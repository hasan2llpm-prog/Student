package com.student.feature.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.SupportAgent
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
fun SupportScreen(api: SupabaseApi, session: StudentSession, profile: StudentProfile?) {
    val scope=rememberCoroutineScope()
    var subject by remember{mutableStateOf("")}
    var body by remember{mutableStateOf("")}
    var tickets by remember{mutableStateOf<List<SupportTicketItem>>(emptyList())}
    var busy by remember{mutableStateOf(false)}
    var message by remember{mutableStateOf<String?>(null)}
    fun refresh(){scope.launch{tickets=withContext(Dispatchers.IO){api.mySupportTickets(session).getOrDefault(emptyList())}}}
    LaunchedEffect(Unit){refresh()}
    LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(14.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
        item{StudentOutlinedCard(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){Row{Icon(Icons.Rounded.SupportAgent,null,tint=StudentBlue);Spacer(Modifier.width(8.dp));Text("دعم الحساب الموثق",fontWeight=FontWeight.Black)};Text("أرسل سؤالك أو مشكلتك مباشرة إلى إدارة Student. هذه الخدمة من مزايا التوثيق.",color=StudentMuted);if(profile?.isVerified!=true&&profile?.role!="admin")Text("يجب توثيق الحساب لاستخدام الدعم الداخلي.",color=MaterialTheme.colorScheme.error,fontWeight=FontWeight.Bold);OutlinedTextField(subject,{subject=it.take(160)},label={Text("عنوان الطلب")},modifier=Modifier.fillMaxWidth());OutlinedTextField(body,{body=it.take(5000)},label={Text("اشرح المشكلة")},modifier=Modifier.fillMaxWidth(),minLines=4);Button(onClick={scope.launch{busy=true;val r=withContext(Dispatchers.IO){api.submitSupportTicket(session,subject.trim(),body.trim())};busy=false;r.onSuccess{message="تم إرسال طلب الدعم.";subject="";body="";refresh()}.onFailure{message=it.message?:"تعذر إرسال الطلب."}}},enabled=!busy&&subject.isNotBlank()&&body.isNotBlank()&&(profile?.isVerified==true||profile?.role=="admin"),modifier=Modifier.fillMaxWidth()){Text(if(busy)"جارٍ الإرسال..." else "إرسال للدعم")};message?.let{Text(it,color=if(it.startsWith("تم"))Color(0xFF16803C) else MaterialTheme.colorScheme.error,fontWeight=FontWeight.Bold)}}}}
        item{Text("طلباتي السابقة",fontWeight=FontWeight.Black)}
        items(tickets,key={it.id}){t->StudentOutlinedCard(Modifier.fillMaxWidth()){Column(Modifier.padding(13.dp),verticalArrangement=Arrangement.spacedBy(5.dp)){Text(t.subject,fontWeight=FontWeight.Bold);Text(t.message,color=StudentMuted);Text("الحالة: ${supportStatus(t.status)}",color=StudentBlue,fontWeight=FontWeight.Bold);t.adminReply?.takeIf{it.isNotBlank()}?.let{Surface(color=Color(0xFFF1F7FF)){Text("رد الإدارة: $it",Modifier.padding(9.dp))}}}}}
        if(tickets.isEmpty())item{Text("لا توجد طلبات دعم سابقة.",color=StudentMuted)}
    }
}
private fun supportStatus(s:String)=when(s){"open"->"قيد المراجعة";"answered"->"تم الرد";"closed"->"مغلق";else->s}
