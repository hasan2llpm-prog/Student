@file:OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)

package com.student.feature.home

import android.net.Uri
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

@Composable
fun StoriesScreen(
    api: SupabaseApi,
    session: StudentSession,
    profile: StudentProfile?,
    initialStoryId: String? = null,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var stories by remember { mutableStateOf<List<StoryItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var message by remember { mutableStateOf<String?>(null) }
    var editorUri by remember { mutableStateOf<Uri?>(null) }
    var editorType by remember { mutableStateOf("image") }
    var caption by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }

    fun reload() {
        scope.launch {
            loading = true
            stories = withContext(Dispatchers.IO) { api.stories(session).getOrDefault(emptyList()) }
            loading = false
        }
    }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri ?: return@rememberLauncherForActivityResult
        val mime = context.contentResolver.getType(uri).orEmpty()
        editorType = if (mime.startsWith("video/")) "video" else "image"
        editorUri = uri
    }

    fun publishStory(uri: Uri, type: String, draft: StoryEditDraft) {
        scope.launch {
            busy = true
            val mime = context.contentResolver.getType(uri).orEmpty()
            runCatching {
                val suffix = if (type == "video") ".mp4" else ".jpg"
                val file = withContext(Dispatchers.IO) {
                    if (type == "image") materializeEditedStoryFile(context, uri, draft)
                    else materializeUriToCacheFile(context, uri, suffix, 80L * 1024L * 1024L)
                }
                val path = "${session.userId}/${UUID.randomUUID()}$suffix"
                val url = withContext(Dispatchers.IO) {
                    api.uploadObjectFile(session, "stories", path, file, mime.ifBlank { if (type == "video") "video/mp4" else "image/jpeg" }).getOrThrow()
                }
                withContext(Dispatchers.IO) { api.createStory(session, url, type, draft.caption).getOrThrow() }
                caption = ""
                editorUri = null
                message = "تم نشر قصتك"
                reload()
            }.onFailure { message = it.message ?: "تعذر نشر القصة" }
            busy = false
        }
    }

    LaunchedEffect(session.userId) { reload() }

    if (loading) {
        Box(Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Color.White)
        }
        return
    }

    if (stories.isEmpty()) {
        EmptyStories(profile, message, onBack) { picker.launch("*/*") }
    } else {
        val initialPage = stories.indexOfFirst { it.id == initialStoryId }.coerceAtLeast(0)
        val pagerState = rememberPagerState(initialPage = initialPage, pageCount = { stories.size })
        LaunchedEffect(pagerState.currentPage, stories.size) {
            stories.getOrNull(pagerState.currentPage)?.let { story ->
                withContext(Dispatchers.IO) { api.markStoryViewed(session, story.id) }
            }
        }
        StoryViewer(
            api = api,
            session = session,
            stories = stories,
            pagerState = pagerState,
            onClose = onBack,
            onCreate = { picker.launch("*/*") },
            onNext = {
                scope.launch {
                    if (pagerState.currentPage < stories.lastIndex) pagerState.animateScrollToPage(pagerState.currentPage + 1) else onBack()
                }
            },
            onPrevious = {
                scope.launch { if (pagerState.currentPage > 0) pagerState.animateScrollToPage(pagerState.currentPage - 1) }
            }
        )
    }

    editorUri?.let { uri ->
        StoryComposerScreen(
            uri = uri,
            mediaType = editorType,
            busy = busy,
            onClose = { if (!busy) editorUri = null },
            onPickAnother = { if (!busy) picker.launch("*/*") },
            onPublish = { draft -> publishStory(uri, editorType, draft) }
        )
    }
}

