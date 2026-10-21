package com.student.feature.home

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Handler
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.effect.Presentation
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.coroutines.resume
import kotlin.math.max
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Streams a content Uri into a temporary cache file without buffering the whole input in RAM.
 * If [maxBytes] is supplied, copying stops immediately once the limit is exceeded.
 */
internal fun materializeUriToCacheFile(
    context: Context,
    uri: Uri,
    suffix: String,
    maxBytes: Long? = null
): File = copyUriToFile(
    context = context,
    uri = uri,
    output = File.createTempFile("student_media_", normalizedSuffix(suffix), context.cacheDir),
    maxBytes = maxBytes
)

/** Keeps a selected community attachment across activity/process recreation until publish succeeds. */
internal fun persistCommunityDraftFile(
    context: Context,
    uri: Uri,
    suffix: String,
    maxBytes: Long
): File {
    val dir = File(context.filesDir, "community_drafts").apply { mkdirs() }
    // Remove abandoned drafts older than three days; current drafts are kept until explicitly replaced/published.
    val cutoff = System.currentTimeMillis() - 3L * 24L * 60L * 60L * 1000L
    dir.listFiles()?.filter { it.lastModified() < cutoff }?.forEach { runCatching { it.delete() } }
    return copyUriToFile(
        context = context,
        uri = uri,
        output = File.createTempFile("community_", normalizedSuffix(suffix), dir),
        maxBytes = maxBytes
    )
}

private fun copyUriToFile(context: Context, uri: Uri, output: File, maxBytes: Long?): File {
    require(maxBytes == null || maxBytes > 0L) { "حد حجم الملف غير صالح." }
    try {
        context.contentResolver.openInputStream(uri)?.buffered()?.use { input ->
            output.outputStream().buffered().use { out ->
                val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                var total = 0L
                while (true) {
                    val read = input.read(buffer)
                    if (read < 0) break
                    total += read.toLong()
                    if (maxBytes != null && total > maxBytes) {
                        throw IllegalStateException("حجم الملف أكبر من الحد المسموح.")
                    }
                    out.write(buffer, 0, read)
                }
            }
        } ?: error("تعذر قراءة الملف.")
        require(output.length() > 0L) { "الملف فارغ." }
        return output
    } catch (t: Throwable) {
        output.delete()
        throw t
    }
}

private fun normalizedSuffix(suffix: String): String = if (suffix.startsWith('.')) suffix else ".$suffix"

/** Resolves only image/video MIME types and falls back to the selected file name when providers omit MIME metadata. */
internal fun resolveSupportedVisualMimeType(context: Context, uri: Uri): String? {
    val declared = runCatching { context.contentResolver.getType(uri)?.lowercase() }.getOrNull()
    if (declared?.startsWith("image/") == true || declared?.startsWith("video/") == true) return declared

    val displayName = runCatching {
        context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (!cursor.moveToFirst()) null else cursor.getString(0)
        }
    }.getOrNull().orEmpty()
    val ext = displayName.substringAfterLast('.', "").lowercase().takeIf { it.isNotBlank() } ?: return null
    val inferred = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext)?.lowercase()
    return inferred?.takeIf { it.startsWith("image/") || it.startsWith("video/") }
}

internal fun mediaFileSuffixForMime(mime: String): String = when (mime.lowercase()) {
    "image/png" -> "png"
    "image/webp" -> "webp"
    "image/heic", "image/heif" -> "heic"
    "video/quicktime" -> "mov"
    "video/webm" -> "webm"
    else -> if (mime.startsWith("image/", true)) "jpg" else "mp4"
}

internal data class CommunityNetworkProfile(
    val constrained: Boolean,
    val imageMaxDimension: Int,
    val imageQuality: Int,
    val videoHeight: Int
)

/** Uses transport/metered/link hints to reduce upload size on weak or costly connections. */
internal fun communityNetworkProfile(context: Context): CommunityNetworkProfile {
    val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    val caps = cm.activeNetwork?.let(cm::getNetworkCapabilities)
    val metered = runCatching { cm.isActiveNetworkMetered }.getOrDefault(true)
    val cellular = caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true
    val downstream = caps?.linkDownstreamBandwidthKbps ?: 0
    val constrained = metered || cellular || downstream in 1..2999
    return if (constrained) {
        CommunityNetworkProfile(true, imageMaxDimension = 1280, imageQuality = 72, videoHeight = 480)
    } else {
        CommunityNetworkProfile(false, imageMaxDimension = 1920, imageQuality = 84, videoHeight = 720)
    }
}

