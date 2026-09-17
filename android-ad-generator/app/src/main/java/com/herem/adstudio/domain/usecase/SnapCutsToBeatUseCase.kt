package com.herem.adstudio.domain.usecase

import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.BeatMap
import com.herem.adstudio.domain.model.Clip
import com.herem.adstudio.domain.model.MediaAsset
import javax.inject.Inject
import kotlin.math.abs

/**
 * Nudges every clip boundary onto the nearest musical beat.
 *
 * Images are simply held longer or shorter. Videos keep their trim window and change
 * [Clip.speedFactor] instead, so the shot still shows the same action — just re-timed to
 * land on the beat. Boundaries only move within [TOLERANCE_MS]; a beat further away than
 * that is ignored rather than mangling the edit.
 */
class SnapCutsToBeatUseCase @Inject constructor() {

    operator fun invoke(project: AdProject, beatMap: BeatMap): AdProject {
        if (project.clips.isEmpty() || beatMap.beatsMs.isEmpty()) return project
        val startOffset = project.audio?.startOffsetMs ?: 0L
        val beats = beatMap.beatsInWindow(startOffset, project.totalDurationMs + TOLERANCE_MS)
        if (beats.isEmpty()) return project

        var cursor = 0L
        val snapped = project.clips.mapIndexed { index, clip ->
            if (index == project.clips.lastIndex) return@mapIndexed clip // let the last clip run out
            val naturalEnd = cursor + clip.durationMs
            val beat = beats.minByOrNull { abs(it - naturalEnd) }
            val target = if (beat != null && abs(beat - naturalEnd) <= TOLERANCE_MS) beat else naturalEnd
            val newDuration = (target - cursor).coerceAtLeast(MIN_CLIP_MS)
            cursor += newDuration
            clip.retimedTo(newDuration)
        }
        return project.copy(clips = snapped)
    }

    private fun Clip.retimedTo(newDurationMs: Long): Clip = when (asset) {
        is MediaAsset.Image -> copy(imageDurationMs = newDurationMs)
        is MediaAsset.Video -> {
            val sourceMs = durationMs * speedFactor // trim window at 1x
            val factor = (sourceMs / newDurationMs.toFloat())
                .coerceIn(Clip.MIN_SPEED, Clip.MAX_SPEED)
            copy(speedFactor = factor)
        }
    }

    companion object {
        /** Half a beat at 120 BPM. Beyond this, snapping is more damaging than helpful. */
        const val TOLERANCE_MS = 250L
        const val MIN_CLIP_MS = 400L
    }
}
