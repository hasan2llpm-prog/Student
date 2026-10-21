package com.student.feature.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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

@Composable
fun CommunityScreen(
    api: SupabaseApi,
    session: StudentSession,
    onOpenProfile: (String) -> Unit,
    onCreatePost: () -> Unit,
    initialPostId: String? = null,
    initialCommentId: String? = null
) {
    val context = LocalContext.current
    val offline = remember { OfflineStore(context) }
    val cfg = LocalNativeRemoteConfig.current
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val pageSize = cfg.int("community.page_size", 20, 5, 50)
    var posts by remember(session.userId) { mutableStateOf(offline.loadPosts()) }
    var loading by remember { mutableStateOf(false) }
    var loadingMore by remember { mutableStateOf(false) }
    var hasMore by remember { mutableStateOf(true) }
    var message by remember { mutableStateOf<String?>(null) }
    var openedComments by remember { mutableStateOf<String?>(null) }

    fun refresh() {
        scope.launch {
            loading = true
            withContext(Dispatchers.IO) { api.feed(session, pageSize, 0) }
                .onSuccess {
                    posts = it
                    hasMore = it.size >= pageSize
                    offline.savePosts(it)
                    message = null
                }
                .onFailure { message = it.message ?: "تعذر تحميل المجتمع. يتم عرض آخر نسخة محفوظة." }
            loading = false
        }
    }
    fun loadMore() {
        if (loading || loadingMore || !hasMore) return
        scope.launch {
            loadingMore = true
            withContext(Dispatchers.IO) { api.feed(session, pageSize, posts.size) }
                .onSuccess { page ->
                    val known = posts.asSequence().map { it.id }.toHashSet()
                    posts = posts + page.filterNot { it.id in known }
                    hasMore = page.size >= pageSize
                    offline.savePosts(posts.take(80))
                }
                .onFailure { message = it.message ?: "تعذر تحميل المزيد." }
            loadingMore = false
        }
    }

    LaunchedEffect(session.userId) { refresh() }
    LaunchedEffect(initialPostId, initialCommentId, posts) {
        val pid = initialPostId ?: return@LaunchedEffect
        if (initialCommentId != null) openedComments = pid
        else posts.indexOfFirst { it.id == pid }.takeIf { it >= 0 }?.let { listState.scrollToItem(it) }
    }

    openedComments?.let { pid ->
        CommunityComments(api, session, pid, initialCommentId, onClose = { openedComments = null })
        return
    }

    Column(Modifier.fillMaxSize().background(Color(0xFFF0F2F5))) {
        Surface(color = Color.White, shadowElevation = 1.dp) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("المجتمع", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black, color = Color(0xFF1C1E21))
                    Text("آخر منشورات الطلاب", color = Color(0xFF65676B), style = MaterialTheme.typography.bodySmall)
                }
                FilledTonalButton(onClick = onCreatePost) {
                    Icon(Icons.Rounded.Add, null); Spacer(Modifier.width(4.dp)); Text("إنشاء منشور")
                }
            }
        }
        Card(
            Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp).clickable(onClick = onCreatePost),
            shape = RoundedCornerShape(10.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Edit, null, tint = Color(0xFF1877F2))
                Spacer(Modifier.width(10.dp))
                Text("بم تفكر؟ شارك شيئًا مع المجتمع", color = Color(0xFF65676B))
            }
        }
        if (loading && posts.isEmpty()) LinearProgressIndicator(Modifier.fillMaxWidth())
        message?.let { Text(it, Modifier.padding(horizontal = 12.dp), color = MaterialTheme.colorScheme.error) }
        LazyColumn(state = listState, contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(posts, key = { it.id }) { post ->
                CommunityPostCard(api, session, post, onOpenProfile, { openedComments = post.id }, ::refresh)
            }
            when {
                loadingMore -> item { Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp) } }
                hasMore && posts.isNotEmpty() -> item { OutlinedButton(onClick = ::loadMore, modifier = Modifier.fillMaxWidth()) { Text("تحميل المزيد") } }
                posts.isEmpty() && !loading -> item { Text("لا توجد منشورات بعد. كن أول من ينشر.", color = StudentMuted, modifier = Modifier.padding(18.dp)) }
            }
        }
    }
}

