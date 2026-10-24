@file:OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)

package com.student.feature.home

import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun FeedScreen(
    api: SupabaseApi,
    session: StudentSession,
    profile: StudentProfile?,
    onOpenCommunity: (String) -> Unit,
    onCreatePost: () -> Unit,
    onCreateStory: () -> Unit,
    onOpenStories: (String?) -> Unit,
    onOpenProfile: () -> Unit,
    onOpenEducation: (String) -> Unit,
    onOpenStudentAi: () -> Unit,
    onOpenLearnEnglish: () -> Unit,
    onOpenEnglishSection: (String) -> Unit,
    onOpenAcademicReports: () -> Unit,
    onOpenAskAi: () -> Unit,
    onOpenReels: (String?) -> Unit,
    onOpenRooms: () -> Unit,
    onOpenRemoteTarget: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    val cfg = LocalNativeRemoteConfig.current
    var communityPosts by remember { mutableStateOf<List<PostItem>>(emptyList()) }
    var stories by remember { mutableStateOf<List<StoryItem>>(emptyList()) }
    var ads by remember { mutableStateOf<List<HomeAd>>(emptyList()) }
    var featureFlags by remember { mutableStateOf<Map<String, Boolean>>(emptyMap()) }
    var remoteModules by remember { mutableStateOf<List<RemoteModuleItem>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }

    fun refresh() {
        scope.launch {
            loading = true
            val loaded = withContext(Dispatchers.IO) {
                coroutineScope {
                    val communityJob = async { api.feed(session, 6, 0) }
                    val adsJob = async { api.homeAds(session) }
                    val flagsJob = async { api.featureFlags(session) }
                    val controlsJob = async { api.v14FeatureControls(session) }
                    val modulesJob = async { api.remoteModules(session) }
                    Triple(
                        Triple(communityJob.await(), adsJob.await(), flagsJob.await()),
                        controlsJob.await(),
                        modulesJob.await()
                    )
                }
            }
            loaded.first.first.onSuccess { communityPosts = it }
            loaded.first.second.onSuccess { ads = it }
            loaded.first.third.onSuccess { flags -> featureFlags = flags.associate { it.key.lowercase() to it.enabled } }
            loaded.second.onSuccess { controls ->
                featureFlags = featureFlags + controls.mapKeys { (key, _) -> "english_${key.lowercase()}" }
            }
            loaded.third.onSuccess { remoteModules = it }
            withContext(Dispatchers.IO) { api.stories(session) }.onSuccess { stories = it }
            loading = false
        }
    }
    LaunchedEffect(session.userId) { refresh() }
    LaunchedEffect(session.userId, cfg.long("home.remote_modules_refresh_seconds", 30L, 10L, 600L)) {
        while (true) {
            delay(cfg.long("home.remote_modules_refresh_seconds", 30L, 10L, 600L) * 1000L)
            withContext(Dispatchers.IO) { api.remoteModules(session) }.onSuccess { remoteModules = it }
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(Color(0xFFF9F9FB)),
        contentPadding = PaddingValues(bottom = 20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            HomeStoriesRow(
                stories = stories,
                profile = profile,
                onOpenStory = { onOpenStories(it) },
                onCreateStory = onCreateStory
            )
        }
        if (cfg.bool("home.show_features", true)) {
            item {
                Spacer(Modifier.height(cfg.int("home.features_top_space_dp", 4, 0, 24).dp))
                EnglishHomeFeatureGrid(
                    featureFlags = featureFlags,
                    onTranslation = onOpenStudentAi,
                    onOpenSection = onOpenEnglishSection,
                    onOpenReports = onOpenAcademicReports,
                    onOpenAskAi = onOpenAskAi,
                    onOpenRooms = onOpenRooms
                )
            }
        }
        if (cfg.bool("home.show_remote_modules", true) && remoteModules.isNotEmpty()) {
            item {
                Spacer(Modifier.height(cfg.int("home.remote_modules_top_space_dp", 10, 0, 40).dp))
                RemoteModulesRow(remoteModules, onOpenRemoteTarget)
            }
        }
        if (cfg.bool("home.show_ads", true) && ads.isNotEmpty()) {
            item {
                Spacer(Modifier.height(cfg.int("home.ads_top_space_dp", 10, 0, 50).dp))
                HomeAdsCarousel(ads)
            }
        }
    }
}

@Composable
private fun HomeWelcomePanel(name: String, onTranslate: () -> Unit, onEducation: () -> Unit, onCreatePost: () -> Unit) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = StudentBlueDark),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("صباح الخير، $name", color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.Black)
            Text("مساحتك اليومية للتعلم والتواصل والإنجاز", color = Color.White.copy(alpha = .78f), fontSize = 12.sp)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                HomeQuickAction(Icons.Rounded.Translate, "ترجم", onTranslate)
                HomeQuickAction(Icons.Rounded.School, "تعلّم", onEducation)
                HomeQuickAction(Icons.Rounded.Edit, "انشر", onCreatePost)
            }
        }
    }
}

