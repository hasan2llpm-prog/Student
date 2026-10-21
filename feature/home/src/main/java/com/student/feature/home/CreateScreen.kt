package com.student.feature.home

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.student.core.data.OfflineStore
import com.student.core.data.StudentSession
import com.student.core.data.SupabaseApi
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

@Composable
fun CreateScreen(api: SupabaseApi, session: StudentSession, onDone: () -> Unit) {
    val context = LocalContext.current
    val cfg = LocalNativeRemoteConfig.current
    val scope = rememberCoroutineScope()
    val offline = remember { OfflineStore(context) }
    val drafts = remember { context.getSharedPreferences("student_drafts", Context.MODE_PRIVATE) }

    var text by remember { mutableStateOf(drafts.getString("community_post_text", drafts.getString("post_text", "")).orEmpty()) }
    var selectedFile by remember {
        mutableStateOf(drafts.getString("community_media_path", null)?.let(::File)?.takeIf { it.exists() && it.length() > 0L })
    }
    var selectedMime by remember { mutableStateOf(drafts.getString("community_media_mime", null)) }
    var busy by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    var confirmPublish by remember { mutableStateOf(false) }
    var confirmRemoveMedia by remember { mutableStateOf(false) }

    fun persistDraftMedia(file: File?, mime: String?) {
        drafts.edit().apply {
            if (file == null) remove("community_media_path") else putString("community_media_path", file.absolutePath)
            if (mime == null) remove("community_media_mime") else putString("community_media_mime", mime)
        }.apply()
    }

    fun clearSelectedMedia(deleteFile: Boolean) {
        val old = selectedFile
        selectedFile = null
        selectedMime = null
        persistDraftMedia(null, null)
        if (deleteFile) runCatching { old?.delete() }
    }

    LaunchedEffect(message) {
        if (message != null) {
            kotlinx.coroutines.delay(4200)
            message = null
        }
    }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        runCatching { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
        val mime = resolveSupportedVisualMimeType(context, uri)
        if (mime == null) {
            message = "اختر صورة أو فيديو صالحاً."
            return@rememberLauncherForActivityResult
        }
        scope.launch {
            busy = true
            status = "جارٍ تجهيز الملف..."
            val maxMb = if (mime.startsWith("video/")) {
                cfg.int("community.max_video_source_mb", 120, 10, 300)
            } else {
                cfg.int("community.max_image_source_mb", 30, 2, 80)
            }
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    persistCommunityDraftFile(
                        context,
                        uri,
                        mediaFileSuffixForMime(mime),
                        maxMb.toLong() * 1024L * 1024L
                    )
                }
            }
            result.onSuccess { file ->
                val old = selectedFile
                selectedFile = file
                selectedMime = mime
                persistDraftMedia(file, mime)
                if (old?.absolutePath != file.absolutePath) runCatching { old?.delete() }
                message = "تم تجهيز الوسائط وحفظ المسودة."
            }.onFailure { error ->
                message = if (error.message == "حجم الملف أكبر من الحد المسموح.") {
                    "حجم الملف أكبر من الحد المسموح (${maxMb}MB)."
                } else error.message ?: "تعذر تجهيز الملف."
            }
            status = null
            busy = false
        }
    }

    fun publish() {
        val draftMedia = selectedFile?.takeIf { it.exists() && it.length() > 0L }
        if (text.isBlank() && draftMedia == null) return

        scope.launch {
            busy = true
            message = null
            status = "جارٍ تجهيز المنشور..."
            val result = runCatching {
                val mediaType = when {
                    draftMedia == null -> "text"
                    selectedMime?.startsWith("video/") == true -> "video"
                    else -> "image"
                }
                val profile = communityNetworkProfile(context)
                var uploadFile: File? = null
                var lowVideoFile: File? = null
                var uploadedPath: String? = null
                var lowUploadedPath: String? = null
                val moderationPreviewPaths = mutableListOf<String>()
                var committed = false
                try {
                    if (draftMedia != null) {
                        status = if (mediaType == "video") {
                            if (profile.constrained) "الإنترنت محدود — جارٍ ضغط الفيديو للرفع..." else "جارٍ تحسين الفيديو قبل الرفع..."
                        } else {
                            if (profile.constrained) "الإنترنت محدود — جارٍ ضغط الصورة..." else "جارٍ تحسين الصورة..."
                        }

                        if (mediaType == "image") {
                            uploadFile = withContext(Dispatchers.IO) { optimizeCommunityImage(draftMedia, profile) }
                        } else {
                            uploadFile = transcodeCommunityVideo(context, draftMedia, profile.videoHeight).getOrElse { draftMedia }
                            lowVideoFile = transcodeCommunityVideo(context, draftMedia, 360).getOrNull()
                        }
                    }

                    var mediaUrl: String? = null
                    var lowMediaUrl: String? = null
                    if (uploadFile != null) {
                        status = "جارٍ رفع الوسائط..."
                        val stamp = System.currentTimeMillis()
                        val ext = if (mediaType == "video") "mp4" else "jpg"
                        val mime = if (mediaType == "video") "video/mp4" else "image/jpeg"
                        val path = "${session.userId}/${stamp}_community.$ext"
                        uploadedPath = path
                        mediaUrl = withContext(Dispatchers.IO) {
                            api.uploadObjectFile(session, "community", path, uploadFile!!, mime).getOrThrow()
                        }

                        if (mediaType == "video" && lowVideoFile?.exists() == true && lowVideoFile!!.length() > 0L) {
                            status = "جارٍ رفع نسخة خفيفة للفيديو..."
                            val lowPath = "${session.userId}/${stamp}_community_360p.mp4"
                            lowMediaUrl = withContext(Dispatchers.IO) {
                                api.uploadObjectFile(session, "community", lowPath, lowVideoFile!!, "video/mp4")
                            }.onSuccess { lowUploadedPath = lowPath }.getOrNull()
                        }

                        status = "جارٍ فحص الوسائط..."
                        val previews = if (mediaType == "video") {
                            createVideoModerationPreviews(context, Uri.fromFile(draftMedia!!)).mapIndexedNotNull { index, preview ->
                                val previewPath = "${session.userId}/moderation/${stamp}_${index}.jpg"
                                withContext(Dispatchers.IO) {
                                    api.uploadObject(session, "community", previewPath, preview, "image/jpeg")
                                }.onSuccess { moderationPreviewPaths += previewPath }.getOrNull()
                            }
                        } else emptyList()
                        val moderation = withContext(Dispatchers.IO) {
                            api.moderatePublicMedia(session, mediaUrl!!, mediaType, text.trim(), previews).getOrThrow()
                        }
                        require(moderation == "approved") {
                            if (moderation == "rejected") "تعذر نشر الوسائط لأنها تخالف قواعد المحتوى العام."
                            else "الوسائط قيد المراجعة ولا يمكن نشرها الآن."
                        }
                    }

                    status = "جارٍ نشر المنشور..."
                    withContext(Dispatchers.IO) {
                        api.createPost(
                            session = session,
                            content = text.trim(),
                            mediaUrl = mediaUrl,
                            mediaType = mediaType,
                            mediaLowUrl = lowMediaUrl,
                            mediaMime = when (mediaType) {
                                "video" -> "video/mp4"
                                "image" -> "image/jpeg"
                                else -> null
                            }
                        ).getOrThrow()
                    }
                    committed = true
                } finally {
                    moderationPreviewPaths.forEach { previewPath ->
                        withContext(Dispatchers.IO) { api.deleteObject(session, "community", previewPath) }
                    }
                    if (!committed) {
                        lowUploadedPath?.let { withContext(Dispatchers.IO) { api.deleteObject(session, "community", it) } }
                        uploadedPath?.let { withContext(Dispatchers.IO) { api.deleteObject(session, "community", it) } }
                    }
                    if (uploadFile != null && uploadFile?.absolutePath != draftMedia?.absolutePath) runCatching { uploadFile?.delete() }
                    if (lowVideoFile != null && lowVideoFile?.absolutePath != draftMedia?.absolutePath) runCatching { lowVideoFile?.delete() }
                }
            }

            result.onSuccess {
                drafts.edit().remove("community_post_text").remove("post_text").apply()
                text = ""
                clearSelectedMedia(deleteFile = true)
                status = null
                message = "تم النشر في المجتمع."
                busy = false
                onDone()
            }.onFailure { err ->
                status = null
                if (selectedFile == null && text.isNotBlank()) {
                    offline.enqueue("post_text", JSONObject().put("content", text.trim()))
                    drafts.edit().remove("community_post_text").remove("post_text").apply()
                    text = ""
                    message = "تم حفظ النص وسيتم نشره عند عودة الإنترنت."
                } else {
                    // Keep media + text draft intact so a weak/failed connection never loses the user's work.
                    message = (err.message ?: "تعذر النشر.") + " المسودة محفوظة ويمكنك إعادة المحاولة."
                }
                busy = false
            }
        }
    }

    if (confirmPublish) {
        AlertDialog(
            onDismissRequest = { if (!busy) confirmPublish = false },
            title = { Text("تأكيد النشر في المجتمع") },
            text = { Text("سيتم تحسين الصور والفيديو تلقائياً حسب جودة الإنترنت قبل الرفع.") },
            confirmButton = {
                Button(enabled = !busy, onClick = { confirmPublish = false; publish() }) { Text("تأكيد ونشر") }
            },
            dismissButton = {
                TextButton(enabled = !busy, onClick = { confirmPublish = false }) { Text("رجوع للتحرير") }
            }
        )
    }

    if (confirmRemoveMedia) {
        AlertDialog(
            onDismissRequest = { confirmRemoveMedia = false },
            title = { Text("إزالة الوسائط؟") },
            text = { Text("سيتم حذف الصورة أو الفيديو من المسودة الحالية فقط.") },
            confirmButton = { Button(onClick = { confirmRemoveMedia = false; clearSelectedMedia(true) }) { Text("إزالة") } },
            dismissButton = { TextButton(onClick = { confirmRemoveMedia = false }) { Text("إلغاء") } }
        )
    }

    Column(
        Modifier.fillMaxSize().imePadding().navigationBarsPadding().padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("نشر في المجتمع", style = MaterialTheme.typography.headlineSmall)
        Text("نص، صورة أو فيديو — يتم تقليل حجم الوسائط تلقائياً عند ضعف الإنترنت.", style = MaterialTheme.typography.bodySmall, color = StudentMuted)
        OutlinedTextField(
            value = text,
            onValueChange = { value ->
                text = value.take(12000)
                drafts.edit().putString("community_post_text", text).apply()
            },
            label = { Text("ماذا تريد أن تنشر؟") },
            modifier = Modifier.fillMaxWidth().heightIn(min = 130.dp),
            enabled = !busy
        )
        OutlinedButton(
            onClick = { picker.launch(arrayOf("image/*", "video/*")) },
            enabled = !busy,
            modifier = Modifier.fillMaxWidth()
        ) { Text(if (selectedFile == null) "اختيار صورة أو فيديو" else "تغيير الصورة أو الفيديو") }

        selectedFile?.takeIf { it.exists() }?.let { file ->
            val uri = Uri.fromFile(file)
            when {
                selectedMime?.startsWith("image/") == true -> AsyncImage(
                    model = uri,
                    contentDescription = "معاينة الصورة",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxWidth().height(220.dp)
                )
                selectedMime?.startsWith("video/") == true -> StudentLocalVideoPreview(
                    uri = uri,
                    modifier = Modifier.fillMaxWidth().height(260.dp)
                )
                else -> Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                    Text("تم اختيار الملف.", Modifier.padding(16.dp))
                }
            }
            TextButton(enabled = !busy, onClick = { confirmRemoveMedia = true }) {
                Icon(Icons.Rounded.DeleteOutline, null); Spacer(Modifier.width(5.dp)); Text("إزالة الوسائط")
            }
        }

        status?.let {
            LinearProgressIndicator(Modifier.fillMaxWidth())
            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
        }
        message?.let {
            Text(it, color = if (it.startsWith("تم")) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error)
        }
        Button(
            onClick = { confirmPublish = true },
            enabled = !busy && (text.isNotBlank() || selectedFile != null),
            modifier = Modifier.fillMaxWidth().height(52.dp)
        ) {
            if (busy) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
            else Text("مراجعة وتأكيد")
        }
    }
}
