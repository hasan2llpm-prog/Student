package com.student.feature.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun SearchScreen(api: SupabaseApi, session: StudentSession, onOpenMessages: (String) -> Unit, onOpenProfile: (String) -> Unit = {}) {
    val scope = rememberCoroutineScope()
    val uriHandler = LocalUriHandler.current
    var query by remember { mutableStateOf("") }
    var mode by remember { mutableIntStateOf(0) } // 0 people, 1 English, 2 education
    var people by remember { mutableStateOf<List<ProfileSearchItem>>(emptyList()) }
    var english by remember { mutableStateOf<List<EnglishVocabularyItem>>(emptyList()) }
    var materials by remember { mutableStateOf<List<EducationMaterial>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var blockedIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var blockConfirm by remember { mutableStateOf<Pair<ProfileSearchItem, Boolean>?>(null) }

    LaunchedEffect(session.userId) { blockedIds = withContext(Dispatchers.IO) { api.blockedUserIds(session).getOrDefault(emptySet()) } }
    LaunchedEffect(message) { if (message != null) { kotlinx.coroutines.delay(2600); message = null } }

    fun search() {
        val q = query.trim(); if (q.isBlank()) return
        scope.launch {
            busy = true; message = null
            when (mode) {
                0 -> withContext(Dispatchers.IO) { api.searchProfiles(session, q) }.onSuccess { people = it }.onFailure { message = it.message }
                1 -> withContext(Dispatchers.IO) { api.englishVocabulary(session, limit = 100) }.onSuccess { all -> english = all.filter { it.word.contains(q,true) || it.meaningAr.contains(q,true) || it.exampleEn.contains(q,true) }.take(60) }.onFailure { message = it.message }
                else -> withContext(Dispatchers.IO) { api.searchEducationMaterials(session, q) }.onSuccess { materials = it }.onFailure { message = it.message }
            }
            busy = false
        }
    }

    blockConfirm?.let { (item, shouldBlock) ->
        AlertDialog(
            onDismissRequest = { if (!busy) blockConfirm = null },
            title = { Text(if (shouldBlock) "تأكيد حظر المستخدم" else "تأكيد إلغاء الحظر") },
            text = { Text(if (shouldBlock) "هل تريد حظر ${item.fullName}؟ ستُلغى المتابعة ولن تبدأ محادثة جديدة بينكما." else "هل تريد إلغاء حظر ${item.fullName}؟") },
            confirmButton = { Button(enabled = !busy, onClick = { scope.launch { busy = true; val r = withContext(Dispatchers.IO) { if (shouldBlock) api.blockUser(session,item.id) else api.unblockUser(session,item.id) }; busy=false; r.onSuccess { blockedIds = if(shouldBlock) blockedIds+item.id else blockedIds-item.id; message=if(shouldBlock)"تم حظر المستخدم." else "تم إلغاء الحظر."; blockConfirm=null }.onFailure { message=it.message } } }) { Text("تأكيد") } },
            dismissButton = { TextButton(enabled=!busy,onClick={blockConfirm=null}){Text("إلغاء")} }
        )
    }

    Column(Modifier.fillMaxSize().padding(horizontal = 12.dp)) {
        Row(Modifier.fillMaxWidth().padding(top=8.dp), horizontalArrangement=Arrangement.spacedBy(6.dp)) {
            FilterChip(mode==0,{mode=0},{Text("أشخاص")},modifier=Modifier.weight(1f))
            FilterChip(mode==1,{mode=1},{Text("English")},modifier=Modifier.weight(1f))
            FilterChip(mode==2,{mode=2},{Text("المواد")},modifier=Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(query,{query=it; if(it.isBlank()){people=emptyList();english=emptyList();materials=emptyList()}},placeholder={Text(when(mode){0->"الاسم أو اسم المستخدم";1->"كلمة إنجليزية أو معناها";else->"ابحث في المواد والشروحات"})},singleLine=true,shape=RoundedCornerShape(15.dp),modifier=Modifier.weight(1f))
            Button(onClick=::search,enabled=!busy&&query.isNotBlank(),shape=RoundedCornerShape(14.dp)){ if(busy) CircularProgressIndicator(Modifier.size(18.dp),strokeWidth=2.dp) else Text("بحث") }
        }
        message?.let { Text(it,color=MaterialTheme.colorScheme.error,fontSize=12.sp) }
        LazyColumn(contentPadding=PaddingValues(vertical=6.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
            if(mode==0) items(people,key={it.id}) { item ->
                Card(Modifier.fillMaxWidth(),shape=RoundedCornerShape(17.dp),colors=CardDefaults.cardColors(containerColor=Color.White),border=BorderStroke(1.dp,StudentBorder)) {
                    Row(Modifier.fillMaxWidth().clickable{onOpenProfile(item.id)}.padding(12.dp),verticalAlignment=Alignment.CenterVertically) {
                        StudentAvatar(item.fullName,item.avatarUrl,item.profileFrameUrl,50.dp);Spacer(Modifier.width(9.dp));Column(Modifier.weight(1f)){StudentName(item.fullName,item.isVerified,item.verificationColor);Text("@${item.username} • ${if(item.role.equals("teacher",true))"مدرس" else "طالب"}",color=StudentMuted,fontSize=12.sp)}
                        if(item.id!=session.userId){ val blocked=item.id in blockedIds; Column(horizontalAlignment=Alignment.End){TextButton(enabled=!blocked&&!busy,onClick={scope.launch{busy=true;val r=withContext(Dispatchers.IO){api.startDirectChat(session,item.id)};busy=false;r.onSuccess(onOpenMessages).onFailure{message=it.message}}}){Text("مراسلة")};TextButton(onClick={blockConfirm=item to !blocked}){Icon(if(blocked)Icons.Rounded.LockOpen else Icons.Rounded.Block,null,Modifier.size(15.dp));Spacer(Modifier.width(3.dp));Text(if(blocked)"إلغاء الحظر" else "حظر",fontSize=11.sp)}} }
                    }
                }
            }
            if(mode==1) items(english,key={it.id}) { w -> StudentOutlinedCard(Modifier.fillMaxWidth()){Column(Modifier.padding(13.dp)){Text(w.word,fontWeight=FontWeight.Black,fontSize=20.sp);Text("${w.meaningAr} • ${w.level}",color=StudentBlue,fontWeight=FontWeight.Bold);if(w.exampleEn.isNotBlank())Text(w.exampleEn);if(w.exampleAr.isNotBlank())Text(w.exampleAr,color=StudentMuted)}} }
            if(mode==2) items(materials,key={it.id}) { m -> StudentOutlinedCard(Modifier.fillMaxWidth()){Column(Modifier.padding(13.dp),verticalArrangement=Arrangement.spacedBy(5.dp)){Text(m.title,fontWeight=FontWeight.Black);if(m.description.isNotBlank())Text(m.description,color=StudentMuted);val url=m.fileUrl?:m.externalUrl;if(!url.isNullOrBlank())OutlinedButton(onClick={runCatching{uriHandler.openUri(url)}}){Text("فتح المحتوى")}}} }
            val empty = when(mode){0->people.isEmpty();1->english.isEmpty();else->materials.isEmpty()}
            if(empty && query.isNotBlank() && !busy) item { Text("لا توجد نتائج.",color=StudentMuted,modifier=Modifier.padding(18.dp)) }
        }
    }
}