private fun materializeEditedStoryFile(context: android.content.Context, uri: Uri, draft: StoryEditDraft): File {
    val source = context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) }
        ?: error("تعذر قراءة الصورة.")
    val output = Bitmap.createBitmap(source.width, source.height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(output)
    val matrix = Matrix().apply {
        postTranslate(-source.width / 2f, -source.height / 2f)
        postScale(draft.scale, draft.scale)
        postRotate(draft.rotation)
        postTranslate(source.width / 2f, source.height / 2f)
    }
    canvas.drawBitmap(source, matrix, Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))
    if (draft.caption.isNotBlank()) {
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.WHITE
            textSize = (source.width * .065f).coerceIn(28f, 92f)
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            setShadowLayer(8f, 2f, 2f, android.graphics.Color.BLACK)
            textAlign = Paint.Align.CENTER
        }
        val maxWidth = source.width * .86f
        val words = draft.caption.split(" ")
        val lines = mutableListOf<String>()
        var line = ""
        words.forEach { word ->
            val candidate = if (line.isBlank()) word else "$line $word"
            if (paint.measureText(candidate) > maxWidth && line.isNotBlank()) { lines += line; line = word } else line = candidate
        }
        if (line.isNotBlank()) lines += line
        val startY = source.height - (lines.size * paint.textSize * 1.2f) - source.height * .08f
        lines.forEachIndexed { index, text -> canvas.drawText(text, source.width / 2f, startY + index * paint.textSize * 1.2f, paint) }
    }
    val file = File(context.cacheDir, "story_edited_${System.currentTimeMillis()}.jpg")
    FileOutputStream(file).use { outputStream -> output.compress(Bitmap.CompressFormat.JPEG, 92, outputStream) }
    source.recycle()
    output.recycle()
    return file
}

@Composable
private fun StoryViewer(
    api: SupabaseApi,
    session: StudentSession,
    stories: List<StoryItem>,
    pagerState: androidx.compose.foundation.pager.PagerState,
    onClose: () -> Unit,
    onCreate: () -> Unit,
    onNext: () -> Unit,
    onPrevious: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var reply by remember { mutableStateOf("") }
    var selectedReaction by remember { mutableStateOf<String?>(null) }
    var interactionMessage by remember { mutableStateOf<String?>(null) }
    var currentProgress by remember(pagerState.currentPage) { mutableFloatStateOf(0f) }
    val current = stories.getOrNull(pagerState.currentPage)
    Box(Modifier.fillMaxSize().background(Color.Black)) {
        HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize(), userScrollEnabled = true) { page ->
            StoryPage(stories[page], onNext, onPrevious, onProgress = { value -> if (page == pagerState.currentPage) currentProgress = value })
        }
        Column(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 10.dp, vertical = 8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                stories.forEachIndexed { index, _ ->
                    val fraction = when {
                        index < pagerState.currentPage -> 1f
                        index > pagerState.currentPage -> 0f
                        else -> currentProgress
                    }
                    LinearProgressIndicator(
                        progress = { fraction },
                        modifier = Modifier.weight(1f).height(3.dp),
                        color = Color.White,
                        trackColor = Color.White.copy(alpha = 0.35f)
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                current?.let {
                    StudentAvatar(it.authorName, it.authorAvatarUrl, it.authorFrameUrl, 38.dp)
                    Spacer(Modifier.width(8.dp))
                    Text(it.authorName, color = Color.White, fontWeight = FontWeight.Bold, maxLines = 1, modifier = Modifier.weight(1f))
                }
                IconButton(onClick = onCreate) { Icon(Icons.Rounded.Add, "إضافة قصة", tint = Color.White) }
                IconButton(onClick = onClose) { Icon(Icons.Rounded.Close, "إغلاق", tint = Color.White) }
                IconButton(onClick = {}) { Icon(Icons.Rounded.MoreVert, "المزيد", tint = Color.White) }
            }
            current?.let { story ->
                Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    listOf("like" to "👍", "love" to "❤️", "fire" to "🔥", "wow" to "😮").forEach { (key, emoji) ->
                        TextButton(onClick = {
                            val nextReaction = if (selectedReaction == key) null else key
                            selectedReaction = nextReaction
                            scope.launch {
                                val result = withContext(Dispatchers.IO) { api.setStoryReaction(session, story.id, nextReaction) }
                                if (result.isFailure) interactionMessage = "تعذر حفظ التفاعل"
                            }
                        }, contentPadding = PaddingValues(horizontal = 4.dp)) { Text(emoji, fontSize = 22.sp) }
                    }
                    OutlinedTextField(
                        value = reply,
                        onValueChange = { reply = it.take(1000) },
                        placeholder = { Text("أرسل ردًا...") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = OutlinedTextFieldDefaults.colors(unfocusedContainerColor = Color.Black.copy(alpha = .45f), focusedContainerColor = Color.Black.copy(alpha = .55f), unfocusedTextColor = Color.White, focusedTextColor = Color.White, unfocusedPlaceholderColor = Color.White.copy(alpha = .8f), focusedPlaceholderColor = Color.White)
                    )
                    IconButton(enabled = reply.isNotBlank(), onClick = {
                        val body = reply.trim()
                        reply = ""
                        scope.launch {
                            val result = withContext(Dispatchers.IO) { api.replyToStory(session, story.id, body) }
                            if (result.isFailure) { reply = body; interactionMessage = "تعذر إرسال الرد" }
                        }
                    }) { Icon(Icons.Rounded.Send, "إرسال رد", tint = Color.White) }
                }
                interactionMessage?.let { Text(it, color = Color(0xFFFFC7B8), fontSize = 11.sp, modifier = Modifier.padding(top = 3.dp)) }
            }
        }
    }
}

