package com.student.feature.home

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import com.student.core.data.*
import io.livekit.android.LiveKit
import io.livekit.android.events.RoomEvent
import io.livekit.android.events.collect
import io.livekit.android.room.Room
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun RoomsScreen(
    api: SupabaseApi,
    session: StudentSession,
    onBack: () -> Unit,
    onOpenProfile: (String) -> Unit
) {
    var selected by remember { mutableStateOf<VoiceRoomItem?>(null) }
    if (selected != null) {
        VoiceRoomDetailScreen(api, session, selected!!, onBack = { selected = null }, onOpenProfile = onOpenProfile)
    } else {
        VoiceRoomsDiscovery(api, session, onBack = onBack, onOpenRoom = { selected = it })
    }
}

@Composable
private fun VoiceRoomsDiscovery(api: SupabaseApi, session: StudentSession, onBack: () -> Unit, onOpenRoom: (VoiceRoomItem) -> Unit) {
    val scope = rememberCoroutineScope()
    var rooms by remember { mutableStateOf<List<VoiceRoomItem>>(emptyList()) }
    var query by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var showCreate by remember { mutableStateOf(false) }
    var tab by remember { mutableStateOf("discover") }
    var error by remember { mutableStateOf<String?>(null) }

    fun reload() {
        scope.launch {
            loading = true
            withContext(Dispatchers.IO) { api.voiceRooms(session, query) }
                .onSuccess { rooms = it; error = null }
                .onFailure { error = friendlyRoomError(it.message) }
            loading = false
        }
    }
    LaunchedEffect(query) { delay(250); reload() }

    Column(Modifier.fillMaxSize().background(Color(0xFFF8F9FC))) {
        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Rounded.ArrowBack, "رجوع") }
            Text("الغرف", fontSize = 24.sp, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
            FilledTonalIconButton(onClick = { showCreate = true }) { Icon(Icons.Rounded.Add, "إنشاء غرفة") }
        }
        OutlinedTextField(
            value = query, onValueChange = { query = it.take(80) },
            leadingIcon = { Icon(Icons.Rounded.Search, null) },
            placeholder = { Text("بحث") }, singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp)
        )
        Row(Modifier.fillMaxWidth().padding(horizontal=14.dp,vertical=8.dp),horizontalArrangement=Arrangement.spacedBy(7.dp)) {
            FilterChip(selected=tab=="discover",onClick={tab="discover"},label={Text("اكتشاف")})
            FilterChip(selected=tab=="popular",onClick={tab="popular"},label={Text("شائعة")})
            FilterChip(selected=tab=="saved",onClick={tab="saved"},label={Text("غرفي")})
        }
        if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
        error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(14.dp)) }
        val visibleRooms = when(tab){
            "saved" -> rooms.filter{it.isSaved}
            "popular" -> rooms.sortedByDescending{it.memberCount}
            else -> rooms
        }
        LazyColumn(contentPadding = PaddingValues(14.dp, 10.dp, 14.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(visibleRooms, key = { it.id }) { room ->
                Card(
                    Modifier.fillMaxWidth().heightIn(min = 100.dp).clickable { onOpenRoom(room) },
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Box(Modifier.fillMaxWidth()) {
                        room.backgroundUrl?.let { AsyncImage(it, null, Modifier.matchParentSize(), contentScale = ContentScale.Crop) }
                        if (room.backgroundUrl != null) Box(Modifier.matchParentSize().background(Color.Black.copy(alpha = .42f)))
                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            AsyncImage(room.ownerAvatarUrl, null, Modifier.size(52.dp).clip(CircleShape).background(Color(0xFFE9ECF2)))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(room.title, fontWeight = FontWeight.Black, fontSize = 18.sp, color = if(room.backgroundUrl==null) StudentText else Color.White)
                                if (room.description.isNotBlank()) Text(room.description, color = if(room.backgroundUrl==null) StudentMuted else Color.White.copy(.82f), maxLines = 1)
                                Text("${room.memberCount}/${room.capacity}", color = if(room.backgroundUrl==null) StudentBlue else Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                            Icon(Icons.Rounded.GraphicEq, null, tint = if(room.backgroundUrl==null) StudentBlue else Color.White)
                        }
                    }
                }
            }
            if (!loading && visibleRooms.isEmpty()) item { Text(if(tab=="saved") "لم تحفظ أي غرفة بعد." else "لا توجد غرف.", color = StudentMuted, modifier = Modifier.padding(20.dp)) }
        }
    }
    if (showCreate) CreateRoomDialog(api, session, onDismiss = { showCreate = false }, onCreated = { showCreate = false; reload() })
}

