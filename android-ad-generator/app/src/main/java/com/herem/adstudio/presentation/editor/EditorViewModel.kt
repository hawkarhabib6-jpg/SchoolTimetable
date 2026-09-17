package com.herem.adstudio.presentation.editor

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.herem.adstudio.core.util.UiEvent
import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.AudioTrack
import com.herem.adstudio.domain.model.BeatMap
import com.herem.adstudio.domain.model.Clip
import com.herem.adstudio.domain.model.ExportSettings
import com.herem.adstudio.domain.model.MediaAsset
import com.herem.adstudio.domain.model.RenderProgress
import com.herem.adstudio.domain.model.TextAnimation
import com.herem.adstudio.domain.model.TextOverlay
import com.herem.adstudio.domain.repository.AudioRepository
import com.herem.adstudio.domain.repository.MediaRepository
import com.herem.adstudio.domain.repository.ProjectRepository
import com.herem.adstudio.domain.repository.RenderRepository
import com.herem.adstudio.domain.usecase.ApplyClipEditUseCase
import com.herem.adstudio.domain.usecase.ApplyClipEditUseCase.Edit
import com.herem.adstudio.domain.usecase.BuildImageAdUseCase
import com.herem.adstudio.domain.usecase.ExportProjectUseCase
import com.herem.adstudio.domain.usecase.SnapCutsToBeatUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

/**
 * Single source of truth for the editor screen.
 *
 * State shape: one immutable [EditorUiState] in a [StateFlow], one [Channel] for one-shot
 * events. The UI never mutates a project — it sends an [EditorAction] and re-renders from
 * whatever comes back, which is what makes undo a one-liner (push the previous project
 * onto a stack) and what lets the whole screen be tested without Compose.
 */
