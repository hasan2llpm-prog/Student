package com.student.feature.home

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

enum class StudentRoute {
    HOME, SEARCH, CREATE, SAVED, MENU,
    PROFILE, MESSAGES, NOTIFICATIONS, EDUCATION, STORE, ADMIN, SETTINGS, STORIES,
    STUDENT_AI, ASK_AI, LEARN_ENGLISH, ENGLISH_ACADEMY, ACADEMIC_REPORTS, SUGGESTIONS, TEACHER_PORTAL, PUBLIC_PROFILE, SUPPORT, COMMUNITY, ACTIVITY, REELS, ROOMS, REMOTE_ACTION, REMOTE_SCREEN
}

@Composable
fun HomeScreen(
    api: SupabaseApi,
    session: StudentSession,
    profile: StudentProfile?,
    loadingProfile: Boolean,
    offlineMode: Boolean,
    rootMessage: String?,
    initialDestination: String? = null,
    onInitialDestinationConsumed: () -> Unit = {},
    onProfileChanged: (StudentProfile) -> Unit,
    onRefreshProfile: () -> Unit,
    onLogout: () -> Unit,
    onExitApp: () -> Unit
) {
    val backStack = remember { mutableStateListOf(StudentRoute.HOME) }
    var showExitConfirm by remember { mutableStateOf(false) }
    var unreadCount by remember { mutableIntStateOf(-1) }
    var educationStageSlug by remember { mutableStateOf<String?>(null) }
    var selectedProfileId by remember { mutableStateOf<String?>(null) }
    var initialConversationId by remember { mutableStateOf<String?>(null) }
    var initialPostId by remember { mutableStateOf<String?>(null) }
    var initialReelId by remember { mutableStateOf<String?>(null) }
    var initialStoryId by remember { mutableStateOf<String?>(null) }
    var initialCommentId by remember { mutableStateOf<String?>(null) }
    var messagesDetail by remember { mutableStateOf(false) }
    var englishSectionKey by remember { mutableStateOf("hub") }
    var initialStoreProductType by remember { mutableStateOf<String?>(null) }
    var remoteActionKey by remember { mutableStateOf<String?>(null) }
    var remoteScreenKey by remember { mutableStateOf<String?>(null) }
    var nativeConfig by remember { mutableStateOf(NativeRemoteConfig.EMPTY) }
    var featureControls by remember { mutableStateOf<Map<String, Boolean>>(emptyMap()) }
    var refreshNonce by remember { mutableIntStateOf(0) }
    var pullDistance by remember { mutableFloatStateOf(0f) }
    var pullRefreshing by remember { mutableStateOf(false) }
    val route = backStack.lastOrNull() ?: StudentRoute.HOME
    val uriHandler = LocalUriHandler.current

    LaunchedEffect(session.userId) {
        while (true) {
            withContext(Dispatchers.IO) { api.nativeRemoteConfig() }.onSuccess { nativeConfig = it }
            withContext(Dispatchers.IO) { api.v14FeatureControls(session) }.onSuccess { featureControls = it }
            val seconds = nativeConfig.long("global.refresh_seconds", 60L, 15L, 600L)
            delay(seconds * 1000L)
        }
    }

    fun navigate(destination: StudentRoute) {
        if (backStack.lastOrNull() != destination) backStack.add(destination)
    }
    fun openProfile(userId: String) {
        selectedProfileId = userId
        navigate(StudentRoute.PUBLIC_PROFILE)
    }
    fun openEducation(slug: String? = null) {
        educationStageSlug = slug
        navigate(StudentRoute.EDUCATION)
    }
    fun selectRoot(destination: StudentRoute) {
        backStack.clear(); backStack.add(StudentRoute.HOME)
        if (destination != StudentRoute.HOME) backStack.add(destination)
    }
    fun goBack() {
        if (backStack.size > 1) backStack.removeAt(backStack.lastIndex) else showExitConfirm = true
    }
    fun logoutSafely() {
        StudentSocialMediaMemoryCache.clear(session.userId)
        onLogout()
    }
    fun routeFromTarget(target: String?): StudentRoute? {
        val v = target.orEmpty().lowercase()
        return when {
            v.startsWith("action:") -> StudentRoute.REMOTE_ACTION
            v.startsWith("screen:") -> StudentRoute.REMOTE_SCREEN
            "message" in v || "chat" in v -> StudentRoute.MESSAGES
            v == "saved" || v == "saved/" || v == "bookmarks" || v == "favorites" || v.startsWith("saved/") || v.startsWith("bookmarks/") -> StudentRoute.SAVED
            "store" in v || "order" in v || "wallet" in v -> StudentRoute.STORE
            "reel" in v -> StudentRoute.REELS
            "education" in v || "lesson" in v || "subject" in v -> StudentRoute.EDUCATION
            "profile" in v || "follow" in v -> StudentRoute.PUBLIC_PROFILE
            "admin" in v || "teacher_request" in v -> StudentRoute.ADMIN
            "community" in v || "post" in v || "comment" in v -> StudentRoute.COMMUNITY
            "activity" in v -> StudentRoute.ACTIVITY
            "report" in v || "academic" in v -> StudentRoute.ACADEMIC_REPORTS
            "ask_ai" in v || "student-ai" in v -> StudentRoute.ASK_AI
            "translate" in v -> StudentRoute.STUDENT_AI
            "rooms" in v || "room" in v -> StudentRoute.ROOMS
            "ai" in v -> StudentRoute.ASK_AI
            else -> null
        }
    }

    fun openNotificationTarget(target: String?) {
        val raw = target.orEmpty().trim()
        val lower = raw.lowercase()
        fun idAfter(vararg keys: String): String? {
            keys.forEach { key ->
                Regex("(?i)(?:^|[/?:=&])${key}[/=:]([A-Za-z0-9_-]+)").find(raw)?.groupValues?.getOrNull(1)?.let { return it }
            }
            return raw.substringAfterLast('/').takeIf { it.isNotBlank() && it != raw && !it.contains("http", true) }
        }
        when {
            lower.startsWith("action:") -> { remoteActionKey = raw.substringAfter(":").trim(); navigate(StudentRoute.REMOTE_ACTION) }
            lower.startsWith("screen:") -> { remoteScreenKey = raw.substringAfter(":").trim(); navigate(StudentRoute.REMOTE_SCREEN) }
            lower == "saved" || lower == "saved/" || lower == "bookmarks" || lower == "favorites" || lower.startsWith("saved/") || lower.startsWith("bookmarks/") -> navigate(StudentRoute.SAVED)
            raw.startsWith("http://", true) || raw.startsWith("https://", true) -> runCatching { uriHandler.openUri(raw) }
            "reel" in lower -> { initialReelId = idAfter("reel", "reels"); navigate(StudentRoute.REELS) }
            "post" in lower || "comment" in lower -> {
                initialPostId = idAfter("post", "posts")
                initialCommentId = if ("comment" in lower) idAfter("comment", "comments") else null
                navigate(StudentRoute.COMMUNITY)
            }
            lower.startsWith("english/") -> {
                englishSectionKey = lower.substringAfter("english/").substringBefore('/').ifBlank { "hub" }
                navigate(StudentRoute.ENGLISH_ACADEMY)
            }
            "english" in lower || "daily_learning" in lower -> { englishSectionKey = if ("daily" in lower) "daily" else "hub"; navigate(StudentRoute.ENGLISH_ACADEMY) }
            "profile" in lower || "follow" in lower -> idAfter("profile", "user", "follow")?.let(::openProfile) ?: navigate(StudentRoute.SEARCH)
            "message" in lower || "chat" in lower || "conversation" in lower -> { initialConversationId = idAfter("message", "chat", "conversation"); navigate(StudentRoute.MESSAGES) }
            "store" in lower || "order" in lower || "wallet" in lower -> navigate(StudentRoute.STORE)
            "education" in lower || "lesson" in lower || "subject" in lower -> navigate(StudentRoute.EDUCATION)
            "admin" in lower || "teacher_request" in lower -> navigate(StudentRoute.ADMIN)
            "report" in lower || "academic" in lower -> navigate(StudentRoute.ACADEMIC_REPORTS)
            "room" in lower -> navigate(StudentRoute.ROOMS)
            "translate" in lower -> navigate(StudentRoute.STUDENT_AI)
            else -> navigate(StudentRoute.NOTIFICATIONS)
        }
    }

    LaunchedEffect(initialDestination) {
        initialDestination?.takeIf { it.isNotBlank() }?.let { target ->
            openNotificationTarget(target)
            onInitialDestinationConsumed()
        }
    }

    LaunchedEffect(session.userId) {
        while (true) {
            val result = withContext(Dispatchers.IO) { api.unreadNotificationCount(session) }
            result.onSuccess { unreadCount = it.coerceAtLeast(0) }
            delay(nativeConfig.long("notifications.badge_refresh_seconds", 15L, 10L, 120L) * 1000L)
        }
    }

    LaunchedEffect(route) {
        if (route == StudentRoute.NOTIFICATIONS) {
            withContext(Dispatchers.IO) { api.unreadNotificationCount(session) }
                .onSuccess { unreadCount = it.coerceAtLeast(0) }
        }
    }

    BackHandler { goBack() }

    if (showExitConfirm) {
        AlertDialog(
            onDismissRequest = { showExitConfirm = false },
            title = { Text("الخروج من Student", fontWeight = FontWeight.Bold) },
            text = { Text("هل تريد الخروج من Student؟") },
            confirmButton = { Button(onClick = { showExitConfirm = false; onExitApp() }) { Text("خروج") } },
            dismissButton = { TextButton(onClick = { showExitConfirm = false }) { Text("إلغاء") } }
        )
    }

    val title = when (route) {
        StudentRoute.HOME -> "Student"
        StudentRoute.SEARCH -> "البحث"
        StudentRoute.CREATE -> "إضافة"
        StudentRoute.SAVED -> "المحفوظات"
        StudentRoute.MENU -> "القائمة"
        StudentRoute.PROFILE -> "الملف الشخصي"
        StudentRoute.MESSAGES -> "الرسائل"
        StudentRoute.NOTIFICATIONS -> "الإشعارات"
        StudentRoute.EDUCATION -> "التعليم"
        StudentRoute.STORE -> "المتجر"
        StudentRoute.ADMIN -> "لوحة الأدمن"
        StudentRoute.SETTINGS -> "الإعدادات"
        StudentRoute.STORIES -> "Stories"
        StudentRoute.STUDENT_AI -> "الترجمة"
        StudentRoute.ASK_AI -> "Ask AI"
        StudentRoute.LEARN_ENGLISH -> "Learn English"
        StudentRoute.ENGLISH_ACADEMY -> "English"
        StudentRoute.ACADEMIC_REPORTS -> "التقارير الأكاديمية"
        StudentRoute.SUGGESTIONS -> "اقتراحات المتابعة"
        StudentRoute.TEACHER_PORTAL -> "نظام المدرس"
        StudentRoute.PUBLIC_PROFILE -> "الملف الشخصي"
        StudentRoute.SUPPORT -> "دعم Student"
        StudentRoute.COMMUNITY -> "المجتمع"
        StudentRoute.ACTIVITY -> "مركز النشاط"
        StudentRoute.REELS -> "Reels"
        StudentRoute.ROOMS -> "الغرف"
        StudentRoute.REMOTE_ACTION -> "إجراء"
        StudentRoute.REMOTE_SCREEN -> "شاشة"
    }

    val routeKey = route.name.lowercase()
    val defaultTopRoutes = listOf("home", "search", "create", "saved", "menu", "profile", "messages", "notifications", "education", "store", "admin", "settings", "student_ai", "ask_ai", "learn_english", "english_academy", "academic_reports", "suggestions", "teacher_portal", "support", "community", "activity")
    val defaultBottomRoutes = listOf("home", "search", "store", "reels", "messages")
    val topRoutes = nativeConfig.strings("navigation.top_bar_routes", defaultTopRoutes).map { it.lowercase() }
    val bottomRoutes = (nativeConfig.strings("navigation.bottom_bar_routes", defaultBottomRoutes).map { it.lowercase() } + listOf("home", "search", "store", "reels", "messages")).distinct()
    val immersiveRoutes = setOf(
        StudentRoute.MESSAGES, StudentRoute.REELS, StudentRoute.STUDENT_AI,
        StudentRoute.LEARN_ENGLISH, StudentRoute.ENGLISH_ACADEMY, StudentRoute.ROOMS, StudentRoute.REMOTE_ACTION, StudentRoute.REMOTE_SCREEN
    )
    val showTopBar = nativeConfig.bool("navigation.show_top_bar", true) && routeKey in topRoutes && route !in immersiveRoutes
    val showBottomBar = nativeConfig.bool("navigation.show_bottom_bar", true) && routeKey in bottomRoutes && route !in immersiveRoutes

    val pullRefreshConnection = remember(route) {
        object : NestedScrollConnection {
            override fun onPostScroll(consumed: Offset, available: Offset, source: NestedScrollSource): Offset {
                if (available.y > 0f && !pullRefreshing) {
                    pullDistance += available.y
                    if (pullDistance >= 180f) {
                        pullDistance = 0f
                        refreshNonce++
                        pullRefreshing = true
                    }
                } else if (available.y < 0f) {
                    pullDistance = 0f
                }
                return Offset.Zero
            }
        }
    }
    LaunchedEffect(refreshNonce) {
        if (refreshNonce > 0) {
            delay(700)
            pullRefreshing = false
        }
    }

    CompositionLocalProvider(LocalNativeRemoteConfig provides nativeConfig) {
    Scaffold(
        containerColor = Color.White,
        topBar = {
            if (showTopBar) StudentNativeTopBar(
                title = title,
                home = route == StudentRoute.HOME,
                welcomeName = profile?.fullName,
                canGoBack = backStack.size > 1 && route !in listOf(StudentRoute.SEARCH, StudentRoute.STORE, StudentRoute.MESSAGES),
                unreadCount = unreadCount,
                onBack = ::goBack,
                onNotifications = { navigate(StudentRoute.NOTIFICATIONS) },
                onMenu = { navigate(StudentRoute.MENU) }
            )
        },
        bottomBar = {
            if (showBottomBar) NavigationBar(containerColor = Color.White, tonalElevation = 0.dp) {
                StudentBottomItem(Icons.Rounded.Home, "الرئيسية", route == StudentRoute.HOME) { selectRoot(StudentRoute.HOME) }
                StudentBottomItem(Icons.Rounded.Search, "البحث", route == StudentRoute.SEARCH) { selectRoot(StudentRoute.SEARCH) }
                StudentBottomItem(Icons.Rounded.Storefront, "المتجر", route == StudentRoute.STORE) { selectRoot(StudentRoute.STORE) }
                if (featureControls["reels"] != false) StudentBottomItem(Icons.Rounded.SmartDisplay, "Reels", route == StudentRoute.REELS) { initialReelId = null; selectRoot(StudentRoute.REELS) }
                if (featureControls["messages"] != false) StudentBottomItem(Icons.Rounded.Send, "الرسائل", route == StudentRoute.MESSAGES) { selectRoot(StudentRoute.MESSAGES) }
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).background(Color.White).nestedScroll(pullRefreshConnection)) {
            if (offlineMode) {
                Surface(color = Color(0xFFFFF5DF), modifier = Modifier.fillMaxWidth()) {
                    Text("وضع Offline — يتم عرض آخر بيانات محفوظة وستتم المزامنة عند عودة الإنترنت", Modifier.padding(horizontal = 14.dp, vertical = 8.dp), color = Color(0xFF8A5A0A), fontSize = 12.sp)
                }
            }
            rootMessage?.takeIf { it.isNotBlank() && !offlineMode }?.let {
                Surface(color = StudentSoft, modifier = Modifier.fillMaxWidth()) {
                    Text(it, Modifier.padding(horizontal = 14.dp, vertical = 8.dp), color = StudentMuted, fontSize = 12.sp)
                }
            }
            Box(Modifier.fillMaxSize()) {
                key(route, refreshNonce) {
                when (route) {
                    StudentRoute.HOME -> FeedScreen(
                        api, session, profile,
                        onOpenCommunity = { postId -> initialPostId = postId; initialCommentId = null; navigate(StudentRoute.COMMUNITY) },
                        onCreatePost = { navigate(StudentRoute.CREATE) },
                        onCreateStory = { navigate(StudentRoute.STORIES) },
                        onOpenStories = { storyId -> initialStoryId = storyId; navigate(StudentRoute.STORIES) },
                        onOpenProfile = { navigate(StudentRoute.PROFILE) },
                        onOpenEducation = { slug -> openEducation(slug) },
                        onOpenStudentAi = { navigate(StudentRoute.STUDENT_AI) },
                        onOpenLearnEnglish = { englishSectionKey = "hub"; navigate(StudentRoute.ENGLISH_ACADEMY) },
                        onOpenEnglishSection = { key -> englishSectionKey = key; navigate(StudentRoute.ENGLISH_ACADEMY) },
                        onOpenAcademicReports = { navigate(StudentRoute.ACADEMIC_REPORTS) },
                        onOpenAskAi = { navigate(StudentRoute.ASK_AI) },
                        onOpenReels = { reelId -> initialReelId = reelId; navigate(StudentRoute.REELS) },
                        onOpenRooms = { navigate(StudentRoute.ROOMS) },
                        onOpenRemoteTarget = { target -> openNotificationTarget(target) }
                    )
                    StudentRoute.SEARCH -> SearchScreen(api, session, onOpenMessages = { conversationId -> initialConversationId = conversationId; navigate(StudentRoute.MESSAGES) }, onOpenProfile = ::openProfile)
                    StudentRoute.CREATE -> CreateScreen(api, session, onDone = { initialPostId = null; initialCommentId = null; selectRoot(StudentRoute.COMMUNITY) })
                    StudentRoute.STORIES -> StoriesScreen(api, session, profile, initialStoryId = initialStoryId, onBack = { initialStoryId = null; goBack() })
                    StudentRoute.SAVED -> SavedScreen(api, session, onOpenTarget = { target -> openNotificationTarget(target) })
                    StudentRoute.MENU -> MenuScreen(
                        profile = profile,
                        onProfile = { navigate(StudentRoute.PROFILE) },
                        onMessages = { navigate(StudentRoute.MESSAGES) },
                        onEducation = { openEducation(null) },
                        onStudentAi = { navigate(StudentRoute.STUDENT_AI) },
                        onLearnEnglish = { navigate(StudentRoute.LEARN_ENGLISH) },
                        onTeacherPortal = { navigate(StudentRoute.TEACHER_PORTAL) },
                        onSuggestions = { navigate(StudentRoute.SUGGESTIONS) },
                        onCommunity = { initialPostId = null; initialCommentId = null; navigate(StudentRoute.COMMUNITY) },
                        onActivity = { navigate(StudentRoute.ACTIVITY) },
                        onStore = { navigate(StudentRoute.STORE) },
                        onSaved = { navigate(StudentRoute.SAVED) },
                        onNotifications = { navigate(StudentRoute.NOTIFICATIONS) },
                        onAdmin = { navigate(StudentRoute.ADMIN) },
                        onSettings = { navigate(StudentRoute.SETTINGS) },
                        onLogout = ::logoutSafely
                    )
                    StudentRoute.PROFILE -> ProfileScreen(api, session, profile, loadingProfile, onProfileChanged, onRefreshProfile, onOpenSupport = { navigate(StudentRoute.SUPPORT) }, onCreatePost = { navigate(StudentRoute.CREATE) }, onOpenVerificationPurchase = { initialStoreProductType = "verification"; navigate(StudentRoute.STORE) })
                    StudentRoute.MESSAGES -> MessagesScreen(api, session, initialConversationId = initialConversationId, onOpenProfile = ::openProfile, onOpenReel = { reelId -> initialReelId = reelId; navigate(StudentRoute.REELS) }, onConversationStateChanged = { messagesDetail = it })
                    StudentRoute.NOTIFICATIONS -> NotificationsScreen(api, session, isAdmin = profile?.role == "admin", onOpenTarget = { target -> openNotificationTarget(target) }, onUnreadChanged = { unreadCount = it })
                    StudentRoute.EDUCATION -> EducationScreen(api, session, educationStageSlug, managerRole = profile?.role)
                    StudentRoute.STORE -> StoreScreen(api, session, initialProductType = initialStoreProductType, onInitialProductConsumed = { initialStoreProductType = null }, onProfileRefresh = onRefreshProfile)
                    StudentRoute.ADMIN -> AdminScreen(api, session, profile, onBack = { goBack() })
                    StudentRoute.SETTINGS -> SettingsScreen(api, session, profile, offlineMode, onRefreshProfile, ::logoutSafely)
                    StudentRoute.REELS -> ReelsScreen(api, session, initialReelId = initialReelId, onBack = { goBack() }, onOpenProfile = ::openProfile)
                    StudentRoute.ROOMS -> RoomsScreen(api, session, onBack = { goBack() }, onOpenProfile = ::openProfile)
                    StudentRoute.REMOTE_ACTION -> RemoteActionScreen(api, session, remoteActionKey.orEmpty(), onBack = { goBack() })
                    StudentRoute.REMOTE_SCREEN -> RemoteScreenScreen(
                        api = api,
                        session = session,
                        screenKey = remoteScreenKey.orEmpty(),
                        onBack = { goBack() },
                        onTarget = { target -> openNotificationTarget(target) },
                        onAction = { action -> remoteActionKey = action; navigate(StudentRoute.REMOTE_ACTION) },
                    )
                    StudentRoute.STUDENT_AI -> StudentAiScreen(api, session)
                    StudentRoute.ASK_AI -> AskAiScreen(api, session)
                    StudentRoute.LEARN_ENGLISH -> EnglishAcademyScreen(api, session, "hub")
                    StudentRoute.ENGLISH_ACADEMY -> EnglishAcademyScreen(api, session, englishSectionKey)
                    StudentRoute.ACADEMIC_REPORTS -> AcademicReportsScreen(api, session)
                    StudentRoute.SUGGESTIONS -> SuggestionsScreen(api, session, onOpenProfile = ::openProfile)
                    StudentRoute.TEACHER_PORTAL -> TeacherPortalScreen(api, session, profile)
                    StudentRoute.SUPPORT -> SupportScreen(api, session, profile)
                    StudentRoute.COMMUNITY -> CommunityScreen(api, session, onOpenProfile = ::openProfile, onCreatePost = { navigate(StudentRoute.CREATE) }, initialPostId = initialPostId, initialCommentId = initialCommentId)
                    StudentRoute.ACTIVITY -> ActivityCenterScreen(api, session, onOpenTarget = { openNotificationTarget(it) })
                    StudentRoute.PUBLIC_PROFILE -> PublicProfileScreen(api, session, selectedProfileId.orEmpty(), onMessage = { conversationId -> initialConversationId = conversationId; navigate(StudentRoute.MESSAGES) })
                }
                }
                if (pullRefreshing) {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.TopCenter).padding(top = 8.dp).size(24.dp),
                        strokeWidth = 2.dp
                    )
                }
            }
        }
    }
    }
}

