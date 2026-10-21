package com.student.feature.home

import android.net.Uri
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.FormatColorText
import androidx.compose.material.icons.rounded.Gesture
import androidx.compose.material.icons.rounded.EmojiEmotions
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.RotateRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

data class StoryEditDraft(
    val caption: String,
    val rotation: Float,
    val scale: Float,
    val strokes: List<List<Offset>> = emptyList(),
    val canvasSize: Size = Size.Zero
    val textScale: Float = 1f
    val textOffset: Offset = Offset.Zero
    val sticker: String? = null
)

@Composable
fun StoryComposerScreen(
    uri: Uri,
    mediaType: String,
    initialCaption: String = "",
    busy: Boolean = false,
    onClose: () -> Unit,
    onPickAnother: () -> Unit,
    onPublish: (StoryEditDraft) -> Unit
) {
    var caption by remember(uri) { mutableStateOf(initialCaption) }
    var textMode by remember(uri) { mutableStateOf(false) }
    var drawMode by remember(uri) { mutableStateOf(false) }
    var textColor by remember(uri) { mutableStateOf(Color.White) }
    var rotation by remember(uri) { mutableFloatStateOf(0f) }
    var scale by remember(uri) { mutableFloatStateOf(1f) }
    var textScale by remember(uri) { mutableFloatStateOf(1f) }
    var textOffset by remember(uri) { mutableStateOf(Offset.Zero) }
    var sticker by remember(uri) { mutableStateOf<String?>(null) }
    var canvasSize by remember(uri) { mutableStateOf(Size.Zero) }
    val strokes = remember(uri) { mutableStateListOf<List<Offset>>() }
    var currentStroke by remember(uri) { mutableStateOf<List<Offset>>(emptyList()) }
    val colors = listOf(Color.White, Color.Black, Color(0xFFE76F51), Color(0xFFD69E2E), Color(0xFF0F766E), Color(0xFF4F46E5))

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        AsyncImage(uri, "معاينة القصة", Modifier.fillMaxSize().graphicsLayer { rotationZ = rotation; scaleX = scale; scaleY = scale }, contentScale = ContentScale.Crop)
        Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.08f)))

        if (drawMode) {
            Canvas(
                Modifier.fillMaxSize().onSizeChanged { canvasSize = Size(it.width.toFloat(), it.height.toFloat()) }.pointerInput(uri, drawMode) {
                    detectDragGestures(
                        onDragStart = { currentStroke = listOf(it) },
                        onDrag = { change, _ -> currentStroke = currentStroke + change.position },
                        onDragEnd = { if (currentStroke.isNotEmpty()) strokes.add(currentStroke); currentStroke = emptyList() }
                    )
                }
            ) {
                fun drawStroke(points: List<Offset>) {
                    if (points.size < 2) return
                    val path = Path().apply { moveTo(points.first().x, points.first().y); points.drop(1).forEach { lineTo(it.x, it.y) } }
                    drawPath(path, textColor, style = androidx.compose.ui.graphics.drawscope.Stroke(width = 8.dp.toPx(), cap = StrokeCap.Round))
                }
                strokes.forEach(::drawStroke)
                drawStroke(currentStroke)
            }
        }

        if (caption.isNotBlank()) {
            Text(
                caption,
                color = textColor,
                fontSize = (26f * textScale).sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.align(Alignment.Center).offset { androidx.compose.ui.unit.IntOffset(textOffset.x.toInt(), textOffset.y.toInt()) }.pointerInput(caption) {
                    detectDragGestures { change, dragAmount -> change.consume(); textOffset += dragAmount }
                }.padding(28.dp)
            )
        }
        sticker?.let { value -> Text(value, fontSize = 58.sp, modifier = Modifier.align(Alignment.Center).offset(y = 110.dp)) }

        Column(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 12.dp, vertical = 10.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onClose, enabled = !busy) { Icon(Icons.Rounded.Close, "إلغاء", tint = Color.White) }
                Text(if (mediaType == "video") "تحرير الفيديو" else "تحرير الصورة", color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                TextButton(onClick = { onPublish(StoryEditDraft(caption.trim(), rotation, scale, strokes.toList(), canvasSize, textScale, textOffset, sticker)) }, enabled = !busy) {
                    if (busy) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    else { Text("مشاركة", color = Color.White, fontWeight = FontWeight.Bold); Spacer(Modifier.width(4.dp)); Icon(Icons.Rounded.Check, null, tint = Color.White) }
                }
            }
        }

        Column(Modifier.align(Alignment.BottomCenter).fillMaxWidth().navigationBarsPadding().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (textMode) {
                OutlinedTextField(
                    value = caption,
                    onValueChange = { caption = it.take(1000) },
                    placeholder = { Text("اكتب شيئًا...") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = false,
                    colors = OutlinedTextFieldDefaults.colors(unfocusedContainerColor = Color.Black.copy(alpha = .5f), focusedContainerColor = Color.Black.copy(alpha = .5f), unfocusedTextColor = Color.White, focusedTextColor = Color.White, unfocusedLabelColor = Color.White, focusedLabelColor = Color.White)
                )
            }
                if (mediaType == "image") {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    EditorTool(Icons.Rounded.RotateRight, "تدوير") { rotation = (rotation + 90f) % 360f }
                    Text("تكبير", color = Color.White, fontSize = 11.sp)
                    Slider(value = scale, onValueChange = { scale = it }, valueRange = 1f..2.5f, modifier = Modifier.weight(1f))
                }
                }
            if (textMode && caption.isNotBlank()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("حجم النص", color = Color.White, fontSize = 11.sp)
                    Slider(value = textScale, onValueChange = { textScale = it }, valueRange = .7f..2f, modifier = Modifier.weight(1f))
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                EditorTool(Icons.Rounded.Refresh, "استبدال") { onPickAnother() }
                EditorTool(Icons.Rounded.FormatColorText, "نص") { textMode = !textMode; drawMode = false }
                EditorTool(Icons.Rounded.Gesture, "رسم") { drawMode = !drawMode; textMode = false }
                EditorTool(Icons.Rounded.EmojiEmotions, "ملصق") { sticker = if (sticker == null) "✨" else null }
                colors.forEach { color ->
                    Surface(Modifier.size(27.dp).clickable { textColor = color }, shape = CircleShape, color = color, border = androidx.compose.foundation.BorderStroke(if (textColor == color) 3.dp else 1.dp, Color.White)) { Box(Modifier.fillMaxSize()) }
                }
            }
            Text("اسحب للرسم، أضف نصًا، ثم شارك قصتك", color = Color.White.copy(alpha = .8f), fontSize = 11.sp, modifier = Modifier.align(Alignment.CenterHorizontally))
        }
    }
}

@Composable
private fun EditorTool(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable(onClick = onClick)) {
        Surface(shape = CircleShape, color = Color.Black.copy(alpha = .55f)) { Icon(icon, label, tint = Color.White, modifier = Modifier.padding(9.dp).size(22.dp)) }
        Text(label, color = Color.White, fontSize = 10.sp)
    }
}
