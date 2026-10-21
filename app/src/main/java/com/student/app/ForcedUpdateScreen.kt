package com.student.app

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class ForcedUpdateInfo(
    val minimumVersionCode: Int,
    val latestVersionCode: Int,
    val apkUrl: String,
    val message: String
)

@Composable
fun ForcedUpdateScreen(info: ForcedUpdateInfo) {
    val uri = LocalUriHandler.current
    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.surface) {
        Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(28.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Column(
                    Modifier.fillMaxWidth().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(13.dp)
                ) {
                    Surface(
                        modifier = Modifier.size(58.dp),
                        shape = RoundedCornerShape(18.dp),
                        color = MaterialTheme.colorScheme.primaryContainer
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text("↑", fontSize = 32.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                    Text("تحديث Student مطلوب", fontSize = 23.sp, fontWeight = FontWeight.Black)
                    Text(
                        info.message.ifBlank { "يتوفر تحديث ضروري لمتابعة استخدام Student." },
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        "نسختك الحالية لم تعد مدعومة. يجب تحديث التطبيق للمتابعة.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Button(
                        onClick = { if (info.apkUrl.isNotBlank()) runCatching { uri.openUri(info.apkUrl) } },
                        enabled = info.apkUrl.isNotBlank(),
                        modifier = Modifier.fillMaxWidth().height(52.dp)
                    ) { Text("تحديث الآن", fontWeight = FontWeight.Bold) }
                    if (info.apkUrl.isBlank()) {
                        Text("رابط التحديث غير مضبوط من لوحة الإدارة.", color = MaterialTheme.colorScheme.error, fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun UpdateAvailableDialog(info: ForcedUpdateInfo, onLater: () -> Unit) {
    val uri = LocalUriHandler.current
    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onLater) { Text("رجوع") }
                Text("تحديث Student", fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleLarge)
            }
            HorizontalDivider()
            Column(Modifier.weight(1f).fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("تحديث جديد متوفر", fontSize = 23.sp, fontWeight = FontWeight.Black)
                Text(info.message.ifBlank { "يتوفر إصدار أحدث من Student." })
                Text(
                    "يمكنك بدء التحديث من داخل التطبيق. سيطلب Android تأكيد التثبيت لحماية جهازك.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.weight(1f))
                Button(
                    onClick = { if (info.apkUrl.isNotBlank()) runCatching { uri.openUri(info.apkUrl) } },
                    enabled = info.apkUrl.isNotBlank(),
                    modifier = Modifier.fillMaxWidth().height(52.dp)
                ) { Text("تحديث الآن", fontWeight = FontWeight.Bold) }
                OutlinedButton(onClick = onLater, modifier = Modifier.fillMaxWidth().height(50.dp)) { Text("لاحقاً") }
            }
        }
    }
}

@Composable
fun DownloadedUpdateScreen(info: ForcedUpdateInfo) {
    val context = androidx.compose.ui.platform.LocalContext.current
    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.surface) {
        Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(28.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Column(
                    Modifier.fillMaxWidth().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(13.dp)
                ) {
                    Text("✓", fontSize = 42.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                    Text("التحديث جاهز للتثبيت", fontSize = 23.sp, fontWeight = FontWeight.Black)
                    Text("اكتمل تنزيل Student في الخلفية. يجب تثبيت الإصدار الجديد للمتابعة.")
                    Button(
                        onClick = { StudentUpdateManager.install(context, info) },
                        modifier = Modifier.fillMaxWidth().height(52.dp)
                    ) { Text("تثبيت الآن", fontWeight = FontWeight.Bold) }
                    Text(
                        "قد يطلب Android السماح بتثبيت التطبيقات من Student في المرة الأولى فقط.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