@Composable
private fun StudentNativeTopBar(
    title: String,
    home: Boolean,
    welcomeName: String?,
    canGoBack: Boolean,
    unreadCount: Int,
    onBack: () -> Unit,
    onNotifications: () -> Unit,
    onMenu: () -> Unit
) {
    val cfg = LocalNativeRemoteConfig.current
    val homeHeight = cfg.int("navigation.home_top_bar_height_dp", 96, 64, 140).dp
    val normalHeight = cfg.int("navigation.top_bar_height_dp", 62, 48, 100).dp
    val bellSize = cfg.int("navigation.bell_icon_size_dp", 31, 18, 44).dp
    val menuSize = cfg.int("navigation.menu_icon_size_dp", 34, 18, 44).dp
    val badgeMax = cfg.int("notifications.badge_max", 99, 9, 999)
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
        Surface(color = Color(0xFFF5F7FA), shadowElevation = 0.dp) {
            Column {
                Box(Modifier.fillMaxWidth().height(if (home) homeHeight else normalHeight).padding(horizontal = 12.dp), contentAlignment = Alignment.Center) {
                    BadgedBox(
                        badge = { if (cfg.bool("notifications.show_badge", true) && unreadCount > 0) Badge(containerColor = Color(0xFFEA3345)) { Text(if (unreadCount > badgeMax) "${badgeMax}+" else unreadCount.toString(), color = Color.White) } },
                        modifier = Modifier.align(Alignment.CenterStart)
                    ) { IconButton(onClick = onNotifications) { Icon(Icons.Rounded.NotificationsNone, "الإشعارات", tint = StudentText, modifier = Modifier.size(bellSize)) } }
                    if (home) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            StudentLogo()
                            Spacer(Modifier.height(3.dp))
                            Text("مرحباً ${welcomeName.orEmpty().ifBlank { "بك" }}", color = StudentMuted, fontSize = 14.sp)
                        }
                    } else Text(title, color = StudentText, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    IconButton(onClick = if (canGoBack) onBack else onMenu, modifier = Modifier.align(Alignment.CenterEnd)) {
                        Icon(if (canGoBack) Icons.Rounded.ArrowBack else Icons.Rounded.Menu, if (canGoBack) "رجوع" else "القائمة", tint = StudentText, modifier = Modifier.size(menuSize))
                    }
                }
                HorizontalDivider(color = StudentBorder.copy(alpha = 0.8f))
            }
        }
    }
}

@Composable
private fun RowScope.StudentBottomItem(icon: ImageVector, label: String, selected: Boolean, onClick: () -> Unit) {
    val cfg = LocalNativeRemoteConfig.current
    val iconSize = cfg.int("navigation.bottom_icon_size_dp", 30, 18, 42).dp
    NavigationBarItem(
        selected = selected,
        onClick = onClick,
        icon = { Icon(icon, label, modifier = Modifier.size(iconSize)) },
        label = { Text(label, fontSize = 9.sp, fontWeight = FontWeight.Bold) },
        alwaysShowLabel = false,
        colors = NavigationBarItemDefaults.colors(
            selectedIconColor = StudentBlue,
            selectedTextColor = StudentBlue,
            indicatorColor = StudentSoft,
            unselectedIconColor = StudentMuted,
            unselectedTextColor = StudentMuted
        )
    )
}
