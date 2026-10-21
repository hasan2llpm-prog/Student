package com.student.feature.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun AuthScreen(
    busy: Boolean,
    message: String?,
    onLogin: (String, String) -> Unit,
    onRegister: (String, String, String, String) -> Unit,
    onForgotPassword: (String) -> Unit
) {
    var register by remember { mutableStateOf(false) }
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var requestedRole by remember { mutableStateOf("student") }
    var localMessage by remember { mutableStateOf<String?>(null) }

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
                color = Color(0xFF6D28D9),
                fontSize = 34.sp,
                fontWeight = FontWeight.Black,
                fontStyle = FontStyle.Italic
            )
            Text("منصة الطالب التعليمية", color = Color(0xFF77818C), fontSize = 12.sp)
            Spacer(Modifier.height(20.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, Color(0xFFE1E5EA)),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(Modifier.padding(18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(if (register) "إنشاء حساب جديد" else "تسجيل الدخول", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(16.dp))
                    if (register) {
                        OutlinedTextField(
                            value = fullName,
                            onValueChange = { fullName = it },
                            label = { Text("الاسم الكامل") },
                            enabled = !busy,
                            singleLine = true,
                            shape = RoundedCornerShape(13.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(Modifier.height(10.dp))
                        Text("نوع الحساب", fontWeight = FontWeight.Bold, modifier = Modifier.fillMaxWidth())
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilterChip(selected = requestedRole == "student", onClick = { requestedRole = "student" }, label = { Text("طالب") })
                            FilterChip(selected = requestedRole == "teacher", onClick = { requestedRole = "teacher" }, label = { Text("أرغب أن أصبح مدرسًا") })
                        }
                        if (requestedRole == "teacher") {
                            Text("سيُنشأ الحساب كطالب أولًا، ثم ترسل طلب مدرس للمراجعة من داخل التطبيق.", color = Color(0xFF77818C), fontSize = 11.sp)
                        }
                        Spacer(Modifier.height(10.dp))
                    }
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("البريد الإلكتروني") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        singleLine = true,
                        enabled = !busy,
                        shape = RoundedCornerShape(13.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("كلمة المرور") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        enabled = !busy,
                        shape = RoundedCornerShape(13.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                    if (!register) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                            TextButton(
                                enabled = !busy,
                                onClick = {
                                    val clean = email.trim()
                                    if (!clean.contains("@") || !clean.contains(".")) {
                                        localMessage = "اكتب بريدك الإلكتروني أولًا."
                                    } else {
                                        localMessage = null
                                        onForgotPassword(clean)
                                    }
                                }
                            ) { Text("نسيت كلمة المرور؟") }
                        }
                    }
                    if (register) {
                        Spacer(Modifier.height(10.dp))
                        OutlinedTextField(
                            value = confirmPassword,
                            onValueChange = { confirmPassword = it },
                            label = { Text("تأكيد كلمة المرور") },
                            visualTransformation = PasswordVisualTransformation(),
                            singleLine = true,
                            enabled = !busy,
                            shape = RoundedCornerShape(13.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    (localMessage ?: message)?.let {
                        Spacer(Modifier.height(10.dp))
                        Text(it, color = if (it.startsWith("تم")) Color(0xFF16803C) else MaterialTheme.colorScheme.error, fontSize = 12.sp)
                    }
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = {
                            localMessage = null
                            if (register) {
                                when {
                                    password.length < 6 -> localMessage = "كلمة المرور يجب أن تكون 6 أحرف على الأقل."
                                    password != confirmPassword -> localMessage = "كلمتا المرور غير متطابقتين."
                                    else -> onRegister(fullName.trim(), email.trim(), password, requestedRole)
                                }
                            } else onLogin(email.trim(), password)
                        },
                        enabled = !busy && email.isNotBlank() && password.length >= 6 && (!register || fullName.isNotBlank()),
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(13.dp)
                    ) {
                        if (busy) CircularProgressIndicator(Modifier.size(21.dp), strokeWidth = 2.dp, color = Color.White)
                        else Text(if (register) "إنشاء الحساب" else "دخول", fontWeight = FontWeight.Bold)
                    }
                    TextButton(onClick = { register = !register; localMessage = null }, enabled = !busy) {
                        Text(if (register) "لديك حساب؟ تسجيل الدخول" else "ليس لديك حساب؟ إنشاء حساب")
                    }
                }
            }
        }
    }
}
