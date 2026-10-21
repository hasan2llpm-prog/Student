package com.student.feature.home

import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun ProfileScreen(
    api: SupabaseApi,
    session: StudentSession,
    profile: StudentProfile?,
    loadingProfile: Boolean,
    onProfileChanged: (StudentProfile) -> Unit,
    onRefreshProfile: () -> Unit,
    onOpenSupport: () -> Unit = {},
    onCreatePost: () -> Unit = {},
    onOpenVerificationPurchase: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var editing by remember { mutableStateOf(false) }
    var fullName by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var bio by remember { mutableStateOf("") }
    var governorate by remember { mutableStateOf("") }
    var schoolName by remember { mutableStateOf("") }
    var universityName by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("public") }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var stats by remember { mutableStateOf(ProfileStats()) }
    var avatarPreview by remember { mutableStateOf<String?>(null) }
    var verificationOpen by remember { mutableStateOf(false) }
    var verificationStatus by remember { mutableStateOf<VerificationRequestItem?>(null) }
    var verificationReason by remember { mutableStateOf("") }
    var profilePosts by remember { mutableStateOf<List<PostItem>>(emptyList()) }
    var selectedPost by remember { mutableStateOf<PostItem?>(null) }
    var shortUsernameAllowed by remember { mutableStateOf(false) }
    LaunchedEffect(message) { if (message != null) { delay(3200); message = null } }

    BackHandler(enabled = editing || verificationOpen) {
        if (verificationOpen) verificationOpen = false else editing = false
        message = null
    }

    fun refreshVerification() {
        scope.launch {
            verificationStatus = withContext(Dispatchers.IO) { api.verificationRequestStatus(session).getOrNull() }
        }
    }

    LaunchedEffect(profile?.id, profile?.fullName, profile?.username, profile?.bio, profile?.accountStatus, profile?.governorate, profile?.schoolName, profile?.universityName) {
        profile?.let {
            fullName = it.fullName
            username = it.username
            bio = it.bio
            governorate = it.governorate
            schoolName = it.schoolName
            universityName = it.universityName
            status = it.accountStatus
            withContext(Dispatchers.IO) { api.profileStats(session, it.id) }.onSuccess { value -> stats = value }
            withContext(Dispatchers.IO) { api.userPosts(session, it.id, 30) }.onSuccess { rows -> profilePosts = rows }
            refreshVerification()
            shortUsernameAllowed = withContext(Dispatchers.IO) { api.shortUsernameEntitled(session).getOrDefault(false) }
        }
    }

    val avatarPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { picked ->
        if (picked != null && profile != null) {
            scope.launch {
                busy = true
                val result = withContext(Dispatchers.IO) {
                    runCatching {
                        val mime = context.contentResolver.getType(picked) ?: "image/jpeg"
                        val ext = when { mime.contains("png") -> "png"; mime.contains("webp") -> "webp"; else -> "jpg" }
                        val temp = try {
                            materializeUriToCacheFile(context, picked, ext, 5L * 1024L * 1024L)
                        } catch (t: IllegalStateException) {
                            if (t.message == "حجم الملف أكبر من الحد المسموح.") throw IllegalStateException("الصورة يجب أن تكون أقل من 5MB.")
                            throw t
                        }
                        val path = "${session.userId}/${System.currentTimeMillis()}.$ext"
                        var committed = false
                        try {
                            val url = api.uploadObjectFile(session, "avatars", path, temp, mime).getOrThrow()
                            api.updateAvatar(session, url).getOrThrow()
                            committed = true
                            api.profile(session).getOrThrow()
                        } finally {
                            temp.delete()
                            if (!committed) api.deleteObject(session, "avatars", path)
                        }
                    }
                }
                result.onSuccess { onProfileChanged(it); message = "تم تحديث صورة الحساب." }
                    .onFailure { message = it.message ?: "تعذر تحديث الصورة." }
                busy = false
            }
        }
    }

    avatarPreview?.let { url -> StudentImageViewer(url, "profile-${session.userId}.jpg", { avatarPreview = null }) }

    if (verificationOpen && profile != null) {
        AlertDialog(
        modifier = Modifier.imePadding().navigationBarsPadding(),
            onDismissRequest = { if (!busy) verificationOpen = false },
            title = { Text("الحصول على شارة تحقق", fontWeight = FontWeight.Black) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("مزايا الحساب الموثق", color = StudentBlue, fontWeight = FontWeight.Bold)
                    VerificationBenefit("شارة تحقق واضحة بجانب اسمك")
                    VerificationBenefit("فتح قسم دعم مخصص داخل التطبيق")
                    VerificationBenefit("إمكانية إنشاء مجموعات وقنوات بعد دفع سعر الألماس المحدد")
                    VerificationBenefit("إبراز منشوراتك وتفاعلاتك داخل المجتمع")
                    VerificationBenefit("مزايا إضافية نفعّلها لاحقًا من لوحة الإدارة")
                    verificationStatus?.let { r ->
                        Surface(color = if (r.status == "pending") Color(0xFFFFF6DF) else Color(0xFFF1F4F8), shape = RoundedCornerShape(12.dp)) {
                            Text("حالة آخر طلب: ${verificationStatusText(r.status)}", Modifier.padding(10.dp), fontWeight = FontWeight.Bold)
                        }
                    }
                    OutlinedTextField(
                        verificationReason,
                        { verificationReason = it.take(1500) },
                        label = { Text("لماذا تريد توثيق الحساب؟") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3
                    )
                }
            },
            confirmButton = {
                Button(
                    enabled = !busy && verificationStatus?.status != "pending",
                    onClick = {
                        scope.launch {
                            busy = true
                            val r = withContext(Dispatchers.IO) {
                                api.submitVerificationRequest(session, profile.fullName, profile.governorate, profile.schoolName, profile.universityName, verificationReason.trim())
                            }
                            busy = false
                            r.onSuccess { message = "تم إرسال طلب التوثيق للإدارة."; verificationOpen = false; verificationReason = ""; refreshVerification() }
                                .onFailure { message = it.message ?: "تعذر إرسال طلب التوثيق." }
                        }
                    }
                ) { Text(if (verificationStatus?.status == "pending") "الطلب قيد المراجعة" else "إرسال الطلب") }
            },
            dismissButton = { TextButton(onClick = { verificationOpen = false }, enabled = !busy) { Text("إغلاق") } }
        )
    }

    selectedPost?.let { post ->
        PostDetailScreen(api, session, post, onBack = { selectedPost = null })
        return
    }

    if (loadingProfile || profile == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(Color(0xFFF5F7FA)),
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = Color.White), border = BorderStroke(1.dp, StudentBorder)) {
            Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.clickable(enabled = !profile.avatarUrl.isNullOrBlank()) { profile.avatarUrl?.let { avatarPreview = it } }) {
                        StudentAvatar(profile.fullName, profile.avatarUrl, profile.profileFrameUrl, 88.dp)
                    }
                    Spacer(Modifier.width(18.dp))
                    Row(Modifier.weight(1f), horizontalArrangement = Arrangement.SpaceEvenly) {
                        ProfileStat(stats.posts, "المنشورات")
                        ProfileStat(stats.followers, "المتابعون")
                        ProfileStat(stats.following, "يتابع")
                    }
                }
                StudentName(profile.fullName, profile.isVerified, profile.verificationColor, style = MaterialTheme.typography.titleLarge)
                Text("@${profile.username}", color = StudentMuted, fontSize = 13.sp)
                if (profile.bio.isNotBlank() && !editing) Text(profile.bio, lineHeight = 21.sp)
                if (!profile.customBadgeLabel.isNullOrBlank()) CustomProfileBadge(profile.customBadgeLabel, profile.customBadgeColor)
                if (!editing) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { editing = true }, modifier = Modifier.height(40.dp), contentPadding = PaddingValues(horizontal = 12.dp), colors = ButtonDefaults.buttonColors(containerColor = StudentBlue)) { Text("تعديل الملف", fontSize = 12.sp) }
                        OutlinedButton(onClick = onCreatePost, modifier = Modifier.weight(1f)) { Icon(Icons.Rounded.Add, null); Spacer(Modifier.width(4.dp)); Text("نشر") }
                        OutlinedButton(onClick = { avatarPicker.launch("image/*") }, enabled = !busy, modifier = Modifier.weight(1f)) { Icon(Icons.Rounded.Person, null); Spacer(Modifier.width(4.dp)); Text("الصورة") }
                    }
                }
            }
            }
        }

        if (!editing) {
            item {
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("معلومات الملف", fontWeight = FontWeight.Black, fontSize = 16.sp)
                        ProfileInfoRow(Icons.Rounded.Badge, "الصفة", if (profile.role.equals("teacher", true)) "مدرس" else "طالب")
                        ProfileInfoRow(Icons.Rounded.LocationOn, "المحافظة", profile.governorate.ifBlank { "غير محددة" })
                        ProfileInfoRow(Icons.Rounded.School, "المدرسة", profile.schoolName.ifBlank { "اختياري" })
                        ProfileInfoRow(Icons.Rounded.AccountBalance, "الجامعة", profile.universityName.ifBlank { "اختياري" })
                    }
                }
            }
            if (!profile.isVerified) {
                item {
                    Button(onClick = onOpenVerificationPurchase, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = StudentGold, contentColor = StudentBlueDark)) {
                        Icon(Icons.Rounded.Verified, null); Spacer(Modifier.width(7.dp)); Text("الحصول على شارة تحقق")
                    }
                }
            } else {
                item { Surface(color = Color(0xFFE1F3F0), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) { Text("حسابك موثق — مزايا التوثيق مفعّلة.", Modifier.padding(14.dp), color = StudentTeal, fontWeight = FontWeight.Bold) } }
                item { Button(onClick = onOpenSupport, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1F7A55))) { Icon(Icons.Rounded.SupportAgent, null); Spacer(Modifier.width(7.dp)); Text("الدعم داخل التطبيق") } }
            }
            item { OutlinedButton(onClick = onRefreshProfile, modifier = Modifier.fillMaxWidth()) { Text("تحديث بيانات الملف") } }
        } else {
            item {
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(11.dp)) {
                        Text("تعديل الملف الشخصي", fontWeight = FontWeight.Black, fontSize = 18.sp)
                        Text("الاسم، اليوزر والمحافظة مطلوبة حتى تظهر اقتراحات المتابعة بدقة.", color = StudentMuted, fontSize = 12.sp)
                        OutlinedTextField(fullName, { fullName = it.take(100) }, label = { Text("الاسم الكامل *") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                        OutlinedTextField(username, { username = it.filterNot(Char::isWhitespace).take(30) }, label = { Text("اسم المستخدم *") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                        OutlinedTextField(bio, { bio = it.take(500) }, label = { Text("النبذة") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
                        OutlinedTextField(governorate, { governorate = it.take(80) }, label = { Text("المحافظة *") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                        OutlinedTextField(schoolName, { schoolName = it.take(140) }, label = { Text("المدرسة — اختياري") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                        OutlinedTextField(universityName, { universityName = it.take(140) }, label = { Text("الجامعة — اختياري") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                        Text("خصوصية الحساب", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilterChip(status == "public", { status = "public" }, { Text("عام") })
                            FilterChip(status == "private", { status = "private" }, { Text("خاص") })
                        }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { editing = false }, enabled = !busy, modifier = Modifier.weight(1f)) { Text("إلغاء") }
                            Button(
                                onClick = {
                                    if (fullName.isBlank() || username.isBlank() || governorate.isBlank()) { message = "الاسم واليوزر والمحافظة مطلوبة."; return@Button }
                                    val cleanUsername = username.trim().removePrefix("@").lowercase()
                                    val usernameChanged = cleanUsername != profile.username.trim().removePrefix("@").lowercase()
                                    if (cleanUsername.length < 3 || (usernameChanged && cleanUsername.length == 3 && !shortUsernameAllowed)) {
                                        message = "اسم المستخدم يجب أن يكون 4 أحرف على الأقل."
                                        return@Button
                                    }
                                    scope.launch {
                                        busy = true
                                        val r = withContext(Dispatchers.IO) { api.updateProfile(session, fullName.trim(), username.trim(), bio.trim(), status, governorate.trim(), schoolName.trim(), universityName.trim()) }
                                        r.onSuccess {
                                            api.profile(session).onSuccess(onProfileChanged)
                                            editing = false
                                            message = "تم حفظ الملف وربطه بالاقتراحات."
                                        }.onFailure { message = it.message ?: "تعذر حفظ الملف." }
                                        busy = false
                                    }
                                },
                                enabled = !busy,
                                modifier = Modifier.weight(1f)
                            ) { Text(if (busy) "جارٍ الحفظ..." else "حفظ") }
                        }
                    }
                }
            }
        }
        if (!editing) {
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
                        Box(Modifier.weight(1f).fillMaxHeight().padding(1.dp).background(Color(0xFFF3F4F6)).then(if (post != null) Modifier.clickable { selectedPost = post } else Modifier), contentAlignment = Alignment.Center) {
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
            if (profilePosts.isEmpty()) item { Text("لا توجد منشورات بعد. استخدم زر نشر لإضافة أول منشور.", color = StudentMuted, fontSize = 12.sp) }
        }
        message?.let { item { Text(it, color = if (it.startsWith("تم") || it.contains("موثق")) Color(0xFF16803C) else MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold) } }
    }
}

@Composable private fun VerificationBenefit(text: String) { Row(verticalAlignment = Alignment.Top) { Icon(Icons.Rounded.CheckCircle, null, tint = Color(0xFF169A59), modifier = Modifier.size(18.dp)); Spacer(Modifier.width(7.dp)); Text(text, fontSize = 13.sp) } }
private fun verificationStatusText(s: String) = when(s.lowercase()) { "pending" -> "قيد المراجعة"; "approved" -> "مقبول"; "rejected" -> "مرفوض"; else -> s }

@Composable private fun ProfileInfoCard(title: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    StudentOutlinedCard(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Row(verticalAlignment = Alignment.CenterVertically) { Icon(icon, null, tint = StudentBlue); Spacer(Modifier.width(7.dp)); Text(title, fontWeight = FontWeight.Bold) }; Spacer(Modifier.height(7.dp)); Text(value, color = Color(0xFF44515F), lineHeight = 22.sp) } }
}
@Composable private fun ProfileInfoRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) { Row(verticalAlignment = Alignment.CenterVertically) { Icon(icon,null,tint=StudentBlue,modifier=Modifier.size(20.dp)); Spacer(Modifier.width(8.dp)); Column { Text(label,fontSize=11.sp,color=StudentMuted); Text(value,fontWeight=FontWeight.Bold) } } }

@Composable private fun ProfileStat(value: Int, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value.toString(), fontWeight = FontWeight.Black, fontSize = 18.sp)
        Text(label, color = StudentMuted, fontSize = 11.sp)
    }
}

@Composable
fun ProfilePostMiniCard(post: PostItem) {
    StudentOutlinedCard(Modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (post.content.isNotBlank()) Text(post.content, fontSize = 14.sp)
            post.mediaUrl?.takeIf { it.isNotBlank() }?.let { url ->
                if (post.postType.equals("video", true) || post.mediaMime?.startsWith("video/") == true) {
                    CommunityVideoPlayer(post)
                } else {
                    AsyncImage(
                        model = url,
                        contentDescription = "صورة المنشور",
                        modifier = Modifier.fillMaxWidth().heightIn(min = 160.dp, max = 420.dp),
                        contentScale = ContentScale.Crop
                    )
                }
            }
            Text(prettyTime(post.createdAt), color = StudentMuted, fontSize = 11.sp)
        }
    }
}
