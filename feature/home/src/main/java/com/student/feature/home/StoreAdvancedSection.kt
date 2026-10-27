package com.student.feature.home

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Brush
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Diamond
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun StoreAdvancedSection(api: SupabaseApi, session: StudentSession, onWalletChanged: () -> Unit) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val masterNumber = "6783943118"
    val masterName = "JAWAD R SAGBAN"
    val whatsappNumber = "9647725541189"
    var subTab by remember { mutableIntStateOf(0) }
    var tasks by remember { mutableStateOf<List<StoreTask>>(emptyList()) }
    var packages by remember { mutableStateOf<List<DiamondPackage>>(emptyList()) }
    var wallet by remember { mutableStateOf(WalletSummary()) }
    var transactions by remember { mutableStateOf<List<WalletTransaction>>(emptyList()) }
    var agency by remember { mutableStateOf<AgencyApplication?>(null) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(message) { if (message != null) { kotlinx.coroutines.delay(2800); message = null } }
    var purchase by remember { mutableStateOf<DiamondPackage?>(null) }
    var senderName by remember { mutableStateOf("") }
    var cardLast4 by remember { mutableStateOf("") }
    var paidConfirmed by remember { mutableStateOf(false) }

    fun refresh() {
        scope.launch {
            busy = true
            val taskResult = withContext(Dispatchers.IO) { api.storeTasks(session) }
            val packageResult = withContext(Dispatchers.IO) { api.diamondPackages(session) }
            val transactionResult = withContext(Dispatchers.IO) { api.walletTransactions(session) }
            val walletResult = withContext(Dispatchers.IO) { api.walletSummary(session) }
            val agencyResult = withContext(Dispatchers.IO) { api.myAgencyApplication(session) }
            taskResult.onSuccess { tasks = it }
            packageResult.onSuccess { packages = it }
            transactionResult.onSuccess { transactions = it }
            walletResult.onSuccess { wallet = it }
            agencyResult.onSuccess { agency = it }
            busy = false
        }
    }
    LaunchedEffect(session.userId) { refresh() }

    purchase?.let { pack ->
        AlertDialog(
            onDismissRequest = { if (!busy) purchase = null },
            title = { Text("دفع باقة ${pack.diamonds} ألماسة") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    Text("السعر: ${pack.userPriceIqd} د.ع", fontWeight = FontWeight.Bold)
                    StudentOutlinedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp)) {
                            Text("بطاقة SuperQi للتحويل", fontWeight = FontWeight.Black)
                            Text(masterNumber, color = StudentBlue, fontWeight = FontWeight.Black)
                            Text(masterName, color = StudentMuted)
                        }
                    }
                    Text("حوّل المبلغ بالضبط، ثم اكتب اسم صاحب البطاقة وآخر 4 أرقام من البطاقة التي حوّلت منها. لا نطلب PIN أو OTP أو الرقم الكامل.", color = StudentMuted)
                    OutlinedTextField(senderName, { senderName = it.take(80) }, label = { Text("اسم صاحب البطاقة") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(cardLast4, { cardLast4 = it.filter(Char::isDigit).take(4) }, label = { Text("آخر 4 أرقام") }, modifier = Modifier.fillMaxWidth())
                    Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                        Checkbox(checked = paidConfirmed, onCheckedChange = { paidConfirmed = it })
                        Text("أؤكد أنني أكملت التحويل")
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (!paidConfirmed || senderName.trim().length < 2 || cardLast4.length != 4) {
                        message = "أكمل بيانات الدفع أولًا."
                        return@Button
                    }
                    scope.launch {
                        busy = true
                        val r = withContext(Dispatchers.IO) { api.submitDiamondPayment(session, pack, senderName, cardLast4) }
                        busy = false
                        r.onSuccess { requestId ->
                            val text = listOf(
                                "طلب شراء ألماس - Student",
                                "رقم الطلب: $requestId",
                                "الباقة: ${pack.title}",
                                "الكمية: ${pack.diamonds} ألماسة",
                                "المبلغ: ${pack.userPriceIqd} د.ع",
                                "اسم صاحب البطاقة: ${senderName.trim()}",
                                "آخر 4 أرقام: ${cardLast4.trim()}"
                            ).joinToString("\n")
                            runCatching {
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$whatsappNumber?text=${Uri.encode(text)}")))
                            }
                            message = "تم إرسال الطلب للإدارة وفتح واتساب لإرسال الإثبات."
                            purchase = null
                            senderName = ""
                            cardLast4 = ""
                            paidConfirmed = false
                            refresh()
                        }.onFailure { message = it.message ?: "تعذر إرسال طلب الدفع." }
                    }
                }, enabled = !busy) { Text("إرسال الطلب وفتح واتساب") }
            },
            dismissButton = { TextButton(onClick = { purchase = null }, enabled = !busy) { Text("إلغاء") } }
        )
    }

    Column(Modifier.fillMaxSize()) {
        Surface(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            shape = RoundedCornerShape(22.dp),
            color = Color.Transparent
        ) {
            Row(
                Modifier.fillMaxWidth().background(
                    Brush.horizontalGradient(listOf(Color(0xFF172554), Color(0xFF6D28D9), Color(0xFFB7791F))),
                    RoundedCornerShape(22.dp)
                ).padding(horizontal = 18.dp, vertical = 15.dp),
                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
            ) {
                Column(Modifier.weight(1f)) {
                    Text("محفظة الألماس", color = Color.White.copy(alpha = .72f), fontSize = 11.sp)
                    Text("${wallet.diamonds}", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Black)
                    Text("الرصيد الحالي المتاح", color = Color.White.copy(alpha = .72f), fontSize = 10.sp)
                }
                Icon(Icons.Rounded.Diamond, "الألماس", tint = Color(0xFFFFE08A), modifier = Modifier.size(42.dp))
            }
        }
        ScrollableTabRow(selectedTabIndex = subTab, edgePadding = 8.dp, containerColor = Color.White, contentColor = StudentBlue) {
            listOf("المهام", "شراء ألماس", "السجل", "الوكالة").forEachIndexed { index, label ->
                Tab(selected = subTab == index, onClick = { subTab = index }, text = { Text(label) })
            }
        }
        message?.let { Text(it, Modifier.padding(12.dp), color = if (it.startsWith("تم")) Color(0xFF16803C) else MaterialTheme.colorScheme.error) }
        when (subTab) {
            0 -> LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(tasks, key = { it.id }) { task ->
                    Surface(
                        Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(18.dp),
                        color = MaterialTheme.colorScheme.surface,
                        shadowElevation = 1.dp
                    ) {
                        Column(Modifier.padding(14.dp)) {
                            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                                Icon(Icons.Rounded.Diamond, null, tint = StudentGold, modifier = Modifier.size(22.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(task.title, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                                Text("+${task.rewardDiamonds}", color = StudentGold, fontWeight = FontWeight.Black)
                            }
                            Spacer(Modifier.height(5.dp))
                            Text(task.description, color = StudentMuted)
                            LinearProgressIndicator(
                                progress = { if (task.verificationType == "daily_visit") 1f else 0f },
                                modifier = Modifier.fillMaxWidth().padding(vertical = 9.dp),
                                color = StudentTeal,
                                trackColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                            if (task.verificationType == "daily_visit") {
                                Button(onClick = {
                                    scope.launch {
                                        busy = true
                                        val r = withContext(Dispatchers.IO) { api.claimStoreTask(session, task.id) }
                                        busy = false
                                        r.onSuccess { message = "تم استلام المكافأة. الرصيد الجديد: $it"; onWalletChanged(); refresh() }
                                            .onFailure { message = it.message }
                                    }
                                }, enabled = !busy) { Text("استلام") }
                            } else Text("يتم التحقق من هذه المهمة بواسطة النظام/الإدارة.", style = MaterialTheme.typography.labelSmall, color = StudentMuted)
                        }
                    }
                }
                if (tasks.isEmpty() && !busy) item { Text("لا توجد مهام متاحة.", color = StudentMuted) }
            }
            1 -> LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(packages, key = { it.id }) { pack ->
                    Surface(
                        Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        color = Color.Transparent
                    ) {
                        Row(
                            Modifier.fillMaxWidth().background(
                                Brush.linearGradient(listOf(Color(0xFF24104F), Color(0xFF6D28D9), Color(0xFFB7791F))),
                                RoundedCornerShape(20.dp)
                            ).padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
                        ) {
                            Column {
                                Text(pack.title, fontWeight = FontWeight.Black, color = Color.White)
                                Text("${pack.diamonds} ألماسة", color = Color(0xFFFFE08A), fontWeight = FontWeight.Bold)
                                Text("${pack.userPriceIqd} IQD", color = Color.White.copy(alpha = .76f), fontSize = 11.sp)
                            }
                            Button(onClick = { purchase = pack }, colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color(0xFF4C1D95))) { Text("شراء") }
                        }
                    }
                }
                if (packages.isEmpty() && !busy) item { Text("لا توجد باقات ألماس متاحة.", color = StudentMuted) }
            }
            2 -> LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                items(transactions, key = { it.id }) { tx ->
                    StudentOutlinedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(tx.description.ifBlank { tx.transactionType }, fontWeight = FontWeight.Bold)
                                Text(if (tx.amount >= 0) "+${tx.amount.toLong()}" else tx.amount.toLong().toString(), color = if (tx.amount >= 0) Color(0xFF16803C) else Color(0xFFC62828))
                            }
                            Text("الرصيد بعد العملية: ${tx.balanceAfter.toLong()}", color = StudentMuted, style = MaterialTheme.typography.labelSmall)
                            Text(prettyTime(tx.createdAt), color = StudentMuted, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
                if (transactions.isEmpty() && !busy) item { Text("لا توجد حركات في المحفظة.", color = StudentMuted) }
            }
            else -> AgencyPane(api, session, agency, busy) { msg -> message = msg; refresh() }
        }
    }
}