@Composable
private fun CreateRoomDialog(api: SupabaseApi, session: StudentSession, onDismiss: () -> Unit, onCreated: () -> Unit) {
    val scope = rememberCoroutineScope()
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = { if(!busy) onDismiss() },
        title = { Text(if(confirm) "تأكيد الإنشاء" else "إنشاء غرفة", fontWeight = FontWeight.Black) },
        text = {
            if(confirm) Text("تأكيد إنشاء الغرفة؟")
            else Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(title, { title = it.take(60) }, label = { Text("اسم الغرفة") }, singleLine = true)
                OutlinedTextField(description, { description = it.take(240) }, label = { Text("الوصف — اختياري") }, minLines = 2)
                message?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            }
        },
        confirmButton = {
            Button(enabled=!busy,onClick = {
                if(!confirm){ if(title.trim().length<3) message="اكتب اسم غرفة واضحاً." else confirm=true }
                else scope.launch { busy=true; withContext(Dispatchers.IO){api.createVoiceRoom(session,title,description)}.onSuccess{onCreated()}.onFailure{message=friendlyRoomError(it.message);confirm=false};busy=false }
            }) { Text(if(busy) "جارٍ الإنشاء..." else if(confirm) "تأكيد" else "إنشاء") }
        },
        dismissButton = { TextButton(enabled=!busy,onClick={ if(confirm) confirm=false else onDismiss() }) { Text("إلغاء") } }
    )
}

