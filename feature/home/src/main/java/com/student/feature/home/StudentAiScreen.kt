package com.student.feature.home

import android.net.Uri
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.text.style.TextAlign
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.student.core.data.StudentSession
import com.student.core.data.SupabaseApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext


private fun isStudentOnline(context: android.content.Context): Boolean {
    val cm = context.getSystemService(android.content.Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
    val network = cm.activeNetwork ?: return false
    val caps = cm.getNetworkCapabilities(network) ?: return false
    return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
        caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
}

private fun bidiTextDirection(text: String): TextDirection =
    if (Regex("[\u0600-\u06FF]").containsMatchIn(text.trim().take(24))) TextDirection.ContentOrRtl else TextDirection.ContentOrLtr

private fun createTranslator(source: String, target: String): Translator {
    val options = TranslatorOptions.Builder()
        .setSourceLanguage(source)
        .setTargetLanguage(target)
        .build()
    return Translation.getClient(options)
}

private fun normalizeOcrParagraphs(blocks: List<String>): String {
    val cleaned = blocks.map { block ->
        block.lines()
            .map { it.trim().replace(Regex("\\s+"), " ") }
            .filter { it.isNotBlank() }
            .joinToString(" ")
            .trim()
    }.filter { it.isNotBlank() }
    if (cleaned.isEmpty()) return ""

    val totalLength = cleaned.sumOf { it.length }
    // Short OCR results should read as one natural paragraph, not fragmented ML Kit blocks.
    if (cleaned.size <= 2 || totalLength < 500) return cleaned.joinToString(" ").replace(Regex("\\s+"), " ").trim()

    // For longer pages, keep paragraph boundaries inside the editable white field.
    val paragraphs = mutableListOf<String>()
    val current = StringBuilder()
    cleaned.forEach { block ->
        val startsLikeHeading = block.length <= 80 && !block.endsWith(".") && !block.endsWith("?") && !block.endsWith("!")
        if (startsLikeHeading && current.isNotEmpty()) {
            paragraphs += current.toString().trim()
            current.clear()
        }
        if (current.isNotEmpty()) current.append(' ')
        current.append(block)
        if (current.length >= 380 && (block.endsWith(".") || block.endsWith("?") || block.endsWith("!"))) {
            paragraphs += current.toString().trim()
            current.clear()
        }
    }
    if (current.isNotEmpty()) paragraphs += current.toString().trim()
    return paragraphs.joinToString("\n\n")
}

private fun splitParagraphs(text: String): List<String> =
    text.trim()
        .split(Regex("\\n\\s*\\n+"))
        .map { it.trim() }
        .filter { it.isNotBlank() }

@Composable
fun StudentAiScreen(api: SupabaseApi, session: StudentSession) {
    // api/session intentionally kept in signature to preserve current navigation contract.
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val speech = rememberStudentSpeechController()
    val scope = rememberCoroutineScope()

    var input by remember { mutableStateOf("") }
    var output by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var ocrBusy by remember { mutableStateOf(false) }
    var preparing by remember { mutableStateOf(true) }
    var modelsReady by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var status by remember { mutableStateOf<String?>(null) }
    var accent by remember { mutableStateOf("american") }
    var speed by remember { mutableStateOf("normal") }
    var selectedTab by remember { mutableIntStateOf(0) }
    var translationMode by remember { mutableStateOf("auto") }
    var lastTranslationEngine by remember { mutableStateOf<String?>(null) }
    val translationCache = remember { mutableStateMapOf<String, String>() }

    val arToEn = remember { createTranslator(TranslateLanguage.ARABIC, TranslateLanguage.ENGLISH) }
    val enToAr = remember { createTranslator(TranslateLanguage.ENGLISH, TranslateLanguage.ARABIC) }
    val textRecognizer = remember { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }

    fun runOcr(uris: List<Uri>) {
        if (uris.isEmpty() || ocrBusy) return
        ocrBusy = true
        error = null
        status = null
        val blocks = mutableListOf<String>()

        fun process(index: Int) {
            if (index >= uris.size) {
                val clean = normalizeOcrParagraphs(blocks)
                ocrBusy = false
                if (clean.isBlank()) {
                    error = "لم أجد نصًا واضحًا في الصور. جرّب صورة أوضح وبإضاءة أفضل."
                } else {
                    input = clean.take(20000)
                    output = ""
                    status = "تم استخراج النص وترتيبه إلى فقرات داخل مربع النص. راجعه ثم ترجم أو انسخه."
                }
                return
            }
            val image = runCatching { InputImage.fromFilePath(context, uris[index]) }.getOrElse {
                process(index + 1)
                return
            }
            textRecognizer.process(image)
                .addOnSuccessListener { result ->
                    val current = result.textBlocks.map { it.text }.filter { it.isNotBlank() }
                    if (current.isNotEmpty()) blocks += current
                    process(index + 1)
                }
                .addOnFailureListener { process(index + 1) }
        }
        process(0)
    }

    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
        runOcr(uris.take(8))
    }

    DisposableEffect(Unit) {
        onDispose {
            arToEn.close()
            enToAr.close()
            textRecognizer.close()
        }
    }

    LaunchedEffect(error, status) {
        if (error != null || status != null) {
            kotlinx.coroutines.delay(4200)
            error = null
            status = null
        }
    }

    // Download both Arabic/English models once. After this, translation works offline.
    LaunchedEffect(Unit) {
        val conditions = DownloadConditions.Builder().build()
        var completed = 0
        var failed = false
        fun done(ok: Boolean) {
            completed += 1
            if (!ok) failed = true
            if (completed == 2) {
                preparing = false
                modelsReady = !failed
                if (failed) error = "يحتاج تنزيل نموذج الترجمة مرة واحدة عند توفر الإنترنت، وبعدها تعمل الترجمة بدون نت."
            }
        }
        arToEn.downloadModelIfNeeded(conditions).addOnSuccessListener { done(true) }.addOnFailureListener { done(false) }
        enToAr.downloadModelIfNeeded(conditions).addOnSuccessListener { done(true) }.addOnFailureListener { done(false) }
    }

    fun translateOffline(text: String, onDone: (Boolean) -> Unit) {
        val hasArabic = Regex("[\u0600-\u06FF]").containsMatchIn(text)
        val translator = if (hasArabic) arToEn else enToAr
        val conditions = DownloadConditions.Builder().build()
        translator.downloadModelIfNeeded(conditions)
            .addOnSuccessListener {
                modelsReady = true
                translator.translate(text)
                    .addOnSuccessListener { translated ->
                        output = translated.trim()
                        translationCache[text] = output
                        lastTranslationEngine = "Offline • ML Kit"
                        onDone(true)
                    }
                    .addOnFailureListener { onDone(false) }
            }
            .addOnFailureListener { onDone(false) }
    }

    fun translateNow() {
        val text = input.trim()
        if (text.isBlank() || busy) return
        error = null
        status = null
        translationCache[text]?.let { cached ->
            output = cached
            lastTranslationEngine = "ذاكرة الجهاز"
            status = "تم عرض ترجمة محفوظة فورًا."
            return
        }
        busy = true

        fun finishOffline() {
            translateOffline(text) { ok ->
                busy = false
                if (!ok) {
                    error = "تعذر تشغيل الترجمة بدون إنترنت. افتح الإنترنت مرة واحدة لتنزيل نموذج العربية والإنجليزية."
                } else {
                    status = "تمت الترجمة بدون إنترنت على الجهاز."
                }
            }
        }

        // Use the on-device model first when it is ready: this avoids a network round-trip.
        if (translationMode == "offline" || (translationMode == "auto" && modelsReady)) {
            finishOffline()
            return
        }

        val canUseOnline = translationMode == "online" && isStudentOnline(context)
        if (!canUseOnline) {
            finishOffline()
            return
        }

        scope.launch {
            val online = withContext(Dispatchers.IO) { api.callStudentAi(session, "translate", text) }
            online.onSuccess { translated ->
                output = translated.trim()
                translationCache[text] = output
                lastTranslationEngine = "Online • Context AI"
                busy = false
                status = "تمت ترجمة النص أونلاين مع مراعاة السياق."
            }.onFailure { throwable ->
                if (translationMode == "online") {
                    busy = false
                    error = throwable.message ?: "تعذر الوصول إلى الترجمة الأونلاين."
                } else {
                    finishOffline()
                }
            }
        }
    }

    val inputHasArabic = Regex("[\\u0600-\\u06FF]").containsMatchIn(input)
    val englishForSpeech = when {
        output.isBlank() -> if (!inputHasArabic) input.trim() else ""
        inputHasArabic -> output
        else -> input.trim()
    }

    LazyColumn(
        Modifier.fillMaxSize().background(Color(0xFFF5F7FA)).imePadding().navigationBarsPadding(),
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = StudentBlueDark)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Surface(shape = RoundedCornerShape(14.dp), color = StudentTeal.copy(alpha = .2f)) { Icon(Icons.Rounded.Translate, null, tint = StudentGold, modifier = Modifier.padding(10.dp).size(24.dp)) }
                        Column {
                            Text("مترجم Student", color = Color.White, fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleLarge)
                            Text("ترجمة ذكية وسريعة على جهازك", color = Color.White.copy(alpha = .72f), fontSize = 12.sp)
                        }
                    }
                    Text("نص • صورة إلى نص • نسخ • نطق", color = Color.White.copy(alpha = .82f))
                    when {
                        preparing -> Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                            Text("جارِ تجهيز الترجمة للاستخدام بدون نت...", color = Color.White.copy(alpha = .82f))
                        }
                        modelsReady -> Text("✓ الترجمة بدون إنترنت جاهزة", color = Color(0xFFB8F2D0), fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        item {
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    Text("وضع الترجمة", fontWeight = FontWeight.Black)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        listOf("auto" to "تلقائي", "online" to "Online", "offline" to "Offline").forEach { (key, label) ->
                            FilterChip(
                                selected = translationMode == key,
                                onClick = { translationMode = key },
                                label = { Text(label) }
                            )
                        }
                    }
                    Text(
                        when (translationMode) {
                            "online" -> "يستخدم الترجمة السياقية عبر الخادم فقط."
                            "offline" -> "يستخدم نموذج الجهاز فقط ولا يحتاج إنترنت بعد تنزيله."
                            else -> "يستخدم Online أولاً، ويتحول إلى Offline تلقائياً عند ضعف أو انقطاع الشبكة."
                        },
                        color = StudentMuted, fontSize = 12.sp
                    )
                    lastTranslationEngine?.let { Text("آخر ترجمة: $it", color = StudentBlue, fontWeight = FontWeight.Bold, fontSize = 12.sp) }
                }
            }
        }

        item {
            TabRow(selectedTabIndex = selectedTab) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("نص وترجمة") }, icon = { Icon(Icons.Rounded.Translate, null) })
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("صورة → نص") }, icon = { Icon(Icons.Rounded.ImageSearch, null) })
            }
        }

        if (selectedTab == 1) {
            item {
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("استخراج النص من الصور", fontWeight = FontWeight.Black)
                        Text("اختر صورة أو عدة صور، وسيظهر النص مرتباً إلى فقرات قابلة للتعديل داخل المربع.", color = StudentMuted)
                        Button(
                            onClick = { imagePicker.launch("image/*") },
                            enabled = !ocrBusy,
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = StudentBlue)
                        ) {
                            if (ocrBusy) CircularProgressIndicator(Modifier.size(19.dp), color = Color.White, strokeWidth = 2.dp)
                            else Icon(Icons.Rounded.AddPhotoAlternate, null)
                            Spacer(Modifier.width(7.dp))
                            Text(if (ocrBusy) "جارِ قراءة الصور..." else "اختيار صور من الاستوديو", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        item {
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = Color.White), border = BorderStroke(1.dp, StudentBorder)) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text(if (selectedTab == 1) "النص المستخرج" else "النص الأصلي", fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                        Surface(shape = RoundedCornerShape(10.dp), color = StudentSoft) { Text(if (input.isBlank()) "AR / EN" else if (inputHasArabic) "العربية" else "English", color = StudentBlue, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp)) }
                        if (input.isNotBlank()) IconButton(onClick = { input = ""; output = "" }) { Icon(Icons.Rounded.Close, "مسح") }
                    }
                    OutlinedTextField(
                        value = input,
                        onValueChange = { input = it.take(20000); output = "" },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 5,
                        maxLines = 12,
                        placeholder = { Text("اكتب أو الصق النص هنا...") },
                        textStyle = LocalTextStyle.current.copy(textDirection = bidiTextDirection(input), textAlign = if (Regex("[\u0600-\u06FF]").containsMatchIn(input.trim().take(24))) TextAlign.Right else TextAlign.Left),
                        shape = RoundedCornerShape(16.dp)
                    )
                }
            }
        }

        if (input.isNotBlank()) {
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { clipboard.setText(AnnotatedString(input)) }, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Rounded.ContentCopy, null, Modifier.size(18.dp)); Spacer(Modifier.width(5.dp)); Text("نسخ الكل")
                    }
                    OutlinedButton(
                        onClick = {
                            if (englishForSpeech.isBlank()) error = "النطق الكامل متاح للنص الإنجليزي. ترجم العربية أولًا."
                            else if (!speech.speak(englishForSpeech, accent, speed)) error = "صوت English المطلوب غير مثبت على الجهاز."
                        },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Rounded.VolumeUp, null, Modifier.size(18.dp)); Spacer(Modifier.width(5.dp)); Text("نطق الكل")
                    }
                }
            }
        }

        item {
            Button(
                onClick = ::translateNow,
                enabled = input.isNotBlank() && !busy,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = StudentTeal),
                shape = RoundedCornerShape(16.dp)
            ) {
                if (busy) CircularProgressIndicator(Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                else { Icon(Icons.Rounded.Translate, null); Spacer(Modifier.width(7.dp)); Text("ترجم", fontWeight = FontWeight.Black) }
            }
        }



        if (output.isNotBlank()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFEAF8F5)),
                    border = BorderStroke(1.dp, Color(0xFFB9E5DA))
                ) {
                    Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text("الترجمة النهائية", color = StudentBlueDark, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                            lastTranslationEngine?.let { Surface(shape = RoundedCornerShape(10.dp), color = Color.White.copy(alpha = .75f)) { Text(it, color = StudentTeal, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)) } }
                        }
                        Text(output, style = MaterialTheme.typography.bodyLarge.copy(textDirection = bidiTextDirection(output)), textAlign = if (Regex("[\u0600-\u06FF]").containsMatchIn(output.trim().take(24))) TextAlign.Right else TextAlign.Left, modifier = Modifier.fillMaxWidth())
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { clipboard.setText(AnnotatedString(output)) }) {
                                Icon(Icons.Rounded.ContentCopy, null, Modifier.size(18.dp)); Spacer(Modifier.width(5.dp)); Text("نسخ")
                            }
                            OutlinedButton(onClick = { val old = input; input = output; output = old }) {
                                Icon(Icons.Rounded.SwapVert, null, Modifier.size(18.dp)); Spacer(Modifier.width(5.dp)); Text("عكس")
                            }
                        }
                    }
                }
            }
        }

        item {
            StudentOutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    Text("النطق الإنجليزي", fontWeight = FontWeight.Black)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        FilterChip(selected = accent == "american", onClick = { accent = "american" }, label = { Text("American") })
                        FilterChip(selected = accent == "british", onClick = { accent = "british" }, label = { Text("British") })
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        FilterChip(selected = speed == "slow", onClick = { speed = "slow" }, label = { Text("بطيء") })
                        FilterChip(selected = speed == "normal", onClick = { speed = "normal" }, label = { Text("طبيعي") })
                        FilterChip(selected = speed == "fast", onClick = { speed = "fast" }, label = { Text("سريع") })
                    }
                }
            }
        }

        status?.let { item { Surface(color = Color(0xFFECFDF3), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) { Text(it, color = Color(0xFF16834A), modifier = Modifier.padding(11.dp)) } } }
        error?.let { item { Surface(color = Color(0xFFFFF1F2), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) { Text(it, color = Color(0xFFB42318), modifier = Modifier.padding(11.dp)) } } }
        item { Spacer(Modifier.height(24.dp)) }
    }
}
