package com.herem.adstudio.data.render

import com.herem.adstudio.domain.model.AdProject
import com.herem.adstudio.domain.model.Clip
import com.herem.adstudio.domain.model.MediaAsset
import com.herem.adstudio.domain.model.TransitionType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FfmpegCommandBuilderTest {

    private val builder = FfmpegCommandBuilder()

    private fun imageProject(
        count: Int,
        holdMs: Long = 3_000L,
        transitionMs: Long = 500L,
        transition: TransitionType = TransitionType.FADE,
    ) = AdProject(
        clips = (0 until count).map { index ->
            Clip(
                id = "clip$index",
                asset = MediaAsset.Image(id = "img$index", uri = "content://img$index"),
                imageDurationMs = holdMs,
                transitionToNext = if (index == count - 1) TransitionType.CUT else transition,
                transitionDurationMs = transitionMs,
            )
        }
    )

    @Test
    fun `each still is looped for its own duration`() {
        val args = builder.build(imageProject(count = 3), "/tmp/out.mp4")

        assertEquals(3, args.count { it == "-loop" })
        assertEquals(3, args.count { it == "-i" })
        assertTrue(args.windowed(2).contains(listOf("-t", "3.000")))
    }

    @Test
    fun `transition offsets pull back by every preceding overlap`() {
        val project = imageProject(count = 3, holdMs = 3_000L, transitionMs = 500L)

        // first join: 3.000 - 0.500
        assertEquals(2_500L, FfmpegCommandBuilder.transitionOffsetMs(project, 1))
        // second join: 6.000 - 1.000
        assertEquals(5_000L, FfmpegCommandBuilder.transitionOffsetMs(project, 2))
    }

    @Test
    fun `output length matches the project timeline`() {
        val project = imageProject(count = 4, holdMs = 2_000L, transitionMs = 400L)
        // 4 x 2000 - 3 x 400
        assertEquals(6_800L, project.totalDurationMs)

        // The output -t is what pins the muxed length to the timeline.
        val args = builder.build(project, "/tmp/out.mp4")
        assertTrue(args.windowed(2).contains(listOf("-t", "6.800")))
    }

    @Test
    fun `cut joins concat instead of fading`() {
        val project = imageProject(count = 2, transition = TransitionType.CUT)
        val graph = builder.build(project, "/tmp/out.mp4").filterGraph()

        assertTrue(graph.contains("concat=n=2"))
        assertTrue(!graph.contains("xfade"))
    }

    @Test
    fun `an over-long transition is clamped to half the clip`() {
        // 1s clips asking for a 2s dissolve: the graph must not ask xfade for more
        // material than the clips contain.
        val project = imageProject(count = 2, holdMs = 1_000L, transitionMs = 2_000L)
        val graph = builder.build(project, "/tmp/out.mp4").filterGraph()

        assertTrue(graph.contains("duration=0.500"))
    }

    @Test
    fun `stills are covered and cropped, never letterboxed`() {
        val graph = builder.build(imageProject(count = 1), "/tmp/out.mp4").filterGraph()

        assertTrue(graph.contains("force_original_aspect_ratio=increase"))
        assertTrue(graph.contains("crop=1080:1920"))
    }

    @Test
    fun `atempo is split into legal stages`() {
        assertEquals("atempo=2.0,atempo=2.0000", FfmpegCommandBuilder.atempoChain(4f))
        assertEquals("atempo=1.5000", FfmpegCommandBuilder.atempoChain(1.5f))
        assertEquals("atempo=0.5,atempo=0.5000", FfmpegCommandBuilder.atempoChain(0.25f))
    }

    @Test
    fun `drawtext values cannot break out of the filtergraph`() {
        val escaped = FfmpegCommandBuilder.escapeDrawTextValue("Today's deal: 50% off")

        assertTrue(escaped.contains("\\:"))
        assertTrue(escaped.contains("\\%"))
        assertTrue(!escaped.contains("'"))
    }

    private fun List<String>.filterGraph(): String = this[indexOf("-filter_complex") + 1]
}
