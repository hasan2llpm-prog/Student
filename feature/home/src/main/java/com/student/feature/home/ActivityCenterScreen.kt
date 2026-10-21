package com.student.feature.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun ActivityCenterScreen(api: SupabaseApi, session: StudentSession, onOpenTarget: (String) -> Unit) {
    var items by remember { mutableStateOf<List<StudentNotification>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    LaunchedEffect(session.userId) {
        withContext(Dispatchers.IO) { api.notifications(session, 120) }.onSuccess { rows ->
            items = rows.filter { it.kind.lowercase() in setOf("follow","post_like","comment","comment_reply","gift","verification_result") }
        }
        loading = false
    }
    Column(Modifier.fillMaxSize()) {
        Column(Modifier.padding(14.dp)) { Text("مركز النشاط", style = MaterialTheme.typography.headlineSmall); Text("التفاعلات والمتابعات والتعليقات والهدايا", color = StudentMuted) }
        LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(items, key = { it.id }) { n -> ElevatedCard(Modifier.fillMaxWidth().clickable { onOpenTarget(notificationTarget(n)) }) { Column(Modifier.padding(13.dp)) { Text(n.title, style = MaterialTheme.typography.titleMedium); if (n.body.isNotBlank()) Text(n.body); Text(prettyTime(n.createdAt), color = StudentMuted, style = MaterialTheme.typography.labelSmall) } } }
            if (!loading && items.isEmpty()) item { Text("لا يوجد نشاط جديد حالياً.", color = StudentMuted, modifier = Modifier.padding(16.dp)) }
        }
    }
}

fun notificationTarget(n: StudentNotification): String {
    val type = n.targetType?.takeIf { it.isNotBlank() } ?: n.kind
    val id = n.targetId?.takeIf { it.isNotBlank() }
    return when {
        !n.link.isNullOrBlank() -> n.link!!
        id != null -> "$type/$id"
        else -> type
    }
}
