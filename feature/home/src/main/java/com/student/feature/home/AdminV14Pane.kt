package com.student.feature.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
fun AdminV14Pane(api: SupabaseApi, session: StudentSession, onMessage: (String)->Unit) {
    val scope=rememberCoroutineScope()
    var tab by remember{mutableIntStateOf(0)}
    var flags by remember{mutableStateOf<Map<String,Boolean>>(emptyMap())}
    var requests by remember{mutableStateOf<List<VerificationRequestItem>>(emptyList())}
    var settings by remember{mutableStateOf(SocialRoomSettings())}
    var supportTickets by remember{mutableStateOf<List<SupportTicketItem>>(emptyList())}
    var groupPrice by remember{mutableStateOf("50")}
    var channelPrice by remember{mutableStateOf("100")}
    var maxMembers by remember{mutableStateOf("500")}
    var busy by remember{mutableStateOf(false)}
    var review by remember{mutableStateOf<Pair<VerificationRequestItem,Boolean>?>(null)}
    var note by remember{mutableStateOf("")}
    var supportReplyTo by remember{mutableStateOf<SupportTicketItem?>(null)}
    var supportReply by remember{mutableStateOf("")}

    fun refresh(){scope.launch{busy=true;val a=withContext(Dispatchers.IO){api.v14FeatureControls(session)};val b=withContext(Dispatchers.IO){api.adminVerificationRequests(session)};val c=withContext(Dispatchers.IO){api.socialRoomSettings(session)};val d=withContext(Dispatchers.IO){api.adminSupportTickets(session)};a.onSuccess{flags=it};b.onSuccess{requests=it};c.onSuccess{settings=it;groupPrice=it.groupPriceDiamonds.toString();channelPrice=it.channelPriceDiamonds.toString();maxMembers=it.maxMembers.toString()};d.onSuccess{supportTickets=it};busy=false}}
    LaunchedEffect(Unit){refresh()}

    review?.let{(r,approve)->AlertDialog(onDismissRequest={review=null},title={Text(if(approve)"قبول طلب التوثيق" else "رفض طلب التوثيق")},text={Column(verticalArrangement=Arrangement.spacedBy(8.dp)){Text(r.fullName,fontWeight=FontWeight.Black);Text("${r.governorate} • ${r.schoolName.ifBlank{"لا مدرسة"}} • ${r.universityName.ifBlank{"لا جامعة"}}",color=StudentMuted);if(r.reason.isNotBlank())Text("السبب: ${r.reason}");OutlinedTextField(note,{note=it.take(1000)},label={Text("ملاحظة الإدارة")},modifier=Modifier.fillMaxWidth(),minLines=2)}},confirmButton={Button(onClick={scope.launch{busy=true;val x=withContext(Dispatchers.IO){api.adminReviewVerificationRequest(session,r.id,approve,note)};busy=false;x.onSuccess{onMessage(if(approve)"تم توثيق الحساب." else "تم رفض الطلب.");review=null;note="";refresh()}.onFailure{onMessage(it.message?:"تعذر تنفيذ الطلب.")}}}){Text("تأكيد")}},dismissButton={TextButton(onClick={review=null}){Text("إلغاء")}})}

    supportReplyTo?.let { t ->
        AlertDialog(
        modifier = Modifier.imePadding().navigationBarsPadding(),
            onDismissRequest = { supportReplyTo = null },
            title = { Text("رد على طلب الدعم") },
            text = { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) { Text(t.subject, fontWeight = FontWeight.Black); Text(t.message, color = StudentMuted); OutlinedTextField(supportReply,{supportReply=it.take(5000)},label={Text("رد الإدارة")},modifier=Modifier.fillMaxWidth(),minLines=3) } },
            confirmButton = { Button(onClick = { scope.launch { busy=true; val r=withContext(Dispatchers.IO){api.adminAnswerSupportTicket(session,t.id,supportReply,false)}; busy=false; r.onSuccess{onMessage("تم إرسال رد الدعم.");supportReplyTo=null;supportReply="";refresh()}.onFailure{onMessage(it.message?:"تعذر إرسال الرد.")} } }, enabled=supportReply.isNotBlank()&&!busy) { Text("إرسال الرد") } },
            dismissButton = { TextButton(onClick={supportReplyTo=null}){Text("إلغاء")} }
        )
    }

    Column(Modifier.fillMaxSize(),verticalArrangement=Arrangement.spacedBy(8.dp)){
        TabRow(selectedTabIndex=tab){Tab(tab==0,{tab=0},text={Text("إظهار/إخفاء")});Tab(tab==1,{tab=1},text={Text("التوثيق")});Tab(tab==2,{tab=2},text={Text("المجموعات")});Tab(tab==3,{tab=3},text={Text("الدعم")})}
        when(tab){
            0->LazyColumn(contentPadding=PaddingValues(8.dp),verticalArrangement=Arrangement.spacedBy(7.dp)){
                items(flags.entries.toList(),key={it.key}){e->Card(Modifier.fillMaxWidth(),shape=RoundedCornerShape(14.dp),colors=CardDefaults.cardColors(containerColor=Color.White),border=BorderStroke(1.dp,StudentBorder)){Row(Modifier.padding(12.dp),horizontalArrangement=Arrangement.SpaceBetween){Column(Modifier.weight(1f)){Text(featureArabic(e.key),fontWeight=FontWeight.Bold);Text(e.key,color=StudentMuted,style=MaterialTheme.typography.labelSmall)};Switch(e.value,{enabled->scope.launch{val r=withContext(Dispatchers.IO){api.adminSetV14Feature(session,e.key,enabled)};r.onSuccess{flags=flags+(e.key to enabled);onMessage("تم تحديث ظهور الميزة.")}.onFailure{onMessage(it.message?:"تعذر التحديث.")}}})}}}
            }
            1->LazyColumn(contentPadding=PaddingValues(8.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){
                items(requests,key={it.id}){r->StudentOutlinedCard(Modifier.fillMaxWidth()){Column(Modifier.padding(13.dp),verticalArrangement=Arrangement.spacedBy(5.dp)){Text(r.fullName,fontWeight=FontWeight.Black);Text("${r.governorate} • ${r.schoolName.ifBlank{"—"}} • ${r.universityName.ifBlank{"—"}}",color=StudentMuted);if(r.reason.isNotBlank())Text(r.reason);Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){Button(onClick={note="";review=r to true},modifier=Modifier.weight(1f)){Text("قبول")};OutlinedButton(onClick={note="";review=r to false},modifier=Modifier.weight(1f)){Text("رفض")}}}}}
                if(requests.isEmpty()&&!busy)item{Text("لا توجد طلبات توثيق معلقة.",Modifier.padding(14.dp),color=StudentMuted)}
            }
            2->Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
                Text("أسعار إنشاء القنوات والمجموعات",fontWeight=FontWeight.Black)
                Text("يتم الخصم مباشرة من رصيد الألماس للحساب الموثق. الأدمن لا يُخصم منه.",color=StudentMuted)
                OutlinedTextField(groupPrice,{groupPrice=it.filter(Char::isDigit).take(7)},label={Text("سعر المجموعة بالماس")},modifier=Modifier.fillMaxWidth())
                OutlinedTextField(channelPrice,{channelPrice=it.filter(Char::isDigit).take(7)},label={Text("سعر القناة بالماس")},modifier=Modifier.fillMaxWidth())
                OutlinedTextField(maxMembers,{maxMembers=it.filter(Char::isDigit).take(6)},label={Text("الحد الأقصى للأعضاء")},modifier=Modifier.fillMaxWidth())
                Button(onClick={scope.launch{busy=true;val r=withContext(Dispatchers.IO){api.adminSetSocialRoomPrices(session,groupPrice.toIntOrNull()?:0,channelPrice.toIntOrNull()?:0,maxMembers.toIntOrNull()?:500)};busy=false;r.onSuccess{onMessage("تم تحديث أسعار المجموعات والقنوات.");refresh()}.onFailure{onMessage(it.message?:"تعذر الحفظ.")}}},modifier=Modifier.fillMaxWidth()){Text("حفظ الأسعار")}
            }
            else->LazyColumn(contentPadding=PaddingValues(8.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){
                items(supportTickets,key={it.id}){t->StudentOutlinedCard(Modifier.fillMaxWidth()){Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(5.dp)){Text(t.subject,fontWeight=FontWeight.Black);Text(t.message,color=StudentMuted);Text("الحالة: ${t.status}",color=StudentBlue);t.adminReply?.takeIf{it.isNotBlank()}?.let{Text("آخر رد: $it")};Button(onClick={supportReply="";supportReplyTo=t},modifier=Modifier.fillMaxWidth()){Text("الرد")}}}}
                if(supportTickets.isEmpty()&&!busy)item{Text("لا توجد طلبات دعم حالياً.",Modifier.padding(14.dp),color=StudentMuted)}
            }
        }
    }
}

private fun featureArabic(key:String)=when(key){"translation"->"الترجمة المتقدمة";"vocabulary"->"المفردات";"parts"->"Parts of Speech";"verbs"->"الأفعال";"grammar"->"القواعد";"reading"->"Reading";"listening"->"Listening";"writing"->"Writing";"speaking"->"Speaking";"pronunciation"->"Pronunciation";"daily"->"التحدي اليومي";"reports"->"التقارير الأكاديمية";"messages"->"المراسلات";"reels"->"Reels";"community"->"المجتمع";"education"->"التعليم";"student_ai"->"Student AI";"notifications"->"الإشعارات";"store"->"المتجر";else->key}
