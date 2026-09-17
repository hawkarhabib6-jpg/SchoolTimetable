package com.herem.adstudio.domain.usecase

import com.herem.adstudio.domain.model.MediaAsset
import com.herem.adstudio.domain.model.PlatformPreset
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BuildImageAdUseCaseTest {

    private val useCase = BuildImageAdUseCase()

    private fun images(count: Int) = (0 until count).map {
        MediaAsset.Image(id = "img$it", uri = "content://img$it")
    }

    @Test
    fun `the auto-edit lands close to the requested length`() {
        val project = useCase(images(5), targetDurationMs = 15_000L)

        assertTrue(
            "expected ~15s, was ${project.totalDurationMs}",
            project.totalDurationMs in 14_000L..16_000L,
        )
    }

    @Test
    fun `the last clip never carries a transition`() {
        val project = useCase(images(4))

        assertEquals(
            com.herem.adstudio.domain.model.TransitionType.CUT,
            project.clips.last().transitionToNext,
        )
    }

    @Test
    fun `a single image still produces a playable ad`() {
        val project = useCase(images(1))

        assertEquals(1, project.clips.size)
        assertTrue(project.totalDurationMs > 0L)
    }

    @Test
    fun `the edit is clamped to what the platform accepts`() {
        val project = useCase(
            images = images(30),
            preset = PlatformPreset.TIKTOK,
            targetDurationMs = 5 * 60_000L,
        )

        assertTrue(project.totalDurationMs <= PlatformPreset.TIKTOK.maxDurationMs)
    }

    @Test
    fun `headline and CTA become overlays at either end`() {
        val project = useCase(images(3), headline = "New arrivals", callToAction = "Order now")

        assertEquals(2, project.overlays.size)
        val cta = project.overlays.last()
        assertEquals(project.totalDurationMs, cta.endMs)
    }
}
