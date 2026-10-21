package com.student.feature.home

import android.content.Context
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import java.io.ByteArrayOutputStream

/** Small local previews used only for server-side safety checks; original video is never decoded in full. */
internal fun createVideoModerationPreviews(context: Context, uri: Uri): List<ByteArray> {
    val retriever = MediaMetadataRetriever()
    return try {
        retriever.setDataSource(context, uri)
        val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()?.coerceAtLeast(1L) ?: 1L
        listOf(10L, 50L, 90L).mapNotNull { pct ->
            val timeUs = durationMs * pct / 100L * 1000L
            val frame = retriever.getFrameAtTime(timeUs, MediaMetadataRetriever.OPTION_CLOSEST_SYNC) ?: return@mapNotNull null
            try {
                val maxSide = 720
                val largest = maxOf(frame.width, frame.height).coerceAtLeast(1)
                val scaled = if (largest > maxSide) {
                    val ratio = maxSide.toFloat() / largest.toFloat()
                    Bitmap.createScaledBitmap(frame, (frame.width * ratio).toInt().coerceAtLeast(1), (frame.height * ratio).toInt().coerceAtLeast(1), true)
                } else frame
                ByteArrayOutputStream().use { out ->
                    scaled.compress(Bitmap.CompressFormat.JPEG, 72, out)
                    if (scaled !== frame) scaled.recycle()
                    out.toByteArray()
                }
            } finally {
                frame.recycle()
            }
        }
    } catch (_: Exception) {
        emptyList()
    } finally {
        runCatching { retriever.release() }
    }
}
