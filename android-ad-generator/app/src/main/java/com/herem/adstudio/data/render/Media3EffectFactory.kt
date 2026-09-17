package com.herem.adstudio.data.render

import android.graphics.Matrix
import androidx.media3.common.Effect
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.SonicAudioProcessor
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.Contrast
import androidx.media3.effect.HslAdjustment
import androidx.media3.effect.MatrixTransformation
import androidx.media3.effect.Presentation
import androidx.media3.effect.RgbFilter
import androidx.media3.effect.RgbAdjustment
import androidx.media3.effect.SpeedChangeEffect
import com.herem.adstudio.domain.model.Clip
import com.herem.adstudio.domain.model.ColorFilter
import com.herem.adstudio.domain.model.ExportSettings
import com.herem.adstudio.domain.model.MotionEffect
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Translates the engine-neutral [ColorFilter]/[MotionEffect] vocabulary into
 * `androidx.media3.effect` instances — the Media3 counterpart of the filtergraph
 * fragments in [FfmpegCommandBuilder].
 *
 * Keeping both mappings driven by the same enums is what lets a project render on either
 * engine without the user seeing a different result.
 *
 * API note: pinned to Media3 **1.5.1**. The `effect` package is `@UnstableApi`; when you
 * bump the version, this file and [Media3RenderEngine] are the two places to re-check.
 */
@UnstableApi
@Singleton
class Media3EffectFactory @Inject constructor() {

    /** Video effects for one clip, in application order. */
    fun videoEffectsFor(clip: Clip, settings: ExportSettings): List<Effect> = buildList {
        // 1. Frame the source: scale to cover the export size, crop the overflow.
        add(
            Presentation.createForWidthAndHeight(
                settings.width,
                settings.height,
                Presentation.LAYOUT_SCALE_TO_FIT_WITH_CROP,
            )
        )
        // 2. Camera move (still images and video alike).
        motionEffect(clip)?.let(::add)
        // 3. Colour look.
        addAll(colorEffects(clip.colorFilter))
        // 4. Re-timing. Audio is re-timed separately by `audioProcessorsFor`.
        if (clip.speedFactor != 1f && !clip.isImage) {
            add(SpeedChangeEffect(clip.speedFactor))
        }
    }

    fun audioProcessorsFor(clip: Clip): List<AudioProcessor> = buildList {
        if (clip.speedFactor != 1f && !clip.isImage) {
            // Sonic keeps the pitch sane while stretching/compressing the timeline.
            add(SonicAudioProcessor().apply { setSpeed(clip.speedFactor) })
        }
    }

    private fun colorEffects(filter: ColorFilter): List<Effect> = when (filter) {
        ColorFilter.NONE -> emptyList()
        ColorFilter.MONO -> listOf(RgbFilter.createGrayscaleFilter())
        ColorFilter.SEPIA -> listOf(
            RgbFilter.createGrayscaleFilter(),
            RgbAdjustment.Builder().setRedScale(1.18f).setGreenScale(1.02f).setBlueScale(0.82f).build(),
        )
        ColorFilter.VIVID -> listOf(
            HslAdjustment.Builder().adjustSaturation(28f).build(),
            Contrast(0.15f),
        )
        ColorFilter.WARM -> listOf(
            RgbAdjustment.Builder().setRedScale(1.10f).setBlueScale(0.92f).build(),
        )
        ColorFilter.COOL -> listOf(
            RgbAdjustment.Builder().setRedScale(0.93f).setBlueScale(1.10f).build(),
        )
        ColorFilter.HIGH_CONTRAST -> listOf(Contrast(0.4f))
        ColorFilter.SOFT -> listOf(
            HslAdjustment.Builder().adjustLightness(6f).adjustSaturation(-6f).build(),
        )
        ColorFilter.FADED -> listOf(
            Contrast(-0.12f),
            HslAdjustment.Builder().adjustSaturation(-18f).adjustLightness(4f).build(),
        )
    }

    /**
     * Ken Burns via a time-varying matrix.
     *
     * [MatrixTransformation] is handed the presentation timestamp of every frame and
     * returns the transform for it — GPU-side, so a 1080x1920 zoom costs nothing measurable
     * next to the encode. Normalised device coordinates run -1..1, which is why the pan
     * fractions are doubled here.
     */
    private fun motionEffect(clip: Clip): Effect? {
        val motion = clip.motionEffect
        if (motion == MotionEffect.NONE) return null
        val durationUs = (clip.durationMs * 1_000L).coerceAtLeast(1L)
        return MatrixTransformation { presentationTimeUs ->
            val t = (presentationTimeUs.toFloat() / durationUs).coerceIn(0f, 1f)
            val eased = t * t * (3f - 2f * t) // smoothstep: no visible start/stop jerk
            val scale = motion.startScale + (motion.endScale - motion.startScale) * eased
            Matrix().apply {
                postScale(scale, scale)
                postTranslate(motion.panXFraction * 2f * eased, motion.panYFraction * 2f * eased)
            }
        }
    }
}