@Composable
private fun StoryPage(story: StoryItem, onNext: () -> Unit, onPrevious: () -> Unit, onProgress: (Float) -> Unit) {
    var progress by remember(story.id) { mutableFloatStateOf(0f) }
    val animatedProgress by animateFloatAsState(progress, label = "story-progress")
    LaunchedEffect(story.id) {
        progress = 0f
        val steps = (story.durationSeconds.coerceIn(3, 15) * 20)
        repeat(steps) {
            kotlinx.coroutines.delay(50)
            progress = ((it + 1).toFloat() / steps).coerceIn(0f, 1f)
            onProgress(progress)
        }
        onNext()
    }
    Box(
        Modifier.fillMaxSize().pointerInput(story.id) {
            detectTapGestures(
                onTap = { position -> if (position.x < size.width * 0.35f) onPrevious() else onNext() }
            )
        }
    ) {
        val mediaUrl = story.mediaUrl
        when {
            story.mediaType == "image" && mediaUrl != null -> AsyncImage(mediaUrl, "Story", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            story.mediaType == "video" && mediaUrl != null -> RemoteStoryVideo(mediaUrl, Modifier.fillMaxSize())
            else -> Box(Modifier.fillMaxSize().background(storyColor(story.backgroundColor)), contentAlignment = Alignment.Center) {
                Text(story.caption, color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(30.dp))
            }
        }
        Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.08f)))
        if (story.caption.isNotBlank() && story.mediaType != "text") {
            Text(story.caption, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Medium, modifier = Modifier.align(Alignment.BottomCenter).padding(horizontal = 24.dp, vertical = 70.dp))
        }
    }
}

private fun storyColor(value: String): Color = runCatching { Color(android.graphics.Color.parseColor(value)) }.getOrDefault(Color(0xFF152238))

@Composable
private fun EmptyStories(profile: StudentProfile?, message: String?, onBack: () -> Unit, onCreate: () -> Unit) {
    Box(Modifier.fillMaxSize().background(Color.Black)) {
        Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
            StudentAvatar(profile?.fullName ?: "أنت", profile?.avatarUrl, profile?.profileFrameUrl, 90.dp)
            Text("لا توجد قصص بعد", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text("كن أول من يشارك قصة اليوم", color = Color.LightGray)
            Button(onClick = onCreate) { Icon(Icons.Rounded.Add, null); Spacer(Modifier.width(6.dp)); Text("إضافة قصة") }
            message?.let { Text(it, color = Color(0xFFB9F6CA)) }
        }
        IconButton(onClick = onBack, modifier = Modifier.align(Alignment.TopEnd).statusBarsPadding().padding(8.dp)) { Icon(Icons.Rounded.Close, "إغلاق", tint = Color.White) }
    }
}

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
@Composable
private fun RemoteStoryVideo(url: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val player = remember(url) { androidx.media3.exoplayer.ExoPlayer.Builder(context).build().apply { setMediaItem(androidx.media3.common.MediaItem.fromUri(url)); prepare(); playWhenReady = true } }
    DisposableEffect(player) { onDispose { player.release() } }
    androidx.compose.ui.viewinterop.AndroidView(factory = { ctx -> androidx.media3.ui.PlayerView(ctx).apply { useController = false; this.player = player } }, modifier = modifier)
}
