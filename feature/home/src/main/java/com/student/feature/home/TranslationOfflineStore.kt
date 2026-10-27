package com.student.feature.home

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import java.security.MessageDigest

/** Persistent, tiny translation cache. It survives process restarts and works offline. */
internal class TranslationOfflineStore(context: Context) {
    private val prefs = context.getSharedPreferences("student_translation_cache", Context.MODE_PRIVATE)

    fun get(source: String): String? = prefs.getString(key(source), null)?.takeIf { it.isNotBlank() }

    fun put(source: String, translated: String) {
        if (source.isBlank() || translated.isBlank()) return
        prefs.edit().putString(key(source), translated.take(12000)).apply()
    }

    private fun key(source: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(source.trim().toByteArray())
        return "translation_" + digest.joinToString("") { "%02x".format(it) }
    }
}

internal fun hasValidatedNetwork(context: Context): Boolean {
    val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
    val network = manager.activeNetwork ?: return false
    val capabilities = manager.getNetworkCapabilities(network) ?: return false
    return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
        capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
}
