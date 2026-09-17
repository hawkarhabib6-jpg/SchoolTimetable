package com.herem.adstudio.data.render

import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.Clip
import com.herem.adstudio.domain.model.MediaAsset
import com.herem.adstudio.domain.model.TransitionType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class Media3TimelinePlanTest {

    private fun project(transitionMs: Long) = AdProject(
        clips = (0 until 3).map { index ->
            Clip(
                id = "clip$index",
                asset = MediaAsset.Image(id = "img$index", uri = "content://img$index"),
                imageDurationMs = 3_000L,
                transitionToNext = if (index == 2) TransitionType.CUT else TransitionType.FADE,
                transitionDurationMs = transitionMs,
            )
        }
    )

    @Test
    fun `the media3 timeline is exactly as long as the ffmpeg one`() {
        val project = project(transitionMs = 600L)
        val plan = Media3TimelinePlan.from(project)

        assertEquals(project.totalDurationMs, plan.totalDurationMs)
        assertEquals(project.totalDurationMs, plan.items.sumOf { it.durationMs })
    }

    @Test
    fun `a seam produces one fade centred on the boundary`() {
        val plan = Media3TimelinePlan.from(project(transitionMs = 600L))

        assertEquals(2, plan.fades.size)
        val first = plan.fades.first()
        assertEquals(300L, first.midMs - first.startMs)
        assertEquals(300L, first.endMs - first.midMs)
        assertEquals(1f, first.alphaAt(first.midMs), 0.001f)
        assertEquals(0f, first.alphaAt(first.startMs), 0.001f)
        assertEquals(0f, first.alphaAt(first.endMs), 0.001f)
    }

    @Test
    fun `alpha ramps monotonically into the seam`() {
        val plan = Media3TimelinePlan.from(project(transitionMs = 800L))
        val fade = plan.fades.first()
        val quarter = fade.alphaAt(fade.startMs + 100L)
        val half = fade.alphaAt(fade.startMs + 200L)

        assertTrue(quarter < half)
    }

    @Test
    fun `cuts add no fades at all`() {
        val cutsOnly = AdProject(
            clips = (0 until 3).map { index ->
                Clip(
                    id = "clip$index",
                    asset = MediaAsset.Image(id = "img$index", uri = "content://img$index"),
                    imageDurationMs = 1_500L,
                    transitionToNext = TransitionType.CUT,
                )
            }
        )

        val plan = Media3TimelinePlan.from(cutsOnly)
        assertTrue(plan.fades.isEmpty())
        assertEquals(4_500L, plan.totalDurationMs)
    }
}
