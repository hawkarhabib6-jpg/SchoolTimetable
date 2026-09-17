package com.herem.adstudio.domain.model

import java.util.UUID

/**
 * The full edit. This is the single serialisable unit the app persists, undoes, and hands
 * to a render engine — no UI state, no Android types.
 */
data class AdProject(
    val id: String = UUID.randomUUID().toString(),
    val name: String = "Untitled ad",
    val clips: List<Clip> = emptyList(),
    val overlays: List<TextOverlay> = emptyList(),
    val audio: AudioTrack? = null,
    val settings: ExportSettings = ExportSettings(),
    val updatedAtMs: Long = 0L,
) {
    /**
     * Timeline length after transition overlap: each transition eats its own duration out
     * of the total, because the outgoing and incoming clips share those frames.
     */
    val totalDurationMs: Long
        get() {
            if (clips.isEmpty()) return 0L
            val raw = clips.sumOf { it.durationMs }
            val overlap = clips.dropLast(1).sumOf { it.effectiveTransitionMs(next = true) }
            return (raw - overlap).coerceAtLeast(0L)
        }

    /** Absolute start of [index] on the timeline, accounting for preceding overlaps. */
    fun startOfClipMs(index: Int): Long {
        var start = 0L
        for (i in 0 until index.coerceAtMost(clips.size)) {
            start += clips[i].durationMs - clips[i].effectiveTransitionMs(next = true)
        }
        return start.coerceAtLeast(0L)
    }

    fun updateClip(clipId: String, transform: (Clip) -> Clip): AdProject =
        copy(clips = clips.map { if (it.id == clipId) transform(it) else it })

    companion object {
        /** A transition can never be longer than half of either clip it joins. */
        fun clampTransition(requestedMs: Long, leftMs: Long, rightMs: Long): Long =
            requestedMs.coerceIn(0L, minOf(leftMs, rightMs) / 2)
    }
}

/** Overlap this clip actually gets, clamped against its own and its neighbour's length. */
internal fun Clip.effectiveTransitionMs(next: Boolean): Long =
    if (!next || transitionToNext == TransitionType.CUT) 0L
    else transitionDurationMs.coerceIn(0L, durationMs / 2)
