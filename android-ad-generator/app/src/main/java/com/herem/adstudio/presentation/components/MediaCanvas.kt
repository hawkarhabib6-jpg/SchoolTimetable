package com.herem.adstudio.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.Clip
import com.herem.adstudio.domain.model.MotionEffect
import com.herem.adstudio.domain.model.TextOverlay

/**
 * The main preview surface.
 *
 * Three rules drive this component:
 *
 * 1. **The canvas is the export frame.** It is locked to the project's aspect ratio, so
 *    what the user positions here is exactly what gets muxed — no "looks fine in the
 *    editor, cropped on TikTok" surprises.
 * 2. **Overlay geometry is normalised.** Drags are converted back into 0..1 fractions
 *    before they reach the ViewModel, which is why the same [TextOverlay] renders
 *    identically at preview size and at 1080x1920.
 * 3. **The preview approximates; the renderer decides.** Motion is a cheap `graphicsLayer`
 *    scale here rather than a real GL pass — accurate enough to judge framing, and it
 *    keeps the canvas at 60 fps while the user drags.
 *
 * Safe-area guides mark the regions where TikTok/Reels paste their own UI over the video;
 * text placed inside them will be covered on the real platform.
 */
@Composable
fun MediaCanvas(
    project: AdProject,
    playheadMs: Long,
    selectedOverlayId: String?,
    onOverlayMoved: (id: String, centerX: Float, centerY: Float) -> Unit,
    onOverlaySelected: (String?) -> Unit,
    modifier: Modifier = Modifier,
    showSafeAreas: Boolean = true,
) {
    val clipIndex = remember(project, playheadMs) { project.clipIndexAt(playheadMs) }
    val clip = project.clips.getOrNull(clipIndex)

    BoxWithConstraints(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(project.settings.aspectRatio.value)
            .clip(RoundedCornerShape(18.dp))
            .background(Color.Black)
            .pointerInput(Unit) {
                detectTapGestures(onTap = { onOverlaySelected(null) })
            },
    ) {
        val canvasWidthPx = with(LocalDensity.current) { maxWidth.toPx() }
        val canvasHeightPx = with(LocalDensity.current) { maxHeight.toPx() }

        if (clip == null) {
            EmptyCanvasHint(Modifier.align(Alignment.Center))
        } else {
            val clipStart = project.startOfClipMs(clipIndex)
            val progress = ((playheadMs - clipStart).toFloat() / clip.durationMs.coerceAtLeast(1L))
                .coerceIn(0f, 1f)

            AsyncImage(
                model = clip.asset.uri,
                contentDescription = null,
                contentScale = ContentScale.Crop, // cover-and-crop, same as the renderer
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        val scale = clip.previewScaleAt(progress)
                        scaleX = scale
                        scaleY = scale
                        translationX = clip.motionEffect.panXFraction * progress * size.width
                        translationY = clip.motionEffect.panYFraction * progress * size.height
                    },
            )
        }

        if (showSafeAreas) SafeAreaGuides()

        // Overlays are drawn above the frame, in the order the project lists them.
        project.overlays
            .filter { playheadMs in it.startMs..it.endMs || it.id == selectedOverlayId }
            .forEach { overlay ->
                DraggableTextOverlay(
                    overlay = overlay,
                    isSelected = overlay.id == selectedOverlayId,
                    canvasWidthPx = canvasWidthPx,
                    canvasHeightPx = canvasHeightPx,
                    onSelected = { onOverlaySelected(overlay.id) },
                    onMoved = { x, y -> onOverlayMoved(overlay.id, x, y) },
                )
            }
    }
}

@Composable
private fun DraggableTextOverlay(
    overlay: TextOverlay,
    isSelected: Boolean,
    canvasWidthPx: Float,
    canvasHeightPx: Float,
    onSelected: () -> Unit,
    onMoved: (Float, Float) -> Unit,
) {
    // Local drag state so the text follows the finger without a round-trip through the
    // ViewModel on every pointer event; the normalised result is committed on drag end.
    var dragX by remember(overlay.id, overlay.centerX) { mutableStateOf(overlay.centerX) }
    var dragY by remember(overlay.id, overlay.centerY) { mutableStateOf(overlay.centerY) }

    val fontSizeSp = (overlay.fontSizeFraction * canvasHeightPx).let { px ->
        with(LocalDensity.current) { px.toSp() }
    }

    Box(
        modifier = Modifier
            .graphicsLayer {
                // Offset is measured from the layout origin, so centre the composable on
                // the normalised point by subtracting half its own measured size.
                translationX = dragX * canvasWidthPx - size.width / 2f
                translationY = dragY * canvasHeightPx - size.height / 2f
                rotationZ = overlay.rotationDegrees
            }
            .pointerInput(overlay.id) {
                detectDragGestures(
                    onDragStart = { onSelected() },
                    onDragEnd = { onMoved(dragX, dragY) },
                    onDrag = { change: androidx.compose.ui.input.pointer.PointerInputChange, drag: Offset ->
                        change.consume()
                        dragX = (dragX + drag.x / canvasWidthPx).coerceIn(0.05f, 0.95f)
                        dragY = (dragY + drag.y / canvasHeightPx).coerceIn(0.05f, 0.95f)
                    },
                )
            }
            .then(
                if (overlay.backgroundArgb != null) {
                    Modifier
                        .background(Color(overlay.backgroundArgb), RoundedCornerShape(6.dp))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                } else Modifier
            ),
    ) {
        Text(
            text = overlay.text,
            color = Color(overlay.colorArgb),
            fontSize = fontSizeSp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            modifier = if (isSelected) Modifier.alpha(0.95f) else Modifier,
        )
    }
}

/**
 * Where the platforms draw their own chrome. Roughly: the top status strip, and the
 * bottom-right action rail plus caption block on TikTok and Reels.
 */
@Composable
private fun SafeAreaGuides() {
    Box(Modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxWidth()
                .fillMaxHeight(TOP_UNSAFE)
                .background(Color.White.copy(alpha = 0.04f)),
        )
        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .fillMaxHeight(BOTTOM_UNSAFE)
                .background(Color.White.copy(alpha = 0.04f)),
        )
    }
}

@Composable
private fun EmptyCanvasHint(modifier: Modifier = Modifier) {
    Text(
        text = "Add photos or a clip to start",
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontSize = 14.sp,
        modifier = modifier.padding(24.dp),
    )
}

/** Preview-side approximation of the renderer's zoom ramp. */
private fun Clip.previewScaleAt(progress: Float): Float {
    if (motionEffect == MotionEffect.NONE) return 1f
    val eased = progress * progress * (3f - 2f * progress)
    return motionEffect.startScale + (motionEffect.endScale - motionEffect.startScale) * eased
}

/** Index of the clip under the playhead, accounting for transition overlap. */
private fun AdProject.clipIndexAt(timeMs: Long): Int {
    if (clips.isEmpty()) return -1
    clips.indices.forEach { index ->
        val start = startOfClipMs(index)
        val end = start + clips[index].durationMs
        if (timeMs in start until end) return index
    }
    return clips.lastIndex
}

private const val TOP_UNSAFE = 0.10f
private const val BOTTOM_UNSAFE = 0.22f
