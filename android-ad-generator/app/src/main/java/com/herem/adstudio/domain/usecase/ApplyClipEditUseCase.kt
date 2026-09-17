package com.herem.adstudio.domain.usecase

import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.Clip
import com.herem.adstudio.domain.model.ColorFilter
import com.herem.adstudio.domain.model.MotionEffect
import com.herem.adstudio.domain.model.TransitionType
import javax.inject.Inject

/**
 * Every edit the effect bar can make, in one place, so the ViewModel stays a thin
 * dispatcher and each rule (clamping speed, clamping transition length) has one home.
 */
class ApplyClipEditUseCase @Inject constructor() {

    sealed interface Edit {
        data class SetColorFilter(val filter: ColorFilter) : Edit
        data class SetMotion(val motion: MotionEffect) : Edit
        data class SetSpeed(val factor: Float) : Edit
        data class SetTransition(val type: TransitionType, val durationMs: Long? = null) : Edit
        data class SetImageDuration(val durationMs: Long) : Edit
        data class SetTrim(val startMs: Long, val endMs: Long) : Edit
        data class SetVolume(val volume: Float) : Edit
    }

    operator fun invoke(project: AdProject, clipId: String, edit: Edit): AdProject =
        project.updateClip(clipId) { clip ->
            when (edit) {
                is Edit.SetColorFilter -> clip.copy(colorFilter = edit.filter)
                is Edit.SetMotion -> clip.copy(motionEffect = edit.motion)
                is Edit.SetSpeed ->
                    clip.copy(speedFactor = edit.factor.coerceIn(Clip.MIN_SPEED, Clip.MAX_SPEED))

                is Edit.SetTransition -> {
                    val requested = edit.durationMs ?: clip.transitionDurationMs
                    val neighbour = project.clips
                        .indexOfFirst { it.id == clipId }
                        .let { i -> project.clips.getOrNull(i + 1)?.durationMs ?: clip.durationMs }
                    clip.copy(
                        transitionToNext = edit.type,
                        transitionDurationMs = AdProject.clampTransition(
                            requestedMs = requested,
                            leftMs = clip.durationMs,
                            rightMs = neighbour,
                        ),
                    )
                }

                is Edit.SetImageDuration ->
                    clip.copy(imageDurationMs = edit.durationMs.coerceIn(MIN_IMAGE_MS, MAX_IMAGE_MS))

                is Edit.SetTrim -> clip.copy(
                    trimStartMs = edit.startMs.coerceAtLeast(0L),
                    trimEndMs = edit.endMs.coerceAtLeast(edit.startMs + MIN_TRIM_MS),
                )

                is Edit.SetVolume -> clip.copy(volume = edit.volume.coerceIn(0f, 1f))
            }
        }

    private companion object {
        const val MIN_IMAGE_MS = 300L
        const val MAX_IMAGE_MS = 15_000L
        const val MIN_TRIM_MS = 200L
    }
}
