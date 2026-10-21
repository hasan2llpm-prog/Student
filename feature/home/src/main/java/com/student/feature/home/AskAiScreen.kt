package com.student.feature.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.student.core.data.StudentSession
import com.student.core.data.SupabaseApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class AskAiBubble(val role:String,val text:String)

@Composable
fun AskAiScreen(api: SupabaseApi, session: StudentSession) {
    val scope = rememberCoroutineScope()
    val clipboard = LocalClipboardManager.current
    var input by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var mode by remember { mutableStateOf("ask") }
    var messages by remember { mutableStateOf<List<AskAiBubble>>(emptyList()) }
    val modes = listOf("ask" to "اسأل", "explain" to "اشرح", "solve" to "حل", "summarize" to "لخّص", "quiz" to "اختبار", "writing" to "صحح كتابة")

    fun send() {
        val q = input.trim()
        if (q.isBlank() || busy) return
        input = ""
        messages = messages + AskAiBubble("user", q)
        busy = true; error = null
        scope.launch {
            val prompt = when(mode) {
                "explain" -> "اشرح للمبتدئ من الصفر، خطوة بخطوة، مع أمثلة مترجمة عند الحاجة:\n$q"
                "solve" -> "حل المسألة خطوة بخطوة واشرح سبب كل خطوة، ولا تقفز إلى الجواب:\n$q"
                "summarize" -> "لخّص النص بوضوح ثم اذكر أهم النقاط:\n$q"
                "quiz" -> "حوّل الموضوع إلى اختبار قصير متنوع مع الإجابات وشرح التصحيح:\n$q"
                "writing" -> "صحح النص الإنجليزي، وضح الخطأ بالعربية، ثم أعطني النسخة الصحيحة:\n$q"
                else -> q
            }
            val result = withContext(Dispatchers.IO) { api.callStudentAi(session, mode, prompt) }
            result.onSuccess { answer ->
                messages = messages + AskAiBubble("assistant", answer)
                withContext(Dispatchers.IO) {
                    api.saveAiMessage(session,"user",q,mode)
                    api.saveAiMessage(session,"assistant",answer,mode)
                }
            }.onFailure { error = it.message ?: "تعذر الوصول إلى Ask AI." }
            busy = false
        }
    }

    Column(Modifier.fillMaxSize().imePadding().navigationBarsPadding()) {
        Surface(tonalElevation = 1.dp) {
            Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Rounded.AutoAwesome,null,tint=StudentBlue)
                    Text("Student Ask AI",fontWeight=FontWeight.Black)
                }
                Text("اسأل، اطلب شرحاً، حل مسألة، تلخيصاً أو تصحيح كتابة. الشرح مصمم ليكون واضحاً للمبتدئ.",color=StudentMuted)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    modes.take(3).forEach { (k,label) -> FilterChip(selected=mode==k,onClick={mode=k},label={Text(label)},modifier=Modifier.weight(1f)) }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    modes.drop(3).forEach { (k,label) -> FilterChip(selected=mode==k,onClick={mode=k},label={Text(label)},modifier=Modifier.weight(1f)) }
                }
            }
        }
        LazyColumn(Modifier.weight(1f),contentPadding=PaddingValues(12.dp),verticalArrangement=Arrangement.spacedBy(9.dp)) {
            if (messages.isEmpty()) item {
                StudentOutlinedCard(Modifier.fillMaxWidth()) { Text("مثال: اشرح لي Present Perfect كأنني لا أعرف عنه شيئاً، مع 8 أمثلة مترجمة.",Modifier.padding(14.dp),color=StudentMuted) }
            }
            items(messages) { m ->
                val mine=m.role=="user"
                Row(Modifier.fillMaxWidth(),horizontalArrangement=if(mine)Arrangement.End else Arrangement.Start) {
                    Surface(shape=RoundedCornerShape(18.dp),color=if(mine)StudentSoft else MaterialTheme.colorScheme.surfaceVariant,modifier=Modifier.widthIn(max=330.dp)) {
                        Column(Modifier.padding(12.dp)) {
                            Text(m.text)
                            if(!mine) TextButton(onClick={clipboard.setText(AnnotatedString(m.text))},contentPadding=PaddingValues(0.dp)){Icon(Icons.Rounded.ContentCopy,null,Modifier.size(16.dp));Spacer(Modifier.width(4.dp));Text("نسخ")}
                        }
                    }
                }
            }
            error?.let { msg -> item { Text(msg,color=MaterialTheme.colorScheme.error) } }
        }
        Surface(shadowElevation=6.dp) {
            Row(Modifier.fillMaxWidth().padding(8.dp),verticalAlignment=androidx.compose.ui.Alignment.Bottom,horizontalArrangement=Arrangement.spacedBy(6.dp)) {
                OutlinedTextField(value=input,onValueChange={input=it.take(5000)},modifier=Modifier.weight(1f),placeholder={Text("اكتب سؤالك...")},maxLines=6)
                FilledIconButton(onClick=::send,enabled=input.isNotBlank()&&!busy){Icon(Icons.Rounded.Send,"إرسال")}
            }
        }
    }
}
