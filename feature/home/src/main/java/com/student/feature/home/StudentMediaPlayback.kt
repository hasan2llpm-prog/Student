package com.student.feature.home

import android.content.Context
import android.net.Uri
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import java.io.File

/** Shared bounded media cache for Reels and community video playback. */
internal object StudentMediaPlayback {
    private const val CACHE_BYTES = 192L * 1024L * 1024L
    private const val PREFETCH_BYTES = 2L * 1024L * 1024L

    @Volatile private var sharedCache: SimpleCache? = null

    private fun cache(context: Context): SimpleCache {
        sharedCache?.let { return it }
        return synchronized(this) {
            sharedCache ?: SimpleCache(
                File(context.applicationContext.cacheDir, "student_media_cache"),
                LeastRecentlyUsedCacheEvictor(CACHE_BYTES),
                StandaloneDatabaseProvider(context.applicationContext)
            ).also { sharedCache = it }
        }
    }

    fun dataSourceFactory(context: Context): CacheDataSource.Factory {
        val app = context.applicationContext
        val http = DefaultHttpDataSource.Factory()
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(8_000)
            .setReadTimeoutMs(12_000)
        val upstream = DefaultDataSource.Factory(app, http)
        return CacheDataSource.Factory()
            .setCache(cache(app))
            .setUpstreamDataSourceFactory(upstream)
            .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
    }

    fun mediaSourceFactory(context: Context): DefaultMediaSourceFactory =
        DefaultMediaSourceFactory(dataSourceFactory(context))

    /** Warm only the beginning of the next video; never downloads the whole file. */
    fun prefetchPrefix(context: Context, url: String?, bytes: Long = PREFETCH_BYTES) {
        if (url.isNullOrBlank()) return
        runCatching {
            val dataSource = dataSourceFactory(context).createDataSource()
            val spec = DataSpec.Builder()
                .setUri(Uri.parse(url))
                .setPosition(0)
                .setLength(bytes)
                .build()
            dataSource.open(spec)
            try {
                val buffer = ByteArray(64 * 1024)
                var remaining = bytes
                while (remaining > 0L) {
                    val read = dataSource.read(buffer, 0, minOf(buffer.size.toLong(), remaining).toInt())
                    if (read <= 0) break
                    remaining -= read.toLong()
                }
            } finally {
                dataSource.close()
            }
        }
    }
}

internal object StudentSocialMediaMemoryCache {
    private const val TTL_MS = 2L * 60L * 1000L
    private const val MAX_USERS = 4

    private data class CacheEntry<T>(val value: T, val storedAtMs: Long)

    private val lock = Any()
    private val reelsByUser = LinkedHashMap<String, CacheEntry<List<com.student.core.data.ReelItem>>>(8, 0.75f, true)

    fun reels(userId: String): List<com.student.core.data.ReelItem> = synchronized(lock) {
        val entry = reelsByUser[userId] ?: return@synchronized emptyList()
        if (System.currentTimeMillis() - entry.storedAtMs > TTL_MS) {
            reelsByUser.remove(userId)
            emptyList()
        } else entry.value
    }

    fun putReels(userId: String, items: List<com.student.core.data.ReelItem>) = synchronized(lock) {
        reelsByUser[userId] = CacheEntry(items, System.currentTimeMillis())
        trimReels()
    }

    fun clear(userId: String) = synchronized(lock) {
        reelsByUser.remove(userId)
        Unit
    }

    private fun trimReels() {
        while (reelsByUser.size > MAX_USERS) reelsByUser.remove(reelsByUser.entries.first().key)
    }
}
