@file:OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)

package com.student.feature.home

import android.Manifest
import android.graphics.Bitmap
import android.media.MediaRecorder
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.time.Duration
import java.time.Instant

private val MsgOrange = Color(0xFF0F766E)
private val MsgOrangeSoft = Color(0xFFE1F3F0)
private val MsgBg = Color(0xFFF5F7FA)

private data class PendingAttachmentUi(
    val uri: android.net.Uri? = null,
    val bitmap: Bitmap? = null,
    val name: String,
    val type: String,
    val status: String = "جارٍ الإرسال…"
)

@Composable
fun MessagesScreen(
    api: SupabaseApi,
    session: StudentSession,
    initialConversationId: String? = null,
    onOpenProfile: (String) -> Unit = {},
    onOpenReel: (String) -> Unit = {},
    onConversationStateChanged: (Boolean) -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val uriHandler = LocalUriHandler.current
    val cfg = LocalNativeRemoteConfig.current
    val offline = remember { OfflineStore(context) }
    val listState = rememberLazyListState()

    var profile by remember { mutableStateOf<StudentProfile?>(null) }
    var conversations by remember { mutableStateOf<List<ConversationItem>>(emptyList()) }
    var followers by remember { mutableStateOf<List<MessageContact>>(emptyList()) }
    var deleteConversation by remember { mutableStateOf<ConversationItem?>(null) }
    var current by remember { mutableStateOf<ConversationItem?>(null) }
    var messages by remember { mutableStateOf<List<MessageItem>>(emptyList()) }
    var rooms by remember { mutableStateOf<List<SocialRoomItem>>(emptyList()) }
    var roomSettings by remember { mutableStateOf(SocialRoomSettings()) }
    var currentRoom by remember { mutableStateOf<SocialRoomItem?>(null) }
    var roomMessages by remember { mutableStateOf<List<SocialRoomMessage>>(emptyList()) }
    var tab by remember { mutableIntStateOf(0) }
    var input by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var imagePreview by remember { mutableStateOf<String?>(null) }
    var pendingAttachment by remember { mutableStateOf<PendingAttachmentUi?>(null) }
    var replyingMessage by remember { mutableStateOf<MessageItem?>(null) }
    var replyingRoomMessage by remember { mutableStateOf<SocialRoomMessage?>(null) }
    var editingRoomMessage by remember { mutableStateOf<SocialRoomMessage?>(null) }
    var deleteRoomMessage by remember { mutableStateOf<SocialRoomMessage?>(null) }
    var forwardRoomMessage by remember { mutableStateOf<SocialRoomMessage?>(null) }
    var editingMessage by remember { mutableStateOf<MessageItem?>(null) }
    var deleteMessage by remember { mutableStateOf<MessageItem?>(null) }
    var menuMessageId by remember { mutableStateOf<String?>(null) }
    var stickerOpen by remember { mutableStateOf(false) }
    var createRoomOpen by remember { mutableStateOf(false) }
    var forwardMessage by remember { mutableStateOf<MessageItem?>(null) }
    var recording by remember { mutableStateOf(false) }
    var recorder by remember { mutableStateOf<MediaRecorder?>(null) }
    var recordingFile by remember { mutableStateOf<File?>(null) }
    var addMemberOpen by remember { mutableStateOf(false) }
    var addMemberUsername by remember { mutableStateOf("") }
    var roomManageOpen by remember { mutableStateOf(false) }
    var roomMembers by remember { mutableStateOf<List<SocialRoomMember>>(emptyList()) }

    LaunchedEffect(error) { if (error != null) { delay(3600); error = null } }

    fun loadConversations(quiet: Boolean = false) {
        scope.launch {
            if (!quiet) busy = true
            val hidden = withContext(Dispatchers.IO) { api.hiddenConversationIds(session).getOrDefault(emptySet()) }
            withContext(Dispatchers.IO) { api.conversations(session) }
                .onSuccess { conversations = it.filterNot { row -> row.id in hidden } }
                .onFailure { if (!quiet) error = it.message }
            if (!quiet) busy = false
        }
    }
    fun loadFollowers(quiet: Boolean = false) {
        scope.launch {
            withContext(Dispatchers.IO) { api.messageFollowers(session, 80) }
                .onSuccess { followers = it }
                .onFailure { if (!quiet) error = it.message }
        }
    }
    fun loadRooms(quiet: Boolean = false) {
        scope.launch {
            if (!quiet) busy = true
            val result = withContext(Dispatchers.IO) { api.socialRooms(session) }
            result.onSuccess { rooms = it }.onFailure { if (!quiet) error = it.message }
            roomSettings = withContext(Dispatchers.IO) { api.socialRoomSettings(session).getOrDefault(roomSettings) }
            if (!quiet) busy = false
        }
    }
    fun loadMessages(conv: ConversationItem, quiet: Boolean = false) {
        scope.launch {
            if (!quiet) {
                busy = true
                val cached = offline.loadMessages(conv.id)
                if (cached.isNotEmpty()) messages = cached.sortedBy { it.createdAt }
            }
            withContext(Dispatchers.IO) { api.messages(session, conv.id) }
                .onSuccess { rows ->
                    messages = rows.sortedBy { it.createdAt }
                    offline.saveMessages(conv.id, rows)
                    withContext(Dispatchers.IO) { api.markConversationRead(session, conv.id) }
                }
                .onFailure { if (!quiet && messages.isEmpty()) error = it.message }
            if (!quiet) busy = false
        }
    }
    fun loadRoomMessages(room: SocialRoomItem, quiet: Boolean = false) {
        scope.launch {
            if (!quiet) busy = true
            withContext(Dispatchers.IO) { api.socialRoomMessages(session, room.id) }
                .onSuccess { roomMessages = it }
                .onFailure { if (!quiet) error = it.message }
            if (!quiet) busy = false
        }
    }

    LaunchedEffect(Unit) {
        profile = withContext(Dispatchers.IO) { api.profile(session).getOrNull() }
        loadConversations(); loadFollowers(); loadRooms()
    }
    LaunchedEffect(initialConversationId, conversations) {
        val id = initialConversationId?.takeIf { it.isNotBlank() } ?: return@LaunchedEffect
        conversations.firstOrNull { it.id == id }?.let { conv -> if (current?.id != conv.id) { current = conv; loadMessages(conv) } }
    }
    LaunchedEffect(current?.id, currentRoom?.id) { onConversationStateChanged(current != null || currentRoom != null) }
    DisposableEffect(Unit) { onDispose { onConversationStateChanged(false); runCatching { recorder?.release() } } }
    DisposableEffect(current?.id, session.accessToken) {
        val conv = current
        val obs = if (conv != null) api.observeConversationMessages(session, conv.id) { loadMessages(conv, true) } else null
        onDispose { obs?.close() }
    }
    // Keep a conversation anchored to the newest message when it is opened, but do not
    // fight the user if they intentionally scroll up to read older messages.
    var lastOpenedConversation by remember { mutableStateOf<String?>(null) }
    var lastOpenedRoom by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(current?.id, messages.size) {
        val convId = current?.id ?: return@LaunchedEffect
        if (messages.isEmpty()) return@LaunchedEffect
        val lastVisible = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: -1
        val opening = lastOpenedConversation != convId
        val nearBottom = lastVisible < 0 || lastVisible >= messages.lastIndex - 2
        if (opening || nearBottom) {
            runCatching { listState.scrollToItem(messages.lastIndex) }
            lastOpenedConversation = convId
        }
    }
    LaunchedEffect(currentRoom?.id, roomMessages.size) {
        val roomId = currentRoom?.id ?: return@LaunchedEffect
        if (roomMessages.isEmpty()) return@LaunchedEffect
        val lastVisible = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: -1
        val opening = lastOpenedRoom != roomId
        val nearBottom = lastVisible < 0 || lastVisible >= roomMessages.lastIndex - 2
        if (opening || nearBottom) {
            runCatching { listState.scrollToItem(roomMessages.lastIndex) }
            lastOpenedRoom = roomId
        }
    }

    fun uploadBytes(
        bytes: ByteArray, mime: String, displayName: String, type: String,
        previewUri: android.net.Uri? = null, previewBitmap: Bitmap? = null,
        onDone: () -> Unit = {}
    ) {
        pendingAttachment = PendingAttachmentUi(previewUri, previewBitmap, displayName, type)
        scope.launch {
            busy = true
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    val maxMb = cfg.int("messages.max_upload_mb", 20, 1, 100)
                    if (bytes.size > maxMb * 1024 * 1024) throw IllegalStateException("الحد الأقصى ${maxMb}MB.")
                    val safe = displayName.replace(Regex("[^A-Za-z0-9._-]"), "_").takeLast(100).ifBlank { "attachment" }
                    val path = "${session.userId}/${System.currentTimeMillis()}_$safe"
                    var committed = false
                    try {
                        val url = api.uploadObject(session, "chat-media", path, bytes, mime).getOrThrow()
                        when {
                            current != null -> api.sendMediaMessage(session, current!!.id, url, type, displayName, bytes.size.toLong()).getOrThrow()
                            currentRoom != null -> api.sendSocialRoomMessage(session, currentRoom!!.id, "", type, url, displayName, replyingRoomMessage?.id).getOrThrow()
                            else -> throw IllegalStateException("لا توجد محادثة مفتوحة.")
                        }
                        committed = true
                    } finally {
                        if (!committed) api.deleteObject(session, "chat-media", path)
                    }
                }
            }
            result.onSuccess {
                pendingAttachment = pendingAttachment?.copy(status = "تم الإرسال ✓")
                current?.let { loadMessages(it, true) }
                currentRoom?.let { loadRoomMessages(it, true) }
                replyingRoomMessage = null
                onDone()
                delay(1000)
                pendingAttachment = null
            }.onFailure {
                pendingAttachment = pendingAttachment?.copy(status = "تعذر الإرسال")
                error = it.message
                delay(1800)
                pendingAttachment = null
            }
            busy = false
        }
    }

    fun uploadFile(
        file: File,
        mime: String,
        displayName: String,
        type: String,
        previewUri: android.net.Uri? = null,
        deleteAfter: Boolean = true,
        onDone: () -> Unit = {}
    ) {
        pendingAttachment = PendingAttachmentUi(previewUri, null, displayName, type)
        scope.launch {
            busy = true
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    val maxMb = cfg.int("messages.max_upload_mb", 20, 1, 100)
                    val maxBytes = maxMb.toLong() * 1024L * 1024L
                    require(file.exists() && file.length() > 0L) { "تعذر قراءة الملف." }
                    require(file.length() <= maxBytes) { "الحد الأقصى ${maxMb}MB." }
                    val safe = displayName.replace(Regex("[^A-Za-z0-9._-]"), "_").takeLast(100).ifBlank { "attachment" }
                    val path = "${session.userId}/${System.currentTimeMillis()}_$safe"
                    val size = file.length()
                    var committed = false
                    try {
                        val url = api.uploadObjectFile(session, "chat-media", path, file, mime).getOrThrow()
                        when {
                            current != null -> api.sendMediaMessage(session, current!!.id, url, type, displayName, size).getOrThrow()
                            currentRoom != null -> api.sendSocialRoomMessage(session, currentRoom!!.id, "", type, url, displayName, replyingRoomMessage?.id).getOrThrow()
                            else -> throw IllegalStateException("لا توجد محادثة مفتوحة.")
                        }
                        committed = true
                    } finally {
                        if (!committed) api.deleteObject(session, "chat-media", path)
                    }
                }
            }
            if (deleteAfter) runCatching { file.delete() }
            result.onSuccess {
                pendingAttachment = pendingAttachment?.copy(status = "تم الإرسال ✓")
                current?.let { loadMessages(it, true) }
                currentRoom?.let { loadRoomMessages(it, true) }
                replyingRoomMessage = null
                onDone()
                delay(1000)
                pendingAttachment = null
            }.onFailure {
                pendingAttachment = pendingAttachment?.copy(status = "تعذر الإرسال")
                error = it.message
                delay(1800)
                pendingAttachment = null
            }
            busy = false
        }
    }

    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { picked ->
        if (picked != null && (current != null || currentRoom != null)) {
            scope.launch {
                val mime = context.contentResolver.getType(picked) ?: "application/octet-stream"
                val displayName = runCatching {
                    context.contentResolver.query(picked, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c -> if (c.moveToFirst()) c.getString(0) else null }
                }.getOrNull()?.takeIf { !it.isNullOrBlank() } ?: "attachment"
                val type = when { mime.startsWith("image/") -> "image"; mime.startsWith("video/") -> "video"; mime.startsWith("audio/") -> "audio"; else -> "file" }
                pendingAttachment = PendingAttachmentUi(uri = picked, name = displayName, type = type, status = "جارٍ الإرسال…")
                val maxMb = cfg.int("messages.max_upload_mb", 20, 1, 100)
                val suffix = displayName.substringAfterLast('.', "").takeIf { it.isNotBlank() }
                    ?: MimeTypeMap.getSingleton().getExtensionFromMimeType(mime)
                    ?: "bin"
                val temp = withContext(Dispatchers.IO) {
                    runCatching { materializeUriToCacheFile(context, picked, suffix, maxMb.toLong() * 1024L * 1024L) }
                }.getOrElse {
                    pendingAttachment = pendingAttachment?.copy(status = "تعذر الإرسال")
                    error = if (it.message == "حجم الملف أكبر من الحد المسموح.") "الحد الأقصى ${maxMb}MB." else (it.message ?: "تعذر قراءة الملف.")
                    delay(1800)
                    pendingAttachment = null
                    return@launch
                }
                uploadFile(temp, mime, displayName, type, previewUri = picked)
            }
        }
    }

    val roomAvatarPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { picked ->
        val room = currentRoom
        if (picked != null && room != null) {
            scope.launch {
                busy = true
                val r = withContext(Dispatchers.IO) {
                    runCatching {
                        val mime = context.contentResolver.getType(picked) ?: "image/jpeg"
                        val ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mime) ?: "jpg"
                        val temp = materializeUriToCacheFile(context, picked, ext, 5L * 1024L * 1024L)
                        val path = "rooms/${room.id}/${System.currentTimeMillis()}.$ext"
                        var committed = false
                        try {
                            val url = api.uploadObjectFile(session, "chat-media", path, temp, mime).getOrThrow()
                            api.updateSocialRoom(session,room.id,room.name,room.username.orEmpty(),room.description,url,room.isPublic).getOrThrow()
                            committed = true
                            url
                        } finally {
                            temp.delete()
                            if (!committed) api.deleteObject(session, "chat-media", path)
                        }
                    }
                }
                busy = false
                r.onSuccess { url -> currentRoom = room.copy(avatarUrl=url); loadRooms(true); error="تم تحديث صورة القناة/المجموعة." }.onFailure { error=it.message }
            }
        }
    }

    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicturePreview()) { bitmap: Bitmap? ->
        if (bitmap != null) {
            val out = ByteArrayOutputStream(); bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out)
            uploadBytes(out.toByteArray(), "image/jpeg", "camera_${System.currentTimeMillis()}.jpg", "image", previewBitmap = bitmap)
        }
    }

    fun stopRecordingAndSend() {
        val r = recorder; val f = recordingFile
        runCatching { r?.stop() }; runCatching { r?.release() }
        recorder = null; recording = false
        if (f != null && f.exists() && f.length() > 0) {
            uploadFile(f, "audio/mp4", "voice_${System.currentTimeMillis()}.m4a", "audio", deleteAfter = true)
        }
    }
    fun startRecording() {
        runCatching {
            val f = File(context.cacheDir, "student_voice_${System.currentTimeMillis()}.m4a")
            @Suppress("DEPRECATION")
            val r = MediaRecorder()
            r.setAudioSource(MediaRecorder.AudioSource.MIC)
            r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            r.setAudioEncodingBitRate(128000)
            r.setAudioSamplingRate(44100)
            r.setOutputFile(f.absolutePath)
            r.prepare(); r.start()
            recordingFile = f; recorder = r; recording = true
        }.onFailure { error = "تعذر بدء التسجيل الصوتي: ${it.message.orEmpty()}" }
    }
    val micPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> if (granted) startRecording() else error = "يجب السماح بالمايكروفون لتسجيل رسالة صوتية." }
    fun toggleRecording() {
        if (recording) stopRecordingAndSend()
        else if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_GRANTED) startRecording()
        else micPermission.launch(Manifest.permission.RECORD_AUDIO)
    }

    imagePreview?.let { StudentImageViewer(it, "student-image.jpg", { imagePreview = null }) }

    if (createRoomOpen) {
        CreateRoomDialog(profile, roomSettings, busy, onDismiss = { createRoomOpen = false }, onCreate = { kind,name,desc ->
            scope.launch {
                busy = true
                val r = withContext(Dispatchers.IO) { api.createSocialRoom(session, kind, name, desc, true) }
                busy = false
                r.onSuccess { createRoomOpen = false; loadRooms(); error = "تم إنشاء ${if(kind=="channel") "القناة" else "المجموعة"}." }
                    .onFailure { error = friendlyRoomError(it.message) }
            }
        })
    }

    if (addMemberOpen && currentRoom != null) {
        AlertDialog(
            onDismissRequest = { addMemberOpen=false },
            title = { Text("إضافة عضو") },
            text = { OutlinedTextField(addMemberUsername,{addMemberUsername=it.take(40)},label={Text("اسم المستخدم @username")},modifier=Modifier.fillMaxWidth(),singleLine=true) },
            confirmButton = { Button(onClick={ scope.launch { busy=true; val r=withContext(Dispatchers.IO){api.addSocialRoomMember(session,currentRoom!!.id,addMemberUsername.trim())}; busy=false; r.onSuccess{error="تمت إضافة العضو.";addMemberOpen=false;addMemberUsername=""}.onFailure{error=it.message} } },enabled=addMemberUsername.isNotBlank()&&!busy){Text("إضافة")} },
            dismissButton = { TextButton(onClick={addMemberOpen=false}){Text("إلغاء")} }
        )
    }

    if (roomManageOpen && currentRoom != null) {
        val room = currentRoom!!
        RoomManageDialog(
            room=room, members=roomMembers, busy=busy,
            onDismiss={roomManageOpen=false},
            onRefreshMembers={ scope.launch { withContext(Dispatchers.IO){api.socialRoomMembers(session,room.id)}.onSuccess{roomMembers=it}.onFailure{error=it.message} } },
            onPickAvatar={roomAvatarPicker.launch("image/*")},
            onSave={name,user,desc,isPublic -> scope.launch { busy=true; val r=withContext(Dispatchers.IO){api.updateSocialRoom(session,room.id,name,user,desc,room.avatarUrl,isPublic)}; busy=false; r.onSuccess{currentRoom=room.copy(name=name,username=user.ifBlank{null},description=desc,isPublic=isPublic);loadRooms(true);error="تم حفظ معلومات القناة/المجموعة."}.onFailure{error=it.message} } },
            onSetRole={username,role -> scope.launch { busy=true; val r=withContext(Dispatchers.IO){api.setSocialRoomMemberRole(session,room.id,username,role)};busy=false;r.onSuccess{withContext(Dispatchers.IO){api.socialRoomMembers(session,room.id)}.onSuccess{roomMembers=it};error="تم تحديث صلاحية العضو."}.onFailure{error=it.message} } },
            onRemove={username -> scope.launch { busy=true;val r=withContext(Dispatchers.IO){api.removeSocialRoomMember(session,room.id,username)};busy=false;r.onSuccess{withContext(Dispatchers.IO){api.socialRoomMembers(session,room.id)}.onSuccess{roomMembers=it};error="تم حذف العضو."}.onFailure{error=it.message} } },
            onTransfer={username -> scope.launch { busy=true;val r=withContext(Dispatchers.IO){api.transferSocialRoomOwnership(session,room.id,username)};busy=false;r.onSuccess{roomManageOpen=false;currentRoom=null;loadRooms();error="تم نقل الملكية."}.onFailure{error=it.message} } }
        )
    }

    forwardMessage?.let { msg ->
        AlertDialog(
            onDismissRequest = { forwardMessage = null },
            title = { Text("إعادة توجيه إلى") },
            text = {
                LazyColumn(Modifier.heightIn(max = 360.dp)) {
                    items(conversations, key = { it.id }) { conv ->
                        ListItem(
                            headlineContent = { StudentName(conv.title, conv.isVerified, conv.verificationColor) },
                            supportingContent = { Text("@${conv.otherUserId?.take(8).orEmpty()} • ${roleLabel(conv.otherRole)}") },
                            leadingContent = { StudentAvatar(conv.title, conv.avatarUrl, conv.profileFrameUrl, 42.dp) },
                            modifier = Modifier.clickable {
                                scope.launch {
                                    busy = true
                                    val r = withContext(Dispatchers.IO) { api.forwardMessage(session, conv.id, msg) }
                                    busy = false
                                    r.onSuccess { forwardMessage = null; error = "تمت إعادة توجيه الرسالة." }.onFailure { error = it.message }
                                }
                            }
                        )
                    }
                }
            },
            confirmButton = {},
            dismissButton = { TextButton(onClick = { forwardMessage = null }) { Text("إلغاء") } }
        )
    }

    forwardRoomMessage?.let { target ->
        AlertDialog(
            onDismissRequest = { forwardRoomMessage = null },
            title = { Text("إعادة توجيه") },
            text = { LazyColumn(Modifier.heightIn(max = 420.dp)) {
                if (conversations.isNotEmpty()) item { Text("المحادثات", fontWeight = FontWeight.Black, modifier = Modifier.padding(8.dp)) }
                items(conversations, key={"c-"+it.id}) { conv -> ListItem(headlineContent={Text(conv.title)},leadingContent={StudentAvatar(conv.title,conv.avatarUrl,conv.profileFrameUrl,36.dp)},modifier=Modifier.clickable {
                    scope.launch { busy=true; val r=withContext(Dispatchers.IO){ val mediaUrl = target.mediaUrl; if(mediaUrl != null) api.sendMediaMessage(session,conv.id,mediaUrl,target.messageType,target.fileName,0) else api.sendMessage(session,conv.id,target.body) }; busy=false; r.onSuccess{forwardRoomMessage=null;error="تمت إعادة التوجيه."}.onFailure{error=it.message} }
                }) }
                if (rooms.isNotEmpty()) item { Text("القنوات والمجموعات", fontWeight = FontWeight.Black, modifier = Modifier.padding(8.dp)) }
                items(rooms, key={"r-"+it.id}) { room -> ListItem(headlineContent={Text(room.name)},modifier=Modifier.clickable { scope.launch { busy=true; val r=withContext(Dispatchers.IO){api.forwardSocialRoomMessage(session,room.id,target)}; busy=false; r.onSuccess{forwardRoomMessage=null;error="تمت إعادة التوجيه."; if(currentRoom?.id==room.id)loadRoomMessages(room,true)}.onFailure{error=it.message} } }) }
            } },
            confirmButton = {}, dismissButton = { TextButton(onClick={forwardRoomMessage=null}){Text("إلغاء")} }
        )
    }

    deleteRoomMessage?.let { target ->
        AlertDialog(
            onDismissRequest = { deleteRoomMessage = null },
            title = { Text("حذف الرسالة؟") }, text = { Text("سيتم حذف هذه الرسالة من القناة أو المجموعة.") },
            confirmButton = { Button(onClick = { scope.launch { busy=true; val r=withContext(Dispatchers.IO){api.deleteSocialRoomMessage(session,target.id)}; busy=false; r.onSuccess{deleteRoomMessage=null;currentRoom?.let{loadRoomMessages(it,true)}}.onFailure{error=it.message} } }, colors=ButtonDefaults.buttonColors(containerColor=Color(0xFFC62828))){Text("حذف")} },
            dismissButton = { TextButton(onClick={deleteRoomMessage=null}){Text("إلغاء")} }
        )
    }

    deleteMessage?.let { target ->
        AlertDialog(
            onDismissRequest = { deleteMessage = null },
            title = { Text("حذف الرسالة؟") }, text = { Text("سيتم حذف هذه الرسالة من المحادثة.") },
            confirmButton = { Button(onClick = { scope.launch { busy=true; val r=withContext(Dispatchers.IO){api.deleteMessage(session,target.id)}; busy=false; r.onSuccess{deleteMessage=null;current?.let{loadMessages(it,true)}}.onFailure{error=it.message} } }, colors=ButtonDefaults.buttonColors(containerColor=Color(0xFFC62828))){Text("حذف")} },
            dismissButton = { TextButton(onClick={deleteMessage=null}){Text("إلغاء")} }
        )
    }

    deleteConversation?.let { conv ->
        AlertDialog(
            onDismissRequest = { if (!busy) deleteConversation = null },
            title = { Text("حذف الدردشة؟") },
            text = { Text("ستُحذف هذه المحادثة من قائمتك فقط. لن تُحذف رسائل الطرف الآخر.") },
            confirmButton = {
                Button(
                    enabled = !busy,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC62828)),
                    onClick = {
                        scope.launch {
                            busy = true
                            withContext(Dispatchers.IO) { api.hideConversationForMe(session, conv.id) }
                                .onSuccess { conversations = conversations.filterNot { it.id == conv.id }; deleteConversation = null; error = "تم حذف الدردشة من قائمتك." }
                                .onFailure { error = it.message }
                            busy = false
                        }
                    }
                ) { Text("حذف") }
            },
            dismissButton = { TextButton(enabled = !busy, onClick = { deleteConversation = null }) { Text("إلغاء") } }
        )
    }

    BackHandler(enabled = current != null || currentRoom != null) {
        current = null; currentRoom = null; messages = emptyList(); roomMessages = emptyList(); input = ""; replyingMessage = null; replyingRoomMessage = null; editingRoomMessage = null
        loadConversations(true); loadRooms(true)
    }

    when {
        current != null -> DirectConversationView(
            api = api, conv = current!!, messages = messages, session = session, input = input, onInput = { input = it }, busy = busy, error = error,
            listState = listState, replying = replyingMessage, editing = editingMessage, recording = recording, pendingAttachment = pendingAttachment,
            onBack = { current=null;messages=emptyList();input="";replyingMessage=null }, onProfile = { current!!.otherUserId?.let(onOpenProfile) }, onOpenReel = onOpenReel,
            onOpenImage = { imagePreview = it }, onOpenFile = { runCatching { uriHandler.openUri(it) } },
            onAttach = { filePicker.launch("*/*") }, onCamera = { camera.launch(null) }, onMic = ::toggleRecording,
            onSticker = { stickerOpen = !stickerOpen }, stickerOpen = stickerOpen,
            onStickerPick = { st -> input += st; stickerOpen = false },
            onReply = { replyingMessage = it; editingMessage = null }, onForward = { forwardMessage = it },
            onEdit = { editingMessage = it; replyingMessage = null; input = it.body }, onDelete = { deleteMessage = it },
            onCancelAction = { replyingMessage=null;editingMessage=null;input="" },
            onSend = {
                val body=input.trim(); if(body.isBlank()) return@DirectConversationView
                val reply=replyingMessage; val edit=editingMessage; input="";replyingMessage=null;editingMessage=null
                scope.launch {
                    val r=withContext(Dispatchers.IO){ when { edit!=null -> api.editMessage(session,edit.id,body); reply!=null -> api.sendMessageReply(session,current!!.id,body,reply.id); else -> api.sendMessage(session,current!!.id,body) } }
                    r.onSuccess{loadMessages(current!!,true)}.onFailure{error=it.message}
                }
            }
        )
        currentRoom != null -> RoomConversationView(
            api=api, room=currentRoom!!, messages=roomMessages, session=session, input=input, onInput={input=it}, busy=busy,error=error,listState=listState,
            replying=replyingRoomMessage, editing=editingRoomMessage, recording=recording, pendingAttachment=pendingAttachment,
            onBack={currentRoom=null;roomMessages=emptyList();input="";replyingRoomMessage=null},
            onAddMember={addMemberOpen=true},
            onManage={ roomManageOpen=true; scope.launch { withContext(Dispatchers.IO){api.socialRoomMembers(session,currentRoom!!.id)}.onSuccess{roomMembers=it}.onFailure{error=it.message} } },
            onAttach={filePicker.launch("*/*")}, onCamera={camera.launch(null)},onMic=::toggleRecording,
            onSticker={stickerOpen=!stickerOpen},stickerOpen=stickerOpen,onStickerPick={input+=it;stickerOpen=false},
            onReply={replyingRoomMessage=it;editingRoomMessage=null},onEdit={editingRoomMessage=it;replyingRoomMessage=null;input=it.body},onDelete={deleteRoomMessage=it},onForward={forwardRoomMessage=it},onCancelReply={replyingRoomMessage=null;editingRoomMessage=null;input=""},onOpenImage={imagePreview=it},onOpenFile={runCatching{uriHandler.openUri(it)}},
            onSend={ val body=input.trim(); if(body.isBlank()) return@RoomConversationView; input=""; val reply=replyingRoomMessage; val edit=editingRoomMessage; replyingRoomMessage=null;editingRoomMessage=null; scope.launch{ val r=withContext(Dispatchers.IO){ if(edit!=null) api.editSocialRoomMessage(session,edit.id,body) else api.sendSocialRoomMessage(session,currentRoom!!.id,body,"text",replyTo=reply?.id).map{} };r.onSuccess{loadRoomMessages(currentRoom!!,true)}.onFailure{error=it.message}} }
        )
        else -> MessagesHomeList(
            tab=tab,onTab={tab=it},conversations=conversations,followers=followers,rooms=rooms,busy=busy,error=error,
            onRefresh={loadConversations();loadFollowers();loadRooms()},onCreateRoom={createRoomOpen=true},
            onOpenConversation={current=it;loadMessages(it)},onDeleteConversation={deleteConversation=it},
            onOpenRoom={currentRoom=it;loadRoomMessages(it)},onOpenProfile=onOpenProfile
        )
    }
}

