package com.student.feature.home

import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import com.student.core.data.NativeRemoteConfig

val LocalNativeRemoteConfig = staticCompositionLocalOf { NativeRemoteConfig.EMPTY }


fun NativeRemoteConfig.color(path: String, default: Color): Color {
    val raw = string(path, "").trim()
    if (raw.isBlank()) return default
    return try {
        val normalized = if (raw.startsWith("#")) raw else "#$raw"
        Color(android.graphics.Color.parseColor(normalized))
    } catch (_: Throwable) { default }
}
