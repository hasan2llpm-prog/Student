package com.student.feature.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.student.core.data.PostItem
import com.student.core.data.StudentSession
import com.student.core.data.SupabaseApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
internal fun FacebookPostCard(
    api: SupabaseApi,
    session: StudentSession,
    post: PostItem,
    onOpenProfile: () -> Unit,
    onOpenComments: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var liked by remember(post.id) { mutableStateOf(false) }
    var likeCount by remember(post.id) { mutableIntStateOf(0) }
    var commentCount by remember(post.id) { mutableIntStateOf(0) }
    var expanded by remember(post.id) { mutableStateOf(false) }
    var reactionsOpen by remember(post.id) { mutableStateOf(false) }
    var optionsOpen by remember(post.id) { mutableStateOf(false) }
    var shareOpen by remember(post.id) { mutableStateOf(false) }

    LaunchedEffect(post.id) {
        liked = withContext(Dispatchers.IO) { api.isPostLiked(session, post.id).getOrDefault(false) }
        likeCount = withContext(Dispatchers.IO) { api.postLikeCount(session, post.id).getOrDefault(0) }
        commentCount = withContext(Dispatchers.IO) { api.comments(session, post.id).getOrDefault(emptyList()).size }
    }

    fun toggleLike() {
        scope.launch {
            val next = !liked
            withContext(Dispatchers.IO) { api.setPostLiked(session, post.id, next) }
                .onSuccess { liked = next; likeCount = (likeCount + if (next) 1 else -1).coerceAtLeast(0) }
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFE7EAF0))
    ) {
        Column(Modifier.fillMaxWidth()) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                androidx.compose.foundation.layout.Box(Modifier.size(42.dp)) {
                    StudentAvatar(post.authorName, feedAvatarUrl(post.authorName, post.authorAvatarUrl), post.authorFrameUrl, 42.dp)
                }
                Spacer(Modifier.width(9.dp))
                Column(Modifier.weight(1f)) {
                    StudentName(post.authorName, post.authorVerified, post.authorVerificationColor)
                    Text("${prettyTime(post.createdAt)} · عام", color = StudentMuted, fontSize = 11.sp)
                }
                Box {
                    IconButton(onClick = { optionsOpen = true }) { Icon(Icons.Rounded.MoreHoriz, "خيارات المنشور") }
                    DropdownMenu(expanded = optionsOpen, onDismissRequest = { optionsOpen = false }) {
                        DropdownMenuItem(text = { Text("مشاركة") }, leadingIcon = { Icon(Icons.Rounded.Share, null) }, onClick = { optionsOpen = false; shareOpen = true })
                    }
                }
            }

            if (post.content.isNotBlank()) {
                Column(Modifier.padding(horizontal = 14.dp, vertical = 2.dp)) {
                    Text(post.content, maxLines = if (expanded) Int.MAX_VALUE else 3, fontSize = 15.sp, lineHeight = 22.sp)
                    if (post.content.length > 180 && !expanded) {
                        TextButton(onClick = { expanded = true }, contentPadding = PaddingValues(0.dp)) { Text("عرض المزيد", color = StudentBlue, fontWeight = FontWeight.Bold) }
                    }
                }
            }

            PostMediaGrid(post)

            Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                if (likeCount > 0) Text("👍 ❤️  $likeCount", color = StudentMuted, fontSize = 12.sp, modifier = Modifier.weight(1f)) else Spacer(Modifier.weight(1f))
                Text("$commentCount تعليق", color = StudentMuted, fontSize = 12.sp)
            }
            HorizontalDivider(color = Color(0xFFE9ECF1))
            Box(Modifier.fillMaxWidth()) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 2.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                    TextButton(
                        onClick = { toggleLike() },
                        modifier = Modifier.combinedClickable(onClick = { toggleLike() }, onLongClick = { reactionsOpen = true }),
                        contentPadding = PaddingValues(horizontal = 12.dp)
                    ) { Icon(if (liked) Icons.Rounded.ThumbUp else Icons.Rounded.ThumbUpOffAlt, null, tint = if (liked) StudentBlue else StudentMuted); Spacer(Modifier.width(4.dp)); Text("أعجبني", color = if (liked) StudentBlue else StudentMuted) }
                    TextButton(onClick = onOpenComments, contentPadding = PaddingValues(horizontal = 12.dp)) { Icon(Icons.Rounded.ChatBubbleOutline, null, tint = StudentMuted); Spacer(Modifier.width(4.dp)); Text("تعليق", color = StudentMuted) }
                    TextButton(onClick = { shareOpen = true }, contentPadding = PaddingValues(horizontal = 12.dp)) { Icon(Icons.Rounded.Share, null, tint = StudentMuted); Spacer(Modifier.width(4.dp)); Text("مشاركة", color = StudentMuted) }
                }
                if (reactionsOpen) {
                    Surface(shape = RoundedCornerShape(22.dp), color = Color.White, shadowElevation = 5.dp, modifier = Modifier.padding(start = 12.dp, bottom = 42.dp)) {
                        LazyRow(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            items(listOf("👍", "❤️", "😂", "😮", "😢", "😡")) { emoji ->
                                TextButton(onClick = { reactionsOpen = false; if (!liked) toggleLike() }, contentPadding = PaddingValues(horizontal = 5.dp)) { Text(emoji, fontSize = 22.sp) }
                            }
                        }
                    }
                }
            }
        }
    }
    if (shareOpen) PostShareSheet(api, session, post) { shareOpen = false }
}

@Composable
private fun PostMediaGrid(post: PostItem) {
    val urls = post.mediaUrl.orEmpty().split("||").map(String::trim).filter(String::isNotBlank).take(9)
    if (urls.isEmpty()) return
    if (urls.size == 1) {
        if (post.postType.equals("video", true) || post.mediaMime?.startsWith("video/") == true) CommunityVideoPlayer(post, Modifier.fillMaxWidth().heightIn(min = 220.dp, max = 500.dp))
        else AsyncImage(urls.first(), "صورة المنشور", Modifier.fillMaxWidth().heightIn(min = 180.dp, max = 520.dp), contentScale = ContentScale.Crop)
        return
    }
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Row(Modifier.fillMaxWidth().height(210.dp), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            urls.take(2).forEach { url -> AsyncImage(url, "صورة المنشور", Modifier.weight(1f).fillMaxHeight(), contentScale = ContentScale.Crop) }
        }
        if (urls.size > 2) Row(Modifier.fillMaxWidth().height(120.dp), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            urls.drop(2).take(3).forEachIndexed { index, url ->
                Box(Modifier.weight(1f).fillMaxHeight()) {
                    AsyncImage(url, "صورة المنشور", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    if (index == 2 && urls.size > 5) {
                        Surface(color = Color.Black.copy(alpha = .55f), modifier = Modifier.fillMaxSize()) { Box(contentAlignment = Alignment.Center) { Text("+${urls.size - 5}", color = Color.White, fontWeight = FontWeight.Black, fontSize = 22.sp) } }
                    }
                }
            }
        }
    }
}

private fun feedAvatarUrl(name: String, url: String?): String = url ?: "https://ui-avatars.com/api/?name=${java.net.URLEncoder.encode(name.ifBlank { "Student" }, "UTF-8")}&background=0F172A&color=FFFFFF&size=128"