@Composable
private fun MessagesHomeList(
    tab:Int,onTab:(Int)->Unit,conversations:List<ConversationItem>,followers:List<MessageContact>,rooms:List<SocialRoomItem>,busy:Boolean,error:String?,
    onRefresh:()->Unit,onCreateRoom:()->Unit,onOpenConversation:(ConversationItem)->Unit,onDeleteConversation:(ConversationItem)->Unit,onOpenRoom:(SocialRoomItem)->Unit,onOpenProfile:(String)->Unit
) {
    var query by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().background(Color(0xFFF5F7FA))) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("الرسائل", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black, color = StudentText)
                Text("تواصل مع زملائك ومجتمعاتك", color = StudentMuted, fontSize = 12.sp)
            }
            Surface(shape = CircleShape, color = MsgOrangeSoft) {
                Icon(Icons.Rounded.MarkUnreadChatAlt, null, tint = MsgOrange, modifier = Modifier.padding(10.dp).size(22.dp))
            }
        }
        Surface(color=Color.White,shadowElevation=1.dp) {
            Column(Modifier.fillMaxWidth().padding(horizontal=12.dp,vertical=10.dp),verticalArrangement=Arrangement.spacedBy(9.dp)) {
                OutlinedTextField(
                    value=query,
                    onValueChange={query=it.take(80)},
                    leadingIcon={Icon(Icons.Rounded.Search,"بحث")},
                    trailingIcon={IconButton(onClick=onRefresh){Icon(Icons.Rounded.Refresh,"تحديث")}},
                    placeholder={Text(if(tab==0)"بحث في المحادثات" else "بحث في القنوات والمجموعات")},
                    modifier=Modifier.fillMaxWidth(),
                    singleLine=true,
                    shape=RoundedCornerShape(22.dp)
                )
                Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected=tab==0,onClick={onTab(0)},label={Text("المحادثات")},leadingIcon={Icon(Icons.Rounded.Chat,null)},modifier=Modifier.weight(1f))
                    FilterChip(selected=tab==1,onClick={onTab(1)},label={Text("القنوات والمجموعات")},leadingIcon={Icon(Icons.Rounded.Groups,null)},modifier=Modifier.weight(1f))
                }
            }
        }
        error?.let { Text(it,Modifier.padding(12.dp),color=if(it.startsWith("تم"))Color(0xFF16803C) else MaterialTheme.colorScheme.error,fontWeight=FontWeight.Bold,fontSize=12.sp) }
        if(tab==0) {
            Column(Modifier.fillMaxSize()) {
                if (followers.isNotEmpty()) {
                    LazyRow(
                        Modifier.fillMaxWidth().padding(top = 8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(followers, key = { "f_" + it.id }) { user ->
                            Column(Modifier.width(72.dp).clickable { onOpenProfile(user.id) }, horizontalAlignment = Alignment.CenterHorizontally) {
                                Box {
                                    StudentAvatar(user.fullName, user.avatarUrl, user.profileFrameUrl, 52.dp)
                                    if (isUserActive(user.lastActiveAt)) {
                                        Box(Modifier.align(Alignment.BottomEnd).size(14.dp).background(Color(0xFF22C55E), CircleShape).border(2.dp, Color.White, CircleShape))
                                    }
                                }
                                Text(user.fullName, maxLines = 1, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                Text(presenceText(user.lastActiveAt), maxLines = 1, fontSize = 8.sp, color = if (isUserActive(user.lastActiveAt)) Color(0xFF16834A) else StudentMuted)
                            }
                        }
                    }
                    HorizontalDivider(color = StudentBorder, modifier = Modifier.padding(top = 8.dp))
                }
            LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(10.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
                items(conversations.filter { query.isBlank() || it.title.contains(query,true) || it.lastMessage.contains(query,true) },key={it.id}) { conv ->
                    Row(Modifier.fillMaxWidth().combinedClickable(onClick={onOpenConversation(conv)},onLongClick={onDeleteConversation(conv)}).padding(horizontal=8.dp,vertical=10.dp),verticalAlignment=Alignment.CenterVertically) {
                        Box {
                            Box(Modifier.clickable { conv.otherUserId?.let(onOpenProfile) }) { StudentAvatar(conv.title,conv.avatarUrl,conv.profileFrameUrl,54.dp) }
                            if (isUserActive(conv.lastActiveAt)) Box(Modifier.align(Alignment.BottomEnd).size(14.dp).background(Color(0xFF22C55E),CircleShape).border(2.dp,Color.White,CircleShape))
                        }
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment=Alignment.CenterVertically) { StudentName(conv.title,conv.isVerified,conv.verificationColor); Spacer(Modifier.width(6.dp)); RolePill(conv.otherRole) }
                            Text(presenceText(conv.lastActiveAt), maxLines=1, color=if(isUserActive(conv.lastActiveAt)) Color(0xFF16834A) else StudentMuted, fontSize=10.sp)
                            if(conv.lastMessage.isNotBlank()) Text(conv.lastMessage,maxLines=1,color=StudentMuted,fontSize=12.sp)
                        }
                        if(conv.unreadCount>0) Surface(shape=CircleShape,color=MsgOrange){Text(conv.unreadCount.toString(),Modifier.padding(horizontal=8.dp,vertical=4.dp),color=Color.White,fontSize=11.sp,fontWeight=FontWeight.Bold)}
                    }
                }
                if(conversations.isEmpty()&&!busy) item { EmptyMessageState("لا توجد محادثات بعد","ابحث عن شخص وابدأ المراسلة.") }
            }
            }
        } else {
            Column(Modifier.fillMaxSize()) {
                Button(onClick=onCreateRoom,modifier=Modifier.fillMaxWidth().padding(10.dp),colors=ButtonDefaults.buttonColors(containerColor=MsgOrange)) { Icon(Icons.Rounded.Add,null);Spacer(Modifier.width(6.dp));Text("إنشاء مجموعة أو قناة") }
                LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(10.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
                    items(rooms.filter { query.isBlank() || it.name.contains(query,true) || it.description.contains(query,true) || it.username.orEmpty().contains(query,true) },key={it.id}) { room ->
                        Card(Modifier.fillMaxWidth().clickable{onOpenRoom(room)},shape=RoundedCornerShape(18.dp),colors=CardDefaults.cardColors(containerColor=Color.White),border=BorderStroke(1.dp,Color(0xFFF0DED0))) {
                            Row(Modifier.padding(12.dp),verticalAlignment=Alignment.CenterVertically) {
                                if(!room.avatarUrl.isNullOrBlank()) AsyncImage(room.avatarUrl,"صورة",Modifier.size(50.dp).clip(CircleShape),contentScale=ContentScale.Crop) else Surface(Modifier.size(50.dp),shape=CircleShape,color=MsgOrangeSoft){Box(contentAlignment=Alignment.Center){Icon(if(room.kind=="channel")Icons.Rounded.Campaign else Icons.Rounded.Groups,null,tint=MsgOrange)}}
                                Spacer(Modifier.width(10.dp));Column(Modifier.weight(1f)){Text(room.name,fontWeight=FontWeight.Black);Text(listOfNotNull(if(room.kind=="channel")"قناة" else "مجموعة",room.username?.let{"@$it"},room.memberRole).joinToString(" • "),color=StudentMuted,fontSize=11.sp);if(room.description.isNotBlank())Text(room.description,maxLines=1,color=StudentMuted,fontSize=11.sp)}
                                Icon(Icons.Rounded.ChevronRight,null,tint=StudentMuted)
                            }
                        }
                    }
                    if(rooms.isEmpty()&&!busy) item{EmptyMessageState("لا توجد مجموعات أو قنوات","الحساب الموثق يقدر ينشئها بسعر الألماس المحدد من الإدارة.")}
                }
            }
        }
    }
}

