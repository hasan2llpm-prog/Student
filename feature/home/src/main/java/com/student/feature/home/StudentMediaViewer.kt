package com.student.feature.home

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.Environment
import android.os.ParcelFileDescriptor
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.OpenInNew
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.net.URL

internal fun studentDownload(context: Context, url: String, fileName: String? = null): Boolean = runCatching {
    val safeName = fileName?.takeIf { it.isNotBlank() }
        ?: Uri.parse(url).lastPathSegment?.substringBefore('?')?.takeIf { it.isNotBlank() }
        ?: "student-${System.currentTimeMillis()}"
    val request = DownloadManager.Request(Uri.parse(url))
        .setTitle(safeName)
        .setDescription("Student")
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        .setAllowedOverMetered(true)
        .setAllowedOverRoaming(true)
        .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, safeName)
    (context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
    true
}.getOrDefault(false)

internal fun studentOpenExternal(context: Context, url: String): Boolean = runCatching {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
    true
}.getOrDefault(false)

private fun looksLikeImage(url: String, fileName: String?): Boolean {
    val v = (fileName ?: url).lowercase()
    return listOf(".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp").any { it in v }
}

private fun looksLikePdf(url: String, fileName: String?): Boolean = (fileName ?: url).lowercase().contains(".pdf")

@Composable
fun StudentImageViewer(
    url: String,
    fileName: String? = null,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
            AsyncImage(
                model = url,
                contentDescription = fileName ?: "صورة",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit
            )
            Row(
                modifier = Modifier.align(Alignment.TopEnd).padding(12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilledIconButton(
                    onClick = { studentDownload(context, url, fileName) },
                    colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color.Black.copy(alpha = .55f))
                ) { Icon(Icons.Rounded.Download, "تحميل", tint = Color.White) }
                FilledIconButton(
                    onClick = onDismiss,
                    colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color.Black.copy(alpha = .55f))
                ) { Icon(Icons.Rounded.Close, "إغلاق", tint = Color.White) }
            }
        }
    }
}

@Composable
private fun PdfPage(file: File, index: Int) {
    var bitmap by remember(file.absolutePath, index) { mutableStateOf<Bitmap?>(null) }
    LaunchedEffect(file.absolutePath, index) {
        bitmap = withContext(Dispatchers.IO) {
            runCatching {
                ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
                    PdfRenderer(descriptor).use { renderer ->
                        renderer.openPage(index).use { page ->
                            val targetWidth = 1080.coerceAtMost(page.width.coerceAtLeast(1) * 2)
                            val targetHeight = ((targetWidth.toFloat() / page.width.coerceAtLeast(1)) * page.height).toInt().coerceAtLeast(1)
                            Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888).also { bmp ->
                                bmp.eraseColor(android.graphics.Color.WHITE)
                                page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                            }
                        }
                    }
                }
            }.getOrNull()
        }
    }
    bitmap?.let { bmp ->
        Image(
            bitmap = bmp.asImageBitmap(),
            contentDescription = "صفحة ${index + 1}",
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp)
        )
    } ?: Box(Modifier.fillMaxWidth().height(180.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
}

@Composable
fun StudentPdfViewer(url: String, fileName: String? = null, onDismiss: () -> Unit) {
    val context = LocalContext.current
    var localFile by remember(url) { mutableStateOf<File?>(null) }
    var pageCount by remember(url) { mutableIntStateOf(0) }
    var error by remember(url) { mutableStateOf<String?>(null) }

    LaunchedEffect(url) {
        val result = withContext(Dispatchers.IO) {
            runCatching {
                val f = File(context.cacheDir, "student-pdf-${url.hashCode()}-${System.currentTimeMillis()}.pdf")
                URL(url).openStream().use { input -> FileOutputStream(f).use { output -> input.copyTo(output) } }
                val count = ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
                    PdfRenderer(descriptor).use { it.pageCount }
                }
                f to count
            }
        }
        result.onSuccess { (f, count) -> localFile = f; pageCount = count }
            .onFailure { error = it.message ?: "تعذر فتح PDF." }
    }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.fillMaxSize().background(Color(0xFF202124))) {
            when {
                error != null -> Text(error!!, color = Color.White, modifier = Modifier.align(Alignment.Center).padding(24.dp))
                localFile == null -> CircularProgressIndicator(color = Color.White, modifier = Modifier.align(Alignment.Center))
                else -> LazyColumn(Modifier.fillMaxSize().padding(top = 58.dp, bottom = 12.dp)) {
                    items((0 until pageCount).toList(), key = { it }) { page -> PdfPage(localFile!!, page) }
                }
            }
            Row(Modifier.align(Alignment.TopEnd).padding(10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilledIconButton(
                    onClick = { studentDownload(context, url, fileName ?: "student.pdf") },
                    colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color.Black.copy(alpha = .55f))
                ) { Icon(Icons.Rounded.Download, "تحميل", tint = Color.White) }
                FilledIconButton(
                    onClick = onDismiss,
                    colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color.Black.copy(alpha = .55f))
                ) { Icon(Icons.Rounded.Close, "إغلاق", tint = Color.White) }
            }
        }
    }
}

@Composable
fun StudentFileActions(url: String, fileName: String? = null) {
    val context = LocalContext.current
    var internalViewer by remember(url, fileName) { mutableStateOf<String?>(null) }
    when (internalViewer) {
        "image" -> StudentImageViewer(url, fileName) { internalViewer = null }
        "pdf" -> StudentPdfViewer(url, fileName) { internalViewer = null }
    }
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
        TextButton(onClick = {
            internalViewer = when {
                looksLikeImage(url, fileName) -> "image"
                looksLikePdf(url, fileName) -> "pdf"
                else -> null
            }
            if (internalViewer == null) studentOpenExternal(context, url)
        }) {
            Icon(Icons.Rounded.OpenInNew, null)
            Spacer(Modifier.width(4.dp))
            Text("فتح")
        }
        TextButton(onClick = { studentDownload(context, url, fileName) }) {
            Icon(Icons.Rounded.Download, null)
            Spacer(Modifier.width(4.dp))
            Text("تحميل")
        }
    }
}
