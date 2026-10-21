package com.student.feature.home

import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
internal fun PostDetailScreen(
    api: SupabaseApi,
    session: StudentSession,
    post: PostItem,
    onBack: () -> Unit,
    onOpenProfile: (String) -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var liked by remember(post.id) { mutableStateOf(false) }
    var likeCount by remember(post.id) { mutableIntStateOf(0) }
    var commentCount by remember(post.id) { mutableIntStateOf(0) }
    var showComments by remember(post.id) { mutableStateOf(false) }
    var showLikes by remember(post.id) { mutableStateOf(false) }
    var showShare by remember(post.id) { mutableStateOf(false) }
    var imageOpen by remember(post.id) { mutableStateOf(false) }

    fun refresh() {
        scope.launch {
            liked = withContext(Dispatchers.IO) { api.isPostLiked(session, post.id).getOrDefault(false) }
            likeCount = withContext(Dispatchers.IO) { api.postLikeCount(session, post.id).getOrDefault(0) }
            commentCount = withContext(Dispatchers.IO) { api.comments(session, post.id).getOrDefault(emptyList()).size }
        }
    }
    LaunchedEffect(post.id) { refresh() }

    val postMediaUrl = post.mediaUrl
    if (imageOpen && !post.postType.equals("video", true) && !postMediaUrl.isNullOrBlank()) {
        StudentImageViewer(postMediaUrl, "student-post-${post.id}.jpg") { imageOpen = false }
    }
    if (showComments) {
        CommunityComments(api, session, post.id, null) { showComments = false; refresh() }
        return
    }
    if (showLikes) {
        PostLikesSheet(api, session, post.id, onDismiss = { showLikes = false }, onOpenProfile = onOpenProfile)
    }
    if (showShare) {
        PostShareSheet(api, session, post, onDismiss = { showShare = false })
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(Icons.Rounded.ArrowBack, "رجوع") }
                Text("المنشور", fontWeight = FontWeight.Black, fontSize = 19.sp, modifier = Modifier.weight(1f))
                IconButton(onClick = { showShare = true }) { Icon(Icons.Rounded.Share, "مشاركة") }
            }
            HorizontalDivider()
        }
        item {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 14.dp).clickable { onOpenProfile(post.userId) },
                verticalAlignment = Alignment.CenterVertically
            ) {
                StudentAvatar(post.authorName, post.authorAvatarUrl, post.authorFrameUrl, 45.dp)
                Spacer(Modifier.width(9.dp))
                Column(Modifier.weight(1f)) {
                    StudentName(post.authorName, post.authorVerified, post.authorVerificationColor)
                    Text("@${post.authorUsername} • ${prettyTime(post.createdAt)}", color = StudentMuted, fontSize = 11.sp)
                }
            }
        }
        if (post.content.isNotBlank()) item {
            Text(post.content, Modifier.fillMaxWidth().padding(horizontal = 14.dp), fontSize = 16.sp, lineHeight = 24.sp)
        }
        post.mediaUrl?.takeIf { it.isNotBlank() }?.let { url ->
            item {
                if (post.postType.equals("video", true) || post.mediaMime?.startsWith("video/") == true) {
                    CommunityVideoPlayer(post, Modifier.padding(horizontal = 12.dp))
                } else {
                    AsyncImage(
                        model = url,
                        contentDescription = "صورة المنشور",
                        modifier = Modifier.fillMaxWidth().heightIn(min = 260.dp, max = 680.dp).clickable { imageOpen = true },
                        contentScale = ContentScale.Crop
                    )
                }
            }
        }
        item {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                FilledTonalButton(onClick = {
                    scope.launch {
                        val next = !liked
                        withContext(Dispatchers.IO) { api.setPostLiked(session, post.id, next) }
                            .onSuccess { liked = next; likeCount = (likeCount + if (next) 1 else -1).coerceAtLeast(0) }
                    }
                }) {
                    Icon(if (liked) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder, null)
                    Spacer(Modifier.width(4.dp)); Text("$likeCount")
                }
                OutlinedButton(onClick = { showLikes = true }, enabled = likeCount > 0) { Text("الإعجابات") }
                OutlinedButton(onClick = { showComments = true }) {
                    Icon(Icons.Rounded.ChatBubbleOutline, null); Spacer(Modifier.width(4.dp)); Text("$commentCount")
                }
                IconButton(onClick = { showShare = true }) { Icon(Icons.Rounded.Share, "مشاركة") }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PostLikesSheet(
    api: SupabaseApi,
    session: StudentSession,
    postId: String,
    onDismiss: () -> Unit,
    onOpenProfile: (String) -> Unit
) {
    var users by remember(postId) { mutableStateOf<List<ProfileSearchItem>>(emptyList()) }
    var loading by remember(postId) { mutableStateOf(true) }
    LaunchedEffect(postId) {
        users = withContext(Dispatchers.IO) { api.postLikeUsers(session, postId).getOrDefault(emptyList()) }
        loading = false
    }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().heightIn(min = 220.dp, max = 620.dp).navigationBarsPadding()) {
            Text("الإعجابات", Modifier.padding(horizontal = 16.dp, vertical = 8.dp), fontWeight = FontWeight.Black, fontSize = 20.sp)
            if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
            LazyColumn(Modifier.fillMaxWidth()) {
                items(users, key = { it.id }) { u ->
                    ListItem(
                        modifier = Modifier.clickable { onDismiss(); onOpenProfile(u.id) },
                        headlineContent = { StudentName(u.fullName, u.isVerified, u.verificationColor) },
                        supportingContent = { Text("@${u.username}") },
                        leadingContent = { StudentAvatar(u.fullName, u.avatarUrl, u.profileFrameUrl, 42.dp) }
                    )
                }
                if (!loading && users.isEmpty()) item { Text("لا توجد إعجابات بعد.", Modifier.padding(20.dp), color = StudentMuted) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun PostShareSheet(api: SupabaseApi, session: StudentSession, post: PostItem, onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val link = "student://post/${post.id}"
    var conversations by remember(post.id) { mutableStateOf<List<ConversationItem>>(emptyList()) }
    var message by remember { mutableStateOf<String?>(null) }
    var sending by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(post.id) {
        conversations = withContext(Dispatchers.IO) { api.conversations(session).getOrDefault(emptyList()) }
    }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("مشاركة المنشور", fontWeight = FontWeight.Black, fontSize = 20.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { clipboard.setText(AnnotatedString(link)); message = "تم نسخ رابط المنشور." }) {
                    Icon(Icons.Rounded.ContentCopy, null); Spacer(Modifier.width(5.dp)); Text("نسخ الرابط")
                }
                OutlinedButton(onClick = {
                    val text = buildString {
                        if (post.content.isNotBlank()) append(post.content.take(220)).append("\n")
                        append(link)
                    }
                    val intent = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, text) }
                    context.startActivity(Intent.createChooser(intent, "مشاركة المنشور"))
                }) {
                    Icon(Icons.Rounded.Share, null); Spacer(Modifier.width(5.dp)); Text("تطبيق آخر")
                }
            }
            Text("إرسال داخل Student", fontWeight = FontWeight.Bold)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(conversations.take(30), key = { it.id }) { conv ->
                    AssistChip(
                        onClick = {
                            if (sending != null) return@AssistChip
                            sending = conv.id
                            scope.launch {
                                val body = buildString {
                                    if (post.content.isNotBlank()) append(post.content.take(180)).append("\n")
                                    append(link)
                                }
                                val r = withContext(Dispatchers.IO) { api.sendMessage(session, conv.id, body) }
                                sending = null
                                r.onSuccess { message = "تم إرسال المنشور إلى ${conv.title}." }
                                    .onFailure { message = it.message ?: "تعذر إرسال المنشور." }
                            }
                        },
                        label = { Text(if (sending == conv.id) "جارٍ الإرسال..." else conv.title, maxLines = 1) },
                        leadingIcon = { StudentAvatar(conv.title, conv.avatarUrl, conv.profileFrameUrl, 28.dp) }
                    )
                }
            }
            message?.let { Text(it, color = if (it.startsWith("تم")) Color(0xFF16834A) else MaterialTheme.colorScheme.error) }
            Spacer(Modifier.height(6.dp))
        }
    }
}
