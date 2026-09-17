package com.herem.adstudio.domain.model

/**
 * Beat positions detected in (or supplied for) a music track.
 *
 * [beatsMs] are absolute positions in the *source* file, so trimming the track with
 * [AudioTrack.startOffsetMs] does not invalidate them.
 */
data class BeatMap(
    val bpm: Float,
    val beatsMs: List<Long>,
    val confidence: Float = 0f,
) {
    companion object {
        val EMPTY = BeatMap(bpm = 0f, beatsMs = emptyList())

        /**
         * Below this, the detector found onsets but no steady pulse (speech, ambience,
         * rubato). The editor leaves beat-snapping switched off rather than chopping the
         * edit on noise.
         */
        const val MIN_USABLE_CONFIDENCE = 0.55f
    }

    val isUsableForSnapping: Boolean get() = confidence >= MIN_USABLE_CONFIDENCE

    /** Beats that fall inside the window used by the timeline, rebased to 0. */
    fun beatsInWindow(startMs: Long, durationMs: Long): List<Long> =
        beatsMs.asSequence()
            .filter { it in startMs..(startMs + durationMs) }
            .map { it - startMs }
            .toList()
}

data class AudioTrack(
    val id: String,
    val uri: String,
    val title: String = "",
    /** Where playback starts inside the source file. */
    val startOffsetMs: Long = 0L,
    /** 0f..1f, applied to the music bed only. */
    val volume: Float = 0.8f,
    /** Volume applied to audio that came with the imported video clips. */
    val originalAudioVolume: Float = 0f,
    val fadeInMs: Long = 300L,
    val fadeOutMs: Long = 800L,
    val beatMap: BeatMap = BeatMap.EMPTY,
    /** When true, clip boundaries are snapped to [beatMap] before rendering. */
    val snapCutsToBeat: Boolean = false,
)