@Composable private fun DirectConversationView(
    api:SupabaseApi, conv:ConversationItem,messages:List<MessageItem>,session:StudentSession,input:String,onInput:(String)->Unit,busy:Boolean,error:String?,listState:androidx.compose.foundation.lazy.LazyListState,
    replying:MessageItem?,editing:MessageItem?,recording:Boolean,pendingAttachment:PendingAttachmentUi?,onBack:()->Unit,onProfile:()->Unit,onOpenReel:(String)->Unit,onOpenImage:(String)->Unit,onOpenFile:(String)->Unit,
    onAttach:()->Unit,onCamera:()->Unit,onMic:()->Unit,onSticker:()->Unit,stickerOpen:Boolean,onStickerPick:(String)->Unit,
    onReply:(MessageItem)->Unit,onForward:(MessageItem)->Unit,onEdit:(MessageItem)->Unit,onDelete:(MessageItem)->Unit,onCancelAction:()->Unit,onSend:()->Unit
) {
    val scrollScope = rememberCoroutineScope()
    val cfg = LocalNativeRemoteConfig.current
    val roomBg = cfg.color("messages.room_background_color", MsgBg)
    Column(Modifier.fillMaxSize().background(roomBg).imePadding().navigationBarsPadding()) {
        ConversationHeader(conv,onBack,onProfile)
        error?.let{Text(it,Modifier.padding(horizontal=12.dp,vertical=4.dp),color=MaterialTheme.colorScheme.error,fontSize=11.sp)}
        LazyColumn(state=listState,modifier=Modifier.weight(1f),contentPadding=PaddingValues(10.dp),verticalArrangement=Arrangement.spacedBy(7.dp)) {
            items(messages,key={it.id}) { m ->
                val mine=m.senderId==session.userId
                val replied=messages.firstOrNull{it.id==m.replyTo}
                MessageBubble(api,session,m,mine,replied,onOpenReel,onOpenImage,onOpenFile,onReply,onForward,onEdit,onDelete)
            }
        }
        replying?.let{ActionPreview("رد على رسالة",it.body.ifBlank{it.fileName?:"مرفق"},onCancelAction)}
        editing?.let{ActionPreview("تعديل الرسالة",it.body,onCancelAction)}
        if(stickerOpen) StickerRow(onStickerPick)
        pendingAttachment?.let { PendingAttachmentPreview(it) }
        Composer(input,onInput,onAttach,onCamera,onMic,onSticker,onSend,recording,editing!=null,onFocused={})
    }
}

