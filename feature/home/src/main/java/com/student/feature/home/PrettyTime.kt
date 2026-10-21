package com.student.feature.home

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.abs

internal fun prettyTime(value: String?): String {
    if (value.isNullOrBlank() || value.equals("null", ignoreCase = true)) return ""
    val normalized = value.trim()
    val patterns = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXX",
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        "yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
        "yyyy-MM-dd HH:mm:ssXXX",
        "yyyy-MM-dd HH:mm:ss"
    )
    var parsed: Date? = null
    for (pattern in patterns) {
        try {
            val fmt = SimpleDateFormat(pattern, Locale.US).apply {
                isLenient = true
                timeZone = TimeZone.getTimeZone("UTC")
            }
            parsed = fmt.parse(normalized)
            if (parsed != null) break
        } catch (_: Exception) { }
    }
    val date = parsed ?: return normalized.take(16).replace('T', ' ')
    val seconds = abs(System.currentTimeMillis() - date.time) / 1000
    return when {
        seconds < 60 -> "الآن"
        seconds < 3600 -> "منذ ${seconds / 60} د"
        seconds < 86400 -> "منذ ${seconds / 3600} س"
        seconds < 604800 -> "منذ ${seconds / 86400} ي"
        else -> SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(date)
    }
}
