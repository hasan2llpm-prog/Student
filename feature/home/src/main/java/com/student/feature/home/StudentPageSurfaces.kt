package com.student.feature.home

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties

/**
 * Student v2.10.0 page-first interaction policy.
 *
 * These package-level replacements deliberately turn the old Material modal
 * primitives into in-flow/full-page surfaces. Existing actions keep their
 * behavior while dialogs/bottom-sheets/popups disappear from the visual model.
 */
@Composable
fun AlertDialog(
    onDismissRequest: () -> Unit,
    confirmButton: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    dismissButton: (@Composable () -> Unit)? = null,
    icon: (@Composable () -> Unit)? = null,
    title: (@Composable () -> Unit)? = null,
    text: (@Composable () -> Unit)? = null,
    shape: Shape = RoundedCornerShape(0.dp),
    containerColor: Color = MaterialTheme.colorScheme.background,
    iconContentColor: Color = MaterialTheme.colorScheme.primary,
    titleContentColor: Color = MaterialTheme.colorScheme.onBackground,
    textContentColor: Color = MaterialTheme.colorScheme.onBackground,
    tonalElevation: Dp = 0.dp
) {
    BackHandler(onBack = onDismissRequest)
    Surface(
        modifier = modifier.fillMaxSize().imePadding().navigationBarsPadding(),
        color = containerColor,
        shape = shape,
        tonalElevation = tonalElevation
    ) {
        Column(Modifier.fillMaxSize()) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onDismissRequest) { Text("رجوع") }
                Spacer(Modifier.width(4.dp))
                Box(Modifier.weight(1f)) { title?.invoke() }
                icon?.let { Box(Modifier.padding(horizontal = 6.dp)) { it() } }
            }
            HorizontalDivider(color = StudentBorder)
            Box(Modifier.weight(1f).fillMaxWidth().padding(16.dp)) {
                text?.invoke()
            }
            HorizontalDivider(color = StudentBorder)
            Row(
                Modifier.fillMaxWidth().padding(12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.End),
                verticalAlignment = Alignment.CenterVertically
            ) {
                dismissButton?.invoke()
                confirmButton()
            }
        }
    }
}

@Composable
fun ModalBottomSheet(
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    BackHandler(onBack = onDismissRequest)
    Surface(modifier.fillMaxSize().imePadding().navigationBarsPadding(), color = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onDismissRequest) { Text("رجوع") }
                Text("صفحة داخلية", style = MaterialTheme.typography.titleMedium)
            }
            HorizontalDivider(color = StudentBorder)
            Column(Modifier.fillMaxSize(), content = content)
        }
    }
}

@Composable
fun DropdownMenu(
    expanded: Boolean,
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    if (!expanded) return
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, StudentBorder),
        tonalElevation = 0.dp
    ) {
        Column(Modifier.fillMaxWidth(), content = content)
    }
}

@Composable
fun Dialog(
    onDismissRequest: () -> Unit,
    properties: DialogProperties = DialogProperties(),
    content: @Composable () -> Unit
) {
    BackHandler(onBack = onDismissRequest)
    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        content()
    }
}