@Composable
private fun CommunityPostCard(
    api: SupabaseApi,
    session: StudentSession,
    post: PostItem,
    onOpenProfile: (String) -> Unit,
    onComments: () -> Unit,
    onDeleted: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var liked by remember(post.id) { mutableStateOf(false) }
    var likeCount by remember(post.id) { mutableIntStateOf(0) }
    var commentCount by remember(post.id) { mutableIntStateOf(0) }
    var deleteConfirm by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var imageOpen by remember(post.id) { mutableStateOf(false) }
    var shareOpen by remember(post.id) { mutableStateOf(false) }

    fun reloadCounts() {
        scope.launch {
            liked = withContext(Dispatchers.IO) { api.isPostLiked(session, post.id).getOrDefault(false) }
            likeCount = withContext(Dispatchers.IO) { api.postLikeCount(session, post.id).getOrDefault(0) }
            commentCount = withContext(Dispatchers.IO) { api.comments(session, post.id).getOrDefault(emptyList()).size }
        }
    }
    LaunchedEffect(post.id) { reloadCounts() }

    val postMediaUrl = post.mediaUrl
    if (imageOpen && post.postType != "video" && !postMediaUrl.isNullOrBlank()) {
        StudentImageViewer(postMediaUrl, "student-post-${post.id}.jpg") { imageOpen = false }
    }
    if (shareOpen) PostShareSheet(api, session, post) { shareOpen = false }
    if (deleteConfirm) AlertDialog(
        onDismissRequest = { if (!busy) deleteConfirm = false },
        title = { Text("حذف المنشور؟") },
        text = { Text("سيتم حذف المنشور. هل أنت متأكد؟") },
        confirmButton = {
            Button(enabled = !busy, onClick = {
                scope.launch {
                    busy = true
                    withContext(Dispatchers.IO) { api.deletePost(session, post.id) }
                        .onSuccess { deleteConfirm = false; onDeleted() }
                    busy = false
                }
            }) { Text("حذف") }
        },
        dismissButton = { TextButton(onClick = { deleteConfirm = false }) { Text("إلغاء") } }
    )

    Card(
        Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White), border = BorderStroke(1.dp, StudentBorder)
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Row(Modifier.weight(1f).clickable { onOpenProfile(post.userId) }, verticalAlignment = Alignment.CenterVertically) {
                    StudentAvatar(post.authorName, post.authorAvatarUrl, post.authorFrameUrl, 44.dp)
                    Spacer(Modifier.width(8.dp))
                    Column {
                        StudentName(post.authorName, post.authorVerified, post.authorVerificationColor)
                        Text("@${post.authorUsername} • ${prettyTime(post.createdAt)}", color = StudentMuted, style = MaterialTheme.typography.labelSmall)
                    }
                }
                if (post.userId == session.userId) IconButton(onClick = { deleteConfirm = true }) { Icon(Icons.Rounded.DeleteOutline, "حذف") }
            }
            if (post.content.isNotBlank()) Text(post.content, style = MaterialTheme.typography.bodyLarge)
            post.mediaUrl?.takeIf { it.isNotBlank() }?.let { url ->
                if (post.postType.equals("video", true) || post.mediaMime?.startsWith("video/") == true) {
                    CommunityVideoPlayer(post)
                } else {
                    AsyncImage(url, "فتح الصورة", Modifier.fillMaxWidth().heightIn(min = 180.dp, max = 440.dp).clickable { imageOpen = true }, contentScale = ContentScale.Crop)
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                FilledTonalButton(onClick = {
                    scope.launch {
                        val next = !liked
                        withContext(Dispatchers.IO) { api.setPostLiked(session, post.id, next) }
                            .onSuccess { liked = next; likeCount = (likeCount + if (next) 1 else -1).coerceAtLeast(0) }
                    }
                }) {
                    Icon(if (liked) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder, null); Spacer(Modifier.width(4.dp)); Text("$likeCount")
                }
                OutlinedButton(onClick = onComments) { Icon(Icons.Rounded.ChatBubbleOutline, null); Spacer(Modifier.width(4.dp)); Text("تعليقات $commentCount") }
                IconButton(onClick = { shareOpen = true }) { Icon(Icons.Rounded.Share, "مشاركة") }
            }
        }
    }
}

