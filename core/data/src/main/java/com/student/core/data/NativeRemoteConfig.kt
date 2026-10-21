package com.student.core.data

import org.json.JSONArray
import org.json.JSONObject

/**
 * Runtime UI/config values loaded from the public Student config.json.
 * Missing/invalid values always fall back to code defaults so a bad remote edit
 * cannot prevent the app from opening.
 */
class NativeRemoteConfig private constructor(private val root: JSONObject) {

    private fun value(path: String): Any? {
        if (path.isBlank()) return null
        var current: Any? = root
        for (part in path.split('.')) {
            current = (current as? JSONObject)?.opt(part) ?: return null
            if (current == JSONObject.NULL) return null
        }
        return current
    }

    fun has(path: String): Boolean = value(path) != null

    fun string(path: String, default: String = ""): String {
        val v = value(path) ?: return default
        return when (v) {
            is String -> v
            is Number, is Boolean -> v.toString()
            else -> default
        }.takeIf { it != "null" && it != "undefined" } ?: default
    }

    fun bool(path: String, default: Boolean = false): Boolean {
        return when (val v = value(path)) {
            is Boolean -> v
            is Number -> v.toInt() != 0
            is String -> when (v.trim().lowercase()) {
                "true", "1", "yes", "on", "enabled" -> true
                "false", "0", "no", "off", "disabled" -> false
                else -> default
            }
            else -> default
        }
    }

    fun int(path: String, default: Int, min: Int = Int.MIN_VALUE, max: Int = Int.MAX_VALUE): Int {
        val parsed = when (val v = value(path)) {
            is Number -> v.toInt()
            is String -> v.trim().toIntOrNull()
            else -> null
        } ?: default
        return parsed.coerceIn(min, max)
    }

    fun long(path: String, default: Long, min: Long = Long.MIN_VALUE, max: Long = Long.MAX_VALUE): Long {
        val parsed = when (val v = value(path)) {
            is Number -> v.toLong()
            is String -> v.trim().toLongOrNull()
            else -> null
        } ?: default
        return parsed.coerceIn(min, max)
    }

    fun float(path: String, default: Float, min: Float = -Float.MAX_VALUE, max: Float = Float.MAX_VALUE): Float {
        val parsed = when (val v = value(path)) {
            is Number -> v.toFloat()
            is String -> v.trim().toFloatOrNull()
            else -> null
        } ?: default
        return parsed.coerceIn(min, max)
    }

    fun strings(path: String, default: List<String> = emptyList()): List<String> {
        val v = value(path) ?: return default
        val list = when (v) {
            is JSONArray -> buildList {
                for (i in 0 until v.length()) {
                    val s = v.optString(i, "").trim()
                    if (s.isNotBlank() && s != "null") add(s)
                }
            }
            is String -> v.split(',').map { it.trim() }.filter { it.isNotBlank() }
            else -> emptyList()
        }
        return list.ifEmpty { default }
    }

    companion object {
        val EMPTY = NativeRemoteConfig(JSONObject())

        fun fromAppConfig(raw: String): NativeRemoteConfig {
            val app = JSONObject(raw)
            val native = app.optJSONObject("native_ui") ?: JSONObject()
            return NativeRemoteConfig(native)
        }
    }
}
