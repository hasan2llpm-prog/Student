package com.student.feature.home

import android.annotation.SuppressLint
import android.graphics.Color as AndroidColor
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.PlayCircle
import androidx.compose.material.icons.rounded.RecordVoiceOver
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Translate
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.text.HtmlCompat
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions
import com.student.core.data.StudentSession
import com.student.core.data.SupabaseApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.regex.Pattern

private data class YoutubeCue(val startSeconds: Double, val text: String)
private data class YoutubeTranscript(val videoId: String, val cues: List<YoutubeCue>)

private fun extractYoutubeId(raw: String): String? {
    val value = raw.trim()
    val patterns = listOf(
        Regex("(?:youtube\\.com/watch\\?v=|youtu\\.be/|youtube\\.com/embed/)([A-Za-z0-9_-]{11})"),
        Regex("(?:youtube\\.com/shorts/)([A-Za-z0-9_-]{11})")
    )
    return patterns.firstNotNullOfOrNull { it.find(value)?.groupValues?.getOrNull(1) }
}

private fun decodeCaption(value: String): String = HtmlCompat.fromHtml(value, HtmlCompat.FROM_HTML_MODE_LEGACY)
    .toString()
    .replace(Regex("\\s+"), " ")
    .trim()

private fun parseCaptionXml(xml: String): List<YoutubeCue> {
    val tagPattern = Pattern.compile("<text\\b([^>]*)>(.*?)</text>", Pattern.DOTALL or Pattern.CASE_INSENSITIVE)
    val attrPattern = Pattern.compile("\\bstart=\\\"([^\\\"]+)\\\"")
    val matcher = tagPattern.matcher(xml)
    val result = mutableListOf<YoutubeCue>()
    while (matcher.find()) {
        val attrs = matcher.group(1).orEmpty()
        val text = decodeCaption(matcher.group(2).orEmpty())
        val start = attrPattern.matcher(attrs).let { if (it.find()) it.group(1)?.toDoubleOrNull() else null }
        if (!text.isNullOrBlank() && start != null) result += YoutubeCue(start, text)
    }
    return result.distinctBy { "${it.startSeconds}:${it.text}" }
}

private suspend fun fetchYoutubeTranscript(videoId: String): Result<YoutubeTranscript> = withContext(Dispatchers.IO) {
    runCatching {
        val urls = listOf(
            "https://video.google.com/timedtext?lang=en&v=$videoId",
            "https://www.youtube.com/api/timedtext?lang=en&v=$videoId",
            "https://video.google.com/timedtext?lang=en&kind=asr&v=$videoId"
        )
        val cues = urls.asSequence().mapNotNull { url ->
            val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 10_000
                readTimeout = 15_000
                setRequestProperty("User-Agent", "Student Android")
            }
            try {
                if (connection.responseCode !in 200..299) null
                else parseCaptionXml(connection.inputStream.bufferedReader().use { it.readText() })
            } finally {
                connection.disconnect()
            }
        }.firstOrNull { it.isNotEmpty() }.orEmpty()
        if (cues.isEmpty()) throw IllegalStateException("هذا الفيديو لا يوفّر Captions إنجليزية عامة.")
        YoutubeTranscript(videoId, cues.take(80))
    }
}

private fun youtubePlayerHtml(videoId: String, quality: String, rate: String): String = """
<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;background:#101820;overflow:hidden">
<div id="player" style="width:100vw;height:100vh"></div>
<script>
var player;
function onYouTubeIframeAPIReady(){
 player=new YT.Player('player',{videoId:'$videoId',playerVars:{playsinline:1,controls:1,rel:0,modestbranding:1,iv_load_policy:3},events:{onReady:function(){setRate('$rate');setQuality('$quality')}}});
}
function setRate(v){if(player&&player.setPlaybackRate)player.setPlaybackRate(parseFloat(v));}
function setQuality(v){if(player&&player.setPlaybackQuality)player.setPlaybackQuality(v);}
function seekTo(v){if(player&&player.seekTo)player.seekTo(parseFloat(v),true);}
</script><script src="https://www.youtube.com/iframe_api"></script>
</body></html>
""".trimIndent()

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun YoutubePlayer(videoId: String, quality: String, rate: String, modifier: Modifier = Modifier) {
    AndroidView(
        modifier = modifier,
        factory = { context ->
            WebView(context).apply {
                setBackgroundColor(AndroidColor.rgb(16, 24, 32))
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.mediaPlaybackRequiresUserGesture = true
                webChromeClient = WebChromeClient()
                webViewClient = WebViewClient()
                loadDataWithBaseURL("https://www.youtube.com", youtubePlayerHtml(videoId, quality, rate), "text/html", "UTF-8", null)
            }
        },
        update = { view ->
            view.evaluateJavascript("setRate('$rate');setQuality('$quality');", null)
        }
    )
}

