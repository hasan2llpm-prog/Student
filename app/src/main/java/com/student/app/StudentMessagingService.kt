package com.student.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.student.core.data.SessionStore
import com.student.core.data.SupabaseApi
import org.json.JSONObject

class StudentMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        getSharedPreferences("student_push", MODE_PRIVATE).edit().putString("fcm_token", token).apply()

        // Firebase may rotate the token while Student is not open. Persist the new
        // native token in Supabase immediately when a signed-in session exists.
        val session = SessionStore(this).load() ?: return
        Thread {
            runCatching { SupabaseApi().registerPushToken(session, token) }
        }.start()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val session = SessionStore(this).load()
        val actorId = message.data["actor_id"].orEmpty()
        // Never notify a user about an action they performed themselves.
        if (session != null && actorId.isNotBlank() && actorId == session.userId) return

        val title = message.notification?.title ?: message.data["title"] ?: "Student"
        val body = message.notification?.body ?: message.data["body"] ?: "لديك إشعار جديد"
        val manager = getSystemService(NotificationManager::class.java)
        val channelId = "student_main"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "إشعارات Student",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "الرسائل والتنبيهات المهمة من Student"
                enableVibration(true)
            }
            manager.createNotificationChannel(channel)
        }

        val metadata = runCatching { JSONObject(message.data["metadata"].orEmpty()) }.getOrNull()
        val targetType = message.data["target_type"]?.takeIf { it.isNotBlank() }
            ?: metadata?.optString("target_type")?.takeIf { it.isNotBlank() }
            ?: when {
                metadata?.has("post_id") == true -> "post"
                metadata?.has("reel_id") == true -> "reel"
                metadata?.has("conversation_id") == true -> "message"
                metadata?.has("user_id") == true -> "profile"
                else -> null
            }
        val targetId = message.data["target_id"]?.takeIf { it.isNotBlank() }
            ?: metadata?.optString("target_id")?.takeIf { it.isNotBlank() }
            ?: metadata?.optString("post_id")?.takeIf { it.isNotBlank() }
            ?: metadata?.optString("reel_id")?.takeIf { it.isNotBlank() }
            ?: metadata?.optString("conversation_id")?.takeIf { it.isNotBlank() }
            ?: metadata?.optString("user_id")?.takeIf { it.isNotBlank() }
        val kind = message.data["kind"].orEmpty()
        if (kind.equals("app_update", ignoreCase = true)) {
            // A data-only update push wakes the update worker. The worker validates
            // the release against Supabase before queuing a download; never trust
            // a URL or version supplied by a push payload.
            StudentUpdateChecks.enqueueNow(this)
            return
        }
        val updateUrl = metadata?.optString("apk_url")?.takeIf {
            it.startsWith("https://", ignoreCase = true) || it.startsWith("http://", ignoreCase = true)
        }
        // Update notifications must never be trapped on the generic notifications screen.
        // Prefer the server-provided APK URL so even an app_update row with an old/invalid
        // link still opens the actual update destination.
        val target = when {
            kind.equals("app_update", ignoreCase = true) && updateUrl != null -> updateUrl
            !message.data["link"].isNullOrBlank() -> message.data["link"]
            !targetType.isNullOrBlank() && !targetId.isNullOrBlank() -> "$targetType/$targetId"
            kind.isNotBlank() -> kind
            else -> "notifications"
        }

        val intent = Intent(this, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra("student_destination", target)
            .putExtra("student_notification_id", message.data["notification_id"])
            .putExtra("student_kind", message.data["kind"])
            .putExtra("student_link", message.data["link"])
            .putExtra("student_metadata", message.data["metadata"])

        val pending = PendingIntent.getActivity(
            this,
            (System.currentTimeMillis() % Int.MAX_VALUE).toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val incomingCount = message.data["unread_count"]?.toIntOrNull()?.coerceAtLeast(1)
            ?: (getSharedPreferences("student_push", MODE_PRIVATE).getInt("unread_badge_count", 0) + 1).coerceAtMost(999)
        getSharedPreferences("student_push", MODE_PRIVATE).edit().putInt("unread_badge_count", incomingCount).apply()

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_stat_student)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setNumber(incomingCount)
            .setContentIntent(pending)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build()

        val stableId = message.data["notification_id"]?.hashCode()
            ?: (System.currentTimeMillis() % Int.MAX_VALUE).toInt()
        manager.notify(stableId, notification)
    }
}
