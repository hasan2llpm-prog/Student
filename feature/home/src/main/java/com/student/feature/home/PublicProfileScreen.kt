package com.student.feature.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun PublicProfileScreen(api: SupabaseApi, session: StudentSession, userId: String, onMessage: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    var item by remember(userId) { mutableStateOf<ProfileSearchItem?>(null) }
    var stats by remember(userId) { mutableStateOf(ProfileStats()) }
    var following by remember(userId) { mutableStateOf(false) }
    var busy by remember { mutableStateOf(true) }
    var message by remember { mutableStateOf<String?>(null) }
    var avatarPreview by remember { mutableStateOf<String?>(null) }
    var blockConfirm by remember { mutableStateOf(false) }
    var reportOpen by remember { mutableStateOf(false) }
    var reportReason by remember { mutableStateOf("") }
    var profilePosts by remember(userId) { mutableStateOf<List<PostItem>>(emptyList()) }
    var selectedPost by remember(userId) { mutableStateOf<PostItem?>(null) }
    var privateAccount by remember(userId) { mutableStateOf(false) }
    var mutualAccess by remember(userId) { mutableStateOf(true) }

    LaunchedEffect(userId) {
        busy = true
        val profileResult = withContext(Dispatchers.IO) { api.searchProfiles(session, userId) }
        // Search-by-id is not supported by the public search RPC, so use the dedicated lookup below when available.
        val exact = withContext(Dispatchers.IO) { api.profileById(session, userId) }
        exact.onSuccess { p ->
            item = ProfileSearchItem(p.id, p.fullName, p.username, p.role, p.avatarUrl, p.isVerified, p.verificationColor, p.profileFrameUrl)
            stats = withContext(Dispatchers.IO) { api.profileStats(session, p.id).getOrDefault(ProfileStats()) }
            following = withContext(Dispatchers.IO) { api.isFollowing(session, p.id).getOrDefault(false) }
            privateAccount = p.accountStatus.equals("private", true)
            mutualAccess = !privateAccount || p.id == session.userId || withContext(Dispatchers.IO) { api.isMutualFollow(session, p.id).getOrDefault(false) }
            profilePosts = if (mutualAccess) withContext(Dispatchers.IO) { api.userPosts(session, p.id, 30).getOrDefault(emptyList()) } else emptyList()
        }.onFailure { message = it.message ?: "تعذر تحميل الحساب." }
        busy = false
    }
    LaunchedEffect(message) { if (message != null) { kotlinx.coroutines.delay(2600); message = null } }

    avatarPreview?.let { url ->
        StudentImageViewer(url = url, fileName = "profile-$userId.jpg", onDismiss = { avatarPreview = null })
    }
    selectedPost?.let { post ->
        PostDetailScreen(api, session, post, onBack = { selectedPost = null })
        return
    }

    if (busy && item == null) { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }; return }
    val p = item
    if (p == null) { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(message ?: "الحساب غير متاح") }; return }


    if (blockConfirm) {
        AlertDialog(
            onDismissRequest = { if (!busy) blockConfirm = false },
            title = { Text("حظر هذا الحساب؟") },
            text = { Text("لن يتمكن هذا الحساب من متابعتك أو مراسلتك. يمكنك إلغاء الحظر لاحقاً.") },
            confirmButton = { Button(enabled = !busy, onClick = { scope.launch { busy = true; withContext(Dispatchers.IO) { api.blockUser(session, userId) }.onSuccess { message = "تم حظر الحساب."; blockConfirm = false }.onFailure { message = it.message }; busy = false } }) { Text("تأكيد الحظر") } },
            dismissButton = { TextButton(enabled = !busy, onClick = { blockConfirm = false }) { Text("إلغاء") } }
        )
    }
    if (reportOpen) {
        AlertDialog(
            onDismissRequest = { if (!busy) reportOpen = false },
            title = { Text("الإبلاغ عن الحساب") },
            text = { OutlinedTextField(reportReason, { reportReason = it.take(1000) }, label = { Text("سبب البلاغ") }, modifier = Modifier.fillMaxWidth(), minLines = 3) },
            confirmButton = { Button(enabled = !busy && reportReason.trim().length >= 3, onClick = { scope.launch { busy = true; withContext(Dispatchers.IO) { api.reportUser(session, userId, reportReason) }.onSuccess { message = "تم إرسال البلاغ للإدارة."; reportReason = ""; reportOpen = false }.onFailure { message = it.message }; busy = false } }) { Text("إرسال البلاغ") } },
            dismissButton = { TextButton(enabled = !busy, onClick = { reportOpen = false }) { Text("إلغاء") } }
        )
    }

    LazyColumn(
        Modifier.fillMaxSize().background(Color.White),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.clickable(enabled = !p.avatarUrl.isNullOrBlank()) { p.avatarUrl?.let { avatarPreview = it } }) {
                        StudentAvatar(p.fullName, p.avatarUrl, p.profileFrameUrl, 86.dp)
                    }
                    Spacer(Modifier.width(18.dp))
                    Row(Modifier.weight(1f), horizontalArrangement = Arrangement.SpaceEvenly) {
                        ProfileStatPublic(stats.posts, "المنشورات")
                        ProfileStatPublic(stats.followers, "المتابعون")
                        ProfileStatPublic(stats.following, "يتابع")
                    }
                }
                StudentName(p.fullName, p.isVerified, p.verificationColor, style = MaterialTheme.typography.titleLarge)
                Text("@${p.username}", color = StudentMuted, fontSize = 13.sp)
                if (p.id != session.userId) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = {
                                scope.launch {
                                    busy = true
                                    val r = withContext(Dispatchers.IO) { api.setFollowing(session, p.id, !following) }
                                    busy = false
                                    r.onSuccess {
                                        following = !following
                                        scope.launch {
                                            mutualAccess = !privateAccount || withContext(Dispatchers.IO) { api.isMutualFollow(session, p.id).getOrDefault(false) }
                                            profilePosts = if (mutualAccess) withContext(Dispatchers.IO) { api.userPosts(session, p.id, 30).getOrDefault(emptyList()) } else emptyList()
                                        }
                                        message = if (following) "تمت المتابعة." else "تم إلغاء المتابعة."
                                    }.onFailure { message = it.message }
                                }
                            },
                            modifier = Modifier.weight(1f), enabled = !busy,
                            colors = ButtonDefaults.buttonColors(containerColor = StudentBlue)
                        ) { Text(if (following) "إلغاء المتابعة" else "متابعة") }
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    busy = true
                                    val r = withContext(Dispatchers.IO) { api.startDirectChat(session, p.id) }
                                    busy = false
                                    r.onSuccess { onMessage(it) }.onFailure { message = it.message }
                                }
                            }, modifier = Modifier.weight(1f), enabled = !busy
                        ) { Text("مراسلة") }
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TextButton(onClick = { reportOpen = true }, modifier = Modifier.weight(1f)) { Text("إبلاغ") }
                        TextButton(onClick = { blockConfirm = true }, modifier = Modifier.weight(1f), colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFC62828))) { Text("حظر") }
                    }
                }
            }
        }
        item {
            HorizontalDivider(color = StudentBorder)
            Row(Modifier.fillMaxWidth().height(46.dp), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.GridOn, "المنشورات", tint = StudentText)
                Icon(Icons.Rounded.SmartDisplay, "Reels", tint = StudentMuted)
            }
            HorizontalDivider(color = StudentBorder)
        }
        items(profilePosts.chunked(3)) { rowPosts ->
            Row(Modifier.fillMaxWidth().height(132.dp)) {
                repeat(3) { index ->
                    val post = rowPosts.getOrNull(index)
                    Box(
                        Modifier.weight(1f).fillMaxHeight().padding(1.dp).background(Color(0xFFF3F4F6))
                            .then(if (post != null) Modifier.clickable { selectedPost = post } else Modifier),
                        contentAlignment = Alignment.Center
                    ) {
                        when {
                            post == null -> Unit
                            post.postType.equals("video", true) -> {
                                Box(Modifier.fillMaxSize().background(Color(0xFF151515)), contentAlignment = Alignment.Center) {
                                    Icon(Icons.Rounded.PlayCircle, "فيديو", tint = Color.White, modifier = Modifier.size(40.dp))
                                }
                            }
                            !post.mediaUrl.isNullOrBlank() -> AsyncImage(post.mediaUrl, "منشور", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                            post.content.isNotBlank() -> Text(post.content, Modifier.padding(8.dp), maxLines = 5, fontSize = 11.sp)
                            else -> Icon(Icons.Rounded.Article, null, tint = StudentMuted)
                        }
                    }
                }
            }
        }
        if (profilePosts.isEmpty()) item {
            Text(
                if (privateAccount && !mutualAccess) "هذا الحساب خاص. المنشورات تظهر فقط عند وجود متابعة متبادلة." else "لا توجد منشورات لهذا الحساب.",
                color = StudentMuted,
                modifier = Modifier.fillMaxWidth().padding(24.dp)
            )
        }
        message?.let { item { Text(it, color = StudentMuted, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) } }
    }
}
@Composable
private fun ProfileStatPublic(value: Int, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value.toString(), fontWeight = FontWeight.Black, fontSize = 18.sp)
        Text(label, color = StudentMuted, fontSize = 11.sp)
    }
}

