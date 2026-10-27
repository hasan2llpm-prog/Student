package com.student.feature.home

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/** Shared design tokens. Kept in the feature module so app and feature modules share one source safely. */
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
