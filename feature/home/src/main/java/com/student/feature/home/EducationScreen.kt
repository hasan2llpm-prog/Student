package com.student.feature.home

import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.provider.OpenableColumns
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun EducationScreen(api: SupabaseApi, session: StudentSession, initialStageSlug: String? = null, managerRole: String? = null) {
    val cfg = LocalNativeRemoteConfig.current
    val showSchools = cfg.bool("education.show_schools", true)
    val showUniversities = cfg.bool("education.show_universities", true)
    var mode by remember(initialStageSlug) { mutableIntStateOf(if (initialStageSlug == "university") 1 else 0) }
    LaunchedEffect(showSchools, showUniversities) {
        if (!showSchools && showUniversities) mode = 1
        if (showSchools && !showUniversities) mode = 0
    }
    Column(Modifier.fillMaxSize()) {
        if (showSchools && showUniversities && cfg.bool("education.show_mode_tabs", true)) {
            TabRow(selectedTabIndex = mode) {
                Tab(selected = mode == 0, onClick = { mode = 0 }, text = { Text(cfg.string("education.schools_label", "المدارس")) })
                Tab(selected = mode == 1, onClick = { mode = 1 }, text = { Text(cfg.string("education.universities_label", "الجامعات")) })
            }
        }
        when {
            mode == 0 && showSchools -> SchoolEducationPanel(api, session, initialStageSlug, managerRole)
            showUniversities -> UniversityEducationPanel(api, session, managerRole)
            showSchools -> SchoolEducationPanel(api, session, initialStageSlug, managerRole)
            else -> Box(Modifier.fillMaxSize()) { Text("قسم التعليم معطل مؤقتًا.", Modifier.padding(20.dp)) }
        }
    }
}

