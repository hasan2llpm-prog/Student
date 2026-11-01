package com.student.feature.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.student.core.data.StudentNotification
import com.student.core.data.StudentSession
import com.student.core.data.SupabaseApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun AdminAiAlertsPane(
    api: SupabaseApi,
    session: StudentSession,
    alerts: List<StudentNotification>,
    onRefresh: () -> Unit,
    onMessage: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    LazyColumn(
        contentPadding = PaddingValues(vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                Text("مراقبة Ask AI", fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleLarge)
                Text(
                    "تظهر هنا أعطال مزود الترجمة أو Ask AI التي يسجلها الخادم. يتم تقليل التكرار تلقائيًا لمدة 10 دقائق.",
                    color = StudentMuted,
                    style = MaterialTheme.typography.bodySmall
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = onRefresh) { Text("تحديث") }
                    OutlinedButton(
                        onClick = {
                            scope.launch {
                                val result = withContext(Dispatchers.IO) { api.markAllNotificationsRead(session) }
                                result.onSuccess {
                                    onMessage("تم تعليم إشعارات الإدارة كمقروءة.")
                                    onRefresh()
                                }.onFailure { onMessage(it.message ?: "تعذر تحديث حالة الإشعارات.") }
                            }
                        }
                    ) { Text("تصفير الجديد") }
                }
            }
        }
        if (alerts.isEmpty()) {
            item {
                Text(
                    "لا توجد أعطال مسجلة حاليًا.",
                    color = StudentMuted,
                    modifier = Modifier.padding(vertical = 18.dp)
                )
            }
        } else {
            items(alerts, key = { it.id }) { alert ->
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(13.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(alert.title, fontWeight = FontWeight.Black)
                            Text(prettyTime(alert.createdAt), color = StudentMuted, style = MaterialTheme.typography.labelSmall)
                        }
                        Text(alert.body, color = MaterialTheme.colorScheme.onSurface)
                        if (!alert.isRead) {
                            HorizontalDivider(Modifier.padding(vertical = 3.dp))
                            Text(
                                "جديد",
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                        if (!alert.isRead) {
                            OutlinedButton(
                                onClick = {
                                    scope.launch {
                                        val result = withContext(Dispatchers.IO) { api.markNotificationRead(session, alert.id) }
                                        result.onSuccess { onRefresh() }
                                            .onFailure { onMessage(it.message ?: "تعذر تعليم الإشعار.") }
                                    }
                                }
                            ) { Text("تعليم كمقروء") }
                        }
                    }
                }
            }
        }
    }
}
