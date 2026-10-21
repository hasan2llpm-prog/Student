package com.student.feature.home

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun AdminScreen(api: SupabaseApi, session: StudentSession, profile: StudentProfile?, onBack: () -> Unit = {}) {
    val scope = rememberCoroutineScope()
    val cfg = LocalNativeRemoteConfig.current
    var allowed by remember { mutableStateOf(profile?.role.equals("admin", true)) }
    var checked by remember { mutableStateOf(false) }
    var users by remember { mutableStateOf<List<AdminRecentUser>>(emptyList()) }
    var flags by remember { mutableStateOf<List<FeatureFlag>>(emptyList()) }
    var tabKey by remember { mutableStateOf("dashboard") }
    var operationsSection by remember { mutableIntStateOf(0) }
    var loading by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var selected by remember { mutableStateOf<AdminRecentUser?>(null) }
    var broadcastTitle by remember { mutableStateOf("") }
    var broadcastBody by remember { mutableStateOf("") }

    BackHandler {
        if (tabKey != "dashboard") tabKey = "dashboard" else onBack()
    }

    fun refresh() {
        scope.launch {
            loading = true
            val adminResult = withContext(Dispatchers.IO) { api.isAdmin(session) }
            allowed = adminResult.getOrDefault(profile?.role.equals("admin", true))
            checked = true
            if (allowed) {
                val usersResult = withContext(Dispatchers.IO) { api.adminRecentUsers(session) }
                val flagsResult = withContext(Dispatchers.IO) { api.featureFlags(session) }
                usersResult.onSuccess { users = it }.onFailure { message = it.message }
                flagsResult.onSuccess { flags = it }.onFailure { if (message == null) message = it.message }
            }
            loading = false
        }
    }

    LaunchedEffect(Unit) { refresh() }
    LaunchedEffect(message) { if (message != null) { kotlinx.coroutines.delay(cfg.long("admin.status_duration_ms", 3000L, 500L, 10000L)); message = null } }

    selected?.let { user ->
        AdminGiftDialog(
            user = user,
            loading = loading,
            onDismiss = { if (!loading) selected = null },
            onGiftVerification = { color ->
                scope.launch {
                    loading = true
                    val r = withContext(Dispatchers.IO) { api.grantVerification(session, user.id, color) }
                    loading = false
                    r.onSuccess {
                        message = "تم إرسال التوثيق كهدية للمستخدم."
                        selected = null
                        refresh()
                    }.onFailure { message = it.message }
                }
            },
            onGiftFrame = { frameKey, days ->
                scope.launch {
                    loading = true
                    val r = withContext(Dispatchers.IO) { api.grantProfileFrame(session, user.id, frameKey, days) }
                    loading = false
                    r.onSuccess {
                        message = "تم إرسال الإطار كهدية للمستخدم."
                        selected = null
                        refresh()
                    }.onFailure { message = it.message }
                }
            },
            onGiftCustomBadge = { label, color ->
                scope.launch {
                    loading = true
                    val r = withContext(Dispatchers.IO) { api.grantCustomBadge(session, user.id, label, color) }
                    loading = false
                    r.onSuccess {
                        message = "تم إرسال العلامة كهدية للمستخدم."
                        selected = null
                        refresh()
                    }.onFailure { message = it.message }
                }
            }
        )
    }

    val defaultTabs = listOf("dashboard", "users", "features", "broadcast", "v14", "operations", "rooms", "update")
    val allowedTabs = (listOf("dashboard") + cfg.strings("admin.tab_order", defaultTabs) + "v14").map { it.lowercase() }.distinct().filter { key ->
        when (key) {
            "dashboard" -> true
            "users" -> cfg.bool("admin.show_users_tab", true)
            "features" -> cfg.bool("admin.show_features_tab", true)
            "broadcast" -> cfg.bool("admin.show_broadcast_tab", true)
            "v14" -> true
            "operations" -> cfg.bool("admin.show_operations_tab", true)
            "rooms" -> true
            "update" -> true
            else -> false
        }
    }.ifEmpty { listOf("dashboard") }
    LaunchedEffect(allowedTabs) { if (tabKey !in allowedTabs) tabKey = allowedTabs.first() }

    Column(Modifier.fillMaxSize().padding(horizontal = cfg.int("admin.horizontal_padding_dp", 10, 4, 24).dp)) {

        if (checked && !allowed) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Text(
                        "هذه الصفحة متاحة لحساب الأدمن فقط.",
                        Modifier.padding(20.dp),
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
            return@Column
        }

        Surface(
            modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp, horizontal = 2.dp),
            shape = RoundedCornerShape(24.dp),
            color = Color(0xFF111827),
            shadowElevation = 0.dp
        ) {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text("STUDENT ADMIN", color = Color(0xFFDDD6FE), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Text(cfg.string("admin.header_title", "لوحة الإدارة"), fontWeight = FontWeight.Black, fontSize = 24.sp, color = Color.White)
                        Text("إدارة واضحة ومقسمة لكل أجزاء التطبيق", color = Color(0xFFD1D5DB), fontSize = 11.sp)
                    }
                    if (cfg.bool("admin.show_refresh", true)) {
                        FilledTonalButton(onClick = { refresh() }, enabled = !loading) { Text("تحديث") }
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AdminMetricChip("المستخدمون", users.size.toString(), Modifier.weight(1f))
                    AdminMetricChip("الميزات", flags.size.toString(), Modifier.weight(1f))
                    AdminMetricChip("الحالة", if (loading) "تحديث" else "Live", Modifier.weight(1f))
                }
            }
        }

        message?.let {
            Surface(
                color = Color(0xFFF3FAFF),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().padding(bottom = 7.dp)
            ) {
                Text(it, Modifier.padding(10.dp), color = StudentText, fontSize = 12.sp)
            }
        }

        if (tabKey != "dashboard") {
            Row(
                Modifier.fillMaxWidth().padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { tabKey = "dashboard" }) { Icon(Icons.Rounded.ArrowBack, "العودة للوحة") }
                Text(
                    when (tabKey) {
                        "users" -> "المستخدمون"
                        "features" -> "الميزات والتحكم"
                        "broadcast" -> "الإشعارات العامة"
                        "v14" -> "التوثيق والدعم"
                        "operations" -> listOf("طلبات المدرسين","الإعلانات","Learn English","التعليم","المتجر").getOrElse(operationsSection){"الإدارة"}
                        "rooms" -> "إدارة الغرف"
                        "update" -> "التحديث الإجباري"
                        else -> "الإدارة"
                    },
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp
                )
            }
            HorizontalDivider()
        }

        when (tabKey) {
            "dashboard" -> AdminDashboard(
                onOpenUsers = { tabKey = "users" },
                onOpenFeatures = { tabKey = "features" },
                onOpenTeachers = { operationsSection = 0; tabKey = "operations" },
                onOpenAds = { operationsSection = 1; tabKey = "operations" },
                onOpenLearnEnglish = { operationsSection = 2; tabKey = "operations" },
                onOpenEducation = { operationsSection = 3; tabKey = "operations" },
                onOpenStore = { operationsSection = 4; tabKey = "operations" },
                onOpenBroadcast = { tabKey = "broadcast" },
                onOpenSupport = { tabKey = "v14" },
                onOpenRooms = { tabKey = "rooms" },
                onOpenUpdate = { tabKey = "update" }
            )

            "users" -> LazyColumn(
                contentPadding = PaddingValues(vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(users, key = { it.id }) { user ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { selected = user },
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, Color(0xFFE9EDF3))
                    ) {
                        Row(
                            Modifier.fillMaxWidth().padding(13.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            StudentAvatar(user.fullName, null, null, 45.dp)
                            Spacer(Modifier.width(8.dp))
                            Column(Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                                    Text(user.fullName, fontWeight = FontWeight.Bold, color = StudentText)
                                    VerificationBadge(user.isVerified, roleVerificationColor(user.role), size = 16.dp)
                                }
                                Text("@${user.username}", color = StudentMuted, fontSize = 11.sp)
                                Text(user.email, color = StudentMuted, fontSize = 10.sp)
                                Text(prettyTime(user.createdAt), color = Color(0xFF98A2B1), fontSize = 9.sp)
                            }
                            Text("إدارة", color = StudentBlue, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                if (users.isEmpty() && checked && !loading) {
                    item { Text("لا يوجد مستخدمون لعرضهم.", color = StudentMuted, modifier = Modifier.padding(14.dp)) }
                }
            }

            "features" -> LazyColumn(
                contentPadding = PaddingValues(vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(flags, key = { it.id.ifBlank { it.key } }) { flag ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, Color(0xFFE9EDF3))
                    ) {
                        Row(
                            Modifier.fillMaxWidth().padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(flag.name, fontWeight = FontWeight.Bold, color = StudentText)
                                Text(flag.key, color = StudentMuted, fontSize = 10.sp)
                            }
                            Switch(
                                checked = flag.enabled,
                                onCheckedChange = { enabled ->
                                    scope.launch {
                                        val r = withContext(Dispatchers.IO) { api.updateFeatureFlag(session, flag.id, enabled) }
                                        r.onSuccess {
                                            flags = flags.map { if (it.id == flag.id) it.copy(enabled = enabled) else it }
                                            message = "تم تحديث الميزة."
                                        }.onFailure { message = it.message }
                                    }
                                }
                            )
                        }
                    }
                }
            }

            "v14" -> AdminV14Pane(api, session) { message = it }

            "broadcast" -> Column(
                Modifier.fillMaxWidth().padding(vertical = 14.dp, horizontal = 4.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text("نشر إشعار للجميع", fontWeight = FontWeight.Black, fontSize = 19.sp, color = StudentText)
                OutlinedTextField(
                    value = broadcastTitle,
                    onValueChange = { broadcastTitle = it },
                    label = { Text("العنوان") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                OutlinedTextField(
                    value = broadcastBody,
                    onValueChange = { broadcastBody = it },
                    label = { Text("النص") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 4
                )
                Button(
                    onClick = {
                        scope.launch {
                            loading = true
                            val r = withContext(Dispatchers.IO) {
                                api.adminBroadcast(session, broadcastTitle.trim(), broadcastBody.trim())
                            }
                            loading = false
                            r.onSuccess {
                                message = "تم نشر الإشعار للجميع."
                                broadcastTitle = ""
                                broadcastBody = ""
                            }.onFailure { message = it.message }
                        }
                    },
                    enabled = !loading && broadcastTitle.isNotBlank() && broadcastBody.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = StudentBlue)
                ) { Text("نشر الآن") }
            }
            "operations" -> AdminOperationsPane(api, session, { message = it }, initialSection = operationsSection, showTabs = false)
            "rooms" -> AdminRoomsControl(api, session) { message = it }
            "update" -> AdminUpdateControl(api, session) { message = it }
            else -> AdminDashboard(
                onOpenUsers = { tabKey = "users" },
                onOpenFeatures = { tabKey = "features" },
                onOpenTeachers = { operationsSection = 0; tabKey = "operations" },
                onOpenAds = { operationsSection = 1; tabKey = "operations" },
                onOpenLearnEnglish = { operationsSection = 2; tabKey = "operations" },
                onOpenEducation = { operationsSection = 3; tabKey = "operations" },
                onOpenStore = { operationsSection = 4; tabKey = "operations" },
                onOpenBroadcast = { tabKey = "broadcast" },
                onOpenSupport = { tabKey = "v14" },
                onOpenRooms = { tabKey = "rooms" },
                onOpenUpdate = { tabKey = "update" }
            )
        }
    }
}

@Composable
private fun AdminMetricChip(label: String, value: String, modifier: Modifier = Modifier) {
    Surface(modifier = modifier, shape = RoundedCornerShape(14.dp), color = Color(0xFF1F2937)) {
        Column(Modifier.padding(horizontal = 10.dp, vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, color = Color.White, fontWeight = FontWeight.Black, fontSize = 16.sp)
            Text(label, color = Color(0xFF9CA3AF), fontSize = 9.sp)
        }
    }
}

@Composable
private fun AdminGiftDialog(
    user: AdminRecentUser,
    loading: Boolean,
    onDismiss: () -> Unit,
    onGiftVerification: (String) -> Unit,
    onGiftFrame: (String, Int?) -> Unit,
    onGiftCustomBadge: (String, String) -> Unit
) {
    var giftTab by remember(user.id) { mutableIntStateOf(0) }
    var verificationColor by remember(user.id) { mutableStateOf(roleVerificationColor(user.role)) }
    var frameKey by remember(user.id) { mutableStateOf("fire") }
    var frameDays by remember(user.id) { mutableStateOf("30") }
    var badgeLabel by remember(user.id) { mutableStateOf("علامة مميزة") }
    var badgeColor by remember(user.id) { mutableStateOf("#7c3aed") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column {
                Text(user.fullName, fontWeight = FontWeight.Black)
                Text("@${user.username}", color = StudentMuted, fontSize = 11.sp)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("اختر الهدية التي تريد منحها للحساب.", color = StudentMuted, fontSize = 12.sp)
                TabRow(selectedTabIndex = giftTab, containerColor = Color.Transparent, contentColor = StudentBlue) {
                    Tab(selected = giftTab == 0, onClick = { giftTab = 0 }, text = { Text("توثيق", fontSize = 11.sp) })
                    Tab(selected = giftTab == 1, onClick = { giftTab = 1 }, text = { Text("إطار", fontSize = 11.sp) })
                    Tab(selected = giftTab == 2, onClick = { giftTab = 2 }, text = { Text("علامة", fontSize = 11.sp) })
                }

                when (giftTab) {
                    0 -> {
                        Text("لون التوثيق", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf("blue", "red", "orange").forEach { color ->
                                FilterChip(
                                    selected = verificationColor == color,
                                    onClick = { verificationColor = color },
                                    label = { Text(verificationColorLabel(color), fontSize = 10.sp) }
                                )
                            }
                        }
                    }
                    1 -> {
                        Text("نوع الإطار", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            listOf(
                                listOf("fire", "blue-fire", "neon"),
                                listOf("lightning", "royal", "ember")
                            ).forEach { rowKeys ->
                                Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                                    rowKeys.forEach { key ->
                                        FilterChip(
                                            selected = frameKey == key,
                                            onClick = { frameKey = key },
                                            label = { Text(frameShortLabel(key), fontSize = 9.sp) }
                                        )
                                    }
                                }
                            }
                        }
                        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                            StudentAvatar("S", null, "student-frame:$frameKey", 62.dp)
                        }
                        OutlinedTextField(
                            value = frameDays,
                            onValueChange = { frameDays = it.filter { ch -> ch.isDigit() }.take(4) },
                            label = { Text("المدة بالأيام — اتركها فارغة للدائم") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }
                    else -> {
                        OutlinedTextField(
                            value = badgeLabel,
                            onValueChange = { badgeLabel = it.take(40) },
                            label = { Text("اسم العلامة") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = badgeColor,
                            onValueChange = { badgeColor = it.take(20) },
                            label = { Text("اللون مثل #7c3aed") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    when (giftTab) {
                        0 -> onGiftVerification(verificationColor)
                        1 -> onGiftFrame(frameKey, frameDays.toIntOrNull()?.takeIf { it > 0 })
                        else -> onGiftCustomBadge(badgeLabel.trim(), badgeColor.trim())
                    }
                },
                enabled = !loading && (giftTab != 2 || badgeLabel.isNotBlank()),
                colors = ButtonDefaults.buttonColors(containerColor = StudentBlue)
            ) { Text(if (loading) "جارٍ الإرسال..." else "إرسال الهدية") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !loading) { Text("إغلاق") }
        }
    )
}


@Composable
private fun AdminDashboard(
    onOpenUsers:()->Unit,
    onOpenFeatures:()->Unit,
    onOpenTeachers:()->Unit,
    onOpenAds:()->Unit,
    onOpenLearnEnglish:()->Unit,
    onOpenEducation:()->Unit,
    onOpenStore:()->Unit,
    onOpenBroadcast:()->Unit,
    onOpenSupport:()->Unit,
    onOpenRooms:()->Unit,
    onOpenUpdate:()->Unit
) {
    val groups = listOf(
        "المستخدمون والحسابات" to listOf(
            Triple("المستخدمون", Icons.Rounded.People, onOpenUsers),
            Triple("طلبات المدرسين", Icons.Rounded.School, onOpenTeachers),
            Triple("التوثيق والدعم", Icons.Rounded.VerifiedUser, onOpenSupport)
        ),
        "المحتوى والتعليم" to listOf(
            Triple("التعليم", Icons.Rounded.MenuBook, onOpenEducation),
            Triple("Learn English", Icons.Rounded.Language, onOpenLearnEnglish)
        ),
        "المتجر والمالية" to listOf(
            Triple("المتجر والمدفوعات", Icons.Rounded.Storefront, onOpenStore),
            Triple("إدارة الغرف", Icons.Rounded.Groups, onOpenRooms)
        ),
        "التسويق والتواصل" to listOf(
            Triple("الإعلانات", Icons.Rounded.Campaign, onOpenAds),
            Triple("الإشعارات العامة", Icons.Rounded.NotificationsActive, onOpenBroadcast)
        ),
        "التحكم بالنظام" to listOf(
            Triple("الميزات والتحكم", Icons.Rounded.Tune, onOpenFeatures),
            Triple("التحديثات", Icons.Rounded.SystemUpdate, onOpenUpdate)
        )
    )
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 12.dp, horizontal = 2.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        groups.forEach { (groupTitle, groupItems) ->
            item(key = "header-$groupTitle") {
                Text(groupTitle, fontWeight = FontWeight.Black, fontSize = 15.sp, color = StudentMuted, modifier = Modifier.padding(top = 8.dp, bottom = 2.dp))
            }
            items(groupItems.size, key = { index -> "$groupTitle-${groupItems[index].first}" }) { index ->
                val item = groupItems[index]
                AdminDashboardItem(item.first, item.second, item.third)
            }
        }
        item { Spacer(Modifier.height(28.dp)) }
    }
}

@Composable
private fun AdminDashboardItem(title:String, icon:ImageVector, onClick:()->Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick=onClick),
        shape = RoundedCornerShape(18.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFE7EAF0)),
        shadowElevation = 0.dp
    ) {
        Row(Modifier.fillMaxWidth().padding(horizontal=14.dp,vertical=14.dp),verticalAlignment=Alignment.CenterVertically) {
            Surface(Modifier.size(44.dp),shape=RoundedCornerShape(14.dp),color=Color(0xFFF1ECFF)) {
                Box(contentAlignment=Alignment.Center){Icon(icon,null,tint=Color(0xFF6E42C1))}
            }
            Spacer(Modifier.width(12.dp))
            Text(title,Modifier.weight(1f),fontWeight=FontWeight.Black,color=StudentText)
            Icon(Icons.Rounded.ChevronRight,null,tint=StudentMuted)
        }
    }
}

@Composable
private fun AdminRoomsControl(api: SupabaseApi, session: StudentSession, onMessage:(String)->Unit) {
    val scope=rememberCoroutineScope()
    var settings by remember{mutableStateOf(VoiceRoomSettings())}
    var price by remember{mutableStateOf("100")}
    var micPrice by remember{mutableStateOf("50")}
    var tiers by remember{mutableStateOf<List<VoiceRoomCapacityTier>>(emptyList())}
    var loading by remember{mutableStateOf(true)}
    var confirmSave by remember{mutableStateOf(false)}
    fun reload(){ scope.launch{ loading=true; withContext(Dispatchers.IO){api.voiceRoomSettings(session)}.onSuccess{settings=it;price=it.creationPriceDiamonds.toString();micPrice=it.extraMicPriceDiamonds.toString()}; withContext(Dispatchers.IO){api.voiceRoomCapacityTiers(session)}.onSuccess{tiers=it}; loading=false } }
    LaunchedEffect(Unit){reload()}
    LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(vertical=10.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
        item{StudentOutlinedCard(Modifier.fillMaxWidth()){Column(Modifier.padding(14.dp),verticalArrangement=Arrangement.spacedBy(9.dp)){
            Text("إعدادات الغرف",fontWeight=FontWeight.Black,fontSize=19.sp)
            OutlinedTextField(price,{price=it.filter(Char::isDigit).take(7)},label={Text("سعر إنشاء الغرفة بالماس")},modifier=Modifier.fillMaxWidth())
            OutlinedTextField(micPrice,{micPrice=it.filter(Char::isDigit).take(7)},label={Text("سعر فتح مايك إضافي")},modifier=Modifier.fillMaxWidth())
            Row(verticalAlignment=Alignment.CenterVertically){Text("تفعيل الغرف",Modifier.weight(1f));Switch(settings.roomsEnabled,{settings=settings.copy(roomsEnabled=it)})}
            Row(verticalAlignment=Alignment.CenterVertically){Text("تفعيل الهدايا",Modifier.weight(1f));Switch(settings.giftsEnabled,{settings=settings.copy(giftsEnabled=it)})}
            Button(onClick={ if(!confirmSave){confirmSave=true;onMessage("اضغط حفظ مرة ثانية لتأكيد تغيير إعدادات الغرف.")} else scope.launch{loading=true;val next=settings.copy(creationPriceDiamonds=price.toIntOrNull()?:0,extraMicPriceDiamonds=micPrice.toIntOrNull()?:0,maxSpeakers=10);withContext(Dispatchers.IO){api.adminSetVoiceRoomSettingsV25(session,next)}.onSuccess{onMessage("تم تحديث إعدادات الغرف.");settings=next;confirmSave=false}.onFailure{onMessage(it.message?:"تعذر الحفظ")};loading=false}},enabled=!loading,modifier=Modifier.fillMaxWidth()){Text(if(confirmSave)"تأكيد الحفظ" else "حفظ الإعدادات")}
        }}}
        item{Text("توسعة السعة",fontWeight=FontWeight.Black,fontSize=18.sp)}
        items(tiers,key={it.capacity}){tier->StudentOutlinedCard(Modifier.fillMaxWidth()){Row(Modifier.padding(13.dp),verticalAlignment=Alignment.CenterVertically){Text("${tier.capacity} عضو",Modifier.weight(1f),fontWeight=FontWeight.Bold);Text("${tier.diamonds} ♦",color=StudentBlue)}}}
        item{Text("10 مايكات ثابتة: 5 أساسية و5 إضافية مدفوعة.",color=StudentMuted,fontSize=12.sp)}
    }
}

@Composable
private fun AdminUpdateControl(api:SupabaseApi, session:StudentSession, onMessage:(String)->Unit) {
    val scope=rememberCoroutineScope()
    var force by remember{mutableStateOf(false)}
    var minimum by remember{mutableStateOf("0")}
    var latest by remember{mutableStateOf("0")}
    var apkUrl by remember{mutableStateOf("")}
    var updateMessage by remember{mutableStateOf("يتوفر تحديث ضروري لمتابعة استخدام Student.")}
    var loading by remember{mutableStateOf(true)}

    LaunchedEffect(Unit){
        withContext(Dispatchers.IO){api.runtimeUpdateConfig()}
            .onSuccess{
                force=it.forceUpdate
                minimum=it.minimumVersionCode.toString()
                latest=it.latestVersionCode.toString()
                apkUrl=it.apkUrl
                updateMessage=it.message.ifBlank{updateMessage}
            }.onFailure{onMessage(it.message?:"تعذر تحميل إعدادات التحديث.")}
        loading=false
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding=PaddingValues(vertical=12.dp),
        verticalArrangement=Arrangement.spacedBy(10.dp)
    ){
        item{
            Surface(color=Color(0xFFFFF7E8),shape=RoundedCornerShape(16.dp),modifier=Modifier.fillMaxWidth()){
                Text("عند تفعيل التحديث الإجباري، أي نسخة أقل من أقل Version Code مسموح لن تدخل التطبيق حتى تتحدث.",Modifier.padding(13.dp),fontSize=12.sp,color=Color(0xFF7A4A00))
            }
        }
        item{
            Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically){
                Text("تحديث إجباري",Modifier.weight(1f),fontWeight=FontWeight.Bold)
                Switch(force,{force=it})
            }
        }
        item{OutlinedTextField(minimum,{minimum=it.filter(Char::isDigit).take(7)},label={Text("أقل Version Code مسموح")},modifier=Modifier.fillMaxWidth(),singleLine=true)}
        item{OutlinedTextField(latest,{latest=it.filter(Char::isDigit).take(7)},label={Text("Latest Version Code")},modifier=Modifier.fillMaxWidth(),singleLine=true)}
        item{OutlinedTextField(apkUrl,{apkUrl=it.take(800)},label={Text("رابط APK")},modifier=Modifier.fillMaxWidth(),singleLine=true)}
        item{OutlinedTextField(updateMessage,{updateMessage=it.take(500)},label={Text("رسالة التحديث")},modifier=Modifier.fillMaxWidth(),minLines=3)}
        item{
            Button(
                onClick={
                    scope.launch{
                        loading=true
                        val min=minimum.toIntOrNull()?:0
                        val last=(latest.toIntOrNull()?:min).coerceAtLeast(min)
                        withContext(Dispatchers.IO){api.adminSetRuntimeUpdate(session,force,min,last,apkUrl,updateMessage)}
                            .onSuccess{onMessage("تم حفظ إعدادات التحديث.")}
                            .onFailure{onMessage(it.message?:"تعذر حفظ إعدادات التحديث.")}
                        loading=false
                    }
                },
                enabled=!loading && (!force || apkUrl.isNotBlank()),
                modifier=Modifier.fillMaxWidth()
            ){Text(if(loading)"جارٍ الحفظ..." else "حفظ إعدادات التحديث")}
        }
    }
}

private fun roleVerificationColor(role: String): String = when (role.lowercase()) {
    "admin" -> "orange"
    "teacher" -> "red"
    else -> "blue"
}

private fun verificationColorLabel(color: String): String = when (color) {
    "orange" -> "برتقالي"
    "red" -> "أحمر"
    else -> "أزرق"
}

private fun frameShortLabel(key: String): String = when (key) {
    "fire" -> "نار"
    "blue-fire" -> "نار زرقاء"
    "neon" -> "نيون"
    "lightning" -> "برق"
    "royal" -> "ملكي"
    "ember" -> "جمر"
    else -> key
}