@Composable private fun RoomConversationView(
    api:SupabaseApi,room:SocialRoomItem,messages:List<SocialRoomMessage>,session:StudentSession,input:String,onInput:(String)->Unit,busy:Boolean,error:String?,listState:androidx.compose.foundation.lazy.LazyListState,
    replying:SocialRoomMessage?,editing:SocialRoomMessage?,recording:Boolean,pendingAttachment:PendingAttachmentUi?,onBack:()->Unit,onAddMember:()->Unit,onManage:()->Unit,onAttach:()->Unit,onCamera:()->Unit,onMic:()->Unit,onSticker:()->Unit,stickerOpen:Boolean,onStickerPick:(String)->Unit,
    onReply:(SocialRoomMessage)->Unit,onEdit:(SocialRoomMessage)->Unit,onDelete:(SocialRoomMessage)->Unit,onForward:(SocialRoomMessage)->Unit,onCancelReply:()->Unit,onOpenImage:(String)->Unit,onOpenFile:(String)->Unit,onSend:()->Unit
) {
    val cfg = LocalNativeRemoteConfig.current
    val roomBg = cfg.color("messages.room_background_color", MsgBg)
    Column(Modifier.fillMaxSize().background(roomBg).imePadding().navigationBarsPadding()) {
        Surface(color=Color.White,shadowElevation=2.dp){Row(Modifier.fillMaxWidth().padding(8.dp),verticalAlignment=Alignment.CenterVertically){IconButton(onClick=onBack){Icon(Icons.Rounded.ArrowBack,"رجوع")};if(!room.avatarUrl.isNullOrBlank())AsyncImage(room.avatarUrl,"صورة",Modifier.size(44.dp).clip(CircleShape),contentScale=ContentScale.Crop) else Surface(Modifier.size(44.dp),shape=CircleShape,color=MsgOrangeSoft){Box(contentAlignment=Alignment.Center){Icon(if(room.kind=="channel")Icons.Rounded.Campaign else Icons.Rounded.Groups,null,tint=MsgOrange)}};Spacer(Modifier.width(8.dp));Column(Modifier.weight(1f)){Text(room.name,fontWeight=FontWeight.Black);Text(listOfNotNull(if(room.kind=="channel")"قناة" else "مجموعة",room.username?.let{"@$it"}).joinToString(" • "),color=StudentMuted,fontSize=11.sp)};if(room.memberRole=="owner"||room.memberRole=="admin")IconButton(onClick=onAddMember){Icon(Icons.Rounded.PersonAdd,"إضافة عضو",tint=MsgOrange)};if(room.memberRole=="owner"||room.memberRole=="admin")IconButton(onClick=onManage){Icon(Icons.Rounded.Settings,"إدارة",tint=MsgOrange)}}}
        error?.let{Text(it,Modifier.padding(10.dp),color=if(it.startsWith("تم"))Color(0xFF16803C) else MaterialTheme.colorScheme.error,fontSize=11.sp)}
        LazyColumn(state=listState,modifier=Modifier.weight(1f),contentPadding=PaddingValues(10.dp),verticalArrangement=Arrangement.spacedBy(5.dp)){
            items(messages,key={it.id}){m->RoomMessageLine(api,session,m,m.senderId==session.userId,onOpenImage,onOpenFile,onReply,onForward,onEdit,onDelete)}
        }
        replying?.let{ActionPreview("رد على ${it.senderName}",it.body.ifBlank{it.fileName?:"مرفق"},onCancelReply)}
        editing?.let{ActionPreview("تعديل الرسالة",it.body,onCancelReply)}
        if(stickerOpen)StickerRow(onStickerPick)
        pendingAttachment?.let { PendingAttachmentPreview(it) }
        val canPost = room.kind != "channel" || room.memberRole == "owner" || room.memberRole == "admin"
        if(canPost) Composer(input,onInput,onAttach,onCamera,onMic,onSticker,onSend,recording,editing!=null,onFocused={}) else Surface(color=Color.White,shadowElevation=4.dp){Text("هذه قناة. النشر متاح للمالك والمشرفين فقط.",Modifier.fillMaxWidth().padding(13.dp),color=StudentMuted,fontSize=11.sp,textAlign=TextAlign.Center)}
    }
}

