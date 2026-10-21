package com.student.feature.home

import androidx.compose.foundation.BorderStroke
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun StoreScreen(api: SupabaseApi, session: StudentSession, initialProductType: String? = null, onInitialProductConsumed: () -> Unit = {}, onProfileRefresh: () -> Unit = {}) {
    val cfg = LocalNativeRemoteConfig.current
    val context = LocalContext.current
    val offline = remember { OfflineStore(context) }
    val scope = rememberCoroutineScope()
    var products by remember { mutableStateOf(offline.loadProducts()) }
    var wallet by remember { mutableStateOf(WalletSummary()) }
    var orders by remember { mutableStateOf<List<StoreOrder>>(emptyList()) }
    var frames by remember { mutableStateOf<List<OwnedProfileFrame>>(emptyList()) }
    var roomBackgrounds by remember { mutableStateOf<List<VoiceRoomBackground>>(emptyList()) }
    var selectedBackground by remember { mutableStateOf<VoiceRoomBackground?>(null) }
    var tabKey by remember { mutableStateOf("products") }
    var selected by remember { mutableStateOf<StoreProduct?>(null) }
    var deleteFrame by remember { mutableStateOf<OwnedProfileFrame?>(null) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(message) { if (message != null) { kotlinx.coroutines.delay(cfg.long("store.status_duration_ms", 3000L, 500L, 10000L)); message = null } }

    fun refresh() {
        scope.launch {
            busy = true
            message = null
            val productResult = withContext(Dispatchers.IO) { api.storeProducts(session) }
            val walletResult = withContext(Dispatchers.IO) { api.walletSummary(session) }
            val orderResult = withContext(Dispatchers.IO) { api.storeOrders(session) }
            val frameResult = withContext(Dispatchers.IO) { api.myProfileFrames(session) }
            val backgroundResult = withContext(Dispatchers.IO) { api.voiceRoomBackgrounds(session) }
            productResult.onSuccess { products = it; offline.saveProducts(it) }.onFailure { if (products.isEmpty()) message = it.message }
            walletResult.onSuccess { wallet = it }
            orderResult.onSuccess { orders = it }
            frameResult.onSuccess { frames = it }.onFailure { if (tabKey == "frames") message = it.message }
            backgroundResult.onSuccess { roomBackgrounds = it }.onFailure { if (tabKey == "backgrounds") message = it.message }
            busy = false
        }
    }
    LaunchedEffect(Unit) { refresh() }
    LaunchedEffect(initialProductType, products) {
        val type = initialProductType?.takeIf { it.isNotBlank() } ?: return@LaunchedEffect
        val product = products.firstOrNull { it.productType.equals(type, true) }
        if (product != null) {
            selected = product
            message = null
            onInitialProductConsumed()
        } else if (!busy && products.isNotEmpty()) {
            message = "هذه الخدمة غير متاحة حاليًا."
            onInitialProductConsumed()
        }
    }

    selected?.let { p ->
        StorePurchasePage(
            product = p,
            wallet = wallet,
            busy = busy,
            message = message,
            onBack = { if (!busy) { selected = null; message = null } },
            onDiamondPurchase = { requestedUsername ->
                if (wallet.diamonds < p.priceDiamonds) {
                    message = "ليس لديك رصيد ألماس كافٍ."
                } else {
                    scope.launch {
                        busy = true
                        message = null
                        val r = withContext(Dispatchers.IO) {
                            runCatching {
                                if (p.productType.equals("username3", true)) {
                                    val username = requestedUsername?.trim()?.removePrefix("@").orEmpty()
                                    if (username.length != 3) error("اسم المستخدم يجب أن يتكون من 3 أحرف بالضبط.")
                                    api.purchaseShortUsername(session, username).getOrThrow()
                                } else {
                                    val orderId = api.createStoreOrder(session, p.id, "diamonds").getOrThrow()
                                    api.activateDiamondStoreEntitlement(session, orderId, p.id).getOrThrow()
                                    orderId
                                }
                            }
                        }
                        busy = false
                        r.onSuccess {
                            message = "تم الشراء بنجاح."
                            selected = null
                            refresh()
                            onProfileRefresh()
                        }.onFailure { message = it.message ?: "تعذر إتمام الشراء." }
                    }
                }
            },
            onMoneyConfirm = { senderName, cardLast4 ->
                scope.launch {
                    busy = true
                    message = null
                    val r = withContext(Dispatchers.IO) {
                        runCatching {
                            val orderId = api.createStoreOrder(session, p.id, "money").getOrThrow()
                            api.confirmStoreMoneyPayment(session, orderId, senderName, cardLast4).getOrThrow()
                            orderId
                        }
                    }
                    busy = false
                    r.onSuccess {
                        message = "تم إرسال تأكيد التحويل للإدارة."
                        selected = null
                        refresh()
                    }.onFailure { message = it.message ?: "تعذر إرسال تأكيد الدفع." }
                }
            }
        )
        return
    }

    selectedBackground?.let { bg ->
        AlertDialog(
            onDismissRequest = { if (!busy) selectedBackground = null },
            title = { Text("شراء خلفية الغرفة؟") },
            text = { Text("${bg.name} مقابل ${bg.diamonds} ألماسة. إذا كانت مملوكة لديك فلن يتم الخصم مرة ثانية.") },
            confirmButton = {
                Button(enabled = !busy, onClick = {
                    scope.launch {
                        busy = true
                        val r = withContext(Dispatchers.IO) { api.purchaseVoiceRoomBackground(session, bg.id) }
                        busy = false
                        r.onSuccess { selectedBackground = null; message = "تم شراء الخلفية."; refresh() }
                            .onFailure { message = it.message ?: "تعذر شراء الخلفية." }
                    }
                }) { Text("تأكيد الشراء") }
            },
            dismissButton = { TextButton(onClick = { selectedBackground = null }, enabled = !busy) { Text("إلغاء") } }
        )
    }

    deleteFrame?.let { frame ->
        AlertDialog(
            onDismissRequest = { deleteFrame = null },
            title = { Text("حذف الإطار؟") },
            text = { Text("سيُحذف ${frameLabel(frame.frameKey)} من إطاراتك. لا يمكن التراجع عن الحذف.") },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            busy = true
                            val r = withContext(Dispatchers.IO) { api.deleteProfileFrame(session, frame.id) }
                            busy = false
                            r.onSuccess {
                                deleteFrame = null
                                message = "تم حذف الإطار."
                                refresh()
                                onProfileRefresh()
                            }.onFailure { message = it.message }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC62828))
                ) { Text("حذف") }
            },
            dismissButton = { TextButton(onClick = { deleteFrame = null }) { Text("إلغاء") } }
        )
    }

    val defaultTabs = listOf("products", "backgrounds", "orders", "frames", "services")
    val configuredTabs = cfg.strings("store.tab_order", defaultTabs).map { it.lowercase() }.distinct().filter { key ->
        when (key) {
            "products" -> cfg.bool("store.show_products_tab", true)
            "backgrounds" -> true
            "orders" -> cfg.bool("store.show_orders_tab", true)
            "frames" -> cfg.bool("store.show_frames_tab", true)
            "services" -> cfg.bool("store.show_services_tab", true)
            else -> false
        }
    }
    val allowedTabs = (configuredTabs + "backgrounds").distinct().ifEmpty { listOf("products", "backgrounds") }
    LaunchedEffect(allowedTabs) { if (tabKey !in allowedTabs) tabKey = allowedTabs.first() }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("المتجر", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black, color = StudentText)
                Text("خصّص حسابك وامتلك مزايا جديدة", color = StudentMuted, fontSize = 12.sp)
            }
            Icon(Icons.Rounded.ShoppingBag, "المتجر", tint = StudentGold, modifier = Modifier.size(28.dp))
        }
        if (cfg.bool("store.show_wallet", true)) Card(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF7E4)),
            border = BorderStroke(1.dp, Color(0xFFF0D48A))
        ) {
            Column(Modifier.padding(14.dp)) {
                Text(cfg.string("store.wallet_title", "المحفظة"), fontWeight = FontWeight.Bold, fontSize = cfg.int("store.wallet_title_sp", 16, 12, 24).sp)
                Spacer(Modifier.height(4.dp))
                Text("المتاح: ${wallet.availableBalance.toLong()} ${if (wallet.availableBalance > 0) "IQD" else ""}", fontSize = 13.sp)
                Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Rounded.Diamond, null, Modifier.size(16.dp), tint = StudentGold); Spacer(Modifier.width(4.dp)); Text("الألماس: ${wallet.diamonds}", fontSize = 13.sp) }
            }
        }

        if (cfg.bool("store.show_tabs", true)) TabRow(selectedTabIndex = allowedTabs.indexOf(tabKey).coerceAtLeast(0), containerColor = Color.White, contentColor = StudentBlue) {
            allowedTabs.forEach { key ->
                val label = when (key) {
                    "products" -> cfg.string("store.label_products", "المنتجات")
                    "backgrounds" -> "خلفيات الغرف"
                    "orders" -> cfg.string("store.label_orders", "طلباتي")
                    "frames" -> cfg.string("store.label_frames", "إطاراتي")
                    else -> cfg.string("store.label_services", "خدمات")
                }
                Tab(selected = tabKey == key, onClick = { tabKey = key }, text = { Text(label, fontSize = cfg.int("store.tab_text_sp", 12, 9, 16).sp) })
            }
        }
        message?.let { Text(it, Modifier.padding(horizontal = 12.dp, vertical = 7.dp), color = if (it.startsWith("تم")) Color(0xFF16803C) else StudentText, fontSize = 12.sp) }

        when (tabKey) {
            "products" -> LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                gridItems(products, key = { it.id }) { p ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { selected = p },
                        shape = RoundedCornerShape(15.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, Color(0xFFE9EDF3)),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Column(Modifier.fillMaxWidth().padding(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Box(Modifier.fillMaxWidth().aspectRatio(1f), contentAlignment = Alignment.Center) {
                                when {
                                    p.productType == "frame" && !p.frameKey.isNullOrBlank() -> StudentAvatar("S", null, "student-frame:${p.frameKey}", 62.dp)
                                    !p.imageUrl.isNullOrBlank() -> AsyncImage(
                                        model = p.imageUrl,
                                        contentDescription = p.name,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(11.dp))
                                    )
                                    else -> Surface(Modifier.fillMaxSize(), shape = RoundedCornerShape(11.dp), color = Color(0xFFF4F7FB)) {
                                        Box(contentAlignment = Alignment.Center) { Icon(Icons.Rounded.Storefront, null, tint = StudentBlue) }
                                    }
                                }
                            }
                            Text(p.name, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 1)
                            if (p.allowDiamonds) Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Rounded.Diamond, null, Modifier.size(12.dp), tint = StudentBlue)
                                Spacer(Modifier.width(3.dp)); Text("${p.priceDiamonds}", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            } else if (p.allowMoney) {
                                Text("${p.priceMoney.toLong()} ${p.currency}", color = StudentBlue, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
            "backgrounds" -> LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                gridItems(roomBackgrounds, key = { it.id }) { bg ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { if (!bg.isOwned) selectedBackground = bg },
                        shape = RoundedCornerShape(15.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, Color(0xFFE9EDF3))
                    ) {
                        Column(Modifier.fillMaxWidth().padding(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            AsyncImage(bg.imageUrl, bg.name, Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(11.dp)), contentScale = ContentScale.Crop)
                            Text(bg.name, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 1)
                            Text(if (bg.isOwned) "مملوكة" else "${bg.diamonds} ♦", color = if (bg.isOwned) Color(0xFF16803C) else StudentBlue, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            "orders" -> LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(orders, key = { it.id }) { o ->
                    StudentOutlinedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp)) {
                            Text(o.productName, fontWeight = FontWeight.Bold)
                            Text("الحالة: ${orderStatusLabel(o.status)}", color = StudentMuted, fontSize = 12.sp)
                            Text("الدفع: ${paymentLabel(o.paymentMethod)}", color = StudentMuted, fontSize = 12.sp)
                            Text(prettyTime(o.createdAt), color = Color(0xFF98A2B1), fontSize = 10.sp)
                        }
                    }
                }
                if (orders.isEmpty() && !busy) item { Text("لا توجد طلبات.", color = StudentMuted, modifier = Modifier.padding(12.dp)) }
            }
            "frames" -> LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                item {
                    if (frames.any { it.isActive }) {
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    busy = true
                                    val r = withContext(Dispatchers.IO) { api.clearProfileFrame(session) }
                                    busy = false
                                    r.onSuccess {
                                        message = "تمت إزالة الإطار مؤقتًا."
                                        refresh()
                                        onProfileRefresh()
                                    }.onFailure { message = it.message }
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("إزالة الإطار الحالي") }
                    }
                }
                items(frames, key = { it.id }) { frame ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(17.dp),
                        colors = CardDefaults.cardColors(containerColor = if (frame.isActive) Color(0xFFF3FAFF) else Color.White),
                        border = BorderStroke(1.dp, if (frame.isActive) Color(0xFF9FD8FF) else Color(0xFFE9EDF3))
                    ) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            StudentAvatar("S", null, "student-frame:${frame.frameKey}", 58.dp)
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(frameLabel(frame.frameKey), fontWeight = FontWeight.Bold)
                                Text(if (frame.isActive) "مفعّل الآن" else "متاح", color = if (frame.isActive) StudentBlue else StudentMuted, fontSize = 11.sp)
                                frame.expiresAt?.let { Text("ينتهي: ${prettyTime(it)}", color = StudentMuted, fontSize = 10.sp) }
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                if (!frame.isActive) {
                                    TextButton(onClick = {
                                        scope.launch {
                                            busy = true
                                            val r = withContext(Dispatchers.IO) { api.equipProfileFrame(session, frame.id) }
                                            busy = false
                                            r.onSuccess {
                                                message = "تم تفعيل الإطار."
                                                refresh()
                                                onProfileRefresh()
                                            }.onFailure { message = it.message }
                                        }
                                    }) { Text("تفعيل", color = StudentBlue) }
                                }
                                TextButton(onClick = { deleteFrame = frame }) { Text("حذف", color = Color(0xFFC62828), fontSize = 11.sp) }
                            }
                        }
                    }
                }
                if (frames.isEmpty() && !busy) {
                    item {
                        Box(Modifier.fillMaxWidth().padding(vertical = 50.dp), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Rounded.AutoAwesome, null, tint = StudentBlue, modifier = Modifier.size(30.dp))
                                Text("لا توجد إطارات في حسابك بعد.", color = StudentMuted)
                            }
                        }
                    }
                }
            }
            else -> StoreAdvancedSection(api, session) {
                refresh()
                onProfileRefresh()
            }
        }
    }
}