private fun coloredWords(text: String): AnnotatedString = buildAnnotatedString {
    val words = Regex("[A-Za-z]+(?:'[A-Za-z]+)?|[^A-Za-z]+")
    var colorIndex = 0
    words.findAll(text).forEach { match ->
        val token = match.value
        if (token.firstOrNull()?.isLetter() == true) {
            val colors = listOf(Color(0xFF126E82), Color(0xFF2D5BBA), Color(0xFFB56B19), Color(0xFF8A3D72))
            pushStringAnnotation("word", token)
            withStyle(SpanStyle(color = colors[colorIndex++ % colors.size], fontWeight = FontWeight.Bold)) { append(token) }
            pop()
        } else append(token)
    }
}

@Composable
fun YoutubeLearningScreen(api: SupabaseApi, session: StudentSession, initialUrl: String? = null) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val scope = rememberCoroutineScope()
    val speech = rememberStudentSpeechController()
    val localVocabulary = remember(context) { loadOxford5000Vocabulary(context) }
    val translator = remember {
        Translation.getClient(TranslatorOptions.Builder().setSourceLanguage("en").setTargetLanguage("ar").build())
    }

    var url by remember { mutableStateOf(initialUrl.orEmpty()) }
    var videoTitle by remember { mutableStateOf("") }
    var videoDescription by remember { mutableStateOf("") }
    var transcript by remember { mutableStateOf<YoutubeTranscript?>(null) }
    var quality by remember { mutableStateOf("hd720") }
    var rate by remember { mutableStateOf("1.0") }
    var loading by remember { mutableStateOf(false) }
    var translating by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var selectedWord by remember { mutableStateOf<String?>(null) }
    var selectedMeaning by remember { mutableStateOf("") }
    var selectedCueTranslation by remember { mutableStateOf<Map<Double, String>>(emptyMap()) }
    var qualityMenu by remember { mutableStateOf(false) }
    var speedMenu by remember { mutableStateOf(false) }

    DisposableEffect(translator) { onDispose { translator.close() } }
    LaunchedEffect(initialUrl) { if (!initialUrl.isNullOrBlank()) url = initialUrl }
    LaunchedEffect(message) { if (message != null) { kotlinx.coroutines.delay(5000); message = null } }

    fun translateCue(cue: YoutubeCue) {
        if (selectedCueTranslation.containsKey(cue.startSeconds) || translating) return
        translating = true
        translator.downloadModelIfNeeded(DownloadConditions.Builder().build())
            .addOnSuccessListener {
                translator.translate(cue.text)
                    .addOnSuccessListener { translated ->
                        selectedCueTranslation = selectedCueTranslation + (cue.startSeconds to translated)
                        translating = false
                    }
                    .addOnFailureListener { translating = false; message = "تعذرت ترجمة هذا المقطع." }
            }
            .addOnFailureListener {
                scope.launch {
                    withContext(Dispatchers.IO) { api.callStudentAi(session, "translate", cue.text) }
                        .onSuccess { selectedCueTranslation = selectedCueTranslation + (cue.startSeconds to it.trim()) }
                        .onFailure { message = "تعذرت الترجمة. حاول بعد اتصال مستقر." }
                    translating = false
                }
            }
    }

    fun selectWord(word: String) {
        val clean = word.lowercase().trim()
        if (clean.isBlank()) return
        selectedWord = clean
        speech.speak(clean, "american", "normal")
        selectedMeaning = localVocabulary.firstOrNull { it.word.equals(clean, true) }?.meaningAr.orEmpty()
        if (selectedMeaning.isBlank()) {
            selectedMeaning = "جاري جلب المعنى..."
            scope.launch {
                withContext(Dispatchers.IO) { api.callStudentAi(session, "translate", clean) }
                    .onSuccess { selectedMeaning = it.trim() }
                    .onFailure { selectedMeaning = "لا يوجد معنى محفوظ لهذه الكلمة." }
            }
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(Color(0xFFF5F7FA)),
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = Color.White), border = BorderStroke(1.dp, StudentBorder)) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.PlayCircle, null, tint = StudentTeal, modifier = Modifier.size(28.dp))
                        Spacer(Modifier.width(8.dp))
                        Column(Modifier.weight(1f)) {
                            Text("تعلم من فيديو YouTube", fontWeight = FontWeight.Black)
                            Text("الصق الرابط ثم اضغط تحميل الكلمات", color = StudentMuted, fontSize = 11.sp)
                        }
                    }
                    OutlinedTextField(value = url, onValueChange = { url = it }, modifier = Modifier.fillMaxWidth(), singleLine = true, label = { Text("رابط YouTube") }, leadingIcon = { Icon(Icons.Rounded.Search, null) }, shape = RoundedCornerShape(14.dp))
                    OutlinedTextField(value = videoTitle, onValueChange = { videoTitle = it.take(120) }, modifier = Modifier.fillMaxWidth(), singleLine = true, label = { Text("عنوان محفوظ اختياري") }, shape = RoundedCornerShape(14.dp))
                    OutlinedTextField(value = videoDescription, onValueChange = { videoDescription = it.take(500) }, modifier = Modifier.fillMaxWidth().heightIn(min = 76.dp), minLines = 2, maxLines = 4, label = { Text("وصف الفيديو اختياري") }, shape = RoundedCornerShape(14.dp))
                    val saveId = extractYoutubeId(url)
                    OutlinedButton(
                        onClick = {
                            if (saveId == null || saving) return@OutlinedButton
                            saving = true
                            scope.launch {
                                withContext(Dispatchers.IO) {
                                    api.saveItem(
                                        session = session,
                                        contentType = "youtube",
                                        contentId = saveId,
                                        title = videoTitle.ifBlank { "فيديو YouTube" },
                                        subtitle = videoDescription,
                                        source = "youtube",
                                        target = "youtube/$saveId",
                                        metadata = JSONObject().put("video_id", saveId).put("url", "https://www.youtube.com/watch?v=$saveId")
                                    )
                                }.onSuccess { message = "تم حفظ الفيديو في المحفوظات." }.onFailure { message = it.message ?: "تعذر حفظ الفيديو." }
                                saving = false
                            }
                        },
                        enabled = saveId != null && !saving,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp)
                    ) { Text(if (saving) "جاري الحفظ..." else "حفظ الرابط للمستقبل", fontWeight = FontWeight.Bold) }
                    Button(
                        onClick = {
                            val id = extractYoutubeId(url)
                            if (id == null) { message = "ألصق رابط YouTube صحيحًا."; return@Button }
                            loading = true; transcript = null; selectedWord = null; selectedMeaning = ""
                            scope.launch {
                                fetchYoutubeTranscript(id).onSuccess { transcript = it }.onFailure { message = it.message ?: "تعذر جلب Captions." }
                                loading = false
                            }
                        },
                        enabled = !loading && url.isNotBlank(),
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = StudentTeal),
                        shape = RoundedCornerShape(14.dp)
                    ) { if (loading) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp) else { Icon(Icons.Rounded.Translate, null); Spacer(Modifier.width(6.dp)); Text("تحميل الفيديو والكلمات", fontWeight = FontWeight.Bold) } }
                }
            }
        }

        transcript?.let { data ->
            item {
                YoutubePlayer(data.videoId, quality, rate, Modifier.fillMaxWidth().height(210.dp))
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.weight(1f)) {
                        Button(onClick = { qualityMenu = true }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = StudentBlue), shape = RoundedCornerShape(12.dp)) { Text("الجودة: ${quality.removePrefix("hd")}") }
                        DropdownMenu(expanded = qualityMenu, onDismissRequest = { qualityMenu = false }) {
                            listOf("small", "medium", "hd720", "hd1080").forEach { value -> DropdownMenuItem(text = { Text(value) }, onClick = { quality = value; qualityMenu = false }) }
                        }
                    }
                    Box(Modifier.weight(1f)) {
                        Button(onClick = { speedMenu = true }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = StudentBlue), shape = RoundedCornerShape(12.dp)) { Text("السرعة: ${rate}x") }
                        DropdownMenu(expanded = speedMenu, onDismissRequest = { speedMenu = false }) {
                            listOf("0.5", "0.75", "1.0", "1.25", "1.5", "2.0").forEach { value -> DropdownMenuItem(text = { Text("${value}x") }, onClick = { rate = value; speedMenu = false }) }
                        }
                    }
                }
            }
            item {
                Text("اضغط على أي كلمة لسماعها ومعرفة معناها", color = StudentMuted, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 4.dp))
            }
            items(data.cues, key = { "${it.startSeconds}-${it.text}" }) { cue ->
                Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Color.White), border = BorderStroke(1.dp, StudentBorder)) {
                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Text("${cue.startSeconds.toInt()}s", color = StudentMuted, fontSize = 10.sp)
                        androidx.compose.foundation.text.ClickableText(
                            text = coloredWords(cue.text),
                            style = MaterialTheme.typography.bodyLarge.copy(textAlign = TextAlign.Left),
                            onClick = { offset -> coloredWords(cue.text).getStringAnnotations("word", offset, offset).firstOrNull()?.let { selectWord(it.item) } }
                        )
                        val arabic = selectedCueTranslation[cue.startSeconds]
                        if (arabic != null) Text(arabic, color = StudentText, textAlign = TextAlign.Right, modifier = Modifier.fillMaxWidth())
                        else Text("اضغط لترجمة المقطع", color = StudentMuted, fontSize = 11.sp, modifier = Modifier.clickable { translateCue(cue) })
                    }
                }
            }
        }

        if (selectedWord != null) {
            item {
                Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = Color(0xFFEAF8F5)), border = BorderStroke(1.dp, Color(0xFFB9E5DA))) {
                    Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(selectedWord.orEmpty(), color = StudentBlue, fontSize = 22.sp, fontWeight = FontWeight.Black)
                            Text(selectedMeaning, color = StudentText, modifier = Modifier.fillMaxWidth().padding(top = 4.dp))
                        }
                        IconButton(onClick = { speech.speak(selectedWord.orEmpty(), "american", "normal") }) { Icon(Icons.Rounded.RecordVoiceOver, "نطق الكلمة", tint = StudentTeal) }
                    }
                }
            }
        }

        if (message != null) item { Text(message.orEmpty(), color = Color(0xFFC62828), fontSize = 12.sp, modifier = Modifier.padding(horizontal = 4.dp)) }
    }
}
