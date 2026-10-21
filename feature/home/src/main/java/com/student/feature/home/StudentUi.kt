package com.student.feature.home

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

val StudentBlue = Color(0xFF6D28D9)
val StudentBlueDark = Color(0xFF5B21B6)
val StudentText = Color(0xFF262626)
val StudentMuted = Color(0xFF77818C)
val StudentBorder = Color(0xFFDBDBDB)
val StudentSoft = Color(0xFFFAF7FF)
val StudentMessageBg = Color(0xFFF8F5FF)

@Composable
fun VerificationBadge(
    verified: Boolean,
    colorName: String?,
    modifier: Modifier = Modifier,
    size: Dp = 18.dp
) {
    if (!verified) return
    val badgeColor = when (colorName?.lowercase()) {
        "orange" -> Color(0xFFFF8A00)
        "red" -> Color(0xFFE53935)
        "blue" -> Color(0xFF0095F6)
        "green" -> Color(0xFF1B8B55)
        "purple" -> Color(0xFF7C3AED)
        else -> Color(0xFF0095F6)
    }
    Canvas(modifier = modifier.size(size)) {
        val w = this.size.width
        val h = this.size.height
        val points = listOf(
            .50f to .00f, .61f to .08f, .74f to .05f, .82f to .18f,
            .95f to .26f, .92f to .40f, 1.00f to .50f, .92f to .61f,
            .95f to .74f, .82f to .82f, .74f to .95f, .61f to .92f,
            .50f to 1.00f, .39f to .92f, .26f to .95f, .18f to .82f,
            .05f to .74f, .08f to .61f, .00f to .50f, .08f to .40f,
            .05f to .26f, .18f to .18f, .26f to .05f, .39f to .08f
        )
        val badge = Path().apply {
            moveTo(points.first().first * w, points.first().second * h)
            points.drop(1).forEach { (x, y) -> lineTo(x * w, y * h) }
            close()
        }
        drawPath(badge, badgeColor)
        val check = Path().apply {
            moveTo(.27f * w, .52f * h)
            lineTo(.43f * w, .68f * h)
            lineTo(.74f * w, .34f * h)
        }
        drawPath(
            path = check,
            color = Color.White,
            style = Stroke(
                width = (size.value * .12f).dp.toPx(),
                cap = StrokeCap.Round,
                join = StrokeJoin.Round
            )
        )
    }
}

@Composable
fun StudentAvatar(
    name: String,
    avatarUrl: String?,
    frameUrl: String? = null,
    size: Dp = 52.dp,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier.size(size + 10.dp), contentAlignment = Alignment.Center) {
        if (!avatarUrl.isNullOrBlank()) {
            AsyncImage(
                model = avatarUrl,
                contentDescription = "صورة الحساب",
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(size)
                    .clip(CircleShape)
                    .background(Color(0xFFEAF2FF))
            )
        } else {
            Surface(
                modifier = Modifier.size(size),
                shape = CircleShape,
                color = Color(0xFFEAF2FF)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        name.trim().firstOrNull()?.toString()?.uppercase() ?: "S",
                        color = Color(0xFF47709F),
                        fontSize = (size.value * 0.36f).sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }
        }
        if (!frameUrl.isNullOrBlank()) {
            if (frameUrl.startsWith("student-frame:")) {
                NativeProfileFrame(frameUrl.substringAfter("student-frame:"), Modifier.fillMaxSize())
            } else {
                AsyncImage(
                    model = frameUrl,
                    contentDescription = "إطار الحساب",
                    contentScale = ContentScale.FillBounds,
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }
}

@Composable
fun StudentName(
    name: String,
    verified: Boolean,
    verificationColor: String?,
    modifier: Modifier = Modifier,
    style: androidx.compose.ui.text.TextStyle = MaterialTheme.typography.titleMedium
) {
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
        Text(name, style = style, fontWeight = FontWeight.Bold, color = StudentText)
        VerificationBadge(verified, verificationColor)
    }
}


@Composable
fun CustomProfileBadge(label: String?, colorValue: String?, modifier: Modifier = Modifier) {
    if (label.isNullOrBlank()) return
    val bg = runCatching { Color(android.graphics.Color.parseColor(colorValue ?: "#7c3aed")) }.getOrDefault(Color(0xFF7C3AED))
    Surface(modifier = modifier, shape = RoundedCornerShape(999.dp), color = bg.copy(alpha = 0.12f), border = androidx.compose.foundation.BorderStroke(1.dp, bg.copy(alpha = 0.28f))) {
        Text(label, color = bg, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
    }
}

@Composable
fun StudentOutlinedCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE7E5EA)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        content = content
    )
}

@Composable
fun StudentLogo() {
    Text(
        "Student",
        color = StudentBlue,
        fontSize = 25.sp,
        fontWeight = FontWeight.Black,
        fontStyle = FontStyle.Italic
    )
}


@Composable
private fun NativeProfileFrame(frameKey: String, modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "studentFrame")
    val rotation by transition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(animation = tween(2600, easing = LinearEasing)),
        label = "frameRotation"
    )
    val pulse by transition.animateFloat(
        initialValue = 0.72f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(animation = tween(900), repeatMode = RepeatMode.Reverse),
        label = "framePulse"
    )
    val colors = when (frameKey.lowercase()) {
        "fire" -> listOf(Color(0xFFFFD54F), Color(0xFFFF6D00), Color(0xFFE53935), Color(0xFFFFD54F))
        "blue-fire" -> listOf(Color(0xFF80D8FF), Color(0xFF2979FF), Color(0xFF00E5FF), Color(0xFF80D8FF))
        "neon" -> listOf(Color(0xFFFF00E5), Color(0xFF00E5FF), Color(0xFF7C4DFF), Color(0xFFFF00E5))
        "lightning" -> listOf(Color(0xFFFFEA00), Color(0xFFFFFFFF), Color(0xFF2979FF), Color(0xFFFFEA00))
        "royal" -> listOf(Color(0xFFFFF3B0), Color(0xFFFFC107), Color(0xFFB8860B), Color(0xFFFFF3B0))
        "ember" -> listOf(Color(0xFFFF8A65), Color(0xFFBF360C), Color(0xFFFFCA28), Color(0xFFFF8A65))
        else -> listOf(StudentBlue, Color(0xFF7C3AED), StudentBlue)
    }
    Canvas(modifier = modifier.rotate(rotation)) {
        drawCircle(
            brush = Brush.sweepGradient(colors),
            radius = size.minDimension / 2f - 3.dp.toPx(),
            style = Stroke(width = 4.dp.toPx()),
            alpha = pulse
        )
        drawCircle(
            color = colors[1].copy(alpha = 0.25f),
            radius = size.minDimension / 2f - 7.dp.toPx(),
            style = Stroke(width = 1.5.dp.toPx())
        )
    }
}
