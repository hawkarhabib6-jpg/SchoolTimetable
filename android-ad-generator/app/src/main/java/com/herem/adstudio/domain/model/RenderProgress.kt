package com.herem.adstudio.domain.model

/** Progress stream shared by both render engines. */
sealed interface RenderProgress {
    data object Idle : RenderProgress
    /** Decoding/probing before any frame is written; percentage is not known yet. */
    data object Preparing : RenderProgress
    data class Running(val percent: Int, val renderedMs: Long = 0L) : RenderProgress
    data class Completed(val outputPath: String, val durationMs: Long, val sizeBytes: Long) : RenderProgress
    data class Failed(val message: String, val cause: Throwable? = null) : RenderProgress
    data object Cancelled : RenderProgress
}