@Composable
private fun VoiceRoomDetailScreen(api: SupabaseApi, session: StudentSession, roomInfo: VoiceRoomItem, onBack: () -> Unit, onOpenProfile: (String)->Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val feedState = rememberLazyListState()
    var members by remember { mutableStateOf<List<VoiceRoomMember>>(emptyList()) }
    var gifts by remember { mutableStateOf<List<VoiceRoomGiftPack>>(emptyList()) }
    var feed by remember { mutableStateOf<List<VoiceRoomFeedItem>>(emptyList()) }
    var backgrounds by remember { mutableStateOf<List<VoiceRoomBackground>>(emptyList()) }
    var connected by remember { mutableStateOf(false) }
    var micOn by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var showGifts by remember { mutableStateOf(false) }
    var showSettings by remember { mutableStateOf(false) }
    var unlockConfirm by remember { mutableStateOf(false) }
    var manageMember by remember { mutableStateOf<VoiceRoomMember?>(null) }
    var pendingMemberAction by remember { mutableStateOf<String?>(null) }
    var unlockedMics by remember(roomInfo.id) { mutableIntStateOf(roomInfo.unlockedMics.coerceIn(5,10)) }
    var saved by remember(roomInfo.id) { mutableStateOf(roomInfo.isSaved) }
    var backgroundUrl by remember(roomInfo.id) { mutableStateOf(roomInfo.backgroundUrl) }
    var chatText by remember { mutableStateOf("") }
    var replyTarget by remember { mutableStateOf<VoiceRoomFeedItem?>(null) }
    var voiceRoom by remember { mutableStateOf<Room?>(null) }
    var liveKitEventsJob by remember { mutableStateOf<Job?>(null) }
    var speakingUserIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var sessionFeedStart by remember(roomInfo.id) { mutableStateOf("") }
    var diamonds by remember { mutableIntStateOf(0) }
    val me = members.firstOrNull { it.userId == session.userId }
    val canManage = me?.roomRole in setOf("owner","moderator")
    val canSpeak = me?.micState == "speaker" || me?.roomRole in setOf("owner","moderator")
    val isOwner = roomInfo.ownerId == session.userId

    fun refreshMembers() { scope.launch { withContext(Dispatchers.IO){ api.voiceRoomMembers(session,roomInfo.id) }.onSuccess{members=it}.onFailure{message=friendlyRoomError(it.message)} } }
    fun refreshFeed() { scope.launch { withContext(Dispatchers.IO){ api.voiceRoomFeed(session,roomInfo.id) }.onSuccess{feed=it}.onFailure{} } }
    fun refreshBackgrounds(){ scope.launch { withContext(Dispatchers.IO){api.voiceRoomBackgrounds(session)}.onSuccess{backgrounds=it} } }
    fun refreshWallet(){ scope.launch { withContext(Dispatchers.IO){api.walletSummary(session)}.onSuccess{diamonds=it.diamonds} } }

    suspend fun connectVoice() {
        if (connected) return
        withContext(Dispatchers.IO){ api.voiceRoomToken(session,roomInfo.id) }.onSuccess { token ->
            runCatching {
                val lk = LiveKit.create(context.applicationContext)
                liveKitEventsJob?.cancel()
                liveKitEventsJob = scope.launch {
                    lk.events.collect { event ->
                        if (event is RoomEvent.ActiveSpeakersChanged) {
                            speakingUserIds = event.speakers.mapNotNull { it.identity?.value }.toSet()
                        }
                    }
                }
                lk.connect(token.url,token.token)
                voiceRoom = lk
                connected = true
            }.onFailure { message=friendlyRoomError(it.message) }
        }.onFailure { message=friendlyRoomError(it.message) }
    }

    suspend fun enterRoomAndAudio() {
        feed = emptyList()
        sessionFeedStart = ""
        withContext(Dispatchers.IO) { api.joinVoiceRoom(session, roomInfo.id) }
            .onFailure { message=friendlyRoomError(it.message) }
        // Audio starts first; all secondary room data continues loading independently.
        connectVoice()
        withContext(Dispatchers.IO) { api.voiceRoomMembers(session, roomInfo.id) }
            .onSuccess {
                members = it
                sessionFeedStart = it.firstOrNull { member -> member.userId == session.userId }?.joinedAt.orEmpty()
            }
            .onFailure { message=friendlyRoomError(it.message) }
    }

    fun leaveRoomImmediately() {
        speakingUserIds = emptySet()
        micOn = false
        connected = false
        liveKitEventsJob?.cancel()
        liveKitEventsJob = null
        voiceRoom?.disconnect()
        voiceRoom = null
        scope.launch(Dispatchers.IO) { api.leaveVoiceRoom(session, roomInfo.id) }
    }

    LaunchedEffect(roomInfo.id) {
        enterRoomAndAudio()
        refreshFeed(); refreshBackgrounds(); refreshWallet()
        withContext(Dispatchers.IO){ api.voiceRoomGiftPacks(session) }.onSuccess{gifts=it}
        while(true){ delay(1200); refreshMembers(); refreshFeed() }
    }
    LaunchedEffect(feed.size) {
        if(feed.isNotEmpty()) runCatching { feedState.animateScrollToItem(feed.lastIndex.coerceAtLeast(0)) }
    }
    DisposableEffect(lifecycleOwner, roomInfo.id) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            when (event) {
                androidx.lifecycle.Lifecycle.Event.ON_STOP -> leaveRoomImmediately()
                androidx.lifecycle.Lifecycle.Event.ON_START -> if (!connected) {
                    scope.launch { enterRoomAndAudio(); refreshMembers(); refreshFeed() }
                }
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            leaveRoomImmediately()
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) scope.launch { if (canSpeak) runCatching { voiceRoom?.localParticipant?.setMicrophoneEnabled(true) }.onSuccess { micOn=true } }
    }

    Box(Modifier.fillMaxSize().background(Color(0xFF11131A))) {
        backgroundUrl?.let { AsyncImage(it,null,Modifier.matchParentSize(),contentScale=ContentScale.Crop) }
        Box(Modifier.matchParentSize().background(Color.Black.copy(alpha=if(backgroundUrl==null).05f else .48f)))
        Column(Modifier.fillMaxSize().statusBarsPadding()) {
            Row(Modifier.fillMaxWidth().padding(horizontal=8.dp,vertical=6.dp), verticalAlignment=Alignment.CenterVertically) {
                IconButton(onClick=onBack){Icon(Icons.Rounded.ArrowBack,"رجوع",tint=Color.White)}
                Column(Modifier.weight(1f)){ Text(roomInfo.title,color=Color.White,fontWeight=FontWeight.Black,fontSize=18.sp); Text("${members.size}/${roomInfo.capacity}",color=Color.White.copy(.72f),fontSize=11.sp) }
                Row(verticalAlignment=Alignment.CenterVertically){
                    Icon(Icons.Rounded.Diamond,null,tint=StudentBlue,modifier=Modifier.size(17.dp)); Spacer(Modifier.width(3.dp)); Text("$diamonds",color=Color.White,fontSize=12.sp,fontWeight=FontWeight.Bold)
                }
                Spacer(Modifier.width(6.dp))
                OutlinedButton(
                    onClick={ scope.launch { val next=!saved; withContext(Dispatchers.IO){api.toggleSavedVoiceRoom(session,roomInfo.id,next)}.onSuccess{saved=next}.onFailure{message=friendlyRoomError(it.message)} } },
                    colors=ButtonDefaults.outlinedButtonColors(contentColor=Color.White), contentPadding=PaddingValues(horizontal=10.dp,vertical=4.dp)
                ){Text(if(saved)"محفوظة" else "انضمام",fontSize=10.sp)}
                if(isOwner) TextButton(onClick={showSettings=true},contentPadding=PaddingValues(horizontal=7.dp,vertical=3.dp)){
                    Icon(Icons.Rounded.Settings,"إعدادات",tint=Color.White,modifier=Modifier.size(16.dp)); Spacer(Modifier.width(3.dp)); Text("إعدادات",color=Color.White,fontSize=10.sp)
                }
            }
            message?.let { Text(it,color=Color(0xFFFFD0CC),modifier=Modifier.padding(horizontal=14.dp,vertical=2.dp),fontSize=11.sp) }

            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                Row(Modifier.weight(1f).fillMaxWidth()) {
                    MembersSidebar(members=members,session=session,onOpenProfile=onOpenProfile,onFollow={member->
                        scope.launch { val next=!member.isFollowing; withContext(Dispatchers.IO){api.setFollowing(session,member.userId,next)}.onSuccess{refreshMembers()}.onFailure{message=friendlyRoomError(it.message)} }
                    })
                    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                        Column(Modifier.weight(1f).fillMaxHeight()) {
                            MicSeats(
                                members=members, unlockedMics=unlockedMics, isOwner=isOwner, speakingUserIds=speakingUserIds,
                                onSeatClick={slot,occupant,locked->
                                    when {
                                        locked && isOwner -> unlockConfirm=true
                                        locked -> message="هذا المايك مقفل."
                                        occupant==null -> scope.launch { withContext(Dispatchers.IO){api.requestVoiceMic(session,roomInfo.id,slot)}.onSuccess{message="تم إرسال طلب المايك.";refreshMembers()}.onFailure{message=friendlyRoomError(it.message)} }
                                        occupant.userId==session.userId && occupant.micState=="speaker" -> Unit
                                        canManage && occupant.userId != session.userId -> manageMember = occupant
                                        else -> onOpenProfile(occupant.userId)
                                    }
                                },
                                onAccept={member-> scope.launch { withContext(Dispatchers.IO){api.setVoiceMemberMic(session,roomInfo.id,member.userId,true)}.onSuccess{refreshMembers()}.onFailure{message=friendlyRoomError(it.message)} } },
                                canManage=canManage
                            )

                            val visibleFeed = feed
                                .filter { sessionFeedStart.isBlank() || it.createdAt >= sessionFeedStart }
                                .takeLast(35)
                            LazyColumn(
                                state=feedState,
                                modifier=Modifier.weight(1f).fillMaxWidth(),
                                contentPadding=PaddingValues(horizontal=10.dp,vertical=6.dp),
                                verticalArrangement=Arrangement.spacedBy(5.dp)
                            ) {
                                items(visibleFeed,key={it.id}){item->
                                    RoomFeedRow(
                                        item=item,
                                        onReply={ if(item.kind=="message") replyTarget=item },
                                        onReact={reaction-> if(item.kind=="message") scope.launch { withContext(Dispatchers.IO){api.reactVoiceRoomMessage(session,roomInfo.id,item.id,reaction)}.onSuccess{refreshFeed()}.onFailure{message=friendlyRoomError(it.message)} } }
                                    )
                                }
                            }

                            replyTarget?.let { target ->
                                Surface(color=Color.Black.copy(.35f),modifier=Modifier.fillMaxWidth()){
                                    Row(Modifier.padding(horizontal=10.dp,vertical=4.dp),verticalAlignment=Alignment.CenterVertically){
                                        Icon(Icons.Rounded.Reply,null,tint=Color.White.copy(.8f),modifier=Modifier.size(15.dp)); Spacer(Modifier.width(5.dp)); Text("رد على ${target.userName}: ${target.message}",color=Color.White.copy(.8f),fontSize=10.sp,maxLines=1,modifier=Modifier.weight(1f)); IconButton(onClick={replyTarget=null},modifier=Modifier.size(28.dp)){Icon(Icons.Rounded.Close,"إلغاء الرد",tint=Color.White,modifier=Modifier.size(16.dp))}
                                    }
                                }
                            }

                            Row(
                                Modifier.fillMaxWidth().padding(horizontal=8.dp,vertical=6.dp).imePadding().navigationBarsPadding(),
                                verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(6.dp)
                            ){
                                OutlinedTextField(
                                    value=chatText,onValueChange={chatText=it.take(500)},placeholder={Text("اكتب رسالة",color=Color.White.copy(.65f))},singleLine=true,
                                    textStyle=LocalTextStyle.current.copy(color=Color.White),
                                    colors=OutlinedTextFieldDefaults.colors(focusedBorderColor=Color.White.copy(.5f),unfocusedBorderColor=Color.White.copy(.25f)),
                                    modifier=Modifier.weight(1f),trailingIcon={IconButton(enabled=chatText.isNotBlank(),onClick={ val text=chatText.trim(); val replyId=replyTarget?.id; chatText="";replyTarget=null;scope.launch{withContext(Dispatchers.IO){api.sendVoiceRoomMessage(session,roomInfo.id,text,replyId)}.onSuccess{refreshFeed()}.onFailure{message=friendlyRoomError(it.message)}}}){Icon(Icons.Rounded.Send,"إرسال",tint=Color.White)}}
                                )
                                FilledTonalIconButton(onClick={showGifts=true}){Icon(Icons.Rounded.CardGiftcard,"هدايا")}
                                FilledTonalIconButton(onClick={ scope.launch { if(!connected) connectVoice() else {voiceRoom?.disconnect();voiceRoom=null;connected=false;micOn=false} } }){Icon(if(connected)Icons.Rounded.WifiOff else Icons.Rounded.GraphicEq,"الصوت")}
                                FilledIconButton(enabled=canSpeak,onClick={
                                    if(ContextCompat.checkSelfPermission(context,Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED) permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                                    else scope.launch { val next=!micOn; if(next&&!connected)connectVoice();runCatching{voiceRoom?.localParticipant?.setMicrophoneEnabled(next)}.onSuccess{micOn=next}.onFailure{message=friendlyRoomError(it.message)} }
                                }){Icon(if(micOn)Icons.Rounded.Mic else Icons.Rounded.MicOff,"مايك")}
                            }
                        }
                    }
                }
            }
        }
    }

    if(showGifts) GiftSheet(api,session,roomInfo.id,gifts,members,diamonds,onDismiss={showGifts=false},onSent={showGifts=false;refreshFeed();refreshWallet()})
    manageMember?.let { member ->
        if (pendingMemberAction == null) {
            AlertDialog(
                onDismissRequest = { manageMember = null },
                title = { Text(member.fullName, fontWeight = FontWeight.Black) },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        if (member.micState == "speaker" || member.micState == "requested") {
                            OutlinedButton(onClick = { pendingMemberAction = "remove_mic" }, modifier = Modifier.fillMaxWidth()) { Text("إزالة من المايك") }
                        }
                        OutlinedButton(onClick = { onOpenProfile(member.userId); manageMember = null }, modifier = Modifier.fillMaxWidth()) { Text("فتح الملف الشخصي") }
                        OutlinedButton(onClick = { pendingMemberAction = "kick" }, modifier = Modifier.fillMaxWidth()) { Text("طرد من الغرفة", color = Color(0xFFC62828)) }
                        if (isOwner) OutlinedButton(onClick = { pendingMemberAction = "ban" }, modifier = Modifier.fillMaxWidth()) { Text("حظر من الغرفة", color = Color(0xFFC62828)) }
                    }
                },
                confirmButton = {},
                dismissButton = { TextButton(onClick = { manageMember = null }) { Text("إغلاق") } }
            )
        }
    }

    val memberAction = pendingMemberAction
    if (memberAction != null && manageMember != null) {
        val target = manageMember!!
        val label = when (memberAction) {
            "remove_mic" -> "إزالة ${target.fullName} من المايك؟"
            "kick" -> "طرد ${target.fullName} من الغرفة؟"
            else -> "حظر ${target.fullName} من الغرفة؟"
        }
        AlertDialog(
            onDismissRequest = { pendingMemberAction = null },
            title = { Text("تأكيد الإجراء") },
            text = { Text(label) },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            busy = true
                            val r = withContext(Dispatchers.IO) { api.manageVoiceRoomMember(session, roomInfo.id, target.userId, memberAction) }
                            busy = false
                            r.onSuccess {
                                message = when (memberAction) {
                                    "remove_mic" -> "تمت إزالة المستخدم من المايك."
                                    "kick" -> "تم طرد المستخدم."
                                    else -> "تم حظر المستخدم من الغرفة."
                                }
                                pendingMemberAction = null
                                manageMember = null
                                refreshMembers()
                            }.onFailure { message = friendlyRoomError(it.message); pendingMemberAction = null }
                        }
                    },
                    enabled = !busy,
                    colors = ButtonDefaults.buttonColors(containerColor = if (memberAction == "remove_mic") StudentBlue else Color(0xFFC62828))
                ) { Text("تأكيد") }
            },
            dismissButton = { TextButton(onClick = { pendingMemberAction = null }) { Text("إلغاء") } }
        )
    }

    if(showSettings) RoomOwnerSettingsSheet(api,session,roomInfo.id,backgrounds,onDismiss={showSettings=false},onApplied={url->backgroundUrl=url;showSettings=false;refreshBackgrounds()})
    if(unlockConfirm) AlertDialog(onDismissRequest={unlockConfirm=false},title={Text("فتح مايك إضافي؟")},text={Text("سيتم خصم السعر المحدد من الإدارة من رصيد الألماس.")},confirmButton={Button(onClick={unlockConfirm=false;scope.launch{withContext(Dispatchers.IO){api.unlockVoiceMic(session,roomInfo.id)}.onSuccess{unlockedMics=it;message="تم فتح المايك.";refreshWallet()}.onFailure{message=friendlyRoomError(it.message)}}}){Text("تأكيد الشراء")}},dismissButton={TextButton(onClick={unlockConfirm=false}){Text("إلغاء")}})
}

