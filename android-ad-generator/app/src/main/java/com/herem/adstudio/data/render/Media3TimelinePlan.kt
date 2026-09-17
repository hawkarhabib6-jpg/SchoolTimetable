package com.herem.adstudio.data.render

import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.MediaAsset
import com.herem.adstudio.domain.model.TransitionType
import com.herem.adstudio.domain.model.effectiveTransitionMs

/**
 * Media3's `EditedMediaItemSequence` plays items back-to-back — there is no cross-clip
 * transition API. A dissolve is therefore reproduced as *fade through black*: the outgoing
 * clip gives up its last `t/2`, the incoming clip its first `t/2`, and a black overlay
 * ramps 0 → 1 → 0 across the seam.
 *
 * Splitting the overlap evenly is what keeps the Media3 timeline exactly as long as the
 * FFmpeg one (`Σ d − Σ t`, see [AdProject.totalDurationMs]), so switching engines never
 * changes where a text overlay lands.
 *
 * Pure data — no Media3 types — so the arithmetic is unit-testable on the JVM.
 */
data class Media3TimelinePlan(
    val items: List<PlannedItem>,
    val fades: List<FadeWindow>,
    val totalDurationMs: Long,
) {
    data class PlannedItem(
        val clipId: String,
        val uri: String,
        val isImage: Boolean,
        /** Length on the output timeline, after the seam trims. */
        val durationMs: Long,
        /** Videos only: source window to decode, already adjusted for the seam trims. */
        val sourceStartMs: Long,
        val sourceEndMs: Long,
    )

    /** A black-through fade centred on a clip boundary. */
    data class FadeWindow(val startMs: Long, val midMs: Long, val endMs: Long) {
        /** 0f at the edges, 1f (fully black) at the seam. */
        fun alphaAt(timeMs: Long): Float = when {
            timeMs <= startMs || timeMs >= endMs -> 0f
            timeMs < midMs -> (timeMs - startMs).toFloat() / (midMs - startMs).coerceAtLeast(1L)
            else -> (endMs - timeMs).toFloat() / (endMs - midMs).coerceAtLeast(1L)
        }.coerceIn(0f, 1f)
    }

    companion object {
        fun from(project: AdProject): Media3TimelinePlan {
            val clips = project.clips
            val items = mutableListOf<PlannedItem>()
            val fades = mutableListOf<FadeWindow>()
            var timeline = 0L

            clips.forEachIndexed { index, clip ->
                val incoming = clips.getOrNull(index - 1)
                    ?.takeIf { it.transitionToNext != TransitionType.CUT }
                    ?.effectiveTransitionMs(next = true) ?: 0L
                val outgoing = clip.effectiveTransitionMs(next = true)
                    .takeIf { index != clips.lastIndex } ?: 0L

                val headTrim = incoming / 2
                val tailTrim = outgoing / 2
                val duration = (clip.durationMs - headTrim - tailTrim).coerceAtLeast(MIN_ITEM_MS)

                val asset = clip.asset
                val sourceStart: Long
                val sourceEnd: Long
                if (asset is MediaAsset.Video) {
                    val rawEnd = if (clip.trimEndMs > clip.trimStartMs) clip.trimEndMs else asset.durationMs
                    // Trims are applied in source time, so scale them by the speed factor.
                    val speed = clip.speedFactor.coerceAtLeast(0.01f)
                    sourceStart = clip.trimStartMs + (headTrim * speed).toLong()
                    sourceEnd = (rawEnd - (tailTrim * speed).toLong()).coerceAtLeast(sourceStart + MIN_ITEM_MS)
                } else {
                    sourceStart = 0L
                    sourceEnd = duration
                }

                items += PlannedItem(
                    clipId = clip.id,
                    uri = asset.uri,
                    isImage = asset is MediaAsset.Image,
                    durationMs = duration,
                    sourceStartMs = sourceStart,
                    sourceEndMs = sourceEnd,
                )

                timeline += duration
                if (outgoing > 0L) {
                    fades += FadeWindow(
                        startMs = (timeline - outgoing / 2).coerceAtLeast(0L),
                        midMs = timeline,
                        endMs = timeline + outgoing / 2,
                    )
                }
            }

            return Media3TimelinePlan(items, fades, timeline)
        }

        /** Media3 rejects zero-length items; this is the shortest item we will emit. */
        const val MIN_ITEM_MS = 100L
    }
}
