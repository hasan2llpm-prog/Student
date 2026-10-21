package com.student.feature.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.student.core.data.StudentSession
import com.student.core.data.SupabaseApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun AcademicReportsScreen(api: SupabaseApi, session: StudentSession) {
    val scope = rememberCoroutineScope()
    val clipboard = LocalClipboardManager.current
    val departments = listOf("اللغة الإنجليزية", "الرياضيات", "علوم الحاسوب", "الفيزياء", "الكيمياء", "الأحياء", "الهندسة", "الطب", "القانون", "إدارة الأعمال", "الاقتصاد", "التربية", "أخرى")
    var department by remember { mutableStateOf(departments.first()) }
    var customDepartment by remember { mutableStateOf("") }
    var topic by remember { mutableStateOf("") }
    var language by remember { mutableStateOf("العربية") }
    var pages by remember { mutableIntStateOf(4) }
    var citationStyle by remember { mutableStateOf("APA") }
    var mode by remember { mutableStateOf("free") }
    var loading by remember { mutableStateOf(false) }
    var title by remember { mutableStateOf("") }
    var report by remember { mutableStateOf("") }
    var status by remember { mutableStateOf<String?>(null) }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Surface(shape = RoundedCornerShape(24.dp), color = StudentText, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Academic Report Studio", color = androidx.compose.ui.graphics.Color.White, fontWeight = FontWeight.Black, fontSize = 22.sp)
                    Text("تقارير جامعية احترافية لكل الأقسام • مجاني محدود + احترافي", color = androidx.compose.ui.graphics.Color(0xFFD1D5DB), fontSize = 12.sp)
                }
            }
        }
        item {
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("1. اختر القسم", fontWeight = FontWeight.Black)
                    departments.chunked(3).forEach { row ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            row.forEach { d ->
                                FilterChip(selected = department == d, onClick = { department = d }, label = { Text(d, maxLines = 1, fontSize = 10.sp) }, modifier = Modifier.weight(1f))
                            }
                            repeat(3-row.size) { Spacer(Modifier.weight(1f)) }
                        }
                    }
                    if (department == "أخرى") OutlinedTextField(customDepartment, { customDepartment = it }, label = { Text("اسم القسم") }, modifier = Modifier.fillMaxWidth(), singleLine = true)

                    OutlinedTextField(topic, { topic = it }, label = { Text("موضوع التقرير") }, placeholder = { Text("مثال: تطبيقات الذكاء الاصطناعي في التعليم") }, modifier = Modifier.fillMaxWidth(), minLines = 2)

                    Text("2. اللغة", fontWeight = FontWeight.Black)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(language=="العربية", {language="العربية"}, {Text("عربي")})
                        FilterChip(language=="English", {language="English"}, {Text("English")})
                    }

                    Text("3. عدد الصفحات التقريبي: $pages", fontWeight = FontWeight.Black)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(2,4,6,8,10).forEach { n -> FilterChip(pages==n, {pages=n}, {Text(n.toString())}) }
                    }

                    Text("4. المراجع", fontWeight = FontWeight.Black)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("APA","MLA","Chicago").forEach { s -> FilterChip(citationStyle==s, {citationStyle=s}, {Text(s)}) }
                    }

                    Text("5. نوع التوليد", fontWeight = FontWeight.Black)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(mode=="free", {mode="free"}, {Text("مجاني")}, leadingIcon={Icon(Icons.Rounded.AutoAwesome,null)}, modifier=Modifier.weight(1f))
                        FilterChip(mode=="premium", {mode="premium"}, {Text("احترافي")}, leadingIcon={Icon(Icons.Rounded.WorkspacePremium,null)}, modifier=Modifier.weight(1f))
                    }
                    Text(if(mode=="free") "الوضع المجاني يخضع للحصة اليومية المتاحة." else "الوضع الاحترافي يستخدم نموذجاً أقوى ويستهلك Report Credit واحد.", color = StudentMuted, fontSize = 11.sp)

                    Button(
                        onClick = {
                            scope.launch {
                                loading = true; status = null; report = ""
                                val dep = if (department == "أخرى") customDepartment.trim() else department
                                val result = withContext(Dispatchers.IO) { api.generateAcademicReport(session, dep, topic, language, pages, citationStyle, mode) }
                                result.onSuccess {
                                    title = it.title; report = it.content
                                    status = when {
                                        it.remainingFree != null -> "المتبقي المجاني اليوم: ${it.remainingFree}"
                                        it.remainingCredits != null -> "رصيد التقارير الاحترافية: ${it.remainingCredits}"
                                        else -> "تم إنشاء التقرير."
                                    }
                                }.onFailure { status = it.message ?: "تعذر إنشاء التقرير." }
                                loading = false
                            }
                        },
                        enabled = !loading && topic.trim().length >= 3 && (department != "أخرى" || customDepartment.isNotBlank()),
                        modifier = Modifier.fillMaxWidth().height(52.dp)
                    ) {
                        if (loading) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth=2.dp) else Icon(Icons.Rounded.Description, null)
                        Spacer(Modifier.width(8.dp)); Text(if(loading) "جاري إعداد التقرير..." else "إنشاء التقرير")
                    }
                    status?.let { Text(it, color = if(report.isNotBlank()) StudentBlue else MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold, fontSize = 12.sp) }
                }
            }
        }
        if (report.isNotBlank()) {
            item {
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) { Text(title, fontWeight = FontWeight.Black, fontSize = 20.sp); Text("تقرير مولّد بواسطة Student", color=StudentMuted, fontSize=11.sp) }
                            IconButton(onClick = { clipboard.setText(AnnotatedString("$title\n\n$report")); status="تم نسخ التقرير." }) { Icon(Icons.Rounded.ContentCopy, "نسخ") }
                        }
                        HorizontalDivider(color = StudentBorder)
                        Text(report, color = StudentText, lineHeight = 23.sp)
                    }
                }
            }
        }
    }
}