@Composable
private fun AgencyPane(api: SupabaseApi, session: StudentSession, application: AgencyApplication?, parentBusy: Boolean, onDone: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    var fullName by remember { mutableStateOf("") }
    var province by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var whatsapp by remember { mutableStateOf("") }
    var telegram by remember { mutableStateOf("") }
    var experience by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().imePadding(),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(9.dp)
    ) {
        application?.let { current ->
            item {
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("طلب الوكالة", fontWeight = FontWeight.Black)
                        Text("الحالة: ${current.status}", color = StudentBlue)
                        current.adminNote?.let { note -> Text("ملاحظة الإدارة: $note", color = StudentMuted) }
                    }
                }
            }
            if (current.status in listOf("pending", "approved")) return@LazyColumn
        }
        item { Text("التقديم كوكيل", fontWeight = FontWeight.Black) }
        item { OutlinedTextField(fullName, { fullName = it.take(100) }, label = { Text("الاسم الكامل") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(province, { province = it.take(80) }, label = { Text("المحافظة") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(phone, { phone = it.take(30) }, label = { Text("الهاتف") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(whatsapp, { whatsapp = it.take(40) }, label = { Text("WhatsApp") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(telegram, { telegram = it.take(80) }, label = { Text("Telegram") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(experience, { experience = it.take(1000) }, label = { Text("الخبرة") }, modifier = Modifier.fillMaxWidth(), minLines = 3) }
        item {
            Button(
                onClick = {
                    if (fullName.isBlank() || province.isBlank() || phone.isBlank() || busy || parentBusy) return@Button
                    scope.launch {
                        busy = true
                        val r = withContext(Dispatchers.IO) { api.submitAgencyApplication(session, fullName.trim(), province.trim(), phone.trim(), whatsapp.trim(), telegram.trim(), experience.trim()) }
                        busy = false
                        r.onSuccess { onDone("تم إرسال طلب الوكالة للإدارة.") }.onFailure { onDone(it.message ?: "تعذر إرسال الطلب.") }
                    }
                }, modifier = Modifier.fillMaxWidth(), enabled = !busy && !parentBusy
            ) { Text(if (busy) "جارٍ الإرسال..." else "إرسال طلب الوكالة") }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}