@Composable
private fun MembersSidebar(members:List<VoiceRoomMember>,session:StudentSession,onOpenProfile:(String)->Unit,onFollow:(VoiceRoomMember)->Unit){
    Surface(color=Color.Black.copy(.28f),modifier=Modifier.width(78.dp).fillMaxHeight()){
        LazyColumn(contentPadding=PaddingValues(vertical=8.dp),verticalArrangement=Arrangement.spacedBy(8.dp),horizontalAlignment=Alignment.CenterHorizontally){
            items(members,key={it.userId}){m->
                Column(horizontalAlignment=Alignment.CenterHorizontally,modifier=Modifier.width(72.dp)){
                    AsyncImage(m.avatarUrl,null,Modifier.size(42.dp).clip(CircleShape).background(Color.DarkGray).clickable{onOpenProfile(m.userId)},contentScale=ContentScale.Crop)
                    Text(m.fullName,color=Color.White,fontSize=9.sp,maxLines=1,textAlign=TextAlign.Center)
                    if(m.userId!=session.userId) TextButton(onClick={onFollow(m)},contentPadding=PaddingValues(0.dp),modifier=Modifier.height(24.dp)){Text(if(m.isFollowing)"متابَع" else "متابعة",fontSize=8.sp,color=if(m.isFollowing)Color.LightGray else Color(0xFFB7A5FF))}
                }
            }
        }
    }
}

