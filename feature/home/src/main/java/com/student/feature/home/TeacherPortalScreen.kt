package com.student.feature.home

import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.student.core.data.StudentProfile
import com.student.core.data.StudentSession
import com.student.core.data.TeacherRequest
import com.student.core.data.SupabaseApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun TeacherPortalScreen(api: SupabaseApi, session: StudentSession, profile: StudentProfile?) {
    val scope = rememberCoroutineScope()
    var request by remember { mutableStateOf<TeacherRequest?>(null) }
    var fullName by remember(profile?.fullName) { mutableStateOf(profile?.fullName.orEmpty()) }
    var subject by remember { mutableStateOf("") }
    var stage by remember { mutableStateOf("") }
    var experience by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(message) { if (message != null) { kotlinx.coroutines.delay(2800); message = null } }

    fun refresh() { scope.launch { request = withContext(Dispatchers.IO) { api.myTeacherRequest(session).getOrNull() } } }
    LaunchedEffect(session.userId) { refresh() }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .imePadding()
            .navigationBarsPadding()
            .padding(horizontal = 14.dp, vertical = 14.dp)
            .padding(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        if (profile?.role.equals("teacher", true)) {
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(18.dp)) {
                    Text("حساب مدرس", fontWeight = FontWeight.Black)
                    Text("صلاحيات المدرس مفعّلة، وتوثيق المدرس يظهر باللون الأحمر.", color = StudentMuted)
                }
            }
            TeacherEducationPublisher(api, session) { message = it }
            message?.let { Text(it, color = if (it.startsWith("تم")) Color(0xFF16803C) else MaterialTheme.colorScheme.error) }
            return@Column
        }

        request?.let { r ->
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text("طلب المدرس", fontWeight = FontWeight.Black)
                    Text("الحالة: ${teacherStatus(r.status)}", color = StudentBlue)
                    Text("المادة: ${r.subject}", color = StudentMuted)
                    r.adminNote?.takeIf { it.isNotBlank() }?.let { Text("ملاحظة الإدارة: $it") }
                    if (r.status == "pending") Text("لا يمكن إرسال طلب آخر قبل مراجعة الطلب الحالي.", color = StudentMuted)
                }
            }
            if (r.status == "pending" || r.status == "approved") return@Column
        }

        StudentOutlinedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                Text("لماذا تتقدم كمدرس؟", fontWeight = FontWeight.Black, color = StudentBlue)
                Text("بعد قبول الإدارة يصبح حسابك مدرسًا رسميًا في Student، وتظهر صفة مدرس بجانب اسمك وشارة المدرس الحمراء.", color = StudentMuted)
                Text("بعد إطلاق نظام التعليم الكامل ستحصل على صلاحيات نشر الدروس والملفات والشرح، إدارة محتواك التعليمي، والوصول إلى أدوات المدرسين الجديدة التي نفعّلها من السيرفر.", color = StudentMuted)
                Text("التقديم مجاني، والقبول يتم بعد مراجعة المعلومات من الإدارة.", color = Color(0xFF16803C), fontWeight = FontWeight.Bold)
            }
        }
        Text("التقديم كمدرس", fontWeight = FontWeight.Black)
        OutlinedTextField(fullName, { fullName = it.take(100) }, label = { Text("الاسم الكامل") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(subject, { subject = it.take(100) }, label = { Text("مادة التدريس") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(stage, { stage = it.take(100) }, label = { Text("المرحلة التي تدرّسها") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(experience, { experience = it.take(1000) }, label = { Text("الخبرة") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
        OutlinedTextField(note, { note = it.take(1000) }, label = { Text("ملاحظات إضافية") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
        Button(
            onClick = {
                if (busy || fullName.isBlank() || subject.isBlank() || stage.isBlank()) return@Button
                scope.launch {
                    busy = true; message = null
                    val r = withContext(Dispatchers.IO) { api.submitTeacherRequest(session, fullName.trim(), subject.trim(), stage.trim(), experience.trim(), note.trim()) }
                    r.onSuccess { message = "تم إرسال طلب المدرس للإدارة."; refresh() }.onFailure { message = it.message }
                    busy = false
                }
            },
            modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = StudentBlue)
        ) { Text(if (busy) "جارٍ الإرسال..." else "إرسال طلب المدرس") }
        message?.let { Text(it, color = if (it.startsWith("تم")) Color(0xFF16803C) else MaterialTheme.colorScheme.error) }
    }
}

private fun teacherStatus(status: String) = when (status.lowercase()) {
    "pending" -> "قيد المراجعة"
    "approved" -> "تمت الموافقة"
    "rejected" -> "مرفوض"
    else -> status
}

@Composable
private fun TeacherEducationPublisher(api: SupabaseApi, session: StudentSession, onMessage: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    var subjectId by remember { mutableStateOf("") }
    var universityLevelId by remember { mutableStateOf("") }
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var materialType by remember { mutableStateOf("text") }
    var url by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }

    StudentOutlinedCard(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("إضافة درس/شرح", fontWeight = FontWeight.Black)
            Text("يُنشر مباشرة من Supabase بعد تحقق الخادم من صلاحية المدرس؛ لا يحتاج إصدار APK جديد.", color = StudentMuted)
            OutlinedTextField(subjectId, { subjectId = it.trim().take(80) }, label = { Text("Subject ID") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            OutlinedTextField(universityLevelId, { universityLevelId = it.trim().take(80) }, label = { Text("University Level ID — اختياري") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            OutlinedTextField(title, { title = it.take(160) }, label = { Text("عنوان الدرس") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(description, { description = it.take(4000) }, label = { Text("الشرح") }, modifier = Modifier.fillMaxWidth(), minLines = 4)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("text", "link", "video", "pdf").forEach { value ->
                    FilterChip(selected = materialType == value, onClick = { materialType = value }, label = { Text(value) })
                }
            }
            OutlinedTextField(url, { url = it.take(600) }, label = { Text("رابط خارجي — اختياري") }, modifier = Modifier.fillMaxWidth())
            Button(
                onClick = {
                    if (subjectId.isBlank() || title.isBlank() || busy) return@Button
                    scope.launch {
                        busy = true
                        val result = withContext(Dispatchers.IO) {
                            api.publishEducationMaterial(
                                session, subjectId.trim(), title.trim(), description.trim(), materialType,
                                url.trim().ifBlank { null }, universityLevelId.trim().ifBlank { null }
                            )
                        }
                        busy = false
                        result.onSuccess {
                            title = ""; description = ""; url = ""
                            onMessage("تم نشر المحتوى التعليمي.")
                        }.onFailure { onMessage(it.message ?: "تعذر نشر المحتوى.") }
                    }
                },
                enabled = !busy && subjectId.isNotBlank() && title.isNotBlank(),
                modifier = Modifier.fillMaxWidth()
            ) { Text(if (busy) "جارٍ النشر..." else "نشر الدرس") }
        }
    }
}