@Composable
private fun StorePurchasePage(
    product: StoreProduct,
    wallet: WalletSummary,
    busy: Boolean,
    message: String?,
    onBack: () -> Unit,
    onDiamondPurchase: (String?) -> Unit,
    onMoneyConfirm: (String, String) -> Unit
) {
    val masterNumber = "6783943118"
    val masterName = "JAWAD R SAGBAN"
    var moneyMode by remember(product.id) { mutableStateOf(false) }
    var senderName by remember(product.id) { mutableStateOf("") }
    var cardLast4 by remember(product.id) { mutableStateOf("") }
    var confirmed by remember(product.id) { mutableStateOf(false) }
    var requestedUsername by remember(product.id) { mutableStateOf("") }
    var localMessage by remember(product.id) { mutableStateOf<String?>(null) }

    BackHandler(enabled = true) { if (!busy) { if (moneyMode) moneyMode = false else onBack() } }

    Column(Modifier.fillMaxSize()) {
        Surface(color = Color.White, shadowElevation = 2.dp) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { if (!busy) { if (moneyMode) moneyMode = false else onBack() } }) { Icon(Icons.Rounded.ArrowBack, "رجوع") }
                Text(if (moneyMode) "الدفع" else product.name, fontWeight = FontWeight.Black, fontSize = 20.sp)
            }
        }
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                StudentOutlinedCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                        if (product.productType == "frame" && !product.frameKey.isNullOrBlank()) {
                            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { StudentAvatar("S", null, "student-frame:${product.frameKey}", 76.dp) }
                        }
                        Text(product.name, fontWeight = FontWeight.Black, fontSize = 20.sp)
                        if (product.description.isNotBlank()) Text(product.description, color = StudentMuted)
                        product.frameDurationDays?.let { Text("المدة: $it يوم", color = StudentMuted, fontSize = 12.sp) }
                    }
                }
            }
            if (!moneyMode) {
                if (product.productType.equals("username3", true)) item {
                    OutlinedTextField(
                        value = requestedUsername,
                        onValueChange = { requestedUsername = it.lowercase().filter { ch -> ch.isLetterOrDigit() || ch == '_' }.take(3) },
                        label = { Text("اسم المستخدم الثلاثي") },
                        prefix = { Text("@") },
                        supportingText = { Text("3 أحرف إنجليزية/أرقام أو _ — يتم فحص التوفر عند الشراء") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                if (product.allowDiamonds) item {
                    Button(
                        onClick = {
                            if (product.productType.equals("username3", true) && requestedUsername.length != 3) {
                                localMessage = "اكتب اسم مستخدم من 3 أحرف أولًا."
                            } else {
                                localMessage = null
                                onDiamondPurchase(requestedUsername.takeIf { product.productType.equals("username3", true) })
                            }
                        },
                        enabled = !busy,
                        modifier = Modifier.fillMaxWidth().height(52.dp)
                    ) {
                        Icon(Icons.Rounded.Diamond, null)
                        Spacer(Modifier.width(7.dp))
                        Text("شراء بـ ${product.priceDiamonds} ألماسة")
                    }
                }
                if (product.allowDiamonds) item { Text("رصيدك: ${wallet.diamonds} ألماسة", color = StudentMuted, fontSize = 12.sp) }
                if (product.allowMoney && !product.productType.equals("username3", true)) item {
                    OutlinedButton(
                        onClick = { localMessage = null; moneyMode = true },
                        enabled = !busy,
                        modifier = Modifier.fillMaxWidth().height(52.dp)
                    ) { Text("الدفع ${product.priceMoney.toLong()} ${product.currency}") }
                }
            } else {
                item {
                    StudentOutlinedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Text("حوّل المبلغ إلى البطاقة", fontWeight = FontWeight.Black)
                            Text(masterNumber, color = StudentBlue, fontWeight = FontWeight.Black, fontSize = 20.sp)
                            Text(masterName, color = StudentMuted)
                            Text("المبلغ: ${product.priceMoney.toLong()} ${product.currency}", fontWeight = FontWeight.Bold)
                        }
                    }
                }
                item { OutlinedTextField(senderName, { senderName = it.take(80) }, label = { Text("اسم صاحب البطاقة") }, modifier = Modifier.fillMaxWidth(), singleLine = true) }
                item { OutlinedTextField(cardLast4, { cardLast4 = it.filter(Char::isDigit).take(4) }, label = { Text("آخر 4 أرقام من بطاقة المرسل") }, modifier = Modifier.fillMaxWidth(), singleLine = true) }
                item { Row(verticalAlignment = Alignment.CenterVertically) { Checkbox(confirmed, { confirmed = it }); Text("أؤكد أنني أكملت التحويل") } }
                item {
                    Button(
                        onClick = {
                            if (senderName.trim().length < 2 || cardLast4.length != 4 || !confirmed) {
                                localMessage = "أكمل بيانات التحويل والتأكيد أولًا."
                            } else {
                                localMessage = null
                                onMoneyConfirm(senderName.trim(), cardLast4)
                            }
                        },
                        enabled = !busy,
                        modifier = Modifier.fillMaxWidth().height(52.dp)
                    ) { Text(if (busy) "جارٍ الإرسال..." else "تأكيد التحويل") }
                }
            }
            (localMessage ?: message)?.let { msg -> item { Text(msg, color = if (msg.startsWith("تم")) Color(0xFF16803C) else MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold) } }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

private fun frameLabel(key: String): String = when (key) {
    "fire" -> "نار مشتعلة"
    "blue-fire" -> "نار زرقاء"
    "neon" -> "نيون"
    "lightning" -> "برق"
    "royal" -> "ملكي ذهبي"
    "ember" -> "جمر"
    else -> "إطار مميز"
}

private fun orderStatusLabel(value: String): String = when (value.lowercase()) {
    "pending" -> "قيد المراجعة"
    "completed", "approved" -> "مكتمل"
    "rejected", "cancelled" -> "مرفوض"
    else -> value
}

private fun paymentLabel(value: String): String = when (value.lowercase()) {
    "diamonds" -> "ألماس"
    "money" -> "دفع مالي"
    else -> value
}
