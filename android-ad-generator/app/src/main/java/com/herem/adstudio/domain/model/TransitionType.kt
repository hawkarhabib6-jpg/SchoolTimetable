package com.herem.adstudio.domain.model

/**
 * Clip-to-clip transitions.
 *
 * [ffmpegName] maps onto FFmpeg's `xfade=transition=` values. Media3 Transformer has no
 * built-in cross-clip transition API yet, so the Media3 engine approximates the same set
 * with per-clip GL effects (alpha/scale/translate ramps) over the overlap window — see
 * `Media3RenderEngine`. Anything outside that approximation falls back to [CUT].
 */
enum class TransitionType(val ffmpegName: String, val label: String, val media3Approximated: Boolean) {
    CUT("", "Cut", false),
    FADE("fade", "Fade", true),
    FADE_BLACK("fadeblack", "Fade to black", true),
    FADE_WHITE("fadewhite", "Fade to white", true),
    SLIDE_LEFT("slideleft", "Slide left", true),
    SLIDE_UP("slideup", "Slide up", true),
    WIPE_LEFT("wipeleft", "Wipe left", false),
    CIRCLE_OPEN("circleopen", "Circle open", false),
    ZOOM_IN("zoomin", "Zoom in", true),
    DISSOLVE("dissolve", "Dissolve", true),
    PIXELIZE("pixelize", "Pixelize", false);

    companion object {
        /** Transitions both engines can render identically. Shown first in the picker. */
        val universal: List<TransitionType> get() = entries.filter { it.media3Approximated || it == CUT }
    }
}
