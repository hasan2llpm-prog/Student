package com.student.app

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.student.core.data.StudentConfig
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache

class StudentApplication : Application(), ImageLoaderFactory {
    override fun newImageLoader(): ImageLoader = ImageLoader.Builder(this)
        .respectCacheHeaders(false)
        .diskCache {
            DiskCache.Builder()
                .directory(cacheDir.resolve("student_image_cache"))
                .maxSizeBytes(120L * 1024L * 1024L)
                .build()
        }
        .build()

    override fun onCreate() {
        super.onCreate()
        StudentUpdateChecks.schedule(this)
        StudentUpdateChecks.enqueueNow(this)
        if (FirebaseApp.getApps(this).isEmpty()) {
            runCatching {
                val options = FirebaseOptions.Builder()
                    .setProjectId(StudentConfig.FIREBASE_PROJECT_ID)
                    .setGcmSenderId(StudentConfig.FIREBASE_SENDER_ID)
                    .setApiKey(StudentConfig.FIREBASE_API_KEY)
                    .setApplicationId(StudentConfig.FIREBASE_APP_ID)
                    .build()
                FirebaseApp.initializeApp(this, options)
            }
        }
    }
}
