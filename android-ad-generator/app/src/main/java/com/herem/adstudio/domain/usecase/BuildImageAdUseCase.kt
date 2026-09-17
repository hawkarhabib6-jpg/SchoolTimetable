package com.herem.adstudio.domain.usecase

import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.Clip
import com.herem.adstudio.domain.model.ColorFilter
import com.herem.adstudio.domain.model.ExportSettings
import com.herem.adstudio.domain.model.MediaAsset
import com.herem.adstudio.domain.model.MotionEffect
import com.herem.adstudio.domain.model.PlatformPreset
import com.herem.adstudio.domain.model.TextAnimation
import com.herem.adstudio.domain.model.TextOverlay
import com.herem.adstudio.domain.model.TransitionType
import java.util.UUID
import javax.inject.Inject

/**
 * Turns a pile of product photos into a complete, playable ad in one step — the
 * "Image → Video" entry point on the home screen.
 *
 * Pure function of its inputs: no I/O, no Android, so the storyboard rules below are
 * covered by ordinary JVM unit tests.
 */
class BuildImageAdUseCase @Inject constructor() {

    operator fun invoke(
        images: List<MediaAsset.Image>,
        preset: PlatformPreset = PlatformPreset.TIKTOK,
        targetDurationMs: Long = DEFAULT_TARGET_MS,
        headline: String? = null,
        callToAction: String? = null,
        style: AdStyle = AdStyle.DYNAMIC,
    ): AdProject {
        require(images.isNotEmpty()) { "An image ad needs at least one image" }

        val budget = targetDurationMs.coerceAtMost(preset.maxDurationMs)
        val transitionMs = style.transitionMs

        // Transitions overlap their neighbours, so the per-image hold has to account for
        // the (n-1) overlaps that get subtracted from the timeline again.
        val overlapTotal = transitionMs * (images.size - 1)
        val perImage = ((budget + overlapTotal) / images.size)
            .coerceIn(MIN_IMAGE_MS, MAX_IMAGE_MS)

        val clips = images.mapIndexed { index, image ->
            Clip(
                asset = image,
                imageDurationMs = perImage,
                colorFilter = style.colorFilter,
                motionEffect = style.motionFor(index),
                transitionToNext = if (index == images.lastIndex) TransitionType.CUT
                else style.transitionFor(index),
                transitionDurationMs = transitionMs,
            )
        }

        val project = AdProject(
            name = headline?.take(40)?.ifBlank { null } ?: "Untitled ad",
            clips = clips,
            settings = ExportSettings.forPreset(preset),
        )

        val overlays = buildList {
            val total = project.totalDurationMs
            headline?.takeIf { it.isNotBlank() }?.let {
                add(
                    TextOverlay(
                        id = UUID.randomUUID().toString(),
                        text = it,
                        startMs = 200L,
                        endMs = minOf(total, 200L + HEADLINE_HOLD_MS),
                        centerY = 0.18f,
                        fontSizeFraction = 0.075f,
                        animation = TextAnimation.SLIDE_UP,
                    )
                )
            }
            callToAction?.takeIf { it.isNotBlank() }?.let {
                add(
                    TextOverlay(
                        id = UUID.randomUUID().toString(),
                        text = it,
                        startMs = (total - CTA_HOLD_MS).coerceAtLeast(0L),
                        endMs = total,
                        centerY = 0.84f,
                        fontSizeFraction = 0.065f,
                        animation = TextAnimation.POP,
                        backgroundArgb = 0xCC000000.toInt(),
                    )
                )
            }
        }

        return project.copy(overlays = overlays)
    }

    /** Presets for the "auto-edit" chips; each one is just a transition/motion policy. */
    enum class AdStyle(
        val transitionMs: Long,
        val colorFilter: ColorFilter,
    ) {
        CLEAN(400L, ColorFilter.NONE),
        DYNAMIC(300L, ColorFilter.VIVID),
        CINEMATIC(700L, ColorFilter.FADED);

        fun transitionFor(index: Int): TransitionType = when (this) {
            CLEAN -> TransitionType.FADE
            DYNAMIC -> if (index % 2 == 0) TransitionType.SLIDE_LEFT else TransitionType.ZOOM_IN
            CINEMATIC -> if (index % 3 == 2) TransitionType.FADE_BLACK else TransitionType.DISSOLVE
        }

        fun motionFor(index: Int): MotionEffect = when (this) {
            CLEAN -> MotionEffect.NONE
            DYNAMIC -> if (index % 2 == 0) MotionEffect.ZOOM_IN else MotionEffect.PAN_RIGHT
            CINEMATIC -> MotionEffect.KEN_BURNS
        }
    }

    companion object {
        const val DEFAULT_TARGET_MS = 15_000L
        const val MIN_IMAGE_MS = 1_200L
        const val MAX_IMAGE_MS = 6_000L
        const val HEADLINE_HOLD_MS = 2_500L
        const val CTA_HOLD_MS = 2_500L
    }
}