@Composable private fun RoomMessageLine(
    api:SupabaseApi,session:StudentSession,m:SocialRoomMessage,mine:Boolean,
    onOpenImage:(String)->Unit,onOpenFile:(String)->Unit,onReply:(SocialRoomMessage)->Unit,
    onForward:(SocialRoomMessage)->Unit,onEdit:(SocialRoomMessage)->Unit,onDelete:(SocialRoomMessage)->Unit
){
    val scope=rememberCoroutineScope()
    val cfg = LocalNativeRemoteConfig.current
    val mineBubble = cfg.color("messages.room_bubble_mine_color", Color(0xFF1976D2))
    val otherBubble = cfg.color("messages.room_bubble_other_color", Color(0xFF7E57C2))
    val bodyColor = cfg.color("messages.room_text_color", Color.White)
    val metaColor = cfg.color("messages.room_meta_text_color", Color.White.copy(alpha=.76f))
    val bubbleRadius = cfg.int("messages.room_bubble_radius_dp", 18, 8, 32).dp
    val bubbleMaxWidth = cfg.int("messages.room_bubble_max_width_dp", 330, 220, 380).dp
    var reaction by remember(m.id){mutableStateOf<String?>(null)}
    var reactionCount by remember(m.id){mutableIntStateOf(0)}
    var actionsOpen by remember(m.id){mutableStateOf(false)}
    fun reload(){scope.launch{reaction=withContext(Dispatchers.IO){api.myRoomMessageReaction(session,m.id).getOrNull()};reactionCount=withContext(Dispatchers.IO){api.roomMessageReactionCount(session,m.id).getOrDefault(0)}}}
    LaunchedEffect(m.id){reload()}
    Row(Modifier.fillMaxWidth(),horizontalArrangement=if(mine)Arrangement.Start else Arrangement.End){
        Box {
            Column(Modifier.widthIn(max=bubbleMaxWidth)){
                if(!mine)Row(Modifier.padding(horizontal=6.dp,vertical=2.dp),verticalAlignment=Alignment.CenterVertically){
                    StudentAvatar(m.senderName,m.senderAvatarUrl,m.senderFrameUrl,25.dp)
                    Spacer(Modifier.width(5.dp));StudentName(m.senderName,m.senderVerified,m.senderVerificationColor)
                    Spacer(Modifier.width(5.dp));RolePill(m.senderRole)
                }
                Surface(
                    modifier=Modifier.clickable{actionsOpen=true},
                    shape=RoundedCornerShape(bubbleRadius),
                    color=if(mine)mineBubble else otherBubble,
                    tonalElevation=0.dp,
                    shadowElevation=0.dp
                ){
                    Column(Modifier.padding(horizontal=11.dp,vertical=8.dp)){
                        if(m.body.isNotBlank())Text(m.body,fontSize=cfg.int("messages.room_message_font_sp",15,11,22).sp,color=bodyColor)
                        m.mediaUrl?.let{url->
                            if(m.messageType=="image") AsyncImage(url,"صورة",Modifier.widthIn(max=260.dp).heightIn(min=110.dp,max=300.dp).clip(RoundedCornerShape(12.dp)).clickable{onOpenImage(url)},contentScale=ContentScale.Crop)
                            else TextButton(onClick={onOpenFile(url)},contentPadding=PaddingValues(0.dp)){Icon(Icons.Rounded.AttachFile,null,tint=bodyColor);Text(m.fileName?:"فتح الملف",color=bodyColor)}
                        }
                        Row(verticalAlignment=Alignment.CenterVertically){
                            Text(prettyTime(m.createdAt),fontSize=9.sp,color=metaColor)
                            if(reactionCount>0){Spacer(Modifier.width(5.dp));Text("${reaction?:"♡"} $reactionCount",fontSize=9.sp,color=metaColor)}
                        }
                    }
                }
            }
            DropdownMenu(expanded=actionsOpen,onDismissRequest={actionsOpen=false}){
                DropdownMenuItem(text={Text("رد")},leadingIcon={Icon(Icons.Rounded.Reply,null)},onClick={actionsOpen=false;onReply(m)})
                DropdownMenuItem(text={Text(if(reaction=="❤️")"إزالة التفاعل" else "تفاعل")},leadingIcon={Icon(Icons.Rounded.FavoriteBorder,null)},onClick={
                    actionsOpen=false
                    scope.launch{
                        val next=if(reaction=="❤️")null else "❤️"
                        withContext(Dispatchers.IO){api.setRoomMessageReaction(session,m.id,next)}.onSuccess{reaction=next;reload()}
                    }
                })
                DropdownMenuItem(text={Text("مشاركة")},leadingIcon={Icon(Icons.Rounded.Send,null)},onClick={actionsOpen=false;onForward(m)})
                if(mine&&m.messageType=="text") DropdownMenuItem(text={Text("تعديل")},leadingIcon={Icon(Icons.Rounded.Edit,null)},onClick={actionsOpen=false;onEdit(m)})
                if(mine) DropdownMenuItem(text={Text("حذف",color=Color(0xFFC62828))},leadingIcon={Icon(Icons.Rounded.Delete,null,tint=Color(0xFFC62828))},onClick={actionsOpen=false;onDelete(m)})
            }
        }
    }
}