@Composable
private fun RowScope.HomeQuickAction(icon: ImageVector, label: String, onClick: () -> Unit) {
    Surface(Modifier.weight(1f).clickable(onClick = onClick), shape = RoundedCornerShape(15.dp), color = Color.White.copy(alpha = .12f)) {
        Column(Modifier.padding(vertical = 9.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, null, tint = StudentGold, modifier = Modifier.size(20.dp))
            Text(label, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun HomeStoriesRow(
    stories: List<StoryItem>,
    profile: StudentProfile?,
    onOpenStory: (String) -> Unit,
    onCreateStory: () -> Unit
) {
    Column(
        Modifier.fillMaxWidth().background(Color.White).padding(vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("القصص", fontWeight = FontWeight.Black, fontSize = 18.sp, modifier = Modifier.weight(1f))
            Text("شاهد الأحدث", color = StudentBlue, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
        LazyRow(
            contentPadding = PaddingValues(horizontal = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Column(Modifier.width(68.dp).clickable(onClick = onCreateStory), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(contentAlignment = Alignment.BottomEnd) {
                        Surface(shape = CircleShape, color = Color(0xFFE1F3F0), border = BorderStroke(2.dp, StudentTeal)) {
                            StudentAvatar(profile?.fullName ?: "أنت", profile?.avatarUrl, profile?.profileFrameUrl, 58.dp)
                        }
                        Surface(shape = CircleShape, color = StudentTeal, border = BorderStroke(2.dp, Color.White)) {
                            Icon(Icons.Rounded.Add, "إضافة قصة", tint = Color.White, modifier = Modifier.size(22.dp).padding(3.dp))
                        }
                    }
                    Spacer(Modifier.height(5.dp))
                    Text("قصتك", fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                }
            }
            items(stories.take(12), key = { it.id }) { story ->
                Column(Modifier.width(68.dp).clickable { onOpenStory(story.id) }, horizontalAlignment = Alignment.CenterHorizontally) {
                    Surface(
                        shape = CircleShape,
                        border = BorderStroke(3.dp, StudentCoral),
                        color = Color.White
                    ) {
                        StudentAvatar(story.authorName, story.authorAvatarUrl, story.authorFrameUrl, 58.dp)
                    }
                    Spacer(Modifier.height(5.dp))
                    Text(story.authorName, fontSize = 11.sp, maxLines = 1, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun HomeCommunityStrip(
    posts: List<PostItem>,
    profile: StudentProfile?,
    onOpenCommunity: (String?) -> Unit,
    onCreatePost: () -> Unit
) {
    Column(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("المجتمع", fontWeight = FontWeight.Black, fontSize = 17.sp, modifier = Modifier.weight(1f))
            TextButton(onClick = { onOpenCommunity(null) }) { Text("عرض الكل") }
        }
        LazyRow(
            modifier = Modifier.fillMaxWidth().height(112.dp),
            contentPadding = PaddingValues(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item {
                Card(
                    modifier = Modifier.width(108.dp).fillMaxHeight().clickable(onClick = onCreatePost),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF3F8FF)),
                    border = BorderStroke(1.dp, Color(0xFFDCE9F7))
                ) {
                    Column(Modifier.fillMaxSize().padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                        StudentAvatar(profile?.fullName ?: "مستخدم", profile?.avatarUrl, profile?.profileFrameUrl, 42.dp)
                        Spacer(Modifier.height(5.dp))
                        Icon(Icons.Rounded.AddCircle, null, tint = StudentBlue, modifier = Modifier.size(22.dp))
                        Text("نشر", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                    }
                }
            }
            items(posts.take(5), key = { it.id }) { post ->
                Card(
                    modifier = Modifier.width(150.dp).fillMaxHeight().clickable { onOpenCommunity(post.id) },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = BorderStroke(1.dp, Color(0xFFE6EAF0))
                ) {
                    Box(Modifier.fillMaxSize()) {
                        when {
                            post.postType.equals("video", true) -> {
                                Box(Modifier.fillMaxSize().background(Color(0xFF151515)), contentAlignment = Alignment.Center) {
                                    Icon(Icons.Rounded.PlayCircle, "فيديو", tint = Color.White, modifier = Modifier.size(36.dp))
                                }
                            }
                            !post.mediaUrl.isNullOrBlank() -> AsyncImage(post.mediaUrl, "منشور", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                            else -> Column(Modifier.fillMaxSize().padding(10.dp), verticalArrangement = Arrangement.Center) {
                                Text(post.authorName, fontWeight = FontWeight.Bold, fontSize = 10.sp, maxLines = 1)
                                Spacer(Modifier.height(5.dp))
                                Text(post.content.ifBlank { "منشور جديد" }, fontSize = 11.sp, maxLines = 4, color = StudentText)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EnglishHomeFeatureGrid(
    featureFlags: Map<String, Boolean>,
    onTranslation: () -> Unit,
    onOpenSection: (String) -> Unit,
    onOpenReports: () -> Unit,
    onOpenAskAi: () -> Unit,
    onOpenRooms: () -> Unit
) {
    data class HomeEnglishItem(val key:String,val label:String,val icon:ImageVector,val action:()->Unit)
    val cfg = LocalNativeRemoteConfig.current
    val all = listOf(
        HomeEnglishItem("ask_ai", "Ask AI", Icons.Rounded.AutoAwesome, onOpenAskAi),
        HomeEnglishItem("translation", "الترجمة", Icons.Rounded.Translate, onTranslation),
        HomeEnglishItem("vocabulary", "المفردات", Icons.Rounded.MenuBook) { onOpenSection("vocabulary") },
        HomeEnglishItem("grammar", "القواعد", Icons.Rounded.Spellcheck) { onOpenSection("grammar") },
        HomeEnglishItem("verbs", "الأفعال", Icons.Rounded.SyncAlt) { onOpenSection("verbs") },
        HomeEnglishItem("skills", "مهارات اللغة", Icons.Rounded.Headphones) { onOpenSection("skills") },
        HomeEnglishItem("reports", "التقارير", Icons.Rounded.Description, onOpenReports),
        HomeEnglishItem("rooms", "الغرف", Icons.Rounded.Groups, onOpenRooms)
    ).filter { item ->
        cfg.bool("english.feature_${item.key}", true) && (featureFlags["english_${item.key}"] ?: true)
    }
    val rows = all.chunked(4)
    Column(
        Modifier.fillMaxWidth().padding(horizontal = 8.dp),
        verticalArrangement = Arrangement.spacedBy(7.dp)
    ) {
        rows.forEach { rowItems ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                rowItems.forEach { item -> EnglishHomeCompactCard(item.label,item.icon,item.action,Modifier.weight(1f)) }
                repeat((4-rowItems.size).coerceAtLeast(0)) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun EnglishHomeCompactCard(label:String, icon:ImageVector, onClick:()->Unit, modifier:Modifier=Modifier) {
    Card(
        modifier = modifier.height(62.dp).clickable(onClick=onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFE6EAF0))
    ) {
        Column(Modifier.fillMaxSize().padding(4.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(icon,null,tint=StudentBlue,modifier=Modifier.size(22.dp))
            Spacer(Modifier.height(3.dp))
            Text(label,color=StudentText,fontSize=9.sp,fontWeight=FontWeight.Bold,maxLines=1)
        }
    }
}

@Composable
private fun HomeFeatureGrid(
    onPrimary: () -> Unit,
    onMiddle: () -> Unit,
    onSecondary: () -> Unit,
    onUniversity: () -> Unit,
    onAi: () -> Unit,
    onLearnEnglish: () -> Unit
) {
    val cfg = LocalNativeRemoteConfig.current
    val defaultOrder = listOf("primary", "middle", "secondary", "university", "student_ai", "learn_english")
    val order = cfg.strings("home.feature_order", defaultOrder).map { it.lowercase() }.distinct()
    val visible = order.filter { key ->
        when (key) {
            "primary" -> cfg.bool("home.feature_primary", true)
            "middle" -> cfg.bool("home.feature_middle", true)
            "secondary" -> cfg.bool("home.feature_secondary", true)
            "university" -> cfg.bool("home.feature_university", true)
            "student_ai" -> cfg.bool("home.feature_student_ai", true)
            "learn_english" -> cfg.bool("home.feature_learn_english", true)
            else -> false
        }
    }
    val topCount = cfg.int("home.feature_top_count", 5, 1, 6)
    val top = visible.take(topCount)
    val bottom = visible.drop(topCount)

    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = cfg.int("home.feature_padding_horizontal_dp", 10, 0, 28).dp),
        verticalArrangement = Arrangement.spacedBy(cfg.int("home.feature_row_spacing_dp", 9, 0, 24).dp)
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.Top) {
            top.forEach { key -> HomeCircleFeatureForKey(key, cfg, onPrimary, onMiddle, onSecondary, onUniversity, onAi, onLearnEnglish) }
        }
        if (bottom.isNotEmpty()) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.Top) {
                bottom.forEach { key ->
                    HomeCircleFeatureForKey(key, cfg, onPrimary, onMiddle, onSecondary, onUniversity, onAi, onLearnEnglish)
                    Spacer(Modifier.width(cfg.int("home.feature_bottom_spacing_dp", 8, 0, 24).dp))
                }
            }
        }
    }
}

@Composable
private fun HomeCircleFeatureForKey(
    key: String,
    cfg: NativeRemoteConfig,
    onPrimary: () -> Unit,
    onMiddle: () -> Unit,
    onSecondary: () -> Unit,
    onUniversity: () -> Unit,
    onAi: () -> Unit,
    onLearnEnglish: () -> Unit
) {
    when (key) {
        "primary" -> HomeCircleFeature(Icons.Rounded.School, cfg.string("home.label_primary", "الابتدائي"), Color(0xFFE7F6FF), Color(0xFF159BF0), onPrimary)
        "middle" -> HomeCircleFeature(Icons.Rounded.AccountBalance, cfg.string("home.label_middle", "الإعدادي"), Color(0xFFF0EAFE), Color(0xFF7357D9), onMiddle)
        "secondary" -> HomeCircleFeature(Icons.Rounded.AccountBalance, cfg.string("home.label_secondary", "الثانوي"), Color(0xFFE9F8F2), Color(0xFF138B62), onSecondary)
        "university" -> HomeCircleFeature(Icons.Rounded.AccountBalance, cfg.string("home.label_university", "الجامعة"), Color(0xFFFFF6D9), Color(0xFFB87500), onUniversity)
        "student_ai" -> HomeCircleFeature(Icons.Rounded.Translate, cfg.string("home.label_translation", "الترجمة"), Color(0xFFF2E6FF), Color(0xFF8B42D9), onAi)
        "learn_english" -> HomeCircleFeature(Icons.Rounded.Translate, cfg.string("home.label_learn_english", "Learn English"), Color(0xFFE5F7F8), Color(0xFF138A94), onLearnEnglish)
    }
}

@Composable
private fun HomeCircleFeature(icon: ImageVector, title: String, bg: Color, tint: Color, onClick: () -> Unit) {
    val cfg = LocalNativeRemoteConfig.current
    val itemWidth = cfg.int("home.feature_item_width_dp", 64, 48, 92).dp
    val circleSize = cfg.int("home.feature_circle_size_dp", 58, 42, 82).dp
    Column(
        modifier = Modifier.width(itemWidth).clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Surface(
            modifier = Modifier.size(circleSize),
            shape = CircleShape,
            color = bg,
            border = BorderStroke(cfg.int("home.feature_border_width_dp", 1, 0, 3).dp, tint.copy(alpha = .16f))
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(icon, title, tint = tint, modifier = Modifier.size(cfg.int("home.feature_icon_size_dp", 28, 18, 42).dp))
            }
        }
        Spacer(Modifier.height(cfg.int("home.feature_label_gap_dp", 6, 2, 14).dp))
        Text(
            title,
            color = StudentText,
            fontWeight = FontWeight.Bold,
            fontSize = cfg.int("home.feature_text_sp", 11, 9, 15).sp,
            maxLines = 1
        )
    }
}

@Composable
private fun HomeAdsCarousel(ads: List<HomeAd>) {
    val cfg = LocalNativeRemoteConfig.current
    val uri = LocalUriHandler.current
    val pager = rememberPagerState(pageCount = { ads.size })
    LaunchedEffect(ads.size) {
        if (ads.size > 1) {
            while (true) {
                delay(cfg.long("home.ad_interval_ms", 4500L, 1500L, 30000L))
                if (!pager.isScrollInProgress) {
                    val next = (pager.currentPage + 1) % ads.size
                    pager.animateScrollToPage(
                        next,
                        animationSpec = tween(durationMillis = cfg.int("home.ad_animation_ms", 650, 180, 1800))
                    )
                }
            }
        }
    }
    Column(Modifier.fillMaxWidth().padding(horizontal = cfg.int("home.ad_horizontal_padding_dp", 2, 0, 18).dp)) {
        HorizontalPager(state = pager, pageSpacing = cfg.int("home.ad_page_spacing_dp", 10, 0, 24).dp) { index ->
            val ad = ads[index]
            Card(
                modifier = Modifier.fillMaxWidth().height(cfg.int("home.ad_height_dp", 260, 180, 460).dp).clickable(enabled = !ad.actionUrl.isNullOrBlank()) {
                    ad.actionUrl?.let { runCatching { uri.openUri(it) } }
                },
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF7F8FB)),
                border = BorderStroke(1.dp, Color(0xFFE8E8E8))
            ) {
                Box(Modifier.fillMaxSize()) {
                    if (!ad.imageUrl.isNullOrBlank()) {
                        AsyncImage(ad.imageUrl, ad.title.ifBlank { "إعلان Student" }, Modifier.fillMaxSize().background(Color.White), contentScale = if (cfg.string("home.ad_content_scale", "fit").equals("crop", true)) ContentScale.Crop else ContentScale.Fit)
                    }
                    if (cfg.bool("home.ad_show_title", false) && ad.title.isNotBlank()) {
                        Surface(
                            modifier = Modifier.align(Alignment.BottomStart).padding(9.dp),
                            shape = RoundedCornerShape(10.dp),
                            color = Color.Black.copy(alpha = .55f)
                        ) { Text(ad.title, color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) }
                    }
                }
            }
        }
        if (ads.size > 1) {
            Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.Center) {
                repeat(ads.size) { i ->
                    Box(Modifier.padding(horizontal = 3.dp).size(if (i == pager.currentPage) 8.dp else 6.dp).clip(CircleShape).background(if (i == pager.currentPage) Color(0xFF169CF0) else Color(0xFFD6D6D6)))
                }
            }
        }
    }
}


@Composable
private fun RemoteModulesRow(modules: List<RemoteModuleItem>, onOpen: (String) -> Unit) {
    val cfg = LocalNativeRemoteConfig.current
    LazyRow(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = cfg.int("home.remote_modules_padding_dp", 10, 0, 30).dp),
        horizontalArrangement = Arrangement.spacedBy(cfg.int("home.remote_modules_spacing_dp", 8, 0, 24).dp)
    ) {
        items(modules, key = { it.id.ifBlank { it.moduleKey } }) { item ->
            Surface(
                modifier = Modifier.width(cfg.int("home.remote_module_width_dp", 130, 90, 220).dp)
                    .clickable { onOpen(item.target) },
                shape = RoundedCornerShape(cfg.int("home.remote_module_radius_dp", 16, 6, 32).dp),
                color = Color(0xFFF7F7FB),
                border = BorderStroke(1.dp, Color(0xFFE5E5EF))
            ) {
                Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.Start) {
                    Icon(remoteModuleIcon(item.iconKey), null, tint = StudentBlue, modifier = Modifier.size(24.dp))
                    Spacer(Modifier.height(8.dp))
                    Text(item.title, color = StudentText, fontWeight = FontWeight.Bold, fontSize = 13.sp, maxLines = 1)
                    item.subtitle?.let { Text(it, color = StudentMuted, fontSize = 10.sp, maxLines = 2) }
                }
            }
        }
    }
}

private fun remoteModuleIcon(key: String): ImageVector = when (key.lowercase()) {
    "saved", "bookmark", "bookmarks", "favorites" -> Icons.Rounded.Bookmark
    "messages", "chat", "send" -> Icons.Rounded.Send
    "store", "shop" -> Icons.Rounded.Storefront
    "reels", "video" -> Icons.Rounded.SmartDisplay
    "rooms", "mic", "audio" -> Icons.Rounded.Mic
    "translate", "language" -> Icons.Rounded.Translate
    "school", "education" -> Icons.Rounded.School
    "notifications", "bell" -> Icons.Rounded.NotificationsNone
    "profile", "person" -> Icons.Rounded.Person
    "search" -> Icons.Rounded.Search
    "community", "groups" -> Icons.Rounded.Groups
    else -> Icons.Rounded.Apps
}
