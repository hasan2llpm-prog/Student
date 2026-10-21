package com.student.feature.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import com.student.core.data.RemoteActionDefinition
import com.student.core.data.RemoteActionField
import com.student.core.data.StudentSession
import com.student.core.data.SupabaseApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun RemoteActionScreen(
    api: SupabaseApi,
    session: StudentSession,
    actionKey: String,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var definition by remember(actionKey) { mutableStateOf<RemoteActionDefinition?>(null) }
    var loading by remember(actionKey) { mutableStateOf(true) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var confirm by remember { mutableStateOf(false) }
    val values = remember(actionKey) { mutableStateMapOf<String, Any?>() }

    LaunchedEffect(actionKey) {
        loading = true
        withContext(Dispatchers.IO) { api.remoteAction(session, actionKey) }
            .onSuccess { def ->
                definition = def
                def.fields.forEach { f ->
                    if (!values.containsKey(f.key)) values[f.key] = when (f.type) {
                        "boolean", "toggle" -> f.defaultValue?.toBooleanStrictOrNull() ?: false
                        else -> f.defaultValue.orEmpty()
                    }
                }
            }
            .onFailure { message = "تعذر تحميل الإجراء من Supabase." }
        loading = false
    }

    fun validate(def: RemoteActionDefinition): String? {
        def.fields.forEach { f ->
            if (f.required) {
                val v = values[f.key]
                if (v == null || (v is String && v.isBlank())) return "أكمل حقل: ${f.label}"
            }
        }
        return null
    }

    fun execute(def: RemoteActionDefinition) {
        val error = validate(def)
        if (error != null) { message = error; return }
        if (def.confirmRequired && !confirm) { confirm = true; return }
        scope.launch {
            busy = true; message = null
            withContext(Dispatchers.IO) { api.executeRemoteAction(session, def, values.toMap()) }
                .onSuccess { message = def.successMessage ?: "تم تنفيذ العملية بنجاح."; confirm = false }
                .onFailure { message = it.message ?: "تعذر تنفيذ العملية."; confirm = false }
            busy = false
        }
    }

    Column(Modifier.fillMaxSize()) {
        Surface(shadowElevation = 1.dp) {
            Row(Modifier.fillMaxWidth().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(Icons.Rounded.ArrowBack, "رجوع") }
                Text(definition?.title ?: "إجراء", fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleLarge)
            }
        }
        if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
        val def = definition
        if (def != null) {
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                def.description?.let { item { Text(it, color = StudentMuted) } }
                def.fields.forEach { field -> item { RemoteField(field, values[field.key]) { values[field.key] = it } } }
                message?.let { item { Text(it, color = if (it.startsWith("تم")) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error) } }
                item { Button(onClick = { execute(def) }, enabled = !busy, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(if (busy) "جارٍ التنفيذ..." else "تنفيذ") } }
            }
        } else if (!loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(message ?: "الإجراء غير متاح.") }
        }
    }

    val def = definition
    if (confirm && def != null) {
        AlertDialog(
            onDismissRequest = { confirm = false },
            title = { Text("تأكيد") },
            text = { Text(def.confirmText ?: "هل تريد تنفيذ هذا الإجراء؟") },
            confirmButton = { Button(onClick = { execute(def) }) { Text("تأكيد") } },
            dismissButton = { TextButton(onClick = { confirm = false }) { Text("إلغاء") } }
        )
    }
}

@Composable
private fun RemoteField(field: RemoteActionField, value: Any?, onChange: (Any?) -> Unit) {
    when (field.type) {
        "boolean", "toggle" -> Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(field.label, modifier = Modifier.weight(1f)); Switch(value as? Boolean ?: false, { onChange(it) })
        }
        "select" -> {
            var expanded by remember { mutableStateOf(false) }
            Column {
                Text(field.label, fontWeight = FontWeight.Bold)
                Box {
                    OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) { Text(value?.toString()?.ifBlank { "اختر" } ?: "اختر") }
                    DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        field.options.forEach { option -> DropdownMenuItem(text = { Text(option) }, onClick = { onChange(option); expanded = false }) }
                    }
                }
            }
        }
        "slider" -> {
            val current = value?.toString()?.toFloatOrNull() ?: field.defaultValue?.toFloatOrNull() ?: 0f
            Column {
                Text("${field.label}: ${current.toInt()}", fontWeight = FontWeight.Bold)
                Slider(value = current.coerceIn(0f, 100f), onValueChange = { onChange(it.toString()) }, valueRange = 0f..100f)
            }
        }
        else -> {
            val numeric = field.type in setOf("number", "integer")
            val password = field.type == "password"
            OutlinedTextField(
                value = value?.toString().orEmpty(),
                onValueChange = { onChange(it.take(field.maxLength)) },
                label = { Text(field.label) },
                placeholder = { field.placeholder?.let { Text(it) } },
                singleLine = field.type !in setOf("textarea", "multiline"),
                minLines = if (field.type in setOf("textarea", "multiline")) 3 else 1,
                visualTransformation = if (password) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
                keyboardOptions = KeyboardOptions(keyboardType = if (numeric) KeyboardType.Number else KeyboardType.Text),
                leadingIcon = if (field.type == "color") ({ Box(Modifier.size(20.dp).background(parseFieldColor(value?.toString()), RoundedCornerShape(5.dp))) }) else null,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}


private fun parseFieldColor(raw: String?): androidx.compose.ui.graphics.Color = runCatching {
    val clean = raw.orEmpty().trim().removePrefix("#")
    val value = when (clean.length) {
        6 -> 0xFF000000L or clean.toLong(16)
        8 -> clean.toLong(16)
        else -> return androidx.compose.ui.graphics.Color(0xFFCBD5E1)
    }
    androidx.compose.ui.graphics.Color(value)
}.getOrElse { androidx.compose.ui.graphics.Color(0xFFCBD5E1) }
