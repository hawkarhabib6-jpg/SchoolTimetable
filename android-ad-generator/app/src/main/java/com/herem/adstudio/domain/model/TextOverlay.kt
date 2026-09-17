package com.herem.adstudio.domain.model

/** How a CTA enters and leaves the frame. */
enum class TextAnimation(val label: String) {
    NONE("None"),
    FADE_IN("Fade in"),
    SLIDE_UP("Slide up"),
    POP("Pop"),
    TYPEWRITER("Typewriter"),
    /** One word (or short phrase) per beat — needs a beat map on the audio track. */
    BEAT_POP("Beat pop"),
}

enum class TextFont(val label: String, val assetPath: String?) {
    /** Device sans; the renderer falls back to this when a font file is missing. */
    DEFAULT("Default", null),
    INTER_BOLD("Inter Bold", "fonts/Inter-Bold.ttf"),
    POPPINS_SEMIBOLD("Poppins SemiBold", "fonts/Poppins-SemiBold.ttf"),
    NOTO_KURDISH("Noto Naskh Arabic", "fonts/NotoNaskhArabic-Bold.ttf"),
}

/**
 * A text layer positioned in normalised frame coordinates, so the same project renders
 * correctly at 1080x1920 and at preview size.
 *
 * @param centerX 0f = left edge, 1f = right edge.
 * @param centerY 0f = top edge, 1f = bottom edge.
 * @param fontSizeFraction Cap height as a fraction of frame height (0.06f ≈ 115px at 1920).
 */
data class TextOverlay(
    val id: String,
    val text: String,
    val startMs: Long,
    val endMs: Long,
    val centerX: Float = 0.5f,
    val centerY: Float = 0.82f,
    val fontSizeFraction: Float = 0.06f,
    val colorArgb: Int = 0xFFFFFFFF.toInt(),
    val backgroundArgb: Int? = null,
    val font: TextFont = TextFont.DEFAULT,
    val animation: TextAnimation = TextAnimation.FADE_IN,
    val rotationDegrees: Float = 0f,
    val isRtl: Boolean = false,
) {
    val durationMs: Long get() = (endMs - startMs).coerceAtLeast(0L)
}
