package com.student.feature.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Replay
import androidx.compose.material.icons.rounded.VolumeUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.student.core.data.LearnEnglishItem
import com.student.core.data.OfflineStore
import com.student.core.data.StudentSession
import com.student.core.data.SupabaseApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun LearnEnglishScreen(api: SupabaseApi, session: StudentSession) {
    val scope = rememberCoroutineScope()
    val speech = rememberStudentSpeechController()
    val context = LocalContext.current
    val offline = remember(context) { OfflineStore(context) }
    var items by remember { mutableStateOf(offline.loadLearnEnglish()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var accent by remember { mutableStateOf("american") }
    var slow by remember { mutableStateOf(false) }

    fun refresh() {
        scope.launch {
            loading = true; error = null
            val result = withContext(Dispatchers.IO) { api.learnEnglishContent(session) }
            result.onSuccess { items = it; offline.saveLearnEnglish(it) }.onFailure {
                error = if (items.isEmpty()) it.message ?: "تعذر تحميل Learn English." else "Offline: يتم عرض آخر محتوى محفوظ."
            }
            loading = false
        }
    }
    LaunchedEffect(session.userId) { refresh() }
    LaunchedEffect(session.userId) {
        while (true) {
            val zone = java.time.ZoneId.of("Asia/Baghdad")
            val now = java.time.ZonedDateTime.now(zone)
            var next = now.toLocalDate().atTime(8, 0).atZone(zone)
            if (!next.isAfter(now)) next = next.plusDays(1)
            delay(java.time.Duration.between(now, next).toMillis().coerceAtLeast(1000L) + 1200L)
            refresh()
        }
    }

    Column(Modifier.fillMaxSize()) {
        Surface(color = StudentSoft, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Learn English", fontWeight = FontWeight.Black, color = StudentText)
                Text("محتوى من الإدارة مع نطق أمريكي وبريطاني وسرعة مناسبة للتعلّم.", color = StudentMuted)
                Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                    FilterChip(selected = accent == "american", onClick = { accent = "american" }, label = { Text("American") })
                    FilterChip(selected = accent == "british", onClick = { accent = "british" }, label = { Text("British") })
                    FilterChip(selected = slow, onClick = { slow = !slow }, label = { Text(if (slow) "Slow" else "Normal") })
                }
            }
        }
        error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(14.dp)) }
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            items(items, key = { it.id }) { lesson ->
                Card(
                    Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = BorderStroke(1.dp, Color(0xFFEAE4F5))
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(lesson.title, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            Text(lesson.category, color = StudentBlue, style = MaterialTheme.typography.labelSmall)
                        }
                        Text(lesson.englishText, style = MaterialTheme.typography.titleMedium, color = StudentText)
                        if (lesson.arabicText.isNotBlank()) Text(lesson.arabicText, color = StudentMuted)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            OutlinedButton(onClick = { speech.speak(lesson.englishText, accent, slow) }) {
                                Icon(Icons.Rounded.VolumeUp, null); Spacer(Modifier.width(5.dp)); Text("نطق")
                            }
                            IconButton(onClick = { speech.speak(lesson.englishText, accent, slow) }) { Icon(Icons.Rounded.Replay, "إعادة") }
                        }
                    }
                }
            }
            if (!loading && error == null && items.isEmpty()) {
                item { Text("لا يوجد محتوى منشور بعد. لا يعرض التطبيق بيانات تجريبية.", color = StudentMuted, modifier = Modifier.padding(20.dp)) }
            }
        }
    }
}
