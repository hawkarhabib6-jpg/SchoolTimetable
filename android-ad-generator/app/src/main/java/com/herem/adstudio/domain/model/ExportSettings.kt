package com.herem.adstudio.domain.model

data class ExportSettings(
    val preset: PlatformPreset = PlatformPreset.TIKTOK,
    val width: Int = preset.width,
    val height: Int = preset.height,
    val frameRate: Int = preset.frameRate,
    val videoBitrateBps: Int = preset.videoBitrateBps,
    val audioBitrateBps: Int = 128_000,
    /** Burn a watermark into the corner for the free tier. */
    val watermarkText: String? = null,
) {
    val aspectRatio: AspectRatio get() = preset.aspectRatio

    companion object {
        fun forPreset(preset: PlatformPreset) = ExportSettings(
            preset = preset,
            width = preset.width,
            height = preset.height,
            frameRate = preset.frameRate,
            videoBitrateBps = preset.videoBitrateBps,
        )
    }
}
