package com.student.feature.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.student.core.data.StudentProfile
import com.student.core.data.StudentSession
import com.student.core.data.SupabaseApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun SettingsScreen(
    api: SupabaseApi,
    session: StudentSession,
    profile: StudentProfile?,
    offlineMode: Boolean,
    onRefresh: () -> Unit,
    onLogout: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var dataSaver by remember { mutableStateOf(true) }
    var autoRefresh by remember { mutableStateOf(true) }
    var dailyReminder by remember { mutableStateOf(true) }
    var logoutConfirm by remember { mutableStateOf(false) }
    var emailDialog by remember { mutableStateOf(false) }
    var passwordDialog by remember { mutableStateOf(false) }
    var newEmail by remember { mutableStateOf(profile?.email.orEmpty()) }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(session.userId) {
        withContext(Dispatchers.IO) { api.dailyLearningReminderEnabled(session) }.onSuccess { dailyReminder = it }
    }

    LaunchedEffect(message) {
        if (message != null) {
            kotlinx.coroutines.delay(3200)
            message = null
        }
    }

    if (logoutConfirm) {
        AlertDialog(
        modifier = Modifier.imePadding().navigationBarsPadding(),
            onDismissRequest = { logoutConfirm = false },
            title = { Text("تسجيل الخروج") },
            text = { Text("هل تريد تسجيل الخروج من Student؟") },
            confirmButton = {
                Button(onClick = { logoutConfirm = false; onLogout() }) { Text("تسجيل الخروج") }
            },
            dismissButton = { TextButton(onClick = { logoutConfirm = false }) { Text("إلغاء") } }
        )
    }

    if (emailDialog) {
        AlertDialog(
            onDismissRequest = { if (!busy) emailDialog = false },
            title = { Text("تغيير البريد الإلكتروني") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("قد يطلب Student تأكيد البريد الجديد قبل اعتماده.", style = MaterialTheme.typography.bodySmall)
                    OutlinedTextField(
                        value = newEmail,
                        onValueChange = { newEmail = it.trim().take(180) },
                        label = { Text("البريد الجديد") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    enabled = !busy && newEmail.contains("@"),
                    onClick = {
                        scope.launch {
                            busy = true
                            val r = withContext(Dispatchers.IO) { api.updateAccountEmail(session, newEmail) }
                            busy = false
                            r.onSuccess {
                                emailDialog = false
                                message = "تم إرسال طلب تغيير البريد. أكمل التأكيد إذا وصلك رابط."
                            }.onFailure { message = it.message ?: "تعذر تغيير البريد." }
                        }
                    }
                ) { Text(if (busy) "..." else "حفظ") }
            },
            dismissButton = { TextButton(enabled = !busy, onClick = { emailDialog = false }) { Text("إلغاء") } }
        )
    }

    if (passwordDialog) {
        AlertDialog(
            onDismissRequest = { if (!busy) passwordDialog = false },
            title = { Text("تغيير كلمة المرور") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = newPassword,
                        onValueChange = { newPassword = it.take(128) },
                        label = { Text("كلمة المرور الجديدة") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it.take(128) },
                        label = { Text("تأكيد كلمة المرور") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Text("8 أحرف على الأقل.", style = MaterialTheme.typography.bodySmall)
                }
            },
            confirmButton = {
                Button(
                    enabled = !busy && newPassword.length >= 8 && newPassword == confirmPassword,
                    onClick = {
                        scope.launch {
                            busy = true
                            val r = withContext(Dispatchers.IO) { api.updateAccountPassword(session, newPassword) }
                            busy = false
                            r.onSuccess {
                                newPassword = ""
                                confirmPassword = ""
                                passwordDialog = false
                                message = "تم تغيير كلمة المرور."
                            }.onFailure { message = it.message ?: "تعذر تغيير كلمة المرور." }
                        }
                    }
                ) { Text(if (busy) "..." else "تغيير") }
            },
            dismissButton = { TextButton(enabled = !busy, onClick = { passwordDialog = false }) { Text("إلغاء") } }
        )
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().navigationBarsPadding().padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("إعدادات Student", style = MaterialTheme.typography.headlineSmall)
        Text("الحساب: ${profile?.email.orEmpty()}")
        Text(if (offlineMode) "الحالة: Offline" else "الحالة: متصل")
        HorizontalDivider()

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text("توفير البيانات")
                Text("تقليل التحميل غير الضروري", style = MaterialTheme.typography.bodySmall)
            }
            Switch(checked = dataSaver, onCheckedChange = { dataSaver = it })
        }

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text("التحديث التلقائي")
                Text("تحديث المحتوى عند فتح الشاشة", style = MaterialTheme.typography.bodySmall)
            }
            Switch(checked = autoRefresh, onCheckedChange = { autoRefresh = it })
        }

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f)) {
                Text("تذكير التعلم اليومي")
                Text("إشعار يومي واحد لمتابعة الدرس أو المراجعة", style = MaterialTheme.typography.bodySmall)
            }
            Switch(checked = dailyReminder, onCheckedChange = { enabled ->
                dailyReminder = enabled
                scope.launch {
                    withContext(Dispatchers.IO) { api.setDailyLearningReminderEnabled(session, enabled) }
                        .onSuccess { message = if (enabled) "تم تفعيل التذكير اليومي." else "تم إيقاف التذكير اليومي." }
                        .onFailure { dailyReminder = !enabled; message = it.message ?: "تعذر تحديث التذكير." }
                }
            })
        }

        Button(onClick = onRefresh, modifier = Modifier.fillMaxWidth()) { Text("مزامنة الحساب الآن") }

        OutlinedButton(
            onClick = { newEmail = profile?.email.orEmpty(); emailDialog = true },
            modifier = Modifier.fillMaxWidth()
        ) { Text("تغيير البريد الإلكتروني") }

        OutlinedButton(
            onClick = { newPassword = ""; confirmPassword = ""; passwordDialog = true },
            modifier = Modifier.fillMaxWidth()
        ) { Text("تغيير كلمة المرور") }

        OutlinedButton(
            enabled = !busy && !profile?.email.isNullOrBlank(),
            onClick = {
                val accountEmail = profile?.email.orEmpty()
                scope.launch {
                    busy = true
                    val r = withContext(Dispatchers.IO) { api.sendPasswordRecovery(accountEmail) }
                    busy = false
                    r.onSuccess { message = "تم إرسال رابط استعادة كلمة المرور إلى بريدك." }
                        .onFailure { message = it.message ?: "تعذر إرسال رسالة الاستعادة." }
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) { Text("إرسال رابط استعادة كلمة المرور للبريد") }

        OutlinedButton(onClick = { logoutConfirm = true }, modifier = Modifier.fillMaxWidth()) {
            Text("تسجيل الخروج")
        }

        message?.let {
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = MaterialTheme.shapes.medium,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(it, Modifier.padding(12.dp))
            }
        }
    }
}
