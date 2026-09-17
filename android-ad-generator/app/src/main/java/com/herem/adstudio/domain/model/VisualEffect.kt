package com.herem.adstudio.domain.model

/**
 * A colour/look filter applied for the whole length of a clip.
 *
 * Each entry carries both representations so a project renders the same on either engine:
 * [ffmpegFilter] is a filtergraph fragment, and the Media3 engine maps the same id onto
 * `androidx.media3.effect` instances in `Media3EffectFactory`.
 */
enum class ColorFilter(val label: String, val ffmpegFilter: String?) {
    NONE("Original", null),
    VIVID("Vivid", "eq=saturation=1.45:contrast=1.15"),
    WARM("Warm", "colortemperature=temperature=8200"),
    COOL("Cool", "colortemperature=temperature=4600"),
    MONO("Mono", "hue=s=0"),
    SEPIA("Sepia", "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131"),
    HIGH_CONTRAST("Punch", "eq=contrast=1.4:brightness=0.02"),
    SOFT("Soft", "gblur=sigma=0.8,eq=brightness=0.04"),
    FADED("Faded", "curves=lighter,eq=saturation=0.8"),
}

/**
 * Camera-style movement synthesised over a still image (or layered over a video clip).
 * [startScale]/[endScale] and the pan offsets are normalised: 1f is "fills the frame".
 */
enum class MotionEffect(
    val label: String,
    val startScale: Float,
    val endScale: Float,
    val panXFraction: Float = 0f,
    val panYFraction: Float = 0f,
) {
    NONE("Static", 1f, 1f),
    ZOOM_IN("Zoom in", 1f, 1.18f),
    ZOOM_OUT("Zoom out", 1.18f, 1f),
    PAN_LEFT("Pan left", 1.15f, 1.15f, panXFraction = -0.12f),
    PAN_RIGHT("Pan right", 1.15f, 1.15f, panXFraction = 0.12f),
    KEN_BURNS("Ken Burns", 1f, 1.22f, panXFraction = 0.06f, panYFraction = -0.04f),
}
