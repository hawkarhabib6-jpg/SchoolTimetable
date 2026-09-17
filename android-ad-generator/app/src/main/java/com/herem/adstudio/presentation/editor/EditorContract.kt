package com.herem.adstudio.presentation.editor

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material.icons.filled.Transform
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.ui.graphics.vector.ImageVector
import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.Clip
import com.herem.adstudio.domain.model.ColorFilter
import com.herem.adstudio.domain.model.MotionEffect
import com.herem.adstudio.domain.model.PlatformPreset
import com.herem.adstudio.domain.model.RenderProgress
import com.herem.adstudio.domain.model.TransitionType

enum class EditorTool(val label: String, val icon: ImageVector) {
    TRANSITIONS("Transitions", Icons.Filled.Transform),
    EFFECTS("Effects", Icons.Filled.AutoAwesome),
    SPEED("Speed", Icons.Filled.Speed),
    TEXT("Text", Icons.Filled.TextFields),
    AUDIO("Audio", Icons.Filled.MusicNote),
}

/**
 * Everything the screen can ask the ViewModel to do. A single sealed hierarchy (rather than
 * a dozen lambdas) keeps the composables' parameter lists short and makes the undo stack a
 * matter of snapshotting before each mutating action.
 */
sealed interface EditorAction {
    data class AddMedia(val uris: List<String>) : EditorAction
    data class SelectClip(val clipId: String) : EditorAction
    data class SelectTool(val tool: EditorTool) : EditorAction
    data class SelectOverlay(val overlayId: String?) : EditorAction
    data class SetTransition(val type: TransitionType) : EditorAction
    data class SetColorFilter(val filter: ColorFilter) : EditorAction
    data class SetMotion(val motion: MotionEffect) : EditorAction
    data class SetSpeed(val factor: Float) : EditorAction
    data class SetImageDuration(val durationMs: Long) : EditorAction
    data class AddText(val text: String) : EditorAction
    data class MoveOverlay(val overlayId: String, val centerX: Float, val centerY: Float) : EditorAction
    data class RemoveOverlay(val overlayId: String) : EditorAction
    data object PickMusic : EditorAction
    data class SetMusic(val uri: String) : EditorAction
    data class SetBeatSnap(val enabled: Boolean) : EditorAction
    data class SetPreset(val preset: PlatformPreset) : EditorAction
    data class Seek(val timeMs: Long) : EditorAction
    data object TogglePlayback : EditorAction
    data object Undo : EditorAction
    data object Export : EditorAction
    data object CancelExport : EditorAction
}

data class EditorUiState(
    val project: AdProject = AdProject(),
    val selectedClipId: String? = null,
    val selectedOverlayId: String? = null,
    val activeTool: EditorTool = EditorTool.TRANSITIONS,
    val playheadMs: Long = 0L,
    val isPlaying: Boolean = false,
    val isAnalysingAudio: Boolean = false,
    val beatSnapAvailable: Boolean = false,
    val render: RenderProgress = RenderProgress.Idle,
    val canUndo: Boolean = false,
) {
    val selectedClip: Clip?
        get() = project.clips.firstOrNull { it.id == selectedClipId } ?: project.clips.firstOrNull()

    val isExporting: Boolean
        get() = render is RenderProgress.Preparing || render is RenderProgress.Running

    val canExport: Boolean
        get() = project.clips.isNotEmpty() && !isExporting

    val exportPercent: Int
        get() = (render as? RenderProgress.Running)?.percent ?: 0
}
