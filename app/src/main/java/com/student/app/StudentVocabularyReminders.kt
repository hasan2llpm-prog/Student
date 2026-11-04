package com.student.app

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId

/** Local, offline-first vocabulary reminders. Four words are delivered per learning day. */
internal object StudentVocabularyReminders {
    private const val CHANNEL_ID = "student_vocabulary_words"
    private const val ACTION_WORD = "com.studentiraq.app.VOCABULARY_WORD"
    private const val ACTION_BOOT = "android.intent.action.BOOT_COMPLETED"
    private const val PREFS = "student_vocabulary_reminders"
    private const val KEY_INITIALIZED = "initialized"
    private const val KEY_NEXT_AT = "next_at"
    private const val KEY_SLOT = "slot"
    private const val KEY_WORD_INDEX = "word_index"
    private const val WORDS_PER_DAY = 4
    private const val HOURS_BETWEEN = 3L
    private const val MORNING_HOUR = 8

    private data class Word(val english: String, val arabic: String)

    fun schedule(context: Context) {
        val app = context.applicationContext
        createChannel(app)
        val prefs = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        if (prefs.getBoolean(KEY_INITIALIZED, false) && prefs.getLong(KEY_NEXT_AT, 0L) > now) return
        if (!prefs.getBoolean(KEY_INITIALIZED, false)) {
            prefs.edit()
                .putBoolean(KEY_INITIALIZED, true)
                .putInt(KEY_SLOT, 0)
                .putLong(KEY_WORD_INDEX, 0L)
                .apply()
            arm(app, now + 1_000L, 0)
            return
        }
        armNext(app, prefs, now)
    }

    fun handleAlarm(context: Context) {
        val app = context.applicationContext
        createChannel(app)
        val prefs = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val words = loadWords(app)
        if (words.isNotEmpty()) {
            val index = (prefs.getLong(KEY_WORD_INDEX, 0L) % words.size).toInt()
            val word = words[index]
            showNotification(app, word, index)
            prefs.edit().putLong(KEY_WORD_INDEX, index + 1L).apply()
        }
        val slot = prefs.getInt(KEY_SLOT, 0)
        if (slot < WORDS_PER_DAY - 1) {
            arm(app, System.currentTimeMillis() + HOURS_BETWEEN * 60L * 60L * 1000L, slot + 1)
        } else {
            val tomorrow = LocalDate.now().plusDays(1).atTime(LocalTime.of(MORNING_HOUR, 0))
            arm(app, tomorrow.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(), 0)
        }
    }

    private fun armNext(context: Context, prefs: android.content.SharedPreferences, now: Long) {
        val slot = prefs.getInt(KEY_SLOT, 0)
        val todayMorning = LocalDate.now().atTime(LocalTime.of(MORNING_HOUR, 0))
            .atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        if (slot < WORDS_PER_DAY && now <= todayMorning + 18L * 60L * 60L * 1000L) {
            arm(context, now + 1_000L, slot)
        } else {
            val tomorrow = LocalDate.now().plusDays(1).atTime(LocalTime.of(MORNING_HOUR, 0))
            arm(context, tomorrow.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(), 0)
        }
    }

    private fun arm(context: Context, atMillis: Long, slot: Int) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.edit().putLong(KEY_NEXT_AT, atMillis).putInt(KEY_SLOT, slot).apply()
        val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pending = pendingIntent(context)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarm.canScheduleExactAlarms()) {
            alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pending)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pending)
        } else {
            alarm.set(AlarmManager.RTC_WAKEUP, atMillis, pending)
        }
    }

    private fun pendingIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
        context,
        7401,
        Intent(context, StudentVocabularyReminderReceiver::class.java).setAction(ACTION_WORD),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    private fun showNotification(context: Context, word: Word, index: Int) {
        val open = Intent(context, MainActivity::class.java).apply {
            putExtra("student_destination", "english_academy")
            putExtra("student_vocabulary_word", word.english)
        }
        val content = PendingIntent.getActivity(
            context,
            7600 + index,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(com.student.app.R.drawable.ic_stat_student)
            .setContentTitle("كلمة Student الجديدة")
            .setContentText("${word.english} — ${word.arabic}")
            .setStyle(NotificationCompat.BigTextStyle().bigText("${word.english}\nالمعنى: ${word.arabic}"))
            .setContentIntent(content)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .build()
        if (Build.VERSION.SDK_INT < 33 || NotificationManagerCompat.from(context).areNotificationsEnabled()) {
            NotificationManagerCompat.from(context).notify(7600 + index, notification)
        }
    }

    private fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "كلمات Student اليومية",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "كلمة إنجليزية جديدة كل ثلاث ساعات" }
        )
    }

    private fun loadWords(context: Context): List<Word> = runCatching {
        val raw = context.assets.open("oxford_5000_ar.json").bufferedReader(Charsets.UTF_8).use { it.readText() }
        val array = JSONArray(raw)
        buildList(array.length()) {
            for (i in 0 until array.length()) {
                val item = array.getJSONObject(i)
                val english = item.optString("word").trim()
                val arabic = item.optString("meaning_ar").trim()
                if (english.isNotBlank() && arabic.isNotBlank()) add(Word(english, arabic))
            }
        }
    }.getOrDefault(emptyList())
}

internal class StudentVocabularyReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        when (intent?.action) {
            "android.intent.action.BOOT_COMPLETED" -> StudentVocabularyReminders.schedule(context)
            "com.studentiraq.app.VOCABULARY_WORD" -> StudentVocabularyReminders.handleAlarm(context)
        }
    }
}
