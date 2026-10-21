package com.student.feature.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.student.core.data.RemoteScreenComponent
import com.student.core.data.RemoteScreenDefinition
import com.student.core.data.StudentSession
import com.student.core.data.SupabaseApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

@Composable
fun RemoteScreenScreen(
    api: SupabaseApi,
    session: StudentSession,
    screenKey: String,
    onBack: () -> Unit,
    onTarget: (String) -> Unit,
    onAction: (String) -> Unit,
) {
    var definition by remember(screenKey) { mutableStateOf<RemoteScreenDefinition?>(null) }
    var loading by remember(screenKey) { mutableStateOf(true) }
    var error by remember(screenKey) { mutableStateOf<String?>(null) }

    suspend fun reload() {
        withContext(Dispatchers.IO) { api.remoteScreen(session, screenKey) }
            .onSuccess { definition = it; error = null }
            .onFailure { error = it.message ?: "تعذر تحميل الشاشة من Supabase." }
        loading = false
    }

    LaunchedEffect(screenKey) {
        reload()
        while (true) {
            val seconds = definition?.refreshSeconds ?: 30
            delay(seconds * 1000L)
            reload()
        }
    }

    Scaffold(
        topBar = {
            Surface(shadowElevation = 1.dp) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 6.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) { Icon(Icons.Rounded.ArrowBack, "رجوع") }
                    Column(Modifier.weight(1f)) {
                        Text(definition?.title ?: "Student", fontWeight = FontWeight.Black, fontSize = 19.sp)
                        definition?.description?.let { Text(it, fontSize = 11.sp, color = StudentMuted) }
                    }
                }
            }
        }
    ) { padding ->
        when {
            loading && definition == null -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            error != null && definition == null -> Box(Modifier.fillMaxSize().padding(padding).padding(24.dp), contentAlignment = Alignment.Center) {
                Text(error.orEmpty(), color = MaterialTheme.colorScheme.error)
            }
            else -> LazyColumn(
                Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                definition?.components?.forEach { component ->
                    item(key = component.id) {
                        RemoteComponentView(component, onTarget, onAction)
                    }
                }
            }
        }
    }
}

@Composable
private fun RemoteComponentView(
    component: RemoteScreenComponent,
    onTarget: (String) -> Unit,
    onAction: (String) -> Unit,
) {
    val radius = component.style["radius"]?.toFloatOrNull()?.coerceIn(0f, 40f) ?: 16f
    val bg = parseRemoteColor(component.style["background"], Color.White)
    val fg = parseRemoteColor(component.style["text_color"], StudentText)
    when (component.type) {
        "divider" -> HorizontalDivider()
        "spacer" -> Spacer(Modifier.height((component.style["height"]?.toIntOrNull()?.coerceIn(1, 120) ?: 12).dp))
        "section", "heading" -> Column(Modifier.fillMaxWidth().padding(top = 6.dp)) {
            component.title?.let { Text(it, fontWeight = FontWeight.Black, fontSize = 20.sp, color = fg) }
            component.body?.let { Text(it, color = StudentMuted, fontSize = 12.sp) }
        }
        "button" -> Button(
            onClick = {
                component.actionKey?.let(onAction) ?: component.target?.let(onTarget)
            },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(radius.dp)
        ) {
            Text(component.title ?: component.body ?: "فتح")
        }
        "action" -> OutlinedButton(
            onClick = { component.actionKey?.let(onAction) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(radius.dp)
        ) {
            Text(component.title ?: "تنفيذ")
        }
        "card", "navigation" -> Surface(
            onClick = { component.actionKey?.let(onAction) ?: component.target?.let(onTarget) },
            modifier = Modifier.fillMaxWidth(),
            color = bg,
            shape = RoundedCornerShape(radius.dp),
            tonalElevation = 1.dp
        ) {
            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    component.title?.let { Text(it, color = fg, fontWeight = FontWeight.Bold, fontSize = 16.sp) }
                    component.body?.let { Text(it, color = StudentMuted, fontSize = 12.sp) }
                }
                Icon(Icons.Rounded.ChevronRight, null, tint = StudentMuted)
            }
        }
        else -> Column(
            Modifier.fillMaxWidth().background(bg, RoundedCornerShape(radius.dp)).padding(12.dp)
        ) {
            component.title?.let { Text(it, color = fg, fontWeight = FontWeight.Bold) }
            component.body?.let { Text(it, color = fg, fontSize = 13.sp) }
        }
    }
}

private fun parseRemoteColor(raw: String?, fallback: Color): Color {
    val text = raw?.trim().orEmpty()
    if (text.isBlank()) return fallback
    return runCatching {
        val clean = text.removePrefix("#")
        val value = when (clean.length) {
            6 -> (0xFF000000L or clean.toLong(16))
            8 -> clean.toLong(16)
            else -> return fallback
        }
        Color(value)
    }.getOrElse { fallback }
}
