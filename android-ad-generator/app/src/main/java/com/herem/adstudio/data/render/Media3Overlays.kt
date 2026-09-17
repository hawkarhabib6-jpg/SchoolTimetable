package com.herem.adstudio.data.render

import android.graphics.Bitmap
import android.graphics.Color
import android.text.SpannableString
import android.text.Spanned
import android.text.style.AbsoluteSizeSpan
import android.text.style.BackgroundColorSpan
import android.text.style.ForegroundColorSpan
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BitmapOverlay
import androidx.media3.effect.OverlaySettings
import androidx.media3.effect.StaticOverlaySettings
import androidx.media3.effect.TextOverlay as Media3TextOverlay
import com.herem.adstudio.domain.model.TextAnimation
import com.herem.adstudio.domain.model.TextOverlay
import kotlin.math.min

/**
 * Overlay implementations for the Media3 pipeline. Both subclasses are re-evaluated per
 * frame: Media3 calls `getOverlaySettings(presentationTimeUs)` for every rendered frame,
 * which is the hook that makes animation possible without a custom shader.
 *
 * Anchors are in normalised device coordinates (-1..1, y pointing up), so a domain
 * overlay's `centerX/centerY` (0..1, y pointing down) is remapped here.
 */
@UnstableApi
class TimedTextOverlay(
    private val model: TextOverlay,
    frameHeight: Int,
) : Media3TextOverlay() {

    private val span: SpannableString = SpannableString(model.text).apply {
        val sizePx = (model.fontSizeFraction * frameHeight).toInt().coerceAtLeast(8)
        setSpan(AbsoluteSizeSpan(sizePx), 0, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        setSpan(ForegroundColorSpan(model.colorArgb), 0, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        model.backgroundArgb?.let {
            setSpan(BackgroundColorSpan(it), 0, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
    }

    private val anchorX = model.centerX * 2f - 1f
    private val anchorY = 1f - model.centerY * 2f

    override fun getText(presentationTimeUs: Long): SpannableString = span

    override fun getOverlaySettings(presentationTimeUs: Long): OverlaySettings {
        val timeMs = presentationTimeUs / 1_000L
        val visible = timeMs in model.startMs..model.endMs
        val progress = if (model.durationMs == 0L) 1f
        else ((timeMs - model.startMs).toFloat() / model.durationMs).coerceIn(0f, 1f)

        val alpha = when {
            !visible -> 0f
            else -> envelope(timeMs)
        }
        val (offsetX, offsetY) = when (model.animation) {
            TextAnimation.SLIDE_UP -> 0f to SLIDE_NDC * (1f - min(progress / SLIDE_PORTION, 1f))
            else -> 0f to 0f
        }
        val scale = when (model.animation) {
            // Overshoot and settle.
            TextAnimation.POP, TextAnimation.BEAT_POP -> {
                val p = min(progress / POP_PORTION, 1f)
                1f + 0.18f * (1f - p) * (1f - p)
            }
            else -> 1f
        }

        return StaticOverlaySettings.Builder()
            .setBackgroundFrameAnchor(anchorX, anchorY - offsetY)
            .setOverlayFrameAnchor(0f, 0f)
            .setScale(scale, scale)
            .setRotationDegrees(model.rotationDegrees)
            .setAlphaScale(alpha)
            .build()
    }

    /** Linear in/out ramp so text never pops on hard. */
    private fun envelope(timeMs: Long): Float {
        if (model.animation == TextAnimation.NONE) return 1f
        val fade = FADE_MS.coerceAtMost(model.durationMs / 3)
        if (fade <= 0L) return 1f
        val sinceStart = timeMs - model.startMs
        val untilEnd = model.endMs - timeMs
        return min(
            sinceStart.toFloat() / fade,
            untilEnd.toFloat() / fade,
        ).coerceIn(0f, 1f)
    }

    private companion object {
        const val FADE_MS = 350L
        const val SLIDE_NDC = 0.08f
        const val SLIDE_PORTION = 0.25f
        const val POP_PORTION = 0.2f
    }
}

/**
 * Full-frame black card whose alpha follows the fade schedule from [Media3TimelinePlan].
 * This is how the Media3 engine renders "transitions" without an overlap API — see the
 * class docs on [Media3TimelinePlan] for why fade-through-black is the honest mapping.
 *
 * The bitmap is deliberately tiny and stretched by [StaticOverlaySettings.Builder.setScale]:
 * a full 1080x1920 ARGB bitmap would cost ~8 MB of heap for a flat colour.
 */
@UnstableApi
class FadeThroughBlackOverlay(
    private val fades: List<Media3TimelinePlan.FadeWindow>,
) : BitmapOverlay() {

    private val black: Bitmap = Bitmap.createBitmap(2, 2, Bitmap.Config.ARGB_8888).apply {
        eraseColor(Color.BLACK)
    }

    override fun getBitmap(presentationTimeUs: Long): Bitmap = black

    override fun getOverlaySettings(presentationTimeUs: Long): OverlaySettings {
        val timeMs = presentationTimeUs / 1_000L
        val alpha = fades.maxOfOrNull { it.alphaAt(timeMs) } ?: 0f
        return StaticOverlaySettings.Builder()
            // Overlay coordinates are normalised to the frame, so a huge scale on a 2x2
            // bitmap simply covers everything.
            .setScale(OVERSCAN, OVERSCAN)
            .setAlphaScale(alpha)
            .build()
    }

    private companion object {
        const val OVERSCAN = 2_000f
    }
}
