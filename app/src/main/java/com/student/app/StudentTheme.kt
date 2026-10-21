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
    primary = Color(0xFF152238),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDCEFEB),
    onPrimaryContainer = Color(0xFF063D3A),
    secondary = Color(0xFF0F766E),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE1F3F0),
    onSecondaryContainer = Color(0xFF064E4A),
    tertiary = Color(0xFFD69E2E),
    background = Color(0xFFF5F7FA),
    onBackground = Color(0xFF172033),
    surface = Color.White,
    onSurface = Color(0xFF172033),
    surfaceVariant = Color(0xFFEEF2F6),
    onSurfaceVariant = Color(0xFF64748B),
    outline = Color(0xFFD8E0E8),
    outlineVariant = Color(0xFFE7EDF2),
    error = Color(0xFFD64545),
    errorContainer = Color(0xFFFFE9E7)
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