/** Downscales and recompresses community images before upload to save bandwidth. */
internal fun optimizeCommunityImage(input: File, profile: CommunityNetworkProfile): File {
    require(input.exists() && input.length() > 0L) { "تعذر قراءة الصورة." }
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(input.absolutePath, bounds)
    require(bounds.outWidth > 0 && bounds.outHeight > 0) { "ملف الصورة غير صالح." }

    var sample = 1
    while (max(bounds.outWidth / sample, bounds.outHeight / sample) > profile.imageMaxDimension * 2) sample *= 2
    val decoded = BitmapFactory.decodeFile(input.absolutePath, BitmapFactory.Options().apply { inSampleSize = sample })
        ?: error("تعذر تجهيز الصورة.")

    var oriented = decoded
    val orientation = runCatching { ExifInterface(input.absolutePath).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL) }
        .getOrDefault(ExifInterface.ORIENTATION_NORMAL)
    val degrees = when (orientation) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90f
        ExifInterface.ORIENTATION_ROTATE_180 -> 180f
        ExifInterface.ORIENTATION_ROTATE_270 -> 270f
        else -> 0f
    }
    if (degrees != 0f) {
        oriented = Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, Matrix().apply { postRotate(degrees) }, true)
        if (oriented !== decoded) decoded.recycle()
    }

    val largest = max(oriented.width, oriented.height)
    val scaled = if (largest > profile.imageMaxDimension) {
        val ratio = profile.imageMaxDimension.toFloat() / largest.toFloat()
        Bitmap.createScaledBitmap(oriented, (oriented.width * ratio).toInt().coerceAtLeast(1), (oriented.height * ratio).toInt().coerceAtLeast(1), true)
            .also { if (it !== oriented) oriented.recycle() }
    } else oriented

    val output = File.createTempFile("community_image_", ".jpg", input.parentFile ?: input.absoluteFile.parentFile)
    try {
        output.outputStream().buffered().use { stream ->
            require(scaled.compress(Bitmap.CompressFormat.JPEG, profile.imageQuality, stream)) { "تعذر ضغط الصورة." }
        }
        require(output.length() > 0L) { "تعذر تجهيز الصورة." }
        return output
    } catch (t: Throwable) {
        output.delete()
        throw t
    } finally {
        if (!scaled.isRecycled) scaled.recycle()
    }
}

/** Produces an H.264 rendition sized for the current connection. */
@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
internal suspend fun transcodeCommunityVideo(context: Context, input: File, targetHeight: Int): Result<File> = runCatching {
    require(input.exists() && input.length() > 0L) { "تعذر قراءة الفيديو." }
    suspendCancellableCoroutine<File?> { cont ->
        val output = File.createTempFile("community_video_${targetHeight}_", ".mp4", context.cacheDir)
        if (output.exists()) output.delete()
        val completed = AtomicBoolean(false)

        fun finish(value: File?) {
            if (completed.compareAndSet(false, true)) cont.resume(value)
        }

        val edited = EditedMediaItem.Builder(MediaItem.fromUri(Uri.fromFile(input)))
            .setEffects(Effects(emptyList(), listOf(Presentation.createForHeight(targetHeight))))
            .build()
        val transformer = Transformer.Builder(context)
            .setVideoMimeType(MimeTypes.VIDEO_H264)
            .addListener(object : Transformer.Listener {
                override fun onCompleted(composition: Composition, exportResult: ExportResult) {
                    finish(output.takeIf { it.exists() && it.length() > 0L })
                }

                override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
                    output.delete()
                    finish(null)
                }
            })
            .build()

        cont.invokeOnCancellation {
            Handler(transformer.applicationLooper).post {
                runCatching { transformer.cancel() }
                output.delete()
            }
        }
        runCatching { transformer.start(edited, output.absolutePath) }
            .onFailure { output.delete(); finish(null) }
    } ?: error("video_transcode_failed")
}
