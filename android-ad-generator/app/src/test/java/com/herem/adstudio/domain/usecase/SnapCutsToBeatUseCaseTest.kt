package com.herem.adstudio.domain.usecase

import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.BeatMap
import com.herem.adstudio.domain.model.Clip
import com.herem.adstudio.domain.model.MediaAsset
import com.herem.adstudio.domain.model.TransitionType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SnapCutsToBeatUseCaseTest {

    private val useCase = SnapCutsToBeatUseCase()

    private fun project(durations: List<Long>) = AdProject(
        clips = durations.mapIndexed { index, duration ->
            Clip(
                id = "clip$index",
                asset = MediaAsset.Image(id = "img$index", uri = "content://img$index"),
                imageDurationMs = duration,
                transitionToNext = TransitionType.CUT,
            )
        }
    )

    /** 120 BPM: a beat every 500 ms. */
    private val steadyBeat = BeatMap(
        bpm = 120f,
        beatsMs = (0..40).map { it * 500L },
        confidence = 0.9f,
    )

    @Test
    fun `a boundary within tolerance moves onto the beat`() {
        val snapped = useCase(project(listOf(2_400L, 2_000L, 2_000L)), steadyBeat)

        assertEquals(2_500L, snapped.clips[0].durationMs)
    }

    @Test
    fun `a boundary far from any beat is left alone`() {
        val sparse = BeatMap(bpm = 60f, beatsMs = listOf(0L, 10_000L), confidence = 0.9f)
        val original = project(listOf(2_400L, 2_000L, 2_000L))

        assertEquals(original.clips[0].durationMs, useCase(original, sparse).clips[0].durationMs)
    }

    @Test
    fun `the last clip is never re-timed`() {
        val original = project(listOf(2_400L, 2_400L, 2_400L))
        val snapped = useCase(original, steadyBeat)

        assertEquals(original.clips.last().durationMs, snapped.clips.last().durationMs)
    }

    @Test
    fun `an empty beat map is a no-op`() {
        val original = project(listOf(1_000L, 1_000L))

        assertEquals(original, useCase(original, BeatMap.EMPTY))
    }

    @Test
    fun `videos are re-timed by speed rather than by trimming`() {
        val video = MediaAsset.Video(id = "v", uri = "content://v", durationMs = 4_000L)
        val original = AdProject(
            clips = listOf(
                // 2.4s of a 4s source: the first boundary wants to move to 2.5s.
                Clip(id = "a", asset = video, trimEndMs = 2_400L, transitionToNext = TransitionType.CUT),
                Clip(id = "b", asset = video, transitionToNext = TransitionType.CUT),
            )
        )

        val snapped = useCase(original, steadyBeat)
        val first = snapped.clips.first()

        assertEquals(0L, first.trimStartMs)
        assertEquals(0.96f, first.speedFactor, 0.01f)
    }
}
