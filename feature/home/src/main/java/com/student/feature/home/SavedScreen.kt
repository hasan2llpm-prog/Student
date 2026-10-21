package com.student.feature.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.DeleteSweep
import androidx.compose.material.icons.rounded.OpenInNew
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun SavedScreen(
    api: SupabaseApi,
    session: StudentSession,
    onOpenTarget: (String) -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var allItems by remember { mutableStateOf<List<SavedItem>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var filter by remember { mutableStateOf("all") }
    var query by remember { mutableStateOf("") }
    var newestFirst by remember { mutableStateOf(true) }
    var confirmClear by remember { mutableStateOf(false) }

    fun refresh() {
        scope.launch {
            loading = true
            val result = withContext(Dispatchers.IO) { api.savedItems(session) }
            result.onSuccess { allItems = it }.onFailure { message = it.message ?: "تعذر تحميل المحفوظات." }
            loading = false
        }
    }

    LaunchedEffect(session.userId) { refresh() }
    LaunchedEffect(message) {
        if (message != null) {
            kotlinx.coroutines.delay(2600)
            message = null
        }
    }

    val availableTypes = remember(allItems) { allItems.map { it.contentType }.filter { it.isNotBlank() }.distinct().sorted() }
    val shown = remember(allItems, filter, query, newestFirst) {
        val q = query.trim().lowercase()
        allItems
            .asSequence()
            .filter { filter == "all" || it.contentType == filter }
            .filter {
                q.isBlank() || it.title.lowercase().contains(q) || it.subtitle.lowercase().contains(q) ||
                    it.contentId.lowercase().contains(q) || typeLabel(it.contentType).lowercase().contains(q)
            }
            .let { seq -> if (newestFirst) seq else seq.toList().asReversed().asSequence() }
            .toList()
    }

    if (confirmClear) {
        AlertDialog(
            onDismissRequest = { confirmClear = false },
            title = { Text("حذف المحفوظات", fontWeight = FontWeight.Bold) },
            text = { Text(if (filter == "all") "هل تريد حذف كل العناصر المحفوظة؟" else "هل تريد حذف كل عناصر ${typeLabel(filter)} المحفوظة؟") },
            confirmButton = {
                Button(onClick = {
                    confirmClear = false
                    scope.launch {
                        val result = withContext(Dispatchers.IO) { api.clearSavedItems(session, filter.takeUnless { it == "all" }) }
                        result.onSuccess { refresh() }.onFailure { message = it.message }
                    }
                }) { Text("حذف") }
            },
            dismissButton = { TextButton(onClick = { confirmClear = false }) { Text("إلغاء") } }
        )
    }

    Column(Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
            singleLine = true,
            leadingIcon = { Icon(Icons.Rounded.Search, null) },
            label = { Text("ابحث في المحفوظات") }
        )

        Row(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FilterChip(selected = filter == "all", onClick = { filter = "all" }, label = { Text("الكل") })
            availableTypes.take(4).forEach { type ->
                FilterChip(selected = filter == type, onClick = { filter = type }, label = { Text(typeLabel(type)) })
            }
            Spacer(Modifier.weight(1f))
            TextButton(onClick = { newestFirst = !newestFirst }) { Text(if (newestFirst) "الأحدث" else "الأقدم") }
        }

        if (availableTypes.size > 4) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                availableTypes.drop(4).take(4).forEach { type ->
                    FilterChip(selected = filter == type, onClick = { filter = type }, label = { Text(typeLabel(type)) })
                }
            }
        }

        message?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)) }

        if (shown.isNotEmpty()) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = { confirmClear = true }) {
                    Icon(Icons.Rounded.DeleteSweep, null)
                    Spacer(Modifier.width(5.dp))
                    Text(if (filter == "all") "حذف الكل" else "حذف الفئة")
                }
            }
        }

        if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(shown, key = { it.id }) { item ->
                ElevatedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(item.title.ifBlank { item.contentId }, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Text(typeLabel(item.contentType), style = MaterialTheme.typography.labelMedium, color = StudentBlue)
                                item.subtitle.takeIf { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = StudentMuted) }
                                Text(prettyTime(item.createdAt), style = MaterialTheme.typography.labelSmall, color = StudentMuted)
                            }
                            if (item.target.isNotBlank()) {
                                IconButton(onClick = { onOpenTarget(item.target) }) { Icon(Icons.Rounded.OpenInNew, "فتح") }
                            }
                        }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                            TextButton(onClick = {
                                scope.launch {
                                    val result = withContext(Dispatchers.IO) { api.deleteSavedItem(session, item.id) }
                                    result.onSuccess { refresh() }.onFailure { message = it.message }
                                }
                            }) { Text("إزالة") }
                        }
                    }
                }
            }
            if (shown.isEmpty() && !loading) item {
                Text(if (query.isBlank()) "لا توجد عناصر محفوظة." else "لا توجد نتائج مطابقة.", modifier = Modifier.padding(8.dp))
            }
        }
    }
}

private fun typeLabel(type: String): String = when (type.lowercase()) {
    "vocabulary" -> "مفردات"
    "verb" -> "أفعال"
    "grammar" -> "قواعد"
    "listening" -> "استماع"
    "pronunciation" -> "نطق"
    "daily" -> "مراجعة يومية"
    "translation" -> "ترجمة"
    "lesson" -> "درس"
    "post" -> "منشور"
    "reel" -> "ريلز"
    "file" -> "ملف"
    "video" -> "فيديو"
    else -> type.ifBlank { "محتوى" }
}
