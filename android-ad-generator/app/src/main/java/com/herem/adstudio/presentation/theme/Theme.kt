package com.herem.adstudio.presentation.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Video editors are dark by default — a bright chrome around the canvas skews how the
 * user judges exposure and colour in their own footage. Light mode exists for
 * accessibility but keeps the canvas surround near-black.
 */
private val Ink = Color(0xFF0B0B0F)
private val Surface1 = Color(0xFF15151C)
private val Surface2 = Color(0xFF1F1F29)
private val Accent = Color(0xFF6C5CE7)
private val AccentSoft = Color(0xFF2A2440)
private val Highlight = Color(0xFF00D1B2)

private val DarkColors = darkColorScheme(
    primary = Accent,
    onPrimary = Color.White,
    primaryContainer = AccentSoft,
    onPrimaryContainer = Color(0xFFE6E1FF),
    secondary = Highlight,
    onSecondary = Color(0xFF00201B),
    background = Ink,
    onBackground = Color(0xFFEDEDF2),
    surface = Surface1,
    onSurface = Color(0xFFEDEDF2),
    surfaceVariant = Surface2,
    onSurfaceVariant = Color(0xFFB9B9C6),
    outline = Color(0xFF3A3A47),
    error = Color(0xFFFF6B6B),
)

private val LightColors = lightColorScheme(
    primary = Accent,
    onPrimary = Color.White,
    background = Color(0xFFF7F7FA),
    surface = Color.White,
    surfaceVariant = Color(0xFFECECF2),
)

private val AdTypography = Typography(
    titleLarge = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.SemiBold),
    titleMedium = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Medium),
    bodyMedium = TextStyle(fontSize = 14.sp),
    labelSmall = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium),
)

@Composable
fun AdStudioTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = AdTypography,
        content = content,
    )
}
