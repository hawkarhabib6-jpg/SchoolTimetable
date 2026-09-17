package com.herem.adstudio.core.util

/** One-shot messages the ViewModel sends to the screen (snackbars, toasts). */
sealed interface UiEvent {
    data class Message(val text: String) : UiEvent
    data class Saved(val location: String) : UiEvent
    data class Share(val path: String) : UiEvent
}

fun Long.formatTimecode(): String {
    val totalSeconds = this / 1000
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    val tenths = (this % 1000) / 100
    return "%d:%02d.%d".format(minutes, seconds, tenths)
}