@Composable private fun ConversationHeader(conv:ConversationItem,onBack:()->Unit,onProfile:()->Unit){
    Surface(color=Color.White,shadowElevation=2.dp){Row(Modifier.fillMaxWidth().padding(horizontal=8.dp,vertical=7.dp),verticalAlignment=Alignment.CenterVertically){IconButton(onClick=onBack){Icon(Icons.Rounded.ArrowBack,"رجوع")};Row(Modifier.weight(1f).clickable{onProfile()},verticalAlignment=Alignment.CenterVertically){StudentAvatar(conv.title,conv.avatarUrl,conv.profileFrameUrl,45.dp);Spacer(Modifier.width(8.dp));Column{Row(verticalAlignment=Alignment.CenterVertically){StudentName(conv.title,conv.isVerified,conv.verificationColor);Spacer(Modifier.width(5.dp));RolePill(conv.otherRole)};Text(presenceText(conv.lastActiveAt),fontSize=10.sp,color=if(isUserActive(conv.lastActiveAt))Color(0xFF16834A) else StudentMuted)}};Icon(Icons.Rounded.MoreVert,null,tint=StudentMuted)}}
}

@Composable private fun MessageBubble(
    api:SupabaseApi,session:StudentSession,m:MessageItem,mine:Boolean,replied:MessageItem?,
    onOpenReel:(String)->Unit,onOpenImage:(String)->Unit,onOpenFile:(String)->Unit,
    onReply:(MessageItem)->Unit,onForward:(MessageItem)->Unit,onEdit:(MessageItem)->Unit,onDelete:(MessageItem)->Unit
){
    val scope=rememberCoroutineScope()
    var reaction by remember(m.id){mutableStateOf<String?>(null)}
    var reactionCount by remember(m.id){mutableIntStateOf(0)}
    var actionsOpen by remember(m.id){mutableStateOf(false)}
    fun reloadReaction(){scope.launch{reaction=withContext(Dispatchers.IO){api.myMessageReaction(session,m.id).getOrNull()};reactionCount=withContext(Dispatchers.IO){api.messageReactionCount(session,m.id).getOrDefault(0)}}}
    LaunchedEffect(m.id){reloadReaction()}

    Row(Modifier.fillMaxWidth(),horizontalArrangement=if(mine)Arrangement.Start else Arrangement.End){
        Box {
            Surface(
                modifier = Modifier.widthIn(max=330.dp).clickable(enabled=m.deletedAt==null){ actionsOpen=true },
                shape = RoundedCornerShape(18.dp),
                color = if (mine) Color(0xFF1976D2) else Color(0xFF7E57C2),
                tonalElevation = 0.dp,
                shadowElevation = 0.dp
            ) {
            Column(Modifier.padding(horizontal=11.dp,vertical=8.dp)){
                replied?.let{Text("↪ ${it.body.ifBlank{it.fileName?:"مرفق"}}",maxLines=2,fontSize=10.sp,color=Color.White.copy(alpha=.72f),modifier=Modifier.padding(bottom=3.dp))}
                if(m.deletedAt!=null) {
                    Text("تم حذف الرسالة",color=Color.White.copy(alpha=.72f),fontSize=13.sp)
                } else {
                    val messageFileName = m.fileName
                    val linkedReelId = when {
                        m.messageType.equals("reel", true) -> messageFileName?.removePrefix("reel:")
                        messageFileName?.startsWith("reel:") == true -> messageFileName.removePrefix("reel:")
                        else -> Regex("student://reel/([^\\s]+)").find(m.body)?.groupValues?.getOrNull(1)
                    }.orEmpty()
                    if(linkedReelId.isNotBlank()){
                        val reelId=linkedReelId
                        Surface(
                            modifier=Modifier.widthIn(max=280.dp).clickable(enabled=reelId.isNotBlank()){onOpenReel(reelId)},
                            shape=RoundedCornerShape(16.dp),
                            color=Color(0xFF111111)
                        ){
                            Column {
                                if(!m.mediaUrl.isNullOrBlank()) AsyncImage(
                                    m.mediaUrl,"Reel",
                                    Modifier.fillMaxWidth().height(180.dp),
                                    contentScale=ContentScale.Crop
                                ) else Box(Modifier.fillMaxWidth().height(130.dp),contentAlignment=Alignment.Center){
                                    Icon(Icons.Rounded.SmartDisplay,null,tint=Color.White,modifier=Modifier.size(44.dp))
                                }
                                Row(Modifier.fillMaxWidth().padding(10.dp),verticalAlignment=Alignment.CenterVertically){
                                    Icon(Icons.Rounded.PlayCircle,null,tint=Color.White)
                                    Spacer(Modifier.width(7.dp))
                                    Column(Modifier.weight(1f)){
                                        Text("Reel من Student",color=Color.White,fontWeight=FontWeight.Bold,fontSize=12.sp)
                                        if(m.body.isNotBlank())Text(m.body,color=Color.White.copy(alpha=.75f),maxLines=1,fontSize=10.sp)
                                    }
                                    Icon(Icons.Rounded.ChevronRight,null,tint=Color.White)
                                }
                            }
                        }
                    } else {
                        if(m.body.isNotBlank())Text(m.body,fontSize=15.sp,color=Color.White)
                        m.mediaUrl?.let{url->
                            if(m.messageType.lowercase()=="image")
                                AsyncImage(url,"صورة",Modifier.widthIn(max=270.dp).heightIn(min=100.dp,max=320.dp).clip(RoundedCornerShape(12.dp)).clickable{onOpenImage(url)},contentScale=ContentScale.Crop)
                            else TextButton(onClick={onOpenFile(url)},contentPadding=PaddingValues(0.dp)){
                                Icon(if(m.messageType=="audio")Icons.Rounded.PlayCircle else Icons.Rounded.AttachFile,null)
                                Spacer(Modifier.width(4.dp));Text(m.fileName?:"فتح المرفق")
                            }
                        }
                    }
                }
                Row(verticalAlignment=Alignment.CenterVertically){
                    Text(prettyTime(m.createdAt)+(if(m.editedAt!=null)" • معدّلة" else ""),fontSize=9.sp,color=Color.White.copy(alpha=.72f))
                    if(reactionCount>0){Spacer(Modifier.width(5.dp));Text("${reaction?:"♡"} $reactionCount",fontSize=9.sp,color=Color.White.copy(alpha=.80f))}
                    if(mine){Spacer(Modifier.width(3.dp));Icon(if(m.readCount>0)Icons.Rounded.DoneAll else Icons.Rounded.Done,null,tint=if(m.readCount>0)Color.White else Color.White.copy(alpha=.65f),modifier=Modifier.size(13.dp))}
                }
            }
            }
            DropdownMenu(expanded=actionsOpen,onDismissRequest={actionsOpen=false}){
                DropdownMenuItem(text={Text("رد")},leadingIcon={Icon(Icons.Rounded.Reply,null)},onClick={actionsOpen=false;onReply(m)})
                DropdownMenuItem(text={Text(if(reaction=="❤️")"إزالة التفاعل" else "تفاعل")},leadingIcon={Icon(Icons.Rounded.FavoriteBorder,null)},onClick={
                    actionsOpen=false
                    scope.launch{
                        val next=if(reaction=="❤️")null else "❤️"
                        withContext(Dispatchers.IO){api.setMessageReaction(session,m.id,next)}.onSuccess{reaction=next;reloadReaction()}
                    }
                })
                DropdownMenuItem(text={Text("مشاركة")},leadingIcon={Icon(Icons.Rounded.Send,null)},onClick={actionsOpen=false;onForward(m)})
                if(mine&&m.messageType=="text") DropdownMenuItem(text={Text("تعديل")},leadingIcon={Icon(Icons.Rounded.Edit,null)},onClick={actionsOpen=false;onEdit(m)})
                if(mine) DropdownMenuItem(text={Text("حذف",color=Color(0xFFC62828))},leadingIcon={Icon(Icons.Rounded.Delete,null,tint=Color(0xFFC62828))},onClick={actionsOpen=false;onDelete(m)})
            }
        }
    }
}

