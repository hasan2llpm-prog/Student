package com.student.feature.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun ResetPasswordScreen(
    busy: Boolean,
    message: String?,
    onSave: (String) -> Unit,
    onCancel: () -> Unit
) {
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var localMessage by remember { mutableStateOf<String?>(null) }
    var confirmSave by remember { mutableStateOf(false) }

    Surface(Modifier.fillMaxSize(), color = Color.White) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .imePadding()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                "Student",
                color = Color(0xFF152238),
                fontSize = 34.sp,
                fontWeight = FontWeight.Black
            )
            Spacer(Modifier.height(8.dp))
            Text("تعيين كلمة مرور جديدة", fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Text("اكتب كلمة مرور جديدة لحسابك ثم أكدها.", color = Color(0xFF77818C), fontSize = 12.sp)
            Spacer(Modifier.height(20.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, Color(0xFFE1E5EA)),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(Modifier.padding(18.dp)) {
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it; localMessage = null },
                        label = { Text("كلمة المرور الجديدة") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        enabled = !busy,
                        shape = RoundedCornerShape(13.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it; localMessage = null },
                        label = { Text("تأكيد كلمة المرور") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        enabled = !busy,
                        shape = RoundedCornerShape(13.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    (localMessage ?: message)?.let {
                        Spacer(Modifier.height(10.dp))
                        Text(
                            it,
                            color = if (it.startsWith("تم")) Color(0xFF16803C) else MaterialTheme.colorScheme.error,
                            fontSize = 12.sp
                        )
                    }

                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = {
                            localMessage = null
                            when {
                                password.length < 8 -> localMessage = "كلمة المرور يجب أن تكون 8 أحرف على الأقل."
                                password != confirmPassword -> localMessage = "كلمتا المرور غير متطابقتين."
                                else -> confirmSave = true
                            }
                        },
                        enabled = !busy && password.length >= 8 && confirmPassword.isNotBlank(),
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(13.dp)
                    ) {
                        if (busy) CircularProgressIndicator(Modifier.size(21.dp), strokeWidth = 2.dp, color = Color.White)
                        else Text("حفظ كلمة المرور", fontWeight = FontWeight.Bold)
                    }
                    TextButton(
                        onClick = onCancel,
                        enabled = !busy,
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    ) { Text("العودة لتسجيل الدخول") }
                }
            }
        }
    }

    if (confirmSave) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Column(Modifier.fillMaxSize()) {
                Row(Modifier.fillMaxWidth().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    TextButton(enabled = !busy, onClick = { confirmSave = false }) { Text("رجوع") }
                    Text("تأكيد تغيير كلمة المرور", fontWeight = FontWeight.Black)
                }
                HorizontalDivider()
                Column(Modifier.weight(1f).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("هل تريد اعتماد كلمة المرور الجديدة لهذا الحساب؟")
                    Spacer(Modifier.weight(1f))
                    Button(
                        enabled = !busy,
                        onClick = { confirmSave = false; onSave(password) },
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("تأكيد") }
                    OutlinedButton(enabled = !busy, onClick = { confirmSave = false }, modifier = Modifier.fillMaxWidth()) { Text("إلغاء") }
                }
            }
        }
    }
}