@Composable
private fun RoomFeedRow(item:VoiceRoomFeedItem,onReply:()->Unit,onReact:(String)->Unit){
    when(item.kind){
        "gift" -> Surface(color=Color(0x55251700),shape=RoundedCornerShape(10.dp)){
            Text("${item.userName} أرسل ${item.giftEmoji ?: "🎁"} ${if(item.targetUserId==null)"للجميع" else "إلى ${item.targetName}"}",color=Color(0xFFFFD76A),fontSize=12.sp,fontWeight=FontWeight.Bold,modifier=Modifier.padding(horizontal=9.dp,vertical=6.dp))
        }
        "message" -> Surface(color=Color.Black.copy(.22f),shape=RoundedCornerShape(10.dp)){
            Column(Modifier.padding(horizontal=9.dp,vertical=6.dp)){
                item.replyToMessage?.let{ Text("↪ ${item.replyToName ?: "مستخدم"}: $it",color=Color.White.copy(.62f),fontSize=9.sp,maxLines=1) }
                Text("${item.userName}: ${item.message}",color=Color.White,fontSize=12.sp)
                Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(3.dp)){
                    TextButton(onClick=onReply,contentPadding=PaddingValues(horizontal=2.dp,vertical=0.dp),modifier=Modifier.height(24.dp)){Icon(Icons.Rounded.Reply,null,modifier=Modifier.size(13.dp));Spacer(Modifier.width(2.dp));Text("رد",fontSize=9.sp)}
                    listOf("❤️","👍","😂").forEach{r-> TextButton(onClick={onReact(r)},contentPadding=PaddingValues(horizontal=2.dp,vertical=0.dp),modifier=Modifier.height(24.dp)){Text(r,fontSize=11.sp);item.reactions[r]?.takeIf{it>0}?.let{Text(" $it",fontSize=8.sp)}} }
                }
            }
        }
        else -> Text(item.message,color=Color.White.copy(.68f),fontSize=10.sp)
    }
}

