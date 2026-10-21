package com.student.feature.home

import android.net.Uri
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
    var showComposer by remember { mutableStateOf(false) }
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
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            busy = true
            val mime = context.contentResolver.getType(uri).orEmpty()
            val type = if (mime.startsWith("video/")) "video" else "image"
            runCatching {
                val suffix = if (type == "video") ".mp4" else ".jpg"
                val file = withContext(Dispatchers.IO) { materializeUriToCacheFile(context, uri, suffix, 80L * 1024L * 1024L) }
                val path = "${session.userId}/${UUID.randomUUID()}$suffix"
                val url = withContext(Dispatchers.IO) {
                    api.uploadObjectFile(session, "stories", path, file, mime.ifBlank { if (type == "video") "video/mp4" else "image/jpeg" }).getOrThrow()
                }
                withContext(Dispatchers.IO) { api.createStory(session, url, type, caption).getOrThrow() }
                caption = ""
                showComposer = false
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
        EmptyStories(profile, message, onBack) { showComposer = true }
    } else {
        val initialPage = stories.indexOfFirst { it.id == initialStoryId }.coerceAtLeast(0)
        val pagerState = rememberPagerState(initialPage = initialPage, pageCount = { stories.size })
        LaunchedEffect(pagerState.currentPage, stories.size) {
            stories.getOrNull(pagerState.currentPage)?.let { story ->
                withContext(Dispatchers.IO) { api.markStoryViewed(session, story.id) }
            }
        }
        StoryViewer(
            stories = stories,
            pagerState = pagerState,
            onClose = onBack,
            onCreate = { showComposer = true },
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

    if (showComposer) {
        AlertDialog(
            onDismissRequest = { if (!busy) showComposer = false },
            title = { Text("إضافة إلى قصتك", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = caption,
                        onValueChange = { caption = it.take(1000) },
                        label = { Text("نص اختياري") },
                        minLines = 2,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Text("اختر صورة أو فيديو من جهازك، وسيبقى 24 ساعة.", fontSize = 12.sp, color = Color.Gray)
                }
            },
            confirmButton = {
                Button(enabled = !busy, onClick = { picker.launch("image/*") }) { Icon(Icons.Rounded.Add, null); Spacer(Modifier.width(6.dp)); Text("صورة") }
            },
            dismissButton = {
                TextButton(enabled = !busy, onClick = { picker.launch("video/*") }) { Text("فيديو") }
            }
        )
    }
}

@Composable
private fun StoryViewer(
    stories: List<StoryItem>,
    pagerState: androidx.compose.foundation.pager.PagerState,
    onClose: () -> Unit,
    onCreate: () -> Unit,
    onNext: () -> Unit,
    onPrevious: () -> Unit
) {
    var currentProgress by remember(pagerState.currentPage) { mutableFloatStateOf(0f) }
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
                val current = stories.getOrNull(pagerState.currentPage)
                current?.let {
                    StudentAvatar(it.authorName, it.authorAvatarUrl, it.authorFrameUrl, 38.dp)
                    Spacer(Modifier.width(8.dp))
                    Text(it.authorName, color = Color.White, fontWeight = FontWeight.Bold, maxLines = 1, modifier = Modifier.weight(1f))
                }
                IconButton(onClick = onCreate) { Icon(Icons.Rounded.Add, "إضافة قصة", tint = Color.White) }
                IconButton(onClick = onClose) { Icon(Icons.Rounded.Close, "إغلاق", tint = Color.White) }
                IconButton(onClick = {}) { Icon(Icons.Rounded.MoreVert, "المزيد", tint = Color.White) }
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
