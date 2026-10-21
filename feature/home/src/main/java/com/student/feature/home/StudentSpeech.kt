package com.student.feature.home

import android.speech.tts.TextToSpeech
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import java.util.Locale

class StudentSpeechController(context: android.content.Context) {
    private var engine: TextToSpeech? = null
    private var ready = false
    private var pending: Triple<String, String, String>? = null

    init {
        engine = TextToSpeech(context.applicationContext) { status ->
            ready = status == TextToSpeech.SUCCESS
            if (ready) {
                pending?.let { (text, accent, speed) ->
                    pending = null
                    speak(text, accent, speed)
                }
            }
        }
    }

    fun speak(text: String, accent: String, slow: Boolean): Boolean =
        speak(text, accent, if (slow) "slow" else "normal")

    fun speak(text: String, accent: String, speed: String): Boolean {
        if (text.isBlank()) return false
        if (!ready) {
            pending = Triple(text, accent, speed)
            return true
        }

        val locale = if (accent.equals("british", true)) Locale.UK else Locale.US
        val tts = engine ?: return false
        val result = tts.setLanguage(locale)
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) return false

        runCatching {
            val desiredCountry = locale.country
            val candidates = tts.voices
                ?.filter { it.locale.language.equals("en", true) && it.locale.country.equals(desiredCountry, true) }
                .orEmpty()

            // Prefer a high-quality local voice so pronunciation keeps working offline.
            val voice = candidates
                .filter { !it.isNetworkConnectionRequired }
                .sortedWith(compareByDescending<android.speech.tts.Voice> { it.quality }.thenBy { it.latency })
                .firstOrNull()
                ?: candidates.sortedWith(compareByDescending<android.speech.tts.Voice> { it.quality }.thenBy { it.latency }).firstOrNull()

            if (voice != null) tts.voice = voice
        }

        tts.setPitch(1.0f)
        val rate = when (speed.lowercase()) {
            "slow" -> 0.64f
            "fast" -> 1.22f
            else -> 1.0f
        }
        tts.setSpeechRate(rate)
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "student-${System.nanoTime()}")
        return true
    }

    fun stop() { engine?.stop(); pending = null }
    fun shutdown() { engine?.stop(); engine?.shutdown(); engine = null; ready = false; pending = null }
}

@Composable
fun rememberStudentSpeechController(): StudentSpeechController {
    val context = LocalContext.current
    val controller = remember(context) { StudentSpeechController(context) }
    DisposableEffect(controller) { onDispose { controller.shutdown() } }
    return controller
}
