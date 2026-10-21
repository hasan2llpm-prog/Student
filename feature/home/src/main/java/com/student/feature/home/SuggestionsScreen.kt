package com.student.feature.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun SuggestionsScreen(api: SupabaseApi, session: StudentSession, onOpenProfile: (String) -> Unit = {}) {
    val scope = rememberCoroutineScope()
    var items by remember { mutableStateOf<List<FollowSuggestion>>(emptyList()) }
    var busyId by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(message) { if (message != null) { kotlinx.coroutines.delay(2800); message = null } }

    fun refresh() {
        scope.launch {
            loading = true
            val r = withContext(Dispatchers.IO) { api.profileSuggestions(session, 30) }
            r.onSuccess { items = it; message = null }.onFailure { message = it.message ?: "تعذر تحميل اقتراحات المتابعة." }
            loading = false
        }
    }
    LaunchedEffect(session.userId) { refresh() }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text("اقتراحات المتابعة", fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleLarge)
                Text("اقتراحات حسب المحافظة والمدرسة والجامعة ونوع الحساب", color = StudentMuted, style = MaterialTheme.typography.bodySmall)
            }
            TextButton(onClick = { refresh() }, enabled = !loading) { Text("تحديث") }
        }
        message?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(horizontal = 14.dp)) }
        LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            items(items, key = { it.id }) { user ->
                var following by remember(user.id, user.isFollowing) { mutableStateOf(user.isFollowing) }
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Row(Modifier.fillMaxWidth().clickable { onOpenProfile(user.id) }.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        StudentAvatar(user.fullName, user.avatarUrl, user.profileFrameUrl, 52.dp)
                        Spacer(Modifier.width(9.dp))
                        Column(Modifier.weight(1f)) {
                            StudentName(user.fullName, user.isVerified, user.verificationColor)
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                                Text("@${user.username}", color = StudentMuted, style = MaterialTheme.typography.bodySmall)
                                Surface(shape = androidx.compose.foundation.shape.RoundedCornerShape(999.dp), color = if (user.role.equals("teacher", true)) Color(0xFFFFEAEA) else Color(0xFFEAF4FF)) {
                                    Text(if (user.role.equals("teacher", true)) "مدرس" else "طالب", Modifier.padding(horizontal = 6.dp, vertical = 2.dp), fontSize = 8.sp, color = if (user.role.equals("teacher", true)) Color(0xFFB32424) else StudentBlue)
                                }
                            }
                            if (user.commonReasons.isNotEmpty()) Text(user.commonReasons.take(2).joinToString(" • "), color = StudentMuted, style = MaterialTheme.typography.labelSmall)
                        }
                        Button(
                            onClick = {
                                scope.launch {
                                    busyId = user.id
                                    val next = !following
                                    val r = withContext(Dispatchers.IO) { api.setFollowing(session, user.id, next) }
                                    r.onSuccess { following = next }.onFailure { message = it.message }
                                    busyId = null
                                }
                            },
                            enabled = busyId != user.id,
                            colors = ButtonDefaults.buttonColors(containerColor = if (following) Color(0xFFE9EDF3) else StudentBlue, contentColor = if (following) StudentText else Color.White)
                        ) { Text(if (following) "متابَع" else "متابعة") }
                    }
                }
            }
            if (items.isEmpty() && !loading) item { Text("لا توجد اقتراحات كافية حاليًا. حدّث بيانات مرحلتك واهتماماتك من الملف الشخصي.", color = StudentMuted, modifier = Modifier.padding(14.dp)) }
        }
    }
}
