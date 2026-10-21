package com.student.feature.home

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID

@Composable
fun StoriesScreen(api: SupabaseApi, session: StudentSession, profile: StudentProfile?, initialStoryId: String? = null, onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var stories by remember { mutableStateOf<List<StoryItem>>(emptyList()) }
    var selected by remember { mutableStateOf<StoryItem?>(null) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var caption by remember { mutableStateOf("") }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            busy = true
            val mime = context.contentResolver.getType(uri).orEmpty()
            val type = if (mime.startsWith("video/")) "video" else "image"
            runCatching {
                val file = withContext(Dispatchers.IO) { materializeUriToCacheFile(context, uri, if (type == "video") ".mp4" else ".jpg", 80L * 1024L * 1024L) }
                val path = "${session.userId}/${UUID.randomUUID()}${if (type == "video") ".mp4" else ".jpg"}"
                val url = withContext(Dispatchers.IO) { api.uploadObjectFile(session, "stories", path, file, mime.ifBlank { if (type == "video") "video/mp4" else "image/jpeg" }) }.getOrThrow()
                withContext(Dispatchers.IO) { api.createStory(session, url, type, caption).getOrThrow() }
                caption = ""
                stories = withContext(Dispatchers.IO) { api.stories(session).getOrThrow() }
                message = "تم نشر قصتك لمدة 24 ساعة."
            }.onFailure { message = it.message ?: "تعذر نشر القصة." }
            busy = false
        }
    }
    LaunchedEffect(Unit) {
        stories = withContext(Dispatchers.IO) { api.stories(session).getOrDefault(emptyList()) }
        selected = initialStoryId?.let { id -> stories.firstOrNull { it.id == id } }
    }

    Column(Modifier.fillMaxSize().background(Color(0xFF111111))) {
        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Rounded.ArrowBack, "رجوع", tint = Color.White) }
            Text("Stories", color = Color.White, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
            IconButton(onClick = { picker.launch("*/*") }) { Icon(Icons.Rounded.AddCircle, "إضافة قصة", tint = Color.White) }
        }
        OutlinedTextField(value = caption, onValueChange = { caption = it.take(1000) }, label = { Text("نص قصير اختياري") }, modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp), colors = OutlinedTextFieldDefaults.colors(unfocusedTextColor = Color.White, focusedTextColor = Color.White, unfocusedLabelColor = Color.LightGray, focusedLabelColor = Color.White))
        message?.let { Text(it, color = Color(0xFFB9F6CA), modifier = Modifier.padding(14.dp)) }
        if (stories.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("لا توجد قصص نشطة. أضف أول قصة من زر +", color = Color.White) }
        } else {
            LazyRow(contentPadding = PaddingValues(14.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                items(stories, key = { it.id }) { story ->
                    Column(Modifier.width(90.dp).clickable { selected = story }, horizontalAlignment = Alignment.CenterHorizontally) {
                        StudentAvatar(story.authorName, story.authorAvatarUrl, story.authorFrameUrl, 72.dp)
                        Text(story.authorName, color = Color.White, maxLines = 1)
                        if (story.viewed) Text("شوهدت", color = Color.Gray, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
    selected?.let { story ->
        AlertDialog(onDismissRequest = { selected = null }, confirmButton = { TextButton(onClick = { scope.launch { withContext(Dispatchers.IO) { api.markStoryViewed(session, story.id) }; selected = null } }) { Text("إغلاق") } }, title = { Text(story.authorName) }, text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                val mediaUrl = story.mediaUrl
                if (story.mediaType == "image" && mediaUrl != null) AsyncImage(mediaUrl, "Story", Modifier.fillMaxWidth().height(360.dp), contentScale = ContentScale.Crop)
                else if (story.mediaType == "video" && mediaUrl != null) RemoteStoryVideo(mediaUrl, Modifier.fillMaxWidth().height(360.dp))
                else Box(Modifier.fillMaxWidth().height(240.dp).background(Color(android.graphics.Color.parseColor(story.backgroundColor))), contentAlignment = Alignment.Center) { Text(story.caption, color = Color.White) }
                if (story.caption.isNotBlank() && story.mediaType != "text") Text(story.caption, modifier = Modifier.padding(10.dp))
            }
        })
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
