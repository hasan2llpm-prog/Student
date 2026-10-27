package com.student.app

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Single source of truth for the Student visual identity. */
object StudentPalette {
    val Navy = Color(0xFF152238)
    val NavyDark = Color(0xFF0A1424)
    val Teal = Color(0xFF0F766E)
    val TealLight = Color(0xFFE1F3F0)
    val Gold = Color(0xFFD69E2E)
    val Coral = Color(0xFFE76F51)
    val Ink = Color(0xFF172033)
    val Muted = Color(0xFF64748B)
    val Border = Color(0xFFD8E0E8)
    val SurfaceSoft = Color(0xFFF5F7FA)
    val Error = Color(0xFFD64545)
}

object StudentDimens {
    val ScreenPadding = 14.dp
    val CompactPadding = 8.dp
    val CardRadius = 16.dp
    val LargeRadius = 24.dp
    val ControlRadius = 14.dp
    val SmallGap = 6.dp
    val ContentGap = 10.dp
    val SoftElevation = 1.dp
}

object StudentMotion {
    const val FastMillis = 200
    const val StandardMillis = 280
}

private val StudentLightColors = lightColorScheme(
    primary = StudentPalette.Navy,
    onPrimary = Color.White,
    primaryContainer = StudentPalette.TealLight,
    onPrimaryContainer = Color(0xFF063D3A),
    secondary = StudentPalette.Teal,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE1F3F0),
    onSecondaryContainer = Color(0xFF064E4A),
    tertiary = StudentPalette.Gold,
    onTertiary = Color.White,
    background = StudentPalette.SurfaceSoft,
    onBackground = StudentPalette.Ink,
    surface = Color.White,
    onSurface = StudentPalette.Ink,
    surfaceVariant = Color(0xFFEEF2F6),
    onSurfaceVariant = StudentPalette.Muted,
    outline = StudentPalette.Border,
    outlineVariant = Color(0xFFE7EDF2),
    error = StudentPalette.Error,
    errorContainer = Color(0xFFFFE9E7)
)

private val StudentDarkColors = darkColorScheme(
    primary = Color(0xFF9CC9FF),
    onPrimary = Color(0xFF003258),
    primaryContainer = Color(0xFF164B73),
    onPrimaryContainer = Color(0xFFD0E8FF),
    secondary = Color(0xFF75D8CB),
    onSecondary = Color(0xFF003731),
    secondaryContainer = Color(0xFF075048),
    onSecondaryContainer = Color(0xFF9AF2E5),
    tertiary = Color(0xFFFFD36E),
    onTertiary = Color(0xFF3E2E00),
    background = Color(0xFF0B111B),
    onBackground = Color(0xFFE6ECF4),
    surface = Color(0xFF111A27),
    onSurface = Color(0xFFE6ECF4),
    surfaceVariant = Color(0xFF202B3A),
    onSurfaceVariant = Color(0xFFB4C1D1),
    outline = Color(0xFF3A4B60),
    outlineVariant = Color(0xFF29384A),
    error = Color(0xFFFFB4AB),
    errorContainer = Color(0xFF93000A)
)

private fun TextStyle.studentBidi() = copy(textDirection = TextDirection.ContentOrRtl)
private val StudentFontFamily = FontFamily.SansSerif
private val BaseTypography = Typography().run {
    copy(
        displayLarge = displayLarge.copy(fontFamily = StudentFontFamily),
        displayMedium = displayMedium.copy(fontFamily = StudentFontFamily),
        displaySmall = displaySmall.copy(fontFamily = StudentFontFamily),
        headlineLarge = headlineLarge.copy(fontFamily = StudentFontFamily),
        headlineMedium = headlineMedium.copy(fontFamily = StudentFontFamily),
        headlineSmall = headlineSmall.copy(fontFamily = StudentFontFamily),
        titleLarge = titleLarge.copy(fontFamily = StudentFontFamily),
        titleMedium = titleMedium.copy(fontFamily = StudentFontFamily),
        titleSmall = titleSmall.copy(fontFamily = StudentFontFamily),
        bodyLarge = bodyLarge.copy(fontFamily = StudentFontFamily),
        bodyMedium = bodyMedium.copy(fontFamily = StudentFontFamily),
        bodySmall = bodySmall.copy(fontFamily = StudentFontFamily),
        labelLarge = labelLarge.copy(fontFamily = StudentFontFamily),
        labelMedium = labelMedium.copy(fontFamily = StudentFontFamily),
        labelSmall = labelSmall.copy(fontFamily = StudentFontFamily)
    )
}

private val StudentTypography = Typography(
    displaySmall = BaseTypography.displaySmall.studentBidi().copy(fontSize = 32.sp, fontWeight = FontWeight.Black, letterSpacing = (-0.5).sp),
    headlineLarge = BaseTypography.headlineLarge.studentBidi().copy(fontWeight = FontWeight.Black),
    headlineMedium = BaseTypography.headlineMedium.studentBidi().copy(fontWeight = FontWeight.ExtraBold),
    headlineSmall = BaseTypography.headlineSmall.studentBidi().copy(fontWeight = FontWeight.ExtraBold),
    titleLarge = BaseTypography.titleLarge.studentBidi().copy(fontWeight = FontWeight.ExtraBold),
    titleMedium = BaseTypography.titleMedium.studentBidi().copy(fontWeight = FontWeight.Bold),
    titleSmall = BaseTypography.titleSmall.studentBidi().copy(fontWeight = FontWeight.Bold),
    bodyLarge = BaseTypography.bodyLarge.studentBidi().copy(lineHeight = 23.sp),
    bodyMedium = BaseTypography.bodyMedium.studentBidi().copy(lineHeight = 20.sp),
    bodySmall = BaseTypography.bodySmall.studentBidi(),
    labelLarge = BaseTypography.labelLarge.studentBidi().copy(fontWeight = FontWeight.Bold),
    labelMedium = BaseTypography.labelMedium.studentBidi(),
    labelSmall = BaseTypography.labelSmall.studentBidi()
)

private val StudentShapes = Shapes(
    extraSmall = androidx.compose.foundation.shape.RoundedCornerShape(10.dp),
    small = androidx.compose.foundation.shape.RoundedCornerShape(StudentDimens.ControlRadius),
    medium = androidx.compose.foundation.shape.RoundedCornerShape(StudentDimens.CardRadius),
    large = androidx.compose.foundation.shape.RoundedCornerShape(StudentDimens.LargeRadius),
    extraLarge = androidx.compose.foundation.shape.RoundedCornerShape(30.dp)
)

@Composable
fun StudentTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        MaterialTheme(
            colorScheme = if (darkTheme) StudentDarkColors else StudentLightColors,
            typography = StudentTypography,
            shapes = StudentShapes,
            content = content
        )
    }
}