@Composable
private fun PendingAttachmentPreview(item: PendingAttachmentUi) {
    Surface(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 4.dp),
        shape = RoundedCornerShape(18.dp),
        color = Color.White,
        border = BorderStroke(1.dp, StudentBorder.copy(alpha = .65f)),
        shadowElevation = 1.dp
    ) {
        Row(Modifier.fillMaxWidth().padding(9.dp), verticalAlignment = Alignment.CenterVertically) {
            when {
                item.type == "image" && item.bitmap != null -> Image(
                    bitmap = item.bitmap.asImageBitmap(),
                    contentDescription = "الصورة المرسلة",
                    modifier = Modifier.size(64.dp).clip(RoundedCornerShape(13.dp)),
                    contentScale = ContentScale.Crop
                )
                item.type == "image" && item.uri != null -> AsyncImage(
                    model = item.uri,
                    contentDescription = "الصورة المرسلة",
                    modifier = Modifier.size(64.dp).clip(RoundedCornerShape(13.dp)),
                    contentScale = ContentScale.Crop
                )
                else -> Surface(modifier = Modifier.size(54.dp), shape = RoundedCornerShape(14.dp), color = StudentSoft) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Rounded.InsertDriveFile, null, tint = StudentBlue, modifier = Modifier.size(28.dp))
                    }
                }
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(item.name, maxLines = 1, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                Text(
                    item.status,
                    color = if (item.status.startsWith("تم")) Color(0xFF16803C) else if (item.status.startsWith("تعذر")) MaterialTheme.colorScheme.error else StudentMuted,
                    fontSize = 11.sp
                )
            }
            if (item.status.startsWith("جار")) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
            else if (item.status.startsWith("تم")) Icon(Icons.Rounded.DoneAll, null, tint = Color(0xFF16803C))
        }
    }
}

