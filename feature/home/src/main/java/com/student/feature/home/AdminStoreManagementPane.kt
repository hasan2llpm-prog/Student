package com.student.feature.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun AdminStoreManagementPane(
    api: SupabaseApi,
    session: StudentSession,
    onMessage: (String) -> Unit,
    onChanged: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var tab by remember { mutableIntStateOf(0) }
    var products by remember { mutableStateOf<List<AdminManagedProduct>>(emptyList()) }
    var tasks by remember { mutableStateOf<List<StoreTask>>(emptyList()) }
    var packs by remember { mutableStateOf<List<DiamondPackage>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var editProduct by remember { mutableStateOf<AdminManagedProduct?>(null) }
    var createProduct by remember { mutableStateOf(false) }
    var editTask by remember { mutableStateOf<StoreTask?>(null) }
    var createTask by remember { mutableStateOf(false) }
    var editPack by remember { mutableStateOf<DiamondPackage?>(null) }
    var createPack by remember { mutableStateOf(false) }
    var deleteProduct by remember { mutableStateOf<AdminManagedProduct?>(null) }
    var deleteTask by remember { mutableStateOf<StoreTask?>(null) }
    var deletePack by remember { mutableStateOf<DiamondPackage?>(null) }
    var diamondUsername by remember { mutableStateOf("") }
    var diamondDelta by remember { mutableStateOf("") }
    var diamondNote by remember { mutableStateOf("") }

    fun refresh() {
        scope.launch {
            busy = true
            val p = withContext(Dispatchers.IO) { api.adminManagedProducts(session) }
            val t = withContext(Dispatchers.IO) { api.adminAllStoreTasks(session) }
            val d = withContext(Dispatchers.IO) { api.adminAllDiamondPackages(session) }
            p.onSuccess { products = it }.onFailure { onMessage(it.message ?: "تعذر تحميل المنتجات") }
            t.onSuccess { tasks = it }.onFailure { onMessage(it.message ?: "تعذر تحميل المهام") }
            d.onSuccess { packs = it }.onFailure { onMessage(it.message ?: "تعذر تحميل الباقات") }
            busy = false
        }
    }

    LaunchedEffect(session.userId) { refresh() }

    if (createProduct || editProduct != null) {
        ProductEditor(editProduct, busy, onDismiss = { createProduct = false; editProduct = null }) { name, desc, type, money, diamonds, allowMoney, allowDiamonds, active ->
            scope.launch {
                busy = true
                val r = withContext(Dispatchers.IO) { api.adminSaveProduct(session, editProduct?.id, name, desc, type, money, diamonds, allowMoney, allowDiamonds, active) }
                busy = false
                r.onSuccess { onMessage(if (editProduct == null) "تمت إضافة المنتج." else "تم تعديل المنتج."); createProduct = false; editProduct = null; refresh(); onChanged() }
                    .onFailure { onMessage(it.message ?: "تعذر حفظ المنتج") }
            }
        }
    }
    if (createTask || editTask != null) {
        TaskEditor(editTask, busy, onDismiss = { createTask = false; editTask = null }) { title, desc, reward, repeat, verification, active ->
            scope.launch {
                busy = true
                val r = withContext(Dispatchers.IO) { api.adminSaveStoreTask(session, editTask?.id, title, desc, reward, repeat, verification, active) }
                busy = false
                r.onSuccess { onMessage(if (editTask == null) "تمت إضافة المهمة." else "تم تعديل المهمة."); createTask = false; editTask = null; refresh(); onChanged() }
                    .onFailure { onMessage(it.message ?: "تعذر حفظ المهمة") }
            }
        }
    }
    if (createPack || editPack != null) {
        PackageEditor(editPack, busy, onDismiss = { createPack = false; editPack = null }) { title, diamonds, userPrice, agentPrice, active ->
            scope.launch {
                busy = true
                val r = withContext(Dispatchers.IO) { api.adminSaveDiamondPackage(session, editPack?.id, title, diamonds, userPrice, agentPrice, active) }
                busy = false
                r.onSuccess { onMessage(if (editPack == null) "تمت إضافة باقة الألماس." else "تم تعديل الباقة."); createPack = false; editPack = null; refresh(); onChanged() }
                    .onFailure { onMessage(it.message ?: "تعذر حفظ الباقة") }
            }
        }
    }

    deleteProduct?.let { item ->
        ConfirmDelete("حذف المنتج", "سيتم حذف «${item.name}» نهائيًا.", busy, { deleteProduct = null }) {
            scope.launch { busy = true; val r = withContext(Dispatchers.IO) { api.adminDeleteProduct(session, item.id) }; busy = false; r.onSuccess { deleteProduct = null; onMessage("تم حذف المنتج."); refresh(); onChanged() }.onFailure { onMessage(it.message ?: "تعذر الحذف") } }
        }
    }
    deleteTask?.let { item ->
        ConfirmDelete("حذف المهمة", "سيتم حذف «${item.title}» نهائيًا.", busy, { deleteTask = null }) {
            scope.launch { busy = true; val r = withContext(Dispatchers.IO) { api.adminDeleteStoreTask(session, item.id) }; busy = false; r.onSuccess { deleteTask = null; onMessage("تم حذف المهمة."); refresh(); onChanged() }.onFailure { onMessage(it.message ?: "تعذر الحذف") } }
        }
    }
    deletePack?.let { item ->
        ConfirmDelete("حذف الباقة", "سيتم حذف «${item.title}» نهائيًا.", busy, { deletePack = null }) {
            scope.launch { busy = true; val r = withContext(Dispatchers.IO) { api.adminDeleteDiamondPackage(session, item.id) }; busy = false; r.onSuccess { deletePack = null; onMessage("تم حذف الباقة."); refresh(); onChanged() }.onFailure { onMessage(it.message ?: "تعذر الحذف") } }
        }
    }

    Column(Modifier.fillMaxSize()) {
        ScrollableTabRow(selectedTabIndex = tab, edgePadding = 6.dp, containerColor = Color.White, contentColor = StudentBlue) {
            listOf("المنتجات", "المهام", "باقات الألماس", "شحن ألماس").forEachIndexed { i, label ->
                Tab(selected = tab == i, onClick = { tab = i }, text = { Text(label) })
            }
        }
        when (tab) {
            0 -> LazyColumn(contentPadding = PaddingValues(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                item { Button(onClick = { createProduct = true }, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text("+ إضافة منتج") } }
                items(products, key = { it.id }) { p ->
                    StudentOutlinedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(p.name, fontWeight = FontWeight.Black)
                                Text(if (p.isActive) "مفعّل" else "مخفي", color = if (p.isActive) Color(0xFF16803C) else StudentMuted)
                            }
                            Text(p.description, color = StudentMuted, maxLines = 2)
                            Text("${p.priceMoney.toLong()} د.ع · ${p.priceDiamonds} ألماسة", color = StudentBlue)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(onClick = { editProduct = p }) { Text("تعديل") }
                                TextButton(onClick = { deleteProduct = p }) { Text("حذف", color = Color(0xFFC62828)) }
                            }
                        }
                    }
                }
            }
            1 -> LazyColumn(contentPadding = PaddingValues(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                item { Button(onClick = { createTask = true }, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text("+ إضافة مهمة") } }
                items(tasks, key = { it.id }) { t ->
                    StudentOutlinedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(t.title, fontWeight = FontWeight.Black)
                            Text(t.description, color = StudentMuted)
                            Text("المكافأة: ${t.rewardDiamonds} ألماسة · ${if (t.isActive) "مفعلة" else "متوقفة"}", color = StudentBlue)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(onClick = { editTask = t }) { Text("تعديل") }
                                TextButton(onClick = { deleteTask = t }) { Text("حذف", color = Color(0xFFC62828)) }
                            }
                        }
                    }
                }
            }
            2 -> LazyColumn(contentPadding = PaddingValues(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                item { Button(onClick = { createPack = true }, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text("+ إضافة باقة") } }
                items(packs, key = { it.id }) { p ->
                    StudentOutlinedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(p.title, fontWeight = FontWeight.Black)
                            Text("${p.diamonds} ألماسة · ${p.userPriceIqd} د.ع", color = StudentBlue)
                            Text(if (p.isActive) "مفعلة" else "متوقفة", color = StudentMuted)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(onClick = { editPack = p }) { Text("تعديل") }
                                TextButton(onClick = { deletePack = p }) { Text("حذف", color = Color(0xFFC62828)) }
                            }
                        }
                    }
                }
            }
            else -> LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                item { Text("شحن أو خصم الألماس", fontWeight = FontWeight.Black) }
                item { OutlinedTextField(diamondUsername, { diamondUsername = it.take(80) }, modifier = Modifier.fillMaxWidth(), label = { Text("اسم المستخدم بدون @") }) }
                item { OutlinedTextField(diamondDelta, { diamondDelta = it.filter { c -> c.isDigit() || c == '-' }.take(9) }, modifier = Modifier.fillMaxWidth(), label = { Text("الكمية (+ للشحن / - للخصم)") }) }
                item { OutlinedTextField(diamondNote, { diamondNote = it.take(300) }, modifier = Modifier.fillMaxWidth(), label = { Text("ملاحظة") }) }
                item {
                    Button(onClick = {
                        val delta = diamondDelta.toIntOrNull() ?: 0
                        if (diamondUsername.isBlank() || delta == 0) { onMessage("اكتب اسم المستخدم وكمية صحيحة."); return@Button }
                        scope.launch {
                            busy = true
                            val r = withContext(Dispatchers.IO) { api.adminAdjustDiamonds(session, diamondUsername, delta, diamondNote) }
                            busy = false
                            r.onSuccess { balance -> onMessage("تم تحديث الألماس. الرصيد الجديد: $balance"); diamondDelta = ""; diamondNote = ""; onChanged() }
                                .onFailure { onMessage(it.message ?: "تعذر تحديث الألماس") }
                        }
                    }, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text("تنفيذ التعديل") }
                }
            }
        }
    }
}

