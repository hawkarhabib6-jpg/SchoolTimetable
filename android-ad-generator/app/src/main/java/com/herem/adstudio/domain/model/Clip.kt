package com.herem.adstudio.domain.model

import java.util.UUID

/**
 * One entry on the timeline.
 *
 * For an image, [durationMs] is chosen by the user. For a video, it is derived from the
 * trim window and the speed factor, so the timeline and the renderer never disagree about
 * how long a clip actually is.
 */
data class Clip(
    val id: String = UUID.randomUUID().toString(),
    val asset: MediaAsset,
    /** Stills only: how long the image is held, before transitions overlap it. */
    val imageDurationMs: Long = DEFAULT_IMAGE_DURATION_MS,
    /** Videos only: trim window in the source file, at 1x speed. */
    val trimStartMs: Long = 0L,
    val trimEndMs: Long = 0L,
    val colorFilter: ColorFilter = ColorFilter.NONE,
    val motionEffect: MotionEffect = MotionEffect.NONE,
    /** 0.25f..4f. Values other than 1f re-time both the video and its audio. */
    val speedFactor: Float = 1f,
    val transitionToNext: TransitionType = TransitionType.FADE,
    val transitionDurationMs: Long = DEFAULT_TRANSITION_MS,
    val volume: Float = 1f,
) {
    val isImage: Boolean get() = asset is MediaAsset.Image

    /** Length this clip contributes to the timeline, ignoring transition overlap. */
    val durationMs: Long
        get() = when (asset) {
            is MediaAsset.Image -> imageDurationMs
            is MediaAsset.Video -> {
                val end = if (trimEndMs > trimStartMs) trimEndMs else asset.durationMs
                val trimmed = (end - trimStartMs).coerceAtLeast(0L)
                (trimmed / speedFactor.coerceAtLeast(MIN_SPEED)).toLong()
            }
        }

    companion object {
        const val DEFAULT_IMAGE_DURATION_MS = 2_500L
        const val DEFAULT_TRANSITION_MS = 500L
        const val MIN_SPEED = 0.25f
        const val MAX_SPEED = 4f
    }
}
