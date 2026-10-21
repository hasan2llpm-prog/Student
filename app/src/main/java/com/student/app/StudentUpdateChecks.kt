package com.student.app

import android.content.Context
import android.os.Build
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkerParameters
import androidx.work.WorkManager
import com.student.core.data.SupabaseApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/**
 * FCM data-only app_update -> enqueueNow() for timely checks.
 * Periodic WorkManager (minimum 15 minutes, OS-adjusted) covers missing push
 * and updates announced while Student is closed. WorkManager is not an exact timer.
 */
internal object StudentUpdateChecks {
    private const val PERIODIC_NAME = "student_update_periodic_v293"
    private const val IMMEDIATE_NAME = "student_update_immediate_v293"

    private val networkConstraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()

    fun schedule(context: Context) {
        val request = PeriodicWorkRequestBuilder<StudentUpdateWorker>(15, TimeUnit.MINUTES)
            .setConstraints(networkConstraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(context.applicationContext).enqueueUniquePeriodicWork(
            PERIODIC_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request
        )
    }

    fun enqueueNow(context: Context) {
        val request = OneTimeWorkRequestBuilder<StudentUpdateWorker>()
            .setConstraints(networkConstraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
            IMMEDIATE_NAME,
            ExistingWorkPolicy.KEEP,
            request
        )
    }
}

class StudentUpdateWorker(
    context: Context,
    workerParameters: WorkerParameters
) : CoroutineWorker(context, workerParameters) {
    @Suppress("DEPRECATION")
    private fun installedVersionCode(): Int = runCatching {
        val pm = applicationContext.packageManager
        val info = pm.getPackageInfo(applicationContext.packageName, 0)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            info.longVersionCode.toInt()
        } else {
            info.versionCode
        }
    }.getOrDefault(0)

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val runtime = SupabaseApi().runtimeUpdateConfig().getOrElse {
            return@withContext Result.retry()
        }
        val current = installedVersionCode()
        if (current <= 0 || runtime.latestVersionCode <= current) {
            return@withContext Result.success()
        }
        val info = ForcedUpdateInfo(
            minimumVersionCode = runtime.minimumVersionCode,
            latestVersionCode = runtime.latestVersionCode,
            apkUrl = runtime.apkUrl,
            message = runtime.message
        )
        if (!info.apkUrl.startsWith("https://", ignoreCase = true)) {
            return@withContext Result.failure()
        }
        val status = StudentUpdateManager.status(applicationContext, info)
        if (status == UpdateDownloadStatus.READY) {
            StudentUpdateManager.notifyReadyOnce(applicationContext, info)
            return@withContext Result.success()
        }
        val downloadId = runCatching {
            StudentUpdateManager.ensureDownload(applicationContext, info)
        }.getOrNull()
        if (downloadId == null) return@withContext Result.retry()
        StudentUpdateManager.notifyAvailableOnce(applicationContext, info)
        Result.success()
    }
}
