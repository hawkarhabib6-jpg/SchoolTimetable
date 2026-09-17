package com.herem.adstudio.domain.model

/**
 * Output framing. Every render is letterbox-free: sources are scaled to cover and
 * centre-cropped, so a 4:3 product photo still fills a 9:16 reel.
 */
enum class AspectRatio(val widthRatio: Int, val heightRatio: Int, val label: String) {
    VERTICAL_9_16(9, 16, "9:16"),
    SQUARE_1_1(1, 1, "1:1"),
    HORIZONTAL_16_9(16, 9, "16:9");

    val value: Float get() = widthRatio.toFloat() / heightRatio.toFloat()
}

/**
 * Platform presets. These are the numbers the export screen offers by default; every
 * field stays overridable in [ExportSettings] for users who know what they want.
 */
enum class PlatformPreset(
    val displayName: String,
    val aspectRatio: AspectRatio,
    val width: Int,
    val height: Int,
    val frameRate: Int,
    val videoBitrateBps: Int,
    val maxDurationMs: Long,
) {
    TIKTOK("TikTok", AspectRatio.VERTICAL_9_16, 1080, 1920, 30, 8_000_000, 60_000L),
    INSTAGRAM_REELS("Instagram Reels", AspectRatio.VERTICAL_9_16, 1080, 1920, 30, 8_000_000, 90_000L),
    FACEBOOK_ADS("Facebook Ads", AspectRatio.VERTICAL_9_16, 1080, 1920, 30, 6_000_000, 120_000L),
    YOUTUBE_SHORTS("YouTube Shorts", AspectRatio.VERTICAL_9_16, 1080, 1920, 30, 10_000_000, 60_000L),
    SQUARE_FEED("Square feed", AspectRatio.SQUARE_1_1, 1080, 1080, 30, 6_000_000, 60_000L),
}