@Composable
private fun SchoolEducationPanel(api: SupabaseApi, session: StudentSession, initialStageSlug: String? = null, managerRole: String? = null) {
    val scope = rememberCoroutineScope()
    val cfg = LocalNativeRemoteConfig.current
    val uri = LocalUriHandler.current
    val context = LocalContext.current
    val offline = remember(context) { OfflineStore(context) }
    var stages by remember { mutableStateOf(offline.loadEducationStages()) }
    var levels by remember { mutableStateOf<List<EducationLevel>>(emptyList()) }
    var subjects by remember { mutableStateOf<List<EducationSubject>>(emptyList()) }
    var materials by remember { mutableStateOf<List<EducationMaterial>>(emptyList()) }
    var stage by remember { mutableStateOf<EducationStage?>(null) }
    var level by remember { mutableStateOf<EducationLevel?>(null) }
    var subject by remember { mutableStateOf<EducationSubject?>(null) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var showAddSubject by remember { mutableStateOf(false) }
    var showAddMaterial by remember { mutableStateOf(false) }
    var addName by remember { mutableStateOf("") }
    var addDescription by remember { mutableStateOf("") }
    var addUrl by remember { mutableStateOf("") }
    var addFileUri by remember { mutableStateOf<android.net.Uri?>(null) }
    var addFileName by remember { mutableStateOf<String?>(null) }
    val materialPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { picked ->
        addFileUri = picked
        addFileName = picked?.let { u ->
            runCatching {
                context.contentResolver.query(u, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
                    if (c.moveToFirst()) c.getString(0) else null
                }
            }.getOrNull()
        }
    }
    val canPublish = cfg.bool("education.show_publish_actions", true) && managerRole?.lowercase() in setOf("admin", "teacher", "instructor", "professor")
    val canCreateStructure = cfg.bool("education.show_structure_actions", true) && managerRole?.lowercase() == "admin"
    LaunchedEffect(error) { if (error != null) { kotlinx.coroutines.delay(cfg.long("education.status_duration_ms", 3000L, 500L, 10000L)); error = null } }

    fun loadStages() {
        scope.launch {
            loading = true
            val r = withContext(Dispatchers.IO) { api.educationStages(session) }
            r.onSuccess {
                stages = it.filter { x -> x.slug != "university" }
                offline.saveEducationStages(stages)
            }.onFailure { if (stages.isEmpty()) error = it.message else error = "Offline: يتم عرض المراحل المحفوظة." }
            loading = false
        }
    }
    LaunchedEffect(Unit) { loadStages() }
    LaunchedEffect(stages, initialStageSlug) {
        if (stage == null && !initialStageSlug.isNullOrBlank() && initialStageSlug != "university") {
            stages.firstOrNull { it.slug.equals(initialStageSlug, true) }?.let { selected ->
                stage = selected
                levels = offline.loadEducationLevels(selected.id)
                scope.launch {
                    loading = true
                    val r = withContext(Dispatchers.IO) { api.educationLevels(session, selected.id) }
                    r.onSuccess { levels = it; offline.saveEducationLevels(selected.id, it) }.onFailure { if (levels.isEmpty()) error = it.message }
                    loading = false
                }
            }
        }
    }

    if (showAddSubject && level != null) {
        AlertDialog(
            onDismissRequest = { showAddSubject = false },
            title = { Text("إضافة مادة") },
            text = { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(addName, { addName = it }, label = { Text("اسم المادة") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(addDescription, { addDescription = it }, label = { Text("الوصف") }, modifier = Modifier.fillMaxWidth())
            } },
            confirmButton = { Button(onClick = {
                val currentLevel = level ?: return@Button
                scope.launch { loading = true; val r = withContext(Dispatchers.IO) { api.adminCreateSchoolSubject(session, currentLevel.id, addName, addName.trim().lowercase().replace(" ", "-"), addDescription) }; loading = false; r.onSuccess { showAddSubject=false; addName=""; addDescription=""; subjects = api.educationSubjects(session, currentLevel.id).getOrDefault(subjects) }.onFailure { error=it.message } }
            }, enabled = addName.isNotBlank() && !loading) { Text("إضافة") } },
            dismissButton = { TextButton(onClick = { showAddSubject = false }) { Text("إلغاء") } }
        )
    }
    if (showAddMaterial && subject != null) {
        AlertDialog(
            onDismissRequest = { showAddMaterial = false },
            title = { Text("إضافة درس / مادة تعليمية") },
            text = { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(addName, { addName = it }, label = { Text("عنوان الدرس") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(addDescription, { addDescription = it }, label = { Text("الشرح") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
                OutlinedTextField(addUrl, { addUrl = it }, label = { Text("رابط قناة / صفحة / فيديو / ملف — اختياري") }, modifier = Modifier.fillMaxWidth())
                OutlinedButton(onClick = { materialPicker.launch("*/*") }, modifier = Modifier.fillMaxWidth()) {
                    Text(addFileName?.let { "الملف: $it" } ?: "اختيار كتاب / ملف / صورة")
                }
            } },
            confirmButton = { Button(onClick = {
                val currentSubject = subject ?: return@Button
                val currentLevel = level
                scope.launch {
                    loading = true
                    val r = withContext(Dispatchers.IO) {
                        runCatching {
                            var uploadedUrl: String? = null
                            var uploadedName: String? = addFileName
                            var uploadedMime: String? = null
                            var uploadedSize: Long? = null
                            var uploadedPath: String? = null
                            var committed = false
                            try {
                                addFileUri?.let { picked ->
                                    uploadedMime = context.contentResolver.getType(picked) ?: "application/octet-stream"
                                    uploadedName = uploadedName ?: "material-${System.currentTimeMillis()}"
                                    val safe = uploadedName!!.replace(Regex("[^A-Za-z0-9._-]"), "_")
                                    val suffix = safe.substringAfterLast('.', "").takeIf { it.isNotBlank() } ?: "bin"
                                    val temp = materializeUriToCacheFile(context, picked, suffix, 60L * 1024L * 1024L)
                                    uploadedSize = temp.length()
                                    val path = "${session.userId}/${System.currentTimeMillis()}-$safe"
                                    uploadedUrl = try {
                                        api.uploadObjectFile(session, "education-content", path, temp, uploadedMime!!).getOrThrow().also { uploadedPath = path }
                                    } finally {
                                        temp.delete()
                                    }
                                }
                                val type = when {
                                uploadedMime?.startsWith("image/") == true -> "image"
                                uploadedMime == "application/pdf" -> "pdf"
                                uploadedUrl != null -> "file"
                                addUrl.isNotBlank() -> "link"
                                else -> "text"
                            }
                                api.publishEducationMaterial(
                                    session = session,
                                    subjectId = currentSubject.id,
                                    title = addName,
                                    description = addDescription,
                                    materialType = type,
                                    externalUrl = addUrl.takeIf { it.isNotBlank() },
                                    fileUrl = uploadedUrl,
                                    fileName = uploadedName,
                                    mimeType = uploadedMime,
                                    fileSize = uploadedSize,
                                    educationType = "school",
                                    levelId = currentLevel?.id
                                ).getOrThrow()
                                committed = true
                            } finally {
                                if (!committed) uploadedPath?.let { api.deleteObject(session, "education-content", it) }
                            }
                        }
                    }
                    loading = false
                    r.onSuccess {
                        showAddMaterial=false; addName=""; addDescription=""; addUrl=""; addFileUri=null; addFileName=null
                        materials = api.educationMaterials(session, currentSubject.id).getOrDefault(materials)
                    }.onFailure { error=it.message }
                }
            }, enabled = addName.isNotBlank() && !loading) { Text("نشر") } },
            dismissButton = { TextButton(onClick = { showAddMaterial = false }) { Text("إلغاء") } }
        )
    }

    BackHandler(enabled = subject != null || level != null || stage != null) {
        when {
            subject != null -> { subject = null; materials = emptyList() }
            level != null -> { level = null; subjects = emptyList() }
            stage != null -> { stage = null; levels = emptyList() }
        }
    }

    Column(Modifier.fillMaxSize()) {
        error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(12.dp)) }
        when {
            subject != null -> {
                EducationBackHeader("المواد", subject!!.name) { subject = null; materials = emptyList() }
                if (canPublish) TextButton(onClick = { addName=""; addDescription=""; addUrl=""; addFileUri=null; addFileName=null; showAddMaterial = true }, modifier = Modifier.padding(horizontal = 12.dp)) { Text("+ إضافة درس أو شرح") }
                MaterialList(materials, loading, uri)
            }
            level != null -> {
                EducationBackHeader("الصفوف", level!!.name) { level = null; subjects = emptyList() }
                if (canCreateStructure) TextButton(onClick = { addName=""; addDescription=""; showAddSubject = true }, modifier = Modifier.padding(horizontal = 12.dp)) { Text("+ إضافة مادة") }
                LazyColumn(contentPadding = PaddingValues(cfg.int("education.list_padding_dp", 12, 4, 24).dp), verticalArrangement = Arrangement.spacedBy(cfg.int("education.card_spacing_dp", 8, 2, 20).dp)) {
                    items(subjects, key = { it.id }) { s ->
                        EducationCard(s.name, s.description) {
                            subject = s
                            materials = offline.loadEducationMaterials("school_${s.id}")
                            scope.launch {
                                loading = true
                                val r = withContext(Dispatchers.IO) { api.educationMaterials(session, s.id) }
                                r.onSuccess { materials = it; offline.saveEducationMaterials("school_${s.id}", it) }.onFailure { if (materials.isEmpty()) error = it.message else error = "Offline: يتم عرض الدروس المحفوظة." }
                                loading = false
                            }
                        }
                    }
                    if (subjects.isEmpty() && !loading) item { Text("لا توجد مواد مرتبطة بهذا الصف.") }
                }
            }
            stage != null -> {
                EducationBackHeader("المراحل", stage!!.name) { stage = null; levels = emptyList() }
                LazyColumn(contentPadding = PaddingValues(cfg.int("education.list_padding_dp", 12, 4, 24).dp), verticalArrangement = Arrangement.spacedBy(cfg.int("education.card_spacing_dp", 8, 2, 20).dp)) {
                    items(levels, key = { it.id }) { l ->
                        EducationCard(l.name, "") {
                            level = l
                            subjects = offline.loadEducationSubjects("school_${l.id}")
                            scope.launch {
                                loading = true
                                val r = withContext(Dispatchers.IO) { api.educationSubjects(session, l.id) }
                                r.onSuccess { subjects = it; offline.saveEducationSubjects("school_${l.id}", it) }.onFailure { if (subjects.isEmpty()) error = it.message else error = "Offline: يتم عرض المواد المحفوظة." }
                                loading = false
                            }
                        }
                    }
                }
            }
            else -> {
                Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("المراحل الدراسية", style = MaterialTheme.typography.headlineSmall)
                    TextButton(onClick = { loadStages() }) { Text("تحديث") }
                }
                LazyColumn(contentPadding = PaddingValues(cfg.int("education.list_padding_dp", 12, 4, 24).dp), verticalArrangement = Arrangement.spacedBy(cfg.int("education.card_spacing_dp", 8, 2, 20).dp)) {
                    items(stages, key = { it.id }) { s ->
                        EducationCard(s.name, s.description) {
                            stage = s
                            levels = offline.loadEducationLevels(s.id)
                            scope.launch {
                                loading = true
                                val r = withContext(Dispatchers.IO) { api.educationLevels(session, s.id) }
                                r.onSuccess { levels = it; offline.saveEducationLevels(s.id, it) }.onFailure { if (levels.isEmpty()) error = it.message else error = "Offline: يتم عرض الصفوف المحفوظة." }
                                loading = false
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun UniversityEducationPanel(api: SupabaseApi, session: StudentSession, managerRole: String? = null) {
    val cfg = LocalNativeRemoteConfig.current
    val scope = rememberCoroutineScope()
    val uri = LocalUriHandler.current
    val context = LocalContext.current
    val offline = remember(context) { OfflineStore(context) }
    var universities by remember { mutableStateOf(offline.loadUniversityNodes("universities")) }
    var colleges by remember { mutableStateOf<List<UniversityNode>>(emptyList()) }
    var departments by remember { mutableStateOf<List<UniversityNode>>(emptyList()) }
    var levels by remember { mutableStateOf<List<UniversityNode>>(emptyList()) }
    var subjects by remember { mutableStateOf<List<EducationSubject>>(emptyList()) }
    var materials by remember { mutableStateOf<List<EducationMaterial>>(emptyList()) }
    var university by remember { mutableStateOf<UniversityNode?>(null) }
    var college by remember { mutableStateOf<UniversityNode?>(null) }
    var department by remember { mutableStateOf<UniversityNode?>(null) }
    var level by remember { mutableStateOf<UniversityNode?>(null) }
    var subject by remember { mutableStateOf<EducationSubject?>(null) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var showAddSubject by remember { mutableStateOf(false) }
    var showAddMaterial by remember { mutableStateOf(false) }
    var addName by remember { mutableStateOf("") }
    var addDescription by remember { mutableStateOf("") }
    var addUrl by remember { mutableStateOf("") }
    var addFileUri by remember { mutableStateOf<android.net.Uri?>(null) }
    var addFileName by remember { mutableStateOf<String?>(null) }
    val materialPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { picked ->
        addFileUri = picked
        addFileName = picked?.let { u ->
            runCatching {
                context.contentResolver.query(u, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
                    if (c.moveToFirst()) c.getString(0) else null
                }
            }.getOrNull()
        }
    }
    val canPublish = managerRole?.lowercase() in setOf("admin", "teacher", "instructor", "professor")
    val canCreateStructure = managerRole?.lowercase() == "admin"

    fun loadRoot() {
        scope.launch {
            loading = true
            val r = withContext(Dispatchers.IO) { api.universities(session) }
            r.onSuccess { universities = it; offline.saveUniversityNodes("universities", it) }.onFailure { if (universities.isEmpty()) error = it.message else error = "Offline: يتم عرض الجامعات المحفوظة." }
            loading = false
        }
    }
    LaunchedEffect(Unit) { loadRoot() }

    if (showAddSubject && level != null) {
        AlertDialog(onDismissRequest = { showAddSubject=false }, title = { Text("إضافة مادة جامعية") }, text = { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(addName,{addName=it},label={Text("اسم المادة")},modifier=Modifier.fillMaxWidth())
            OutlinedTextField(addDescription,{addDescription=it},label={Text("الوصف")},modifier=Modifier.fillMaxWidth())
        } }, confirmButton = { Button(onClick = { val currentLevel=level ?: return@Button; scope.launch { loading=true; val r=withContext(Dispatchers.IO){ api.adminCreateUniversitySubject(session,currentLevel.id,addName,addName.trim().lowercase().replace(" ","-"),addDescription) }; loading=false; r.onSuccess { showAddSubject=false; addName=""; addDescription=""; subjects=api.universitySubjects(session,currentLevel.id).getOrDefault(subjects) }.onFailure { error=it.message } } }, enabled=addName.isNotBlank()&&!loading){Text("إضافة")} }, dismissButton={TextButton(onClick={showAddSubject=false}){Text("إلغاء")}})
    }
    if (showAddMaterial && subject != null && level != null) {
        AlertDialog(onDismissRequest = { showAddMaterial=false }, title={Text("إضافة درس / مادة تعليمية")}, text={Column(verticalArrangement=Arrangement.spacedBy(8.dp)){
            OutlinedTextField(addName,{addName=it},label={Text("العنوان")},modifier=Modifier.fillMaxWidth())
            OutlinedTextField(addDescription,{addDescription=it},label={Text("الشرح")},modifier=Modifier.fillMaxWidth(),minLines=3)
            OutlinedTextField(addUrl,{addUrl=it},label={Text("رابط قناة / صفحة / فيديو / ملف — اختياري")},modifier=Modifier.fillMaxWidth())
            OutlinedButton(onClick={ materialPicker.launch("*/*") },modifier=Modifier.fillMaxWidth()) { Text(addFileName?.let { "الملف: $it" } ?: "اختيار كتاب / ملف / صورة") }
        }}, confirmButton={Button(onClick={
            val currentSubject=subject ?: return@Button
            val currentLevel=level ?: return@Button
            scope.launch {
                loading=true
                val r=withContext(Dispatchers.IO){
                    runCatching {
                        var uploadedUrl:String?=null
                        var uploadedName:String?=addFileName
                        var uploadedMime:String?=null
                        var uploadedSize:Long?=null
                        var uploadedPath:String?=null
                        var committed=false
                        try {
                            addFileUri?.let { picked ->
                                uploadedMime=context.contentResolver.getType(picked) ?: "application/octet-stream"
                                uploadedName=uploadedName ?: "material-${System.currentTimeMillis()}"
                                val safe=uploadedName!!.replace(Regex("[^A-Za-z0-9._-]"),"_")
                                val suffix=safe.substringAfterLast('.',"").takeIf{it.isNotBlank()} ?: "bin"
                                val temp=materializeUriToCacheFile(context,picked,suffix,60L*1024L*1024L)
                                uploadedSize=temp.length()
                                val path="${session.userId}/${System.currentTimeMillis()}-$safe"
                                uploadedUrl=try{api.uploadObjectFile(session,"education-content",path,temp,uploadedMime!!).getOrThrow().also{uploadedPath=path}}finally{temp.delete()}
                            }
                            val type=when { uploadedMime?.startsWith("image/")==true -> "image"; uploadedMime=="application/pdf" -> "pdf"; uploadedUrl!=null -> "file"; addUrl.isNotBlank() -> "link"; else -> "text" }
                            api.publishEducationMaterial(session,currentSubject.id,addName,addDescription,type,addUrl.takeIf{it.isNotBlank()},currentLevel.id,uploadedUrl,uploadedName,uploadedMime,uploadedSize,"university",null,null).getOrThrow()
                            committed=true
                        } finally {
                            if(!committed) uploadedPath?.let{api.deleteObject(session,"education-content",it)}
                        }
                    }
                }
                loading=false
                r.onSuccess{showAddMaterial=false; addName="";addDescription="";addUrl="";addFileUri=null;addFileName=null; materials=api.universityMaterials(session,currentLevel.id,currentSubject.id).getOrDefault(materials)}.onFailure{error=it.message}
            }
        },enabled=addName.isNotBlank()&&!loading){Text("نشر")}},dismissButton={TextButton(onClick={showAddMaterial=false}){Text("إلغاء")}})
    }

    BackHandler(enabled = subject != null || level != null || department != null || college != null || university != null) {
        when {
            subject != null -> { subject = null; materials = emptyList() }
            level != null -> { level = null; subjects = emptyList() }
            department != null -> { department = null; levels = emptyList() }
            college != null -> { college = null; departments = emptyList() }
            university != null -> { university = null; colleges = emptyList() }
        }
    }

    Column(Modifier.fillMaxSize()) {
        error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(12.dp)) }
        when {
            subject != null -> {
                EducationBackHeader("المواد", subject!!.name) { subject = null; materials = emptyList() }
                if (canPublish) TextButton(onClick = { addName=""; addDescription=""; addUrl=""; addFileUri=null; addFileName=null; showAddMaterial=true }, modifier=Modifier.padding(horizontal=12.dp)) { Text("+ إضافة درس أو شرح") }
                MaterialList(materials, loading, uri)
            }
            level != null -> {
                EducationBackHeader("المراحل", level!!.name) { level = null; subjects = emptyList() }
                if (canCreateStructure) TextButton(onClick = { addName=""; addDescription=""; showAddSubject=true }, modifier=Modifier.padding(horizontal=12.dp)) { Text("+ إضافة مادة") }
                LazyColumn(contentPadding = PaddingValues(cfg.int("education.list_padding_dp", 12, 4, 24).dp), verticalArrangement = Arrangement.spacedBy(cfg.int("education.card_spacing_dp", 8, 2, 20).dp)) {
                    items(subjects, key = { it.id }) { s ->
                        EducationCard(s.name, s.description) {
                            subject = s
                            val levelId = level!!.id
                            materials = offline.loadEducationMaterials("university_${levelId}_${s.id}")
                            scope.launch {
                                loading = true
                                val r = withContext(Dispatchers.IO) { api.universityMaterials(session, levelId, s.id) }
                                r.onSuccess { materials = it; offline.saveEducationMaterials("university_${levelId}_${s.id}", it) }.onFailure { if (materials.isEmpty()) error = it.message else error = "Offline: يتم عرض الدروس المحفوظة." }
                                loading = false
                            }
                        }
                    }
                }
            }
            department != null -> {
                EducationBackHeader("الأقسام", department!!.name) { department = null; levels = emptyList() }
                NodeList(levels) { node ->
                    level = node
                    subjects = offline.loadEducationSubjects("uni_subjects_${node.id}")
                    scope.launch {
                        loading = true
                        val r = withContext(Dispatchers.IO) { api.universitySubjects(session, node.id) }
                        r.onSuccess { subjects = it; offline.saveEducationSubjects("uni_subjects_${node.id}", it) }.onFailure { if (subjects.isEmpty()) error = it.message else error = "Offline: يتم عرض آخر بيانات محفوظة." }
                        loading = false
                    }
                }
            }
            college != null -> {
                EducationBackHeader("الكليات", college!!.name) { college = null; departments = emptyList() }
                NodeList(departments) { node ->
                    department = node
                    levels = offline.loadUniversityNodes("levels_${node.id}")
                    scope.launch {
                        loading = true
                        val r = withContext(Dispatchers.IO) { api.universityLevels(session, node.id) }
                        r.onSuccess { levels = it; offline.saveUniversityNodes("levels_${node.id}", it) }.onFailure { if (levels.isEmpty()) error = it.message else error = "Offline: يتم عرض آخر بيانات محفوظة." }
                        loading = false
                    }
                }
            }
            university != null -> {
                EducationBackHeader("الجامعات", university!!.name) { university = null; colleges = emptyList() }
                NodeList(colleges) { node ->
                    college = node
                    departments = offline.loadUniversityNodes("departments_${node.id}")
                    scope.launch {
                        loading = true
                        val r = withContext(Dispatchers.IO) { api.universityDepartments(session, node.id) }
                        r.onSuccess { departments = it; offline.saveUniversityNodes("departments_${node.id}", it) }.onFailure { if (departments.isEmpty()) error = it.message else error = "Offline: يتم عرض آخر بيانات محفوظة." }
                        loading = false
                    }
                }
            }
            else -> {
                Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("الجامعات", style = MaterialTheme.typography.headlineSmall)
                    TextButton(onClick = { loadRoot() }) { Text("تحديث") }
                }
                NodeList(universities) { node ->
                    university = node
                    colleges = offline.loadUniversityNodes("colleges_${node.id}")
                    scope.launch {
                        loading = true
                        val r = withContext(Dispatchers.IO) { api.universityColleges(session, node.id) }
                        r.onSuccess { colleges = it; offline.saveUniversityNodes("colleges_${node.id}", it) }.onFailure { if (colleges.isEmpty()) error = it.message else error = "Offline: يتم عرض آخر بيانات محفوظة." }
                        loading = false
                    }
                }
            }
        }
    }
}

@Composable
private fun EducationBackHeader(back: String, title: String, onBack: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(10.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
        IconButton(onClick = onBack) { Icon(Icons.Rounded.ArrowBack, "رجوع") }
        Column {
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(back, style = MaterialTheme.typography.labelSmall, color = StudentMuted)
        }
    }
}

@Composable
private fun EducationCard(title: String, description: String, onClick: () -> Unit) {
    val cfg = LocalNativeRemoteConfig.current
    ElevatedCard(Modifier.fillMaxWidth().clickable(onClick = onClick), shape = RoundedCornerShape(cfg.int("education.card_radius_dp", 16, 4, 30).dp)) {
        Column(Modifier.padding(cfg.int("education.card_padding_dp", 16, 8, 28).dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            if (description.isNotBlank()) Text(description, maxLines = 2)
        }
    }
}

@Composable
private fun NodeList(nodes: List<UniversityNode>, onClick: (UniversityNode) -> Unit) {
    val cfg = LocalNativeRemoteConfig.current
    LazyColumn(contentPadding = PaddingValues(cfg.int("education.list_padding_dp", 12, 4, 24).dp), verticalArrangement = Arrangement.spacedBy(cfg.int("education.card_spacing_dp", 8, 2, 20).dp)) {
        items(nodes, key = { it.id }) { node -> EducationCard(node.name, node.description) { onClick(node) } }
        if (nodes.isEmpty()) item { Text("لا توجد بيانات مفعلة هنا بعد.") }
    }
}

@Composable
private fun MaterialList(materials: List<EducationMaterial>, loading: Boolean, uri: androidx.compose.ui.platform.UriHandler) {
    val cfg = LocalNativeRemoteConfig.current
    var imagePreview by remember { mutableStateOf<String?>(null) }
    imagePreview?.let { url -> StudentImageViewer(url = url, onDismiss = { imagePreview = null }) }
    LazyColumn(contentPadding = PaddingValues(cfg.int("education.list_padding_dp", 12, 4, 24).dp), verticalArrangement = Arrangement.spacedBy(cfg.int("education.card_spacing_dp", 8, 2, 20).dp)) {
        items(materials, key = { it.id }) { m ->
            ElevatedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp)) {
                    Text(m.title.ifBlank { "محتوى تعليمي" }, style = MaterialTheme.typography.titleMedium)
                    if (m.description.isNotBlank() && m.description != "null") Text(m.description)
                    m.fileUrl?.takeIf { it.isNotBlank() && it != "null" }?.let { url ->
                        val isImage = m.materialType.equals("image", true) || Regex("\\.(jpg|jpeg|png|webp|gif)(\\?|$)", RegexOption.IGNORE_CASE).containsMatchIn(url)
                        if (isImage) {
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                                TextButton(onClick = { imagePreview = url }) { Text("عرض الصورة") }
                                StudentFileActions(url, m.title)
                            }
                        } else {
                            StudentFileActions(url, m.title)
                        }
                    }
                    m.externalUrl?.takeIf { it.isNotBlank() && it != "null" }?.let { url -> StudentFileActions(url, m.title) }
                }
            }
        }
        if (materials.isEmpty() && !loading) item { Text("لا يوجد محتوى منشور لهذه المادة.") }
    }
}