@Composable private fun Composer(input:String,onInput:(String)->Unit,onAttach:()->Unit,onCamera:()->Unit,onMic:()->Unit,onSticker:()->Unit,onSend:()->Unit,recording:Boolean,editing:Boolean,onFocused:()->Unit={}){
    Surface(color=Color.White,shadowElevation=5.dp,modifier=Modifier.navigationBarsPadding()){Column{if(recording)Text("● جارٍ التسجيل... اضغط المايك لإرسال التسجيل",Modifier.fillMaxWidth().background(Color(0xFFFFE6E6)).padding(7.dp),color=Color(0xFFC62828),fontSize=11.sp,fontWeight=FontWeight.Bold);Row(Modifier.fillMaxWidth().padding(horizontal=6.dp,vertical=6.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(3.dp)){IconButton(onClick=onSticker){Icon(Icons.Rounded.EmojiEmotions,"ملصقات",tint=MsgOrange)};IconButton(onClick=onAttach){Icon(Icons.Rounded.AttachFile,"ملف",tint=MsgOrange)};IconButton(onClick=onCamera){Icon(Icons.Rounded.PhotoCamera,"كاميرا",tint=MsgOrange)};OutlinedTextField(input,onInput,placeholder={Text("الرسالة")},modifier=Modifier.weight(1f).onFocusChanged{if(it.isFocused)onFocused()},maxLines=4,shape=RoundedCornerShape(20.dp));IconButton(onClick=onMic){Icon(if(recording)Icons.Rounded.StopCircle else Icons.Rounded.Mic,"صوت",tint=if(recording)Color.Red else MsgOrange)};FilledIconButton(onClick=onSend,enabled=input.isNotBlank(),colors=IconButtonDefaults.filledIconButtonColors(containerColor=MsgOrange)){Icon(if(editing)Icons.Rounded.Check else Icons.Rounded.Send,"إرسال",tint=Color.White)}}}}
}

@Composable private fun StickerRow(onPick:(String)->Unit){val stickers=listOf("😂","❤️","🔥","👍","👏","😍","🥳","💯","🙏","😎","🤝","✨");LazyColumn(Modifier.fillMaxWidth().height(92.dp).background(Color.White)){item{Row(Modifier.fillMaxWidth().padding(8.dp),horizontalArrangement=Arrangement.SpaceAround){stickers.take(6).forEach{Text(it,fontSize=27.sp,modifier=Modifier.clickable{onPick(it)})}}};item{Row(Modifier.fillMaxWidth().padding(8.dp),horizontalArrangement=Arrangement.SpaceAround){stickers.drop(6).forEach{Text(it,fontSize=27.sp,modifier=Modifier.clickable{onPick(it)})}}}}
}

@Composable private fun ActionPreview(title:String,body:String,onCancel:()->Unit){Surface(color=Color(0xFFFFF0E3)){Row(Modifier.fillMaxWidth().padding(horizontal=12.dp,vertical=7.dp),verticalAlignment=Alignment.CenterVertically){Box(Modifier.width(3.dp).height(34.dp).background(MsgOrange));Spacer(Modifier.width(7.dp));Column(Modifier.weight(1f)){Text(title,color=MsgOrange,fontWeight=FontWeight.Bold,fontSize=11.sp);Text(body,maxLines=1,fontSize=11.sp,color=StudentMuted)};IconButton(onClick=onCancel){Icon(Icons.Rounded.Close,"إلغاء")}}}}

@Composable private fun RolePill(role:String){val teacher=role.equals("teacher",true);Surface(shape=RoundedCornerShape(999.dp),color=if(teacher)Color(0xFFFFEAEA) else Color(0xFFEAF4FF)){Text(if(teacher)"مدرس" else "طالب",Modifier.padding(horizontal=6.dp,vertical=2.dp),fontSize=8.sp,fontWeight=FontWeight.Bold,color=if(teacher)Color(0xFFB32424) else StudentBlue)}}

private fun isUserActive(lastActiveAt: String?): Boolean {
    val instant = runCatching { lastActiveAt?.let(Instant::parse) }.getOrNull() ?: return false
    return Duration.between(instant, Instant.now()).seconds in 0..120
}

private fun presenceText(lastActiveAt: String?): String {
    val instant = runCatching { lastActiveAt?.let(Instant::parse) }.getOrNull() ?: return "منذ زمن طويل"
    val seconds = Duration.between(instant, Instant.now()).seconds.coerceAtLeast(0)
    return when {
        seconds <= 120 -> "نشط الآن"
        seconds < 3600 -> "آخر ظهور منذ ${seconds / 60} د"
        seconds < 86400 -> "آخر ظهور منذ ${seconds / 3600} س"
        seconds < 172800 -> "آخر ظهور أمس"
        seconds < 30L * 86400L -> "آخر ظهور منذ ${seconds / 86400} يوم"
        else -> "منذ زمن طويل"
    }
}

@Composable private fun EmptyMessageState(title:String,sub:String){Box(Modifier.fillMaxWidth().padding(vertical=70.dp),contentAlignment=Alignment.Center){Column(horizontalAlignment=Alignment.CenterHorizontally){Icon(Icons.Rounded.ChatBubbleOutline,null,tint=MsgOrange,modifier=Modifier.size(38.dp));Spacer(Modifier.height(7.dp));Text(title,fontWeight=FontWeight.Bold);Text(sub,color=StudentMuted,fontSize=11.sp)}}}

@Composable private fun CreateRoomDialog(profile:StudentProfile?,settings:SocialRoomSettings,busy:Boolean,onDismiss:()->Unit,onCreate:(String,String,String)->Unit){var kind by remember{mutableStateOf("group")};var name by remember{mutableStateOf("")};var desc by remember{mutableStateOf("")};AlertDialog(onDismissRequest=onDismiss,title={Text("إنشاء مجموعة أو قناة")},text={Column(verticalArrangement=Arrangement.spacedBy(9.dp)){if(profile?.isVerified!=true&&profile?.role!="admin")Surface(color=Color(0xFFFFF0E3),shape=RoundedCornerShape(10.dp)){Text("إنشاء المجموعات والقنوات من مزايا الحساب الموثق.",Modifier.padding(9.dp),color=MsgOrange,fontWeight=FontWeight.Bold)};Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){FilterChip(kind=="group",{kind="group"},{Text("مجموعة • ${settings.groupPriceDiamonds} 💎")});FilterChip(kind=="channel",{kind="channel"},{Text("قناة • ${settings.channelPriceDiamonds} 💎")})};OutlinedTextField(name,{name=it.take(100)},label={Text("الاسم")},modifier=Modifier.fillMaxWidth());OutlinedTextField(desc,{desc=it.take(1000)},label={Text("الوصف")},modifier=Modifier.fillMaxWidth(),minLines=2);Text("السعر يحدده الأدمن من لوحة التحكم، ويُخصم من رصيد الألماس عند الإنشاء.",color=StudentMuted,fontSize=11.sp)}},confirmButton={Button(onClick={onCreate(kind,name.trim(),desc.trim())},enabled=!busy&&name.isNotBlank()&&(profile?.isVerified==true||profile?.role=="admin"),colors=ButtonDefaults.buttonColors(containerColor=MsgOrange)){Text("إنشاء")}},dismissButton={TextButton(onClick=onDismiss){Text("إلغاء")}})}
@Composable private fun RoomManageDialog(
    room:SocialRoomItem,members:List<SocialRoomMember>,busy:Boolean,onDismiss:()->Unit,onRefreshMembers:()->Unit,onPickAvatar:()->Unit,
    onSave:(String,String,String,Boolean)->Unit,onSetRole:(String,String)->Unit,onRemove:(String)->Unit,onTransfer:(String)->Unit
){
    var name by remember(room.id){mutableStateOf(room.name)}
    var username by remember(room.id){mutableStateOf(room.username.orEmpty())}
    var desc by remember(room.id){mutableStateOf(room.description)}
    var isPublic by remember(room.id){mutableStateOf(room.isPublic)}
    var target by remember{mutableStateOf("")}
    var confirmAction by remember(room.id) { mutableStateOf<String?>(null) }
    var confirmTarget by remember(room.id) { mutableStateOf("") }

    confirmAction?.let { action ->
        val title = when (action) {
            "promote" -> "تعيين مشرف؟"
            "demote" -> "تغيير الصلاحية؟"
            "remove" -> "إزالة العضو؟"
            else -> "نقل الملكية؟"
        }
        val body = when (action) {
            "promote" -> "سيحصل @$confirmTarget على صلاحيات إدارة القناة أو المجموعة."
            "demote" -> "سيتم إرجاع @$confirmTarget إلى عضو عادي."
            "remove" -> "سيتم إخراج @$confirmTarget من القناة أو المجموعة. هل أنت متأكد؟"
            else -> "سيصبح @$confirmTarget مالك القناة أو المجموعة بدلًا منك. هذا إجراء حساس."
        }
        val confirmLabel = when (action) { "remove" -> "إزالة"; "transfer" -> "نقل الملكية"; else -> "تأكيد" }
        val destructive = action == "remove" || action == "transfer"
        AlertDialog(
            onDismissRequest = { if (!busy) confirmAction = null },
            title = { Text(title) },
            text = { Text(body) },
            confirmButton = {
                Button(
                    enabled = !busy,
                    onClick = {
                        val selected = confirmTarget
                        when (action) {
                            "promote" -> onSetRole(selected, "admin")
                            "demote" -> onSetRole(selected, "member")
                            "remove" -> onRemove(selected)
                            "transfer" -> onTransfer(selected)
                        }
                        confirmAction = null
                    },
                    colors = if (destructive) ButtonDefaults.buttonColors(containerColor = Color(0xFFC62828)) else ButtonDefaults.buttonColors()
                ) { Text(confirmLabel) }
            },
            dismissButton = { TextButton(enabled = !busy, onClick = { confirmAction = null }) { Text("إلغاء") } }
        )
    }

    if (confirmAction == null) {
        AlertDialog(
        onDismissRequest=onDismiss,
        modifier=Modifier.imePadding().navigationBarsPadding(),
        title={Text("إدارة ${if(room.kind=="channel")"القناة" else "المجموعة"}")},
        text={LazyColumn(Modifier.heightIn(max=520.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){
            item{Row(verticalAlignment=Alignment.CenterVertically){if(!room.avatarUrl.isNullOrBlank())AsyncImage(room.avatarUrl,"صورة",Modifier.size(58.dp).clip(CircleShape),contentScale=ContentScale.Crop) else Surface(Modifier.size(58.dp),CircleShape,color=MsgOrangeSoft){Box(contentAlignment=Alignment.Center){Icon(Icons.Rounded.Groups,null,tint=MsgOrange)}};Spacer(Modifier.width(9.dp));OutlinedButton(onClick=onPickAvatar){Text("تغيير الصورة")}}}
            item{OutlinedTextField(name,{name=it.take(100)},label={Text("الاسم")},modifier=Modifier.fillMaxWidth(),singleLine=true)}
            item{OutlinedTextField(username,{username=it.lowercase().filter{c->c.isLetterOrDigit()||c=='_'}.take(30)},label={Text("يوزر القناة/المجموعة")},prefix={Text("@")},modifier=Modifier.fillMaxWidth(),singleLine=true)}
            item{OutlinedTextField(desc,{desc=it.take(1000)},label={Text("الوصف")},modifier=Modifier.fillMaxWidth(),minLines=2)}
            item{Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically){Text("ظاهرة للعامة",Modifier.weight(1f));Switch(isPublic,{isPublic=it})}}
            item{Button(onClick={onSave(name.trim(),username.trim(),desc.trim(),isPublic)},enabled=name.isNotBlank()&&!busy,modifier=Modifier.fillMaxWidth(),colors=ButtonDefaults.buttonColors(containerColor=MsgOrange)){Text("حفظ التعديلات")}}
            item{HorizontalDivider();Text("الأعضاء والصلاحيات",fontWeight=FontWeight.Black);Text("يمكن للمالك تعيين مشرف، إزالة عضو أو نقل الملكية.",color=StudentMuted,fontSize=11.sp)}
            item{OutlinedTextField(target,{target=it.take(40)},label={Text("@username")},modifier=Modifier.fillMaxWidth(),singleLine=true)}
            item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(5.dp)){OutlinedButton(onClick={confirmTarget=target;confirmAction="promote"},enabled=target.isNotBlank()&&!busy,modifier=Modifier.weight(1f)){Text("مشرف")};OutlinedButton(onClick={confirmTarget=target;confirmAction="demote"},enabled=target.isNotBlank()&&!busy,modifier=Modifier.weight(1f)){Text("عضو")}}}
            if(room.memberRole=="owner") item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(5.dp)){OutlinedButton(onClick={confirmTarget=target;confirmAction="remove"},enabled=target.isNotBlank()&&!busy,modifier=Modifier.weight(1f)){Text("إزالة")};Button(onClick={confirmTarget=target;confirmAction="transfer"},enabled=target.isNotBlank()&&!busy,modifier=Modifier.weight(1f),colors=ButtonDefaults.buttonColors(containerColor=Color(0xFFC62828))){Text("نقل الملكية")}}}
            item{TextButton(onClick=onRefreshMembers,modifier=Modifier.fillMaxWidth()){Text("تحديث قائمة الأعضاء")}}
            items(members){m->ListItem(headlineContent={Row{StudentName(m.fullName,m.isVerified,m.verificationColor);Spacer(Modifier.width(5.dp));RolePill(m.role)}},supportingContent={Text("@${m.username} • ${m.memberRole}")},leadingContent={StudentAvatar(m.fullName,m.avatarUrl,m.profileFrameUrl,38.dp)})}
            item{Spacer(Modifier.height(50.dp))}
        }},
        confirmButton={},dismissButton={TextButton(onClick=onDismiss){Text("إغلاق")}}
        )
    }
}

private fun roleLabel(role:String)=if(role.equals("teacher",true))"مدرس" else "طالب"
private fun friendlyRoomError(msg:String?):String=when{msg.orEmpty().contains("verification_required") -> "يجب توثيق الحساب أولاً لإنشاء مجموعة أو قناة.";msg.orEmpty().contains("insufficient_diamonds") -> "رصيد الألماس غير كافٍ.";else -> msg?:"تعذر إنشاء المجموعة."}
