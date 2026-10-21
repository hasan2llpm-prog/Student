package com.student.core.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Stores Supabase session secrets encrypted with an app-private Android Keystore key.
 * Existing plaintext sessions are migrated once and then removed.
 */
class SessionStore(context: Context) {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    init {
        migratePlaintextIfNeeded()
    }

    fun save(session: StudentSession) {
        prefs.edit()
            .putString(KEY_ACCESS_ENC, encrypt(session.accessToken))
            .putString(KEY_REFRESH_ENC, encrypt(session.refreshToken))
            .putString(KEY_USER_ID, session.userId)
            .putString(KEY_EMAIL, session.email)
            .remove(KEY_ACCESS_PLAIN)
            .remove(KEY_REFRESH_PLAIN)
            .apply()
    }

    fun load(): StudentSession? {
        val accessBlob = prefs.getString(KEY_ACCESS_ENC, null) ?: return null
        val refreshBlob = prefs.getString(KEY_REFRESH_ENC, null) ?: return null
        val userId = prefs.getString(KEY_USER_ID, null) ?: return null
        return runCatching {
            StudentSession(
                accessToken = decrypt(accessBlob),
                refreshToken = decrypt(refreshBlob),
                userId = userId,
                email = prefs.getString(KEY_EMAIL, "").orEmpty()
            )
        }.getOrElse {
            clear()
            null
        }
    }

    fun clear() = prefs.edit().clear().apply()

    private fun migratePlaintextIfNeeded() {
        if (prefs.contains(KEY_ACCESS_ENC) && prefs.contains(KEY_REFRESH_ENC)) return
        val access = prefs.getString(KEY_ACCESS_PLAIN, null) ?: return
        val refresh = prefs.getString(KEY_REFRESH_PLAIN, null) ?: return
        runCatching {
            prefs.edit()
                .putString(KEY_ACCESS_ENC, encrypt(access))
                .putString(KEY_REFRESH_ENC, encrypt(refresh))
                .remove(KEY_ACCESS_PLAIN)
                .remove(KEY_REFRESH_PLAIN)
                .apply()
        }.onFailure {
            // Never keep a half-migrated session.
            prefs.edit().remove(KEY_ACCESS_PLAIN).remove(KEY_REFRESH_PLAIN).apply()
        }
    }

    private fun encrypt(value: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val ciphertext = cipher.doFinal(value.toByteArray(StandardCharsets.UTF_8))
        return Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + "." +
            Base64.encodeToString(ciphertext, Base64.NO_WRAP)
    }

    private fun decrypt(blob: String): String {
        val parts = blob.split('.', limit = 2)
        require(parts.size == 2) { "Invalid encrypted session" }
        val iv = Base64.decode(parts[0], Base64.NO_WRAP)
        val ciphertext = Base64.decode(parts[1], Base64.NO_WRAP)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, iv))
        return String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8)
    }

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build()
        )
        return generator.generateKey()
    }

    private companion object {
        const val PREFS = "student_native_session"
        const val KEY_ALIAS = "student_session_aes_v1"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val KEY_ACCESS_ENC = "access_token_enc"
        const val KEY_REFRESH_ENC = "refresh_token_enc"
        const val KEY_ACCESS_PLAIN = "access_token"
        const val KEY_REFRESH_PLAIN = "refresh_token"
        const val KEY_USER_ID = "user_id"
        const val KEY_EMAIL = "email"
    }
}
