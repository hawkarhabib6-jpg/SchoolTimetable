package com.herem.adstudio.domain.model

/**
 * A file the user imported. The domain layer never touches `android.net.Uri`; the data
 * layer resolves [uri] (an opaque string) back into a content URI when it renders.
 */
sealed interface MediaAsset {
    val id: String
    val uri: String
    val widthPx: Int
    val heightPx: Int

    data class Image(
        override val id: String,
        override val uri: String,
        override val widthPx: Int = 0,
        override val heightPx: Int = 0,
    ) : MediaAsset

    data class Video(
        override val id: String,
        override val uri: String,
        override val widthPx: Int = 0,
        override val heightPx: Int = 0,
        val durationMs: Long = 0L,
        val hasAudio: Boolean = true,
        /** Degrees of display rotation stored in the container metadata. */
        val rotationDegrees: Int = 0,
    ) : MediaAsset
}
