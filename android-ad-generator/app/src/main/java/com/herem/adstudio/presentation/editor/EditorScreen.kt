package com.herem.adstudio.presentation.editor

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.Undo
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.herem.adstudio.core.util.UiEvent
import com.herem.adstudio.core.util.formatTimecode
import com.herem.adstudio.presentation.components.EffectSelectionBar
import com.herem.adstudio.presentation.components.MediaCanvas
import com.herem.adstudio.presentation.components.Timeline
import java.io.File

/**
 * Stateful entry point: owns the system pickers and the snackbar, and forwards everything
 * else to [EditorViewModel]. Keeping [EditorScreen] stateless below it means the whole
 * layout can be driven from a `@Preview` or a screenshot test with a hand-built state.
 */
@Composable
fun EditorRoute(viewModel: EditorViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    // The photo picker needs no storage permission on any API level — a permission prompt
    // before the user has even seen the app work is the fastest way to lose them.
    val mediaPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickMultipleVisualMedia(MAX_PICKED_ITEMS)
    ) { uris: List<Uri> ->
        if (uris.isNotEmpty()) viewModel.onAction(EditorAction.AddMedia(uris.map { it.toString() }))
    }

    val audioPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { viewModel.onAction(EditorAction.SetMusic(it.toString())) }
    }

    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                is UiEvent.Message -> snackbarHostState.showSnackbar(event.text)
                is UiEvent.Saved -> snackbarHostState.showSnackbar("Saved to ${event.location}")
                is UiEvent.Share -> {
                    val file = File(event.path)
                    val uri = FileProvider.getUriForFile(
                        context,
                        "${context.packageName}.fileprovider",
                        file,
                    )
                    val share = Intent(Intent.ACTION_SEND).apply {
                        type = "video/mp4"
                        putExtra(Intent.EXTRA_STREAM, uri)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    context.startActivity(Intent.createChooser(share, "Share your ad"))
                }
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        EditorScreen(
            state = state,
            onAction = { action ->
                when (action) {
                    EditorAction.PickMusic -> audioPicker.launch("audio/*")
                    else -> viewModel.onAction(action)
                }
            },
            onPickMedia = {
                mediaPicker.launch(
                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo)
                )
            },
        )
        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter).navigationBarsPadding(),
        )
    }
}

@Composable
fun EditorScreen(
    state: EditorUiState,
    onAction: (EditorAction) -> Unit,
    onPickMedia: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding(),
    ) {
        TopBar(state = state, onAction = onAction)

        MediaCanvas(
            project = state.project,
            playheadMs = state.playheadMs,
            selectedOverlayId = state.selectedOverlayId,
            onOverlayMoved = { id, x, y -> onAction(EditorAction.MoveOverlay(id, x, y)) },
            onOverlaySelected = { onAction(EditorAction.SelectOverlay(it)) },
            modifier = Modifier
                .weight(1f, fill = false)
                .padding(horizontal = 16.dp),
        )

        PlaybackRow(state = state, onAction = onAction)

        Timeline(
            clips = state.project.clips,
            selectedClipId = state.selectedClip?.id,
            totalDurationMs = state.project.totalDurationMs,
            onClipSelected = { onAction(EditorAction.SelectClip(it)) },
            onAddMedia = onPickMedia,
        )

        EffectSelectionBar(
            activeTool = state.activeTool,
            selectedClip = state.selectedClip,
            beatSnapEnabled = state.project.audio?.snapCutsToBeat == true,
            beatSnapAvailable = state.beatSnapAvailable,
            onAction = onAction,
            modifier = Modifier.navigationBarsPadding(),
        )
    }
}

@Composable
private fun TopBar(state: EditorUiState, onAction: (EditorAction) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column {
            Text(
                text = state.project.settings.preset.displayName,
                color = MaterialTheme.colorScheme.onBackground,
                fontSize = 15.sp,
            )
            Text(
                text = "${state.project.settings.aspectRatio.label} · " +
                    state.project.totalDurationMs.formatTimecode(),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 11.sp,
            )
        }

        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(
                onClick = { onAction(EditorAction.Undo) },
                enabled = state.canUndo,
            ) {
                Icon(Icons.Filled.Undo, contentDescription = "Undo")
            }
            Spacer(Modifier.height(8.dp))
            ExportButton(state = state, onAction = onAction)
        }
    }
}

@Composable
private fun ExportButton(state: EditorUiState, onAction: (EditorAction) -> Unit) {
    if (state.isExporting) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            CircularProgressIndicator(
                modifier = Modifier.height(18.dp),
                strokeWidth = 2.dp,
            )
            Text(
                text = "  ${state.exportPercent}%",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 12.sp,
            )
        }
    } else {
        Button(
            onClick = { onAction(EditorAction.Export) },
            enabled = state.canExport,
        ) {
            Text("Export")
        }
    }
}

@Composable
private fun PlaybackRow(state: EditorUiState, onAction: (EditorAction) -> Unit) {
    Column(Modifier.padding(horizontal = 12.dp)) {
        if (state.isExporting) {
            LinearProgressIndicator(
                progress = { state.exportPercent / 100f },
                modifier = Modifier.fillMaxWidth(),
            )
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { onAction(EditorAction.TogglePlayback) }) {
                Icon(
                    imageVector = if (state.isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                    contentDescription = if (state.isPlaying) "Pause" else "Play",
                    tint = MaterialTheme.colorScheme.onBackground,
                )
            }
            Slider(
                value = state.playheadMs.toFloat(),
                onValueChange = { onAction(EditorAction.Seek(it.toLong())) },
                valueRange = 0f..state.project.totalDurationMs.coerceAtLeast(1L).toFloat(),
                modifier = Modifier.weight(1f),
            )
            Text(
                text = state.playheadMs.formatTimecode(),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 11.sp,
                modifier = Modifier.padding(start = 8.dp),
            )
        }
    }
}

private const val MAX_PICKED_ITEMS = 20