@Composable
private fun ProductEditor(item: AdminManagedProduct?, busy: Boolean, onDismiss: () -> Unit, onSave: (String,String,String,Double,Int,Boolean,Boolean,Boolean) -> Unit) {
    var name by remember(item?.id) { mutableStateOf(item?.name.orEmpty()) }
    var desc by remember(item?.id) { mutableStateOf(item?.description.orEmpty()) }
    var type by remember(item?.id) { mutableStateOf(item?.productType ?: "physical") }
    var money by remember(item?.id) { mutableStateOf(item?.priceMoney?.toLong()?.toString() ?: "0") }
    var diamonds by remember(item?.id) { mutableStateOf(item?.priceDiamonds?.toString() ?: "0") }
    var allowMoney by remember(item?.id) { mutableStateOf(item?.allowMoney ?: true) }
    var allowDiamonds by remember(item?.id) { mutableStateOf(item?.allowDiamonds ?: false) }
    var active by remember(item?.id) { mutableStateOf(item?.isActive ?: true) }
    AlertDialog(onDismissRequest = { if (!busy) onDismiss() }, title = { Text(if (item == null) "إضافة منتج" else "تعديل المنتج") }, text = {
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            OutlinedTextField(name, { name = it.take(120) }, label = { Text("اسم المنتج") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(desc, { desc = it.take(1000) }, label = { Text("الوصف") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
            OutlinedTextField(type, { type = it.take(30) }, label = { Text("النوع: physical/digital/frame/verification/username3") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(money, { money = it.filter(Char::isDigit).take(12) }, label = { Text("السعر بالدينار") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(diamonds, { diamonds = it.filter(Char::isDigit).take(9) }, label = { Text("السعر بالألماس") }, modifier = Modifier.fillMaxWidth())
            CheckRow("الدفع المالي", allowMoney) { allowMoney = it }; CheckRow("الدفع بالألماس", allowDiamonds) { allowDiamonds = it }; CheckRow("مفعّل", active) { active = it }
        }
    }, confirmButton = { Button(onClick = { if (name.isNotBlank() && (allowMoney || allowDiamonds)) onSave(name,desc,type,money.toDoubleOrNull() ?: 0.0,diamonds.toIntOrNull() ?: 0,allowMoney,allowDiamonds,active) }, enabled = !busy) { Text("حفظ") } }, dismissButton = { TextButton(onClick = onDismiss, enabled = !busy) { Text("إلغاء") } })
}

@Composable
private fun TaskEditor(item: StoreTask?, busy: Boolean, onDismiss: () -> Unit, onSave: (String,String,Int,String,String,Boolean) -> Unit) {
    var title by remember(item?.id) { mutableStateOf(item?.title.orEmpty()) }; var desc by remember(item?.id) { mutableStateOf(item?.description.orEmpty()) }
    var reward by remember(item?.id) { mutableStateOf(item?.rewardDiamonds?.toString() ?: "5") }; var repeat by remember(item?.id) { mutableStateOf(item?.repeatKind ?: "once") }
    var verification by remember(item?.id) { mutableStateOf(item?.verificationType ?: "manual") }; var active by remember(item?.id) { mutableStateOf(item?.isActive ?: true) }
    AlertDialog(onDismissRequest = { if (!busy) onDismiss() }, title = { Text(if (item == null) "إضافة مهمة" else "تعديل المهمة") }, text = { Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        OutlinedTextField(title,{title=it.take(150)},label={Text("العنوان")},modifier=Modifier.fillMaxWidth()); OutlinedTextField(desc,{desc=it.take(1000)},label={Text("الوصف")},modifier=Modifier.fillMaxWidth(),minLines=2)
        OutlinedTextField(reward,{reward=it.filter(Char::isDigit).take(7)},label={Text("مكافأة الألماس")},modifier=Modifier.fillMaxWidth()); OutlinedTextField(repeat,{repeat=it.take(30)},label={Text("التكرار: once/daily")},modifier=Modifier.fillMaxWidth())
        OutlinedTextField(verification,{verification=it.take(40)},label={Text("التحقق: manual/daily_visit")},modifier=Modifier.fillMaxWidth()); CheckRow("مفعلة",active){active=it}
    } }, confirmButton = { Button(onClick={ val r=reward.toIntOrNull()?:0; if(title.isNotBlank()&&r>0) onSave(title,desc,r,repeat,verification,active)},enabled=!busy){Text("حفظ")} }, dismissButton={TextButton(onClick=onDismiss,enabled=!busy){Text("إلغاء")}})
}

@Composable
private fun PackageEditor(item: DiamondPackage?, busy: Boolean, onDismiss: () -> Unit, onSave: (String,Int,Int,Int,Boolean) -> Unit) {
    var title by remember(item?.id) { mutableStateOf(item?.title.orEmpty()) }; var diamonds by remember(item?.id) { mutableStateOf(item?.diamonds?.toString() ?: "100") }
    var userPrice by remember(item?.id) { mutableStateOf(item?.userPriceIqd?.toString() ?: "0") }; var agentPrice by remember(item?.id) { mutableStateOf(item?.agentPriceIqd?.toString() ?: "0") }; var active by remember(item?.id) { mutableStateOf(item?.isActive ?: true) }
    AlertDialog(onDismissRequest={if(!busy)onDismiss()},title={Text(if(item==null)"إضافة باقة ألماس" else "تعديل الباقة")},text={Column(verticalArrangement=Arrangement.spacedBy(6.dp)){
        OutlinedTextField(title,{title=it.take(120)},label={Text("اسم الباقة")},modifier=Modifier.fillMaxWidth()); OutlinedTextField(diamonds,{diamonds=it.filter(Char::isDigit).take(9)},label={Text("عدد الألماس")},modifier=Modifier.fillMaxWidth())
        OutlinedTextField(userPrice,{userPrice=it.filter(Char::isDigit).take(12)},label={Text("سعر المستخدم بالدينار")},modifier=Modifier.fillMaxWidth()); OutlinedTextField(agentPrice,{agentPrice=it.filter(Char::isDigit).take(12)},label={Text("سعر الوكيل بالدينار")},modifier=Modifier.fillMaxWidth()); CheckRow("مفعلة",active){active=it}
    }},confirmButton={Button(onClick={val d=diamonds.toIntOrNull()?:0;if(title.isNotBlank()&&d>0)onSave(title,d,userPrice.toIntOrNull()?:0,agentPrice.toIntOrNull()?:0,active)},enabled=!busy){Text("حفظ")}},dismissButton={TextButton(onClick=onDismiss,enabled=!busy){Text("إلغاء")}})
}

@Composable private fun CheckRow(label: String, checked: Boolean, onChange: (Boolean)->Unit) { Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) { Checkbox(checked,onChange); Text(label) } }

@Composable private fun ConfirmDelete(title:String, body:String, busy:Boolean, onDismiss:()->Unit, onConfirm:()->Unit) {
    AlertDialog(onDismissRequest={if(!busy)onDismiss()},title={Text(title)},text={Text(body)},confirmButton={Button(onClick=onConfirm,enabled=!busy,colors=ButtonDefaults.buttonColors(containerColor=Color(0xFFC62828))){Text("حذف")}},dismissButton={TextButton(onClick=onDismiss,enabled=!busy){Text("إلغاء")}})
}
