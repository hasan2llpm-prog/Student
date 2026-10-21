package com.student.app

import android.app.DownloadManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.content.FileProvider
import java.io.File
import java.security.MessageDigest

internal enum class UpdateDownloadStatus { NONE, DOWNLOADING, READY, FAILED }

internal object StudentUpdateManager {
    private const val PREFS = "student_silent_update"
    private const val CHANNEL = "student_updates"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private fun fileName(versionCode: Int) = "Student-update-$versionCode.apk"
    private fun apkFile(context: Context, versionCode: Int): File =
        File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), fileName(versionCode))

    @Synchronized
    fun ensureDownload(context: Context, info: ForcedUpdateInfo): Long? {
        val updateUri = Uri.parse(info.apkUrl)
        if (info.apkUrl.isBlank() || info.latestVersionCode <= 0 || !updateUri.scheme.equals("https", ignoreCase = true)) return null
        val p = prefs(context)
        val existingVersion = p.getInt("version", 0)
        val existingId = p.getLong("download_id", -1L)
        if (existingVersion == info.latestVersionCode && existingId > 0) {
            val existingStatus = status(context, info)
            if (existingStatus == UpdateDownloadStatus.DOWNLOADING || existingStatus == UpdateDownloadStatus.READY) {
                return existingId
            }
        }
        if (existingId > 0) {
            runCatching { (context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).remove(existingId) }
        }
        if (existingVersion > 0) {
            runCatching { apkFile(context, existingVersion).delete() }
        }
        val request = DownloadManager.Request(Uri.parse(info.apkUrl))
            .setTitle("تحديث Student ${info.latestVersionCode}")
            .setDescription("جارٍ تنزيل التحديث بالخلفية")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(true)
            .setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, fileName(info.latestVersionCode))
        val id = (context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
        p.edit()
            .putInt("version", info.latestVersionCode)
            .putLong("download_id", id)
            .putString("url", info.apkUrl)
            .putString("message", info.message)
            .apply()
        // The server sends the single "update available" FCM notification.
        // Locally we only notify again when the APK is fully ready to install.
        return id
    }

    fun status(context: Context, info: ForcedUpdateInfo): UpdateDownloadStatus {
        val p = prefs(context)
        if (p.getInt("version", 0) != info.latestVersionCode) return UpdateDownloadStatus.NONE
        val id = p.getLong("download_id", -1L)
        if (id <= 0) return UpdateDownloadStatus.NONE
        val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        return runCatching {
            dm.query(DownloadManager.Query().setFilterById(id)).use { c ->
                if (!c.moveToFirst()) return@use UpdateDownloadStatus.NONE
                when (c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))) {
                    DownloadManager.STATUS_SUCCESSFUL -> {
                        val file = apkFile(context, info.latestVersionCode)
                        if (file.exists() && verifyDownloadedApk(context, file, info.latestVersionCode)) {
                            UpdateDownloadStatus.READY
                        } else {
                            runCatching { file.delete() }
                            UpdateDownloadStatus.FAILED
                        }
                    }
                    DownloadManager.STATUS_FAILED -> UpdateDownloadStatus.FAILED
                    DownloadManager.STATUS_PENDING, DownloadManager.STATUS_PAUSED, DownloadManager.STATUS_RUNNING -> UpdateDownloadStatus.DOWNLOADING
                    else -> UpdateDownloadStatus.NONE
                }
            }
        }.getOrDefault(UpdateDownloadStatus.NONE)
    }

    fun install(context: Context, info: ForcedUpdateInfo): Boolean {
        val file = apkFile(context, info.latestVersionCode)
        if (!file.exists() || !verifyDownloadedApk(context, file, info.latestVersionCode)) {
            runCatching { file.delete() }
            return false
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !context.packageManager.canRequestPackageInstalls()) {
            val settingsIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(settingsIntent)
            return false
        }
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.updates", file)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        return true
    }

    @Suppress("DEPRECATION")
    private fun verifyDownloadedApk(context: Context, file: File, expectedVersionCode: Int): Boolean = runCatching {
        val pm = context.packageManager
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            PackageManager.GET_SIGNING_CERTIFICATES
        } else {
            PackageManager.GET_SIGNATURES
        }
        val archive = pm.getPackageArchiveInfo(file.absolutePath, flags) ?: return@runCatching false
        if (archive.packageName != context.packageName) return@runCatching false
        val archiveVersion = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) archive.longVersionCode else archive.versionCode.toLong()
        if (archiveVersion != expectedVersionCode.toLong()) return@runCatching false

        val installed = pm.getPackageInfo(context.packageName, flags)
        val installedDigests = signingDigests(installed)
        val archiveDigests = signingDigests(archive)
        installedDigests.isNotEmpty() && archiveDigests.isNotEmpty() && installedDigests.any(archiveDigests::contains)
    }.getOrDefault(false)

    @Suppress("DEPRECATION")
    private fun signingDigests(info: PackageInfo): Set<String> {
        val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val signing = info.signingInfo ?: return emptySet()
            if (signing.hasMultipleSigners()) signing.apkContentsSigners else signing.signingCertificateHistory
        } else {
            info.signatures
        } ?: return emptySet()
        return signatures.mapTo(linkedSetOf<String>()) { signature ->
            MessageDigest.getInstance("SHA-256")
                .digest(signature.toByteArray())
                .joinToString("") { byte -> "%02x".format(byte.toInt() and 0xff) }
        }
    }

    fun infoFromPrefs(context: Context): ForcedUpdateInfo? {
        val p = prefs(context)
        val version = p.getInt("version", 0)
        val url = p.getString("url", "").orEmpty()
        if (version <= 0 || url.isBlank()) return null
        return ForcedUpdateInfo(version, version, url, p.getString("message", "تحديث Student جاهز للتثبيت.").orEmpty())
    }

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(NotificationChannel(CHANNEL, "تحديثات Student", NotificationManager.IMPORTANCE_HIGH))
        }
    }

    private fun notificationIntent(context: Context, destination: String, requestCode: Int): PendingIntent {
        val intent = Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra("student_destination", destination)
        return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun notifyAvailableOnce(context: Context, info: ForcedUpdateInfo) {
        val p = prefs(context)
        if (p.getInt("notified_available", 0) == info.latestVersionCode) return
        ensureChannel(context)
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_student)
            .setContentTitle("تحديث جديد لـ Student")
            .setContentText("يتم تنزيل التحديث بالخلفية.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(notificationIntent(context, "update_downloading", 8000 + info.latestVersionCode))
            .build()
        context.getSystemService(NotificationManager::class.java).notify(8000 + info.latestVersionCode, notification)
        p.edit().putInt("notified_available", info.latestVersionCode).apply()
    }

    fun notifyReadyOnce(context: Context, info: ForcedUpdateInfo) {
        val p = prefs(context)
        if (p.getInt("notified_ready", 0) == info.latestVersionCode) return
        ensureChannel(context)
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_student)
            .setContentTitle("تحديث Student جاهز")
            .setContentText("اضغط لتثبيت التحديث والاستمرار.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(notificationIntent(context, "update_ready", 9000 + info.latestVersionCode))
            .build()
        context.getSystemService(NotificationManager::class.java).notify(9000 + info.latestVersionCode, notification)
        p.edit().putInt("notified_ready", info.latestVersionCode).apply()
    }
}

class UpdateDownloadReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != DownloadManager.ACTION_DOWNLOAD_COMPLETE) return
        val completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
        val info = StudentUpdateManager.infoFromPrefs(context) ?: return
        val p = context.getSharedPreferences("student_silent_update", Context.MODE_PRIVATE)
        if (completedId != p.getLong("download_id", -2L)) return
        if (StudentUpdateManager.status(context, info) == UpdateDownloadStatus.READY) {
            StudentUpdateManager.notifyReadyOnce(context, info)
        }
    }
}