@Composable internal fun CommunityComments(api:SupabaseApi,session:StudentSession,postId:String,focusCommentId:String?,onClose:()->Unit){
    val scope=rememberCoroutineScope();val state=rememberLazyListState();var comments by remember{mutableStateOf<List<CommentItem>>(emptyList())};var text by remember{mutableStateOf("")};var replyTo by remember{mutableStateOf<CommentItem?>(null)};var editing by remember{mutableStateOf<CommentItem?>(null)};var deleting by remember{mutableStateOf<CommentItem?>(null)};var busy by remember{mutableStateOf(false)}
    fun refresh(){scope.launch{withContext(Dispatchers.IO){api.comments(session,postId)}.onSuccess{comments=it}}}
    LaunchedEffect(postId){refresh()}
    LaunchedEffect(focusCommentId,comments){val id=focusCommentId?:return@LaunchedEffect;val flat=comments.filter{it.parentId==null}.flatMap{c->listOf(c)+comments.filter{it.parentId==c.id}};val idx=flat.indexOfFirst{it.id==id};if(idx>=0)state.scrollToItem(idx)}
    deleting?.let{c->AlertDialog(onDismissRequest={deleting=null},title={Text("حذف التعليق؟")},text={Text("سيتم حذف التعليق من المنشور.")},confirmButton={Button(onClick={scope.launch{busy=true;withContext(Dispatchers.IO){api.deleteComment(session,c.id)}.onSuccess{deleting=null;refresh()};busy=false}}){Text("حذف")}},dismissButton={TextButton(onClick={deleting=null}){Text("إلغاء")}})}
    Column(Modifier.fillMaxSize().imePadding()){
        Row(Modifier.fillMaxWidth().padding(10.dp),verticalAlignment=Alignment.CenterVertically){IconButton(onClick=onClose){Icon(Icons.Rounded.ArrowBack,"رجوع")};Text("التعليقات والردود",fontWeight=FontWeight.Black,style=MaterialTheme.typography.titleLarge)};HorizontalDivider()
        LazyColumn(state=state,modifier=Modifier.weight(1f),contentPadding=PaddingValues(12.dp),verticalArrangement=Arrangement.spacedBy(6.dp)){
            items(comments.filter{it.parentId==null},key={it.id}){c->CommentLine(api,session,c,{replyTo=c;editing=null},{editing=c;replyTo=null;text=c.content},{deleting=c});comments.filter{it.parentId==c.id}.forEach{r->Box(Modifier.padding(start=28.dp)){CommentLine(api,session,r,{replyTo=c;editing=null},{editing=r;replyTo=null;text=r.content},{deleting=r})}}}
        }
        (editing?:replyTo)?.let{a->Surface(color=StudentSoft,modifier=Modifier.fillMaxWidth()){Row(Modifier.padding(horizontal=12.dp,vertical=5.dp),verticalAlignment=Alignment.CenterVertically){Text(if(editing!=null)"تعديل تعليقك" else "رد على ${a.authorName}",Modifier.weight(1f),color=StudentBlue);IconButton(onClick={editing=null;replyTo=null;text=""}){Icon(Icons.Rounded.Close,null)}}}}
        Row(Modifier.fillMaxWidth().padding(10.dp),verticalAlignment=Alignment.CenterVertically){OutlinedTextField(text,{text=it.take(1500)},Modifier.weight(1f),placeholder={Text(if(editing!=null)"عدّل تعليقك..." else if(replyTo==null)"اكتب تعليقاً..." else "اكتب ردك...")},maxLines=4);Spacer(Modifier.width(6.dp));IconButton(enabled=!busy&&text.isNotBlank(),onClick={scope.launch{busy=true;val r=withContext(Dispatchers.IO){if(editing!=null)api.editComment(session,editing!!.id,text) else api.addComment(session,postId,text.trim(),replyTo?.id)};r.onSuccess{text="";replyTo=null;editing=null;refresh()};busy=false}}){Icon(if(editing!=null)Icons.Rounded.Check else Icons.Rounded.Send,"إرسال")}}
    }
}

@Composable private fun CommentLine(api:SupabaseApi,session:StudentSession,c:CommentItem,onReply:()->Unit,onEdit:()->Unit,onDelete:()->Unit){
    val scope=rememberCoroutineScope();var reactions by remember(c.id){mutableIntStateOf(0)};var mine by remember(c.id){mutableStateOf<String?>(null)}
    fun refresh(){scope.launch{reactions=withContext(Dispatchers.IO){api.commentReactionCount(session,c.id).getOrDefault(0)};mine=withContext(Dispatchers.IO){api.myCommentReaction(session,c.id).getOrNull()}}}
    LaunchedEffect(c.id){refresh()}
    Column(Modifier.fillMaxWidth().padding(vertical=4.dp)){
        Text(c.authorName,fontWeight=FontWeight.Bold);Text(c.content);Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(0.dp)){Text(prettyTime(c.createdAt)+(if(c.editedAt!=null)" • معدّل" else ""),Modifier.weight(1f),color=StudentMuted,fontSize=10.sp);TextButton(onClick=onReply,contentPadding=PaddingValues(horizontal=5.dp)){Text("رد",fontSize=10.sp)};TextButton(onClick={scope.launch{val next=if(mine=="❤️")null else "❤️";withContext(Dispatchers.IO){api.setCommentReaction(session,c.id,next)}.onSuccess{mine=next;refresh()}}},contentPadding=PaddingValues(horizontal=5.dp)){Text("${if(mine!=null)mine else "♡"} $reactions",fontSize=10.sp)};if(c.userId==session.userId){TextButton(onClick=onEdit,contentPadding=PaddingValues(horizontal=5.dp)){Text("تعديل",fontSize=10.sp)};TextButton(onClick=onDelete,contentPadding=PaddingValues(horizontal=5.dp)){Text("حذف",fontSize=10.sp,color=Color(0xFFC62828))}}}
    }
}
