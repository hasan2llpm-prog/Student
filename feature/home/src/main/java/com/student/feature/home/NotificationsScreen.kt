package com.student.feature.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private fun isAdminOnlyNotification(n: StudentNotification): Boolean {
    val k = n.kind.lowercase()
    return k.startsWith("admin_") || k in setOf("verification_request","verified_support","recharge_request","teacher_request","store_order_admin")
}

@Composable
fun NotificationsScreen(
    api: SupabaseApi,
    session: StudentSession,
    isAdmin: Boolean = false,
    onOpenTarget: (String) -> Unit = {},
    onUnreadChanged: (Int) -> Unit = {}
) {
    val cfg = LocalNativeRemoteConfig.current
    val context = LocalContext.current
    val uriHandler = LocalUriHandler.current
    val offline = remember { OfflineStore(context) }
    val scope = rememberCoroutineScope()
    var items by remember { mutableStateOf(offline.loadNotifications().filter { isAdmin || !isAdminOnlyNotification(it) }) }
    var loading by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var broadcastOpen by remember { mutableStateOf(false) }
    var broadcastConfirm by remember { mutableStateOf(false) }
    var broadcastTitle by remember { mutableStateOf("") }
    var broadcastBody by remember { mutableStateOf("") }
    var broadcastLink by remember { mutableStateOf("") }

    fun refresh() {
        scope.launch {
            loading = true
            val r = withContext(Dispatchers.IO) {
                api.notifications(session, cfg.int("notifications.limit", 60, 10, 200))
            }
            r.onSuccess { fresh ->
                val visible = fresh.filter { isAdmin || !isAdminOnlyNotification(it) }
                items = visible
                offline.saveNotifications(visible)
                message = null
                onUnreadChanged(visible.count { !it.isRead })
            }.onFailure {
                message = if (items.isEmpty()) it.message else "Offline: آخر إشعارات محفوظة"
            }
            loading = false
        }
    }

    fun markAllRead() {
        scope.launch {
            loading = true
            val r = withContext(Dispatchers.IO) { api.markAllNotificationsRead(session) }
            loading = false
            r.onSuccess {
                items = items.map { it.copy(isRead = true) }
                offline.saveNotifications(items)
                onUnreadChanged(0)
                message = "تم تحديد كل الإشعارات كمقروءة."
            }.onFailure { message = it.message ?: "تعذر تحديث الإشعارات." }
        }
    }

    LaunchedEffect(Unit) { refresh() }
    LaunchedEffect(message) {
        if (message != null) {
            kotlinx.coroutines.delay(cfg.long("notifications.status_duration_ms", 2600L, 500L, 10000L))
            message = null
        }
    }

    if (broadcastOpen) {
        AlertDialog(
            onDismissRequest = { if (!loading) broadcastOpen = false },
            title = { Text("بث إشعار للجميع") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = broadcastTitle,
                        onValueChange = { broadcastTitle = it.take(120) },
                        label = { Text("العنوان") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = broadcastBody,
                        onValueChange = { broadcastBody = it.take(900) },
                        label = { Text("نص الإشعار") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 4
                    )
                    OutlinedTextField(
                        value = broadcastLink,
                        onValueChange = { broadcastLink = it.take(500) },
                        label = { Text("رابط اختياري") },
                        supportingText = { Text("رابط تحديث أو صفحة ويب أو وجهة داخل Student") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(
                    enabled = broadcastTitle.isNotBlank() && broadcastBody.isNotBlank() && !loading,
                    onClick = { broadcastOpen = false; broadcastConfirm = true }
                ) { Text("متابعة") }
            },
            dismissButton = { TextButton(onClick = { broadcastOpen = false }) { Text("إلغاء") } }
        )
    }

    if (broadcastConfirm) {
        AlertDialog(
            onDismissRequest = { if (!loading) broadcastConfirm = false },
            title = { Text("تأكيد البث") },
            text = { Text("سيصل هذا الإشعار إلى جميع مستخدمي Student. هل تريد الإرسال؟") },
            confirmButton = {
                Button(
                    enabled = !loading,
                    onClick = {
                        scope.launch {
                            loading = true
                            val r = withContext(Dispatchers.IO) {
                                api.adminBroadcast(session, broadcastTitle.trim(), broadcastBody.trim(), broadcastLink.trim().ifBlank { null })
                            }
                            loading = false
                            r.onSuccess {
                                broadcastConfirm = false
                                broadcastTitle = ""
                                broadcastBody = ""
                                broadcastLink = ""
                                message = "تم إرسال الإشعار للجميع."
                                refresh()
                            }.onFailure {
                                broadcastConfirm = false
                                message = it.message ?: "تعذر بث الإشعار."
                            }
                        }
                    }
                ) { Text("إرسال للجميع") }
            },
            dismissButton = { TextButton(enabled = !loading, onClick = { broadcastConfirm = false }) { Text("إلغاء") } }
        )
    }

    Column(Modifier.fillMaxSize()) {
        if (cfg.bool("notifications.show_header", true)) {
            Column(Modifier.fillMaxWidth().padding(cfg.int("notifications.header_padding_dp", 12, 4, 24).dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(cfg.string("notifications.header_title", "الإشعارات"), style = MaterialTheme.typography.headlineSmall)
                    if (cfg.bool("notifications.show_refresh", true)) {
                        TextButton(onClick = { refresh() }, enabled = !loading) { Text("تحديث") }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (items.any { !it.isRead }) {
                        OutlinedButton(onClick = ::markAllRead, enabled = !loading) {
                            Text("تحديد الكل كمقروء")
                        }
                    }
                    if (isAdmin) {
                        Button(onClick = { broadcastOpen = true }, enabled = !loading) {
                            Text("بث إشعار للجميع")
                        }
                    }
                }
            }
        }

        message?.let { Text(it, Modifier.padding(horizontal = 12.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) }

        LazyColumn(
            contentPadding = PaddingValues(cfg.int("notifications.list_padding_dp", 12, 4, 24).dp),
            verticalArrangement = Arrangement.spacedBy(cfg.int("notifications.card_spacing_dp", 8, 2, 20).dp)
        ) {
            items(items, key = { it.id }) { n ->
                ElevatedCard(
                    Modifier.fillMaxWidth().clickable {
                        if (!n.isRead) {
                            scope.launch {
                                withContext(Dispatchers.IO) { api.markNotificationRead(session, n.id) }
                                items = items.map { if (it.id == n.id) it.copy(isRead = true) else it }
                                offline.saveNotifications(items)
                                onUnreadChanged(items.count { !it.isRead })
                            }
                        }
                        val target = notificationTarget(n)
                        if (target.startsWith("http://", true) || target.startsWith("https://", true)) {
                            runCatching { uriHandler.openUri(target) }
                        } else {
                            onOpenTarget(target)
                        }
                    }
                ) {
                    Column(Modifier.padding(cfg.int("notifications.card_padding_dp", 14, 8, 24).dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(n.title, style = MaterialTheme.typography.titleMedium)
                            if (cfg.bool("notifications.show_new_badge", true) && !n.isRead) {
                                Badge { Text(cfg.string("notifications.new_badge_text", "جديد")) }
                            }
                        }
                        if (cfg.bool("notifications.show_body", true) && n.body.isNotBlank()) {
                            Text(n.body, style = MaterialTheme.typography.bodyMedium)
                        }
                        if (cfg.bool("notifications.show_time", true)) {
                            Text(prettyTime(n.createdAt), style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
            if (items.isEmpty() && !loading) item { Text("لا توجد إشعارات.") }
        }
    }
}