@Composable
private fun MicSeats(members:List<VoiceRoomMember>,unlockedMics:Int,isOwner:Boolean,speakingUserIds:Set<String>,onSeatClick:(Int,VoiceRoomMember?,Boolean)->Unit,onAccept:(VoiceRoomMember)->Unit,canManage:Boolean){
    val transition = rememberInfiniteTransition(label = "speakerPulse")
    val pulse by transition.animateFloat(
        initialValue = 0.35f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(620, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "speakerPulseAlpha"
    )
    Column(Modifier.fillMaxWidth().padding(horizontal=8.dp,vertical=6.dp),verticalArrangement=Arrangement.spacedBy(6.dp)){
        repeat(2){row->
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceEvenly){
                repeat(5){col->
                    val slot=row*5+col+1;val locked=slot>unlockedMics;val occupant=members.firstOrNull{it.micSlot==slot&&it.micState in setOf("requested","speaker")}
                    val speaking = occupant?.userId?.let { uid ->
                        uid in speakingUserIds || ("u_" + uid.replace("-", "")) in speakingUserIds
                    } == true
                    Column(horizontalAlignment=Alignment.CenterHorizontally,modifier=Modifier.width(54.dp).clickable{onSeatClick(slot,occupant,locked)}){
                        Surface(
                            Modifier.size(46.dp).then(if(speaking) Modifier.border(3.dp,Color(0xFF6FE38A).copy(alpha=pulse),CircleShape) else Modifier),
                            shape=CircleShape,
                            color=when{locked->Color.Black.copy(.38f);occupant?.micState=="speaker"->Color(0xFF315C42);occupant?.micState=="requested"->Color(0xFF604B26);else->Color.White.copy(.16f)}
                        ){
                            Box(contentAlignment=Alignment.Center){
                                when{locked->Icon(Icons.Rounded.Lock,"مقفل",tint=Color.White.copy(.72f));occupant!=null->AsyncImage(occupant.avatarUrl,null,Modifier.fillMaxSize().clip(CircleShape),contentScale=ContentScale.Crop);else->Icon(Icons.Rounded.MicNone,"مايك $slot",tint=Color.White)}
                            }
                        }
                        Text(if(locked)"مقفل" else occupant?.fullName ?: "مايك $slot",color=Color.White,fontSize=8.sp,maxLines=1,textAlign=TextAlign.Center)
                        if(canManage&&occupant?.micState=="requested") TextButton(onClick={onAccept(occupant)},contentPadding=PaddingValues(0.dp),modifier=Modifier.height(22.dp)){Text("قبول",fontSize=8.sp,color=Color(0xFF6FE38A))}
                    }
                }
            }
        }
        if(isOwner&&unlockedMics<10) Spacer(Modifier.height(1.dp))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GiftSheet(api:SupabaseApi,session:StudentSession,roomId:String,gifts:List<VoiceRoomGiftPack>,members:List<VoiceRoomMember>,diamondBalance:Int,onDismiss:()->Unit,onSent:()->Unit){
    val scope=rememberCoroutineScope();var selected by remember{mutableStateOf<VoiceRoomGiftPack?>(null)};var recipient by remember{mutableStateOf<String?>(null)};var confirm by remember{mutableStateOf(false)};var msg by remember{mutableStateOf<String?>(null)};var busy by remember{mutableStateOf(false)}
    ModalBottomSheet(onDismissRequest=onDismiss){
        Column(Modifier.fillMaxWidth().padding(16.dp).navigationBarsPadding(),verticalArrangement=Arrangement.spacedBy(10.dp)){
            Row(verticalAlignment=Alignment.CenterVertically){Text("الهدايا",fontWeight=FontWeight.Black,fontSize=19.sp,modifier=Modifier.weight(1f));Icon(Icons.Rounded.Diamond,null,tint=StudentBlue,modifier=Modifier.size(18.dp));Spacer(Modifier.width(4.dp));Text("$diamondBalance",fontWeight=FontWeight.Bold)}
            LazyRow(horizontalArrangement=Arrangement.spacedBy(8.dp)){items(gifts,key={it.id}){g->
                FilterChip(selected=selected?.id==g.id,onClick={selected=g;confirm=false},label={Column(horizontalAlignment=Alignment.CenterHorizontally){Text(g.iconKey.ifBlank{"🎁"},fontSize=28.sp);Row(verticalAlignment=Alignment.CenterVertically){Icon(Icons.Rounded.Diamond,null,tint=StudentBlue,modifier=Modifier.size(12.dp));Spacer(Modifier.width(2.dp));Text("${g.diamonds}",fontSize=10.sp)}}})
            }}
            Row(horizontalArrangement=Arrangement.spacedBy(6.dp)){FilterChip(selected=recipient==null,onClick={recipient=null},label={Text("الجميع")})}
            LazyRow(horizontalArrangement=Arrangement.spacedBy(6.dp)){items(members.filter{it.userId!=session.userId},key={it.userId}){m->FilterChip(selected=recipient==m.userId,onClick={recipient=m.userId},label={Text(m.fullName)})}}
            msg?.let{Text(it,color=MaterialTheme.colorScheme.error)}
            Button(enabled=selected!=null&&!busy,onClick={
                if(!confirm){confirm=true;msg="تأكيد إرسال ${selected?.iconKey ?: "🎁"} مقابل ${selected?.diamonds ?: 0} ألماسة؟"}
                else scope.launch{busy=true;withContext(Dispatchers.IO){api.sendVoiceRoomGift(session,roomId,selected!!.id,recipient)}.onSuccess{onSent()}.onFailure{msg=friendlyRoomError(it.message);confirm=false};busy=false}
            },modifier=Modifier.fillMaxWidth()){Text(if(confirm)"تأكيد الخصم والإرسال" else "إرسال")}
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RoomOwnerSettingsSheet(api:SupabaseApi,session:StudentSession,roomId:String,backgrounds:List<VoiceRoomBackground>,onDismiss:()->Unit,onApplied:(String?)->Unit){
    val scope=rememberCoroutineScope();val context=LocalContext.current
    var pendingBuy by remember{mutableStateOf<VoiceRoomBackground?>(null)};var msg by remember{mutableStateOf<String?>(null)};var uploadBusy by remember{mutableStateOf(false)}
    val picker=rememberLauncherForActivityResult(ActivityResultContracts.GetContent()){picked->
        if(picked!=null) scope.launch{
            uploadBusy=true
            val r=withContext(Dispatchers.IO){runCatching{
                val mime=context.contentResolver.getType(picked)?:"image/jpeg"
                val ext=when{mime.contains("png")->"png";mime.contains("webp")->"webp";else->"jpg"}
                val temp=materializeUriToCacheFile(context,picked,ext,8L*1024L*1024L)
                val path="room-custom/${session.userId}/${System.currentTimeMillis()}.$ext"
                var committed=false
                try {
                    val url=api.uploadObjectFile(session,"home-ads",path,temp,mime).getOrThrow()
                    api.applyCustomVoiceRoomBackground(session,roomId,url).getOrThrow()
                    committed=true
                    url
                } finally {
                    temp.delete()
                    if(!committed) api.deleteObject(session,"home-ads",path)
                }
            }}
            uploadBusy=false
            r.onSuccess{onApplied(it)}.onFailure{msg=friendlyRoomError(it.message)}
        }
    }
    ModalBottomSheet(onDismissRequest=onDismiss){
        Column(Modifier.fillMaxWidth().padding(16.dp).navigationBarsPadding(),verticalArrangement=Arrangement.spacedBy(10.dp)){
            Text("إعدادات الغرفة",fontWeight=FontWeight.Black,fontSize=20.sp)
            Text("الخلفية",fontWeight=FontWeight.Bold)
            OutlinedButton(onClick={picker.launch("image/*")},enabled=!uploadBusy,modifier=Modifier.fillMaxWidth()){
                Icon(Icons.Rounded.PhotoLibrary,null);Spacer(Modifier.width(6.dp));Text(if(uploadBusy)"جارٍ الرفع..." else "اختيار من الاستوديو")
            }
            OutlinedButton(onClick={scope.launch{withContext(Dispatchers.IO){api.applyCustomVoiceRoomBackground(session,roomId,null)}.onSuccess{withContext(Dispatchers.IO){api.applyVoiceRoomBackground(session,roomId,null)};onApplied(null)}.onFailure{msg=friendlyRoomError(it.message)}}},modifier=Modifier.fillMaxWidth()){Text("إزالة الخلفية")}
            Text("من المتجر",fontWeight=FontWeight.Bold)
            LazyRow(horizontalArrangement=Arrangement.spacedBy(10.dp)){items(backgrounds,key={it.id}){bg->
                Card(Modifier.width(130.dp).clickable{
                    if(bg.isOwned) scope.launch{withContext(Dispatchers.IO){api.applyVoiceRoomBackground(session,roomId,bg.id)}.onSuccess{onApplied(bg.imageUrl)}.onFailure{msg=friendlyRoomError(it.message)}} else pendingBuy=bg
                },shape=RoundedCornerShape(14.dp)){
                    Column{AsyncImage(bg.imageUrl,bg.name,Modifier.fillMaxWidth().height(105.dp),contentScale=ContentScale.Crop);Text(bg.name,Modifier.padding(7.dp),fontWeight=FontWeight.Bold,fontSize=11.sp);Row(Modifier.padding(horizontal=7.dp),verticalAlignment=Alignment.CenterVertically){if(bg.isOwned)Text("استخدام",fontSize=10.sp,color=Color(0xFF16803C))else{Icon(Icons.Rounded.Diamond,null,tint=StudentBlue,modifier=Modifier.size(12.dp));Spacer(Modifier.width(2.dp));Text("${bg.diamonds}",fontSize=10.sp,color=StudentBlue)}};Spacer(Modifier.height(7.dp))}
                }
            }}
            msg?.let{Text(it,color=MaterialTheme.colorScheme.error)}
        }
    }
    pendingBuy?.let{bg->AlertDialog(onDismissRequest={pendingBuy=null},title={Text("شراء الخلفية؟")},text={Text("${bg.name} مقابل ${bg.diamonds} ألماسة.")},confirmButton={Button(onClick={pendingBuy=null;scope.launch{withContext(Dispatchers.IO){api.purchaseVoiceRoomBackground(session,bg.id)}.onSuccess{withContext(Dispatchers.IO){api.applyVoiceRoomBackground(session,roomId,bg.id)};onApplied(bg.imageUrl)}.onFailure{msg=friendlyRoomError(it.message)}}}){Text("تأكيد الشراء")}},dismissButton={TextButton(onClick={pendingBuy=null}){Text("إلغاء")}})}
}

private fun friendlyRoomError(raw:String?):String{
    val s=raw.orEmpty().lowercase()
    return when{
        "duplicate key" in s || "follows_pkey" in s -> "تم تحديث المتابعة."
        "insufficient_diamonds" in s -> "رصيد الألماس غير كافٍ."
        "mic_locked" in s -> "هذا المايك مقفل."
        "mic_occupied" in s -> "هذا المايك مستخدم حاليًا."
        "speaker_limit" in s -> "اكتمل عدد المايكات المتاحة."
        "manager_required" in s -> "ليس لديك صلاحية إدارة هذا المستخدم."
        "cannot_manage_owner" in s -> "لا يمكن تنفيذ هذا الإجراء على مالك الغرفة."
        "owner_required" in s -> "هذا الإجراء متاح لمالك الغرفة فقط."
        "room_full" in s -> "الغرفة ممتلئة."
        "room_banned" in s -> "لا يمكنك دخول هذه الغرفة."
        "slow_down" in s -> "انتظر قليلًا قبل إرسال رسالة أخرى."
        "unable to resolve host" in s || "unknownhost" in s || "failed to connect" in s -> "تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى."
        "timeout" in s -> "الاتصال بطيء. حاول مرة أخرى."
        else -> "تعذر تنفيذ العملية الآن. حاول مرة أخرى."
    }
}
