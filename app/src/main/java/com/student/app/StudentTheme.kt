package com.student.app

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalLayoutDirection

private val StudentLightColors = lightColorScheme(
    primary = Color(0xFF6D28D9),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFF1EAFE),
    onPrimaryContainer = Color(0xFF2E1065),
    secondary = Color(0xFF7C3AED),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFF5F0FF),
    onSecondaryContainer = Color(0xFF3B1678),
    tertiary = Color(0xFF0EA5E9),
    background = Color(0xFFF7F7FA),
    onBackground = Color(0xFF17151C),
    surface = Color.White,
    onSurface = Color(0xFF17151C),
    surfaceVariant = Color(0xFFF4F3F7),
    onSurfaceVariant = Color(0xFF6B6572),
    outline = Color(0xFFE2DDE8),
    outlineVariant = Color(0xFFF0ECF4),
    error = Color(0xFFB42318),
    errorContainer = Color(0xFFFFEDEA)
)

private val BaseTypography = Typography()
private fun androidx.compose.ui.text.TextStyle.studentBidi() = copy(textDirection = TextDirection.ContentOrRtl)
private val StudentTypography = Typography(
    displaySmall = BaseTypography.displaySmall.studentBidi().copy(fontWeight = FontWeight.Black, letterSpacing = (-0.5).sp),
    headlineLarge = BaseTypography.headlineLarge.studentBidi().copy(fontWeight = FontWeight.Black, letterSpacing = (-0.35).sp),
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
    small = androidx.compose.foundation.shape.RoundedCornerShape(14.dp),
    medium = androidx.compose.foundation.shape.RoundedCornerShape(20.dp),
    large = androidx.compose.foundation.shape.RoundedCornerShape(26.dp),
    extraLarge = androidx.compose.foundation.shape.RoundedCornerShape(32.dp)
)

@Composable
fun StudentTheme(content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        MaterialTheme(
            colorScheme = StudentLightColors,
            typography = StudentTypography,
            shapes = StudentShapes,
            content = content
        )
    }
}