@HiltViewModel
class EditorViewModel @Inject constructor(
    private val mediaRepository: MediaRepository,
    private val projectRepository: ProjectRepository,
    private val audioRepository: AudioRepository,
    private val buildImageAd: BuildImageAdUseCase,
    private val applyClipEdit: ApplyClipEditUseCase,
    private val snapCutsToBeat: SnapCutsToBeatUseCase,
    private val exportProject: ExportProjectUseCase,
) : ViewModel() {

    private val _state = MutableStateFlow(EditorUiState())
    val state: StateFlow<EditorUiState> = _state.asStateFlow()

    private val _events = Channel<UiEvent>(Channel.BUFFERED)
    val events = _events.receiveAsFlow()

    /** Bounded so a long session cannot grow the heap without limit. */
    private val undoStack = ArrayDeque<AdProject>()

    private var playbackJob: Job? = null
    private var exportJob: Job? = null

    fun onAction(action: EditorAction) {
        when (action) {
            is EditorAction.AddMedia -> addMedia(action.uris)
            is EditorAction.SelectClip -> _state.update { it.copy(selectedClipId = action.clipId) }
            is EditorAction.SelectTool -> _state.update { it.copy(activeTool = action.tool) }
            is EditorAction.SelectOverlay -> _state.update { it.copy(selectedOverlayId = action.overlayId) }

            is EditorAction.SetTransition -> editSelectedClip(Edit.SetTransition(action.type))
            is EditorAction.SetColorFilter -> editSelectedClip(Edit.SetColorFilter(action.filter))
            is EditorAction.SetMotion -> editSelectedClip(Edit.SetMotion(action.motion))
            is EditorAction.SetSpeed -> editSelectedClip(Edit.SetSpeed(action.factor))
            is EditorAction.SetImageDuration -> editSelectedClip(Edit.SetImageDuration(action.durationMs))

            is EditorAction.AddText -> addText(action.text)
            is EditorAction.MoveOverlay -> moveOverlay(action.overlayId, action.centerX, action.centerY)
            is EditorAction.RemoveOverlay -> mutate { project ->
                project.copy(overlays = project.overlays.filterNot { it.id == action.overlayId })
            }

            EditorAction.PickMusic -> Unit // the screen owns the picker; it answers with SetMusic
            is EditorAction.SetMusic -> setMusic(action.uri)
            is EditorAction.SetBeatSnap -> setBeatSnap(action.enabled)
            is EditorAction.SetPreset -> mutate { project ->
                project.copy(settings = ExportSettings.forPreset(action.preset))
            }

            is EditorAction.Seek -> seek(action.timeMs)
            EditorAction.TogglePlayback -> togglePlayback()
            EditorAction.Undo -> undo()
            EditorAction.Export -> export()
            EditorAction.CancelExport -> cancelExport()
        }
    }

    // -- media ---------------------------------------------------------------

    private fun addMedia(uris: List<String>) = viewModelScope.launch {
        val assets = mediaRepository.probeAll(uris)
        if (assets.isEmpty()) {
            _events.send(UiEvent.Message("Could not read those files"))
            return@launch
        }

        val images = assets.filterIsInstance<MediaAsset.Image>()
        val current = _state.value.project

        // An empty project made only of photos gets the full auto-edit; anything else just
        // appends, because the user has already made choices we should not overwrite.
        val updated = if (current.clips.isEmpty() && images.size == assets.size) {
            buildImageAd(images = images, preset = current.settings.preset)
        } else {
            current.copy(
                clips = current.clips + assets.map { Clip(asset = it) }
            )
        }

        pushUndo(current)
        _state.update {
            it.copy(
                project = updated,
                selectedClipId = it.selectedClipId ?: updated.clips.firstOrNull()?.id,
                canUndo = undoStack.isNotEmpty(),
            )
        }
        projectRepository.save(updated)
    }

    private fun addText(text: String) = mutate { project ->
        val start = _state.value.playheadMs
        val overlay = TextOverlay(
            id = UUID.randomUUID().toString(),
            text = text,
            startMs = start,
            endMs = (start + DEFAULT_TEXT_MS).coerceAtMost(project.totalDurationMs),
            animation = TextAnimation.POP,
        )
        project.copy(overlays = project.overlays + overlay)
    }

    private fun moveOverlay(id: String, centerX: Float, centerY: Float) = mutate { project ->
        project.copy(
            overlays = project.overlays.map {
                if (it.id == id) it.copy(centerX = centerX, centerY = centerY) else it
            }
        )
    }

    // -- audio ---------------------------------------------------------------

    private fun setMusic(uri: String) = viewModelScope.launch {
        _state.update {
            it.copy(
                project = it.project.copy(
                    audio = AudioTrack(id = UUID.randomUUID().toString(), uri = uri)
                ),
                isAnalysingAudio = true,
            )
        }

        val beatMap = audioRepository.detectBeats(uri).getOrNull() ?: BeatMap.EMPTY

        _state.update { current ->
            val audio = current.project.audio?.copy(beatMap = beatMap)
            current.copy(
                project = current.project.copy(audio = audio),
                isAnalysingAudio = false,
                beatSnapAvailable = beatMap.isUsableForSnapping,
            )
        }
        if (!beatMap.isUsableForSnapping) {
            _events.send(UiEvent.Message("No steady beat found — snapping stays off"))
        }
    }

    private fun setBeatSnap(enabled: Boolean) = mutate { project ->
        val audio = project.audio ?: return@mutate project
        val withFlag = project.copy(audio = audio.copy(snapCutsToBeat = enabled))
        if (enabled) snapCutsToBeat(withFlag, audio.beatMap) else withFlag
    }

    // -- playback ------------------------------------------------------------

    private fun togglePlayback() {
        if (_state.value.isPlaying) {
            playbackJob?.cancel()
            _state.update { it.copy(isPlaying = false) }
            return
        }
        _state.update { it.copy(isPlaying = true) }
        playbackJob = viewModelScope.launch {
            // A ticking playhead, not real playback: the canvas renders from project state,
            // so the preview stays in sync with edits made while it runs.
            while (true) {
                delay(PLAYBACK_TICK_MS)
                val total = _state.value.project.totalDurationMs
                val next = _state.value.playheadMs + PLAYBACK_TICK_MS
                if (next >= total) {
                    _state.update { it.copy(playheadMs = 0L, isPlaying = false) }
                    break
                }
                _state.update { it.copy(playheadMs = next) }
            }
        }
    }

    private fun seek(timeMs: Long) {
        val total = _state.value.project.totalDurationMs
        _state.update { it.copy(playheadMs = timeMs.coerceIn(0L, total)) }
    }

    // -- export --------------------------------------------------------------

    private fun export() {
        if (!_state.value.canExport) return
        exportJob?.cancel()
        exportJob = viewModelScope.launch {
            exportProject(_state.value.project).collect { progress ->
                _state.update { it.copy(render = progress) }
                if (progress is RenderProgress.Completed) {
                    _events.send(UiEvent.Share(progress.outputPath))
                }
                if (progress is RenderProgress.Failed) {
                    _events.send(UiEvent.Message(progress.message))
                }
            }
        }
    }

    private fun cancelExport() {
        exportJob?.cancel()
        _state.update { it.copy(render = RenderProgress.Cancelled) }
    }

    // -- undo ----------------------------------------------------------------

    private fun undo() {
        val previous = undoStack.removeLastOrNull() ?: return
        _state.update { it.copy(project = previous, canUndo = undoStack.isNotEmpty()) }
    }

    private fun pushUndo(project: AdProject) {
        undoStack.addLast(project)
        while (undoStack.size > UNDO_LIMIT) undoStack.removeFirst()
    }

    /** Snapshot for undo, apply, persist — the path every mutating action takes. */
    private fun mutate(transform: (AdProject) -> AdProject) {
        val current = _state.value.project
        val updated = transform(current)
        if (updated == current) return
        pushUndo(current)
        _state.update {
            it.copy(
                project = updated,
                canUndo = undoStack.isNotEmpty(),
                playheadMs = it.playheadMs.coerceAtMost(updated.totalDurationMs),
            )
        }
        viewModelScope.launch { projectRepository.save(updated) }
    }

    private fun editSelectedClip(edit: Edit) {
        val clipId = _state.value.selectedClip?.id ?: return
        mutate { project -> applyClipEdit(project, clipId, edit) }
    }

    private companion object {
        const val UNDO_LIMIT = 30
        const val PLAYBACK_TICK_MS = 60L
        const val DEFAULT_TEXT_MS = 2_500L
    }
}
