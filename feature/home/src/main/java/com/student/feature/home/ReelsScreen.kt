@file:OptIn(
    androidx.compose.foundation.ExperimentalFoundationApi::class,
    androidx.compose.material3.ExperimentalMaterial3Api::class
)

package com.student.feature.home

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import android.os.Handler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.exoplayer.analytics.AnalyticsListener
import androidx.media3.effect.Presentation
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import com.student.core.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.coroutines.resume

@Composable
fun ReelsScreen(
    api: SupabaseApi,
    session: StudentSession,
    initialReelId: String? = null,
    onBack: () -> Unit,
    onOpenProfile: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    val cfg = LocalNativeRemoteConfig.current
    val context = LocalContext.current
    var reels by remember(session.userId) { mutableStateOf(StudentSocialMediaMemoryCache.reels(session.userId)) }
    var loading by remember(session.userId) { mutableStateOf(reels.isEmpty()) }
    var loadingMore by remember(session.userId) { mutableStateOf(false) }
    var hasMore by remember(session.userId) { mutableStateOf(true) }
    var initialReelConsumed by remember(initialReelId) { mutableStateOf(false) }
    var requestGeneration by remember(session.userId) { mutableIntStateOf(0) }
    var message by remember { mutableStateOf<String?>(null) }
    var commentsFor by remember { mutableStateOf<ReelItem?>(null) }
    var shareFor by remember { mutableStateOf<ReelItem?>(null) }
    var uploadOpen by remember { mutableStateOf(false) }
    var uploadCaption by remember { mutableStateOf("") }
    var selectedVideo by remember { mutableStateOf<Uri?>(null) }
    var uploadConfirm by remember { mutableStateOf(false) }

    val reelPageSize = cfg.int("reels.page_size", 24, 5, 60)

    fun refresh() {
        requestGeneration += 1
        val generation = requestGeneration
        loading = true
        loadingMore = false
        scope.launch {
            withContext(Dispatchers.IO) { api.reels(session, reelPageSize, 0) }
                .onSuccess { page ->
                    if (generation == requestGeneration) {
                        reels = page
                        hasMore = page.size >= reelPageSize
                        StudentSocialMediaMemoryCache.putReels(session.userId, page)
                    }
                }
                .onFailure { if (generation == requestGeneration) message = it.message ?: "تعذر تحميل الريلز." }
            if (generation == requestGeneration) loading = false
        }
    }

    fun loadMoreReels() {
        if (loading || loadingMore || !hasMore) return
        loadingMore = true
        val generation = requestGeneration
        val offset = reels.size
        scope.launch {
            withContext(Dispatchers.IO) { api.reels(session, reelPageSize, offset) }
                .onSuccess { page ->
                    if (generation != requestGeneration) return@onSuccess
                    if (page.isEmpty()) {
                        hasMore = false
                    } else {
                        val known = reels.asSequence().map { it.id }.toHashSet()
                        val fresh = page.filter { known.add(it.id) }
                        reels = reels + fresh
                        hasMore = page.size >= reelPageSize
                        StudentSocialMediaMemoryCache.putReels(session.userId, reels)
                    }
                }
                .onFailure { if (generation == requestGeneration) message = it.message ?: "تعذر تحميل المزيد من الريلز." }
            if (generation == requestGeneration) loadingMore = false
        }
    }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) {
        if (it != null) { selectedVideo = it; uploadOpen = true }
    }

    LaunchedEffect(session.userId) { refresh() }
    LaunchedEffect(session.userId, reels) {
        if (reels.isNotEmpty()) StudentSocialMediaMemoryCache.putReels(session.userId, reels)
    }

    if (uploadOpen) {
        ModalBottomSheet(onDismissRequest = { if (!loading) { uploadOpen = false; selectedVideo = null; uploadCaption = "" } }) {
            Column(
                Modifier.fillMaxWidth().navigationBarsPadding().padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text("معاينة الريل", fontSize = 20.sp, fontWeight = FontWeight.Black)
                selectedVideo?.let { localUri ->
                    StudentLocalVideoPreview(
                        uri = localUri,
                        modifier = Modifier.fillMaxWidth().height(360.dp)
                    )
                }
                OutlinedTextField(
                    uploadCaption,
                    { uploadCaption = it.take(2200) },
                    label = { Text("الوصف — اختياري") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    maxLines = 4
                )
                Button(
                    onClick = { uploadConfirm = true },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !loading && selectedVideo != null
                ) { Text("متابعة") }
                TextButton(
                    onClick = { uploadOpen = false; selectedVideo = null; uploadCaption = "" },
                    enabled = !loading,
                    modifier = Modifier.fillMaxWidth()
                ) { Text("إلغاء") }
            }
        }
    }

    if (uploadConfirm) {
        AlertDialog(
            onDismissRequest = { if (!loading) uploadConfirm = false },
            title = { Text("تأكيد نشر الريل") },
            text = { Text("هل تريد نشر هذا الريل الآن؟") },
            confirmButton = {
                Button(
                    enabled = !loading && selectedVideo != null,
                    onClick = {
                        uploadConfirm = false
                        val picked = selectedVideo ?: return@Button
                        scope.launch {
                            loading = true
                            val mime = context.contentResolver.getType(picked) ?: "video/mp4"
                            val maxMb = cfg.int("reels.max_upload_mb", 80, 5, 300)
                            var originalFile: File? = null
                            var lowCopy: File? = null
                            val result = runCatching {
                                require(mime.startsWith("video/")) { "اختر ملف فيديو." }
                                originalFile = withContext(Dispatchers.IO) {
                                    try {
                                        materializeUriToCacheFile(
                                            context, picked, "mp4",
                                            maxMb.toLong() * 1024L * 1024L
                                        )
                                    } catch (t: IllegalStateException) {
                                        if (t.message == "حجم الملف أكبر من الحد المسموح.") {
                                            throw IllegalStateException("حجم الفيديو أكبر من الحد المسموح (${maxMb}MB).")
                                        }
                                        throw t
                                    }
                                }
                                // Transcode only after the original passed MIME and size checks.
                                lowCopy = createLowQualityReelCopy(context, Uri.fromFile(originalFile!!)).getOrNull()
                                withContext(Dispatchers.IO) {
                                    val stamp = System.currentTimeMillis()
                                    val path = "${session.userId}/${stamp}_reel.mp4"
                                    val lowPath = "${session.userId}/${stamp}_reel_360p.mp4"
                                    var originalUploaded = false
                                    var lowUploaded = false
                                    var committed = false
                                    val moderationPreviewPaths = mutableListOf<String>()
                                    try {
                                        val url = api.uploadObjectFile(session, "reels", path, originalFile!!, mime).getOrThrow().also {
                                            originalUploaded = true
                                        }
                                        val lowUrl = lowCopy?.takeIf { it.exists() && it.length() > 0L }?.let { file ->
                                            runCatching {
                                                api.uploadObjectFile(session, "reels", lowPath, file, "video/mp4").getOrThrow().also {
                                                    lowUploaded = true
                                                }
                                            }.getOrNull()
                                        }
                                        val previews = createVideoModerationPreviews(context, picked).mapIndexedNotNull { index, preview ->
                                            val previewPath = "${session.userId}/moderation/${stamp}_${index}.jpg"
                                            runCatching {
                                                api.uploadObject(session, "reels", previewPath, preview, "image/jpeg").getOrThrow().also {
                                                    moderationPreviewPaths += previewPath
                                                }
                                            }.getOrNull()
                                        }
                                        val moderation = api.moderatePublicMedia(session, url, "video", uploadCaption, previews).getOrThrow()
                                        require(moderation == "approved") {
                                            if (moderation == "rejected") "تعذر نشر الريل لأنه يخالف قواعد المحتوى العام." else "الريل قيد المراجعة ولا يمكن نشره الآن."
                                        }
                                        api.createReel(session, url, uploadCaption, lowQualityUrl = lowUrl).getOrThrow()
                                        committed = true
                                    } finally {
                                        moderationPreviewPaths.forEach { previewPath ->
                                            api.deleteObject(session, "reels", previewPath)
                                        }
                                        if (!committed) {
                                            if (lowUploaded) api.deleteObject(session, "reels", lowPath)
                                            if (originalUploaded) api.deleteObject(session, "reels", path)
                                        }
                                    }
                                }
                            }
                            originalFile?.delete()
                            lowCopy?.delete()
                            loading = false
                            result.onSuccess {
                                uploadOpen = false; selectedVideo = null; uploadCaption = ""
                                message = "تم نشر الريل."; refresh()
                            }.onFailure { message = it.message ?: "تعذر نشر الريل." }
                        }
                    }
                ) { Text("تأكيد ونشر") }
            },
            dismissButton = { TextButton(enabled = !loading, onClick = { uploadConfirm = false }) { Text("رجوع") } }
        )
    }

    commentsFor?.let { reel ->
        ReelCommentsSheet(api, session, reel, onDismiss = { commentsFor = null }) {
            message = it
            refresh()
        }
    }

    shareFor?.let { reel ->
        ReelShareSheet(api, session, reel, onDismiss = { shareFor = null }) { message = it }
    }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        when {
            loading && reels.isEmpty() -> CircularProgressIndicator(Modifier.align(Alignment.Center), color = Color.White)
            reels.isEmpty() -> Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Rounded.SmartDisplay, null, tint = Color.White, modifier = Modifier.size(48.dp))
                Spacer(Modifier.height(10.dp))
                Text("لا توجد Reels بعد", color = Color.White, fontWeight = FontWeight.Bold)
                if (cfg.bool("reels.upload_enabled", true)) {
                    TextButton(onClick = { picker.launch("video/*") }) { Text("انشر أول Reel") }
                }
            }
            else -> {
                val initial = remember(reels, initialReelId) {
                    reels.indexOfFirst { it.id == initialReelId }.takeIf { it >= 0 } ?: 0
                }
                val pager = rememberPagerState(initialPage = initial, pageCount = { reels.size })
                LaunchedEffect(initialReelId, reels, hasMore, loadingMore) {
                    if (!initialReelConsumed && !initialReelId.isNullOrBlank()) {
                        val target = reels.indexOfFirst { it.id == initialReelId }
                        if (target >= 0) {
                            pager.scrollToPage(target)
                            initialReelConsumed = true
                        } else if (!loading && !loadingMore && hasMore) {
                            loadMoreReels()
                        }
                    }
                }
                VerticalPager(state = pager, modifier = Modifier.fillMaxSize()) { page ->
                    val reel = reels[page]
                    ReelPage(
                        reel = reel,
                        active = pager.currentPage == page,
                        onProfile = { onOpenProfile(reel.userId) },
                        onFollow = {
                            val target = !reel.following
                            scope.launch {
                                withContext(Dispatchers.IO) { api.setFollowing(session, reel.userId, target) }
                                    .onSuccess { reels = reels.map { if (it.id == reel.id) it.copy(following = target) else it } }
                                    .onFailure { message = it.message }
                            }
                        },
                        onLike = {
                            val target = !reel.liked
                            scope.launch {
                                withContext(Dispatchers.IO) { api.setReelLiked(session, reel.id, target) }
                                    .onSuccess {
                                        reels = reels.map {
                                            if (it.id == reel.id) it.copy(
                                                liked = target,
                                                likeCount = (it.likeCount + if (target) 1 else -1).coerceAtLeast(0)
                                            ) else it
                                        }
                                    }.onFailure { message = it.message }
                            }
                        },
                        onComments = { commentsFor = reel },
                        onShare = { shareFor = reel },
                        onSave = {
                            val target = !reel.saved
                            scope.launch {
                                withContext(Dispatchers.IO) {
                                    runCatching {
                                        api.setReelSaved(session, reel.id, target).getOrThrow()
                                        if (target) {
                                            api.saveItem(
                                                session,
                                                "reel",
                                                reel.id,
                                                reel.caption.ifBlank { "ريلز محفوظ" },
                                                reel.authorName,
                                                "reels",
                                                "reel/${reel.id}"
                                            ).getOrThrow()
                                        } else {
                                            api.removeSavedItem(session, "reel", reel.id).getOrThrow()
                                        }
                                    }
                                }.onSuccess { reels = reels.map { if (it.id == reel.id) it.copy(saved = target) else it } }
                                    .onFailure { message = it.message }
                            }
                        },
                        onDownload = {
                            runCatching { downloadReel(context, reel.videoUrl, reel.id) }
                                .onSuccess { message = "بدأ تحميل الفيديو." }
                                .onFailure { message = "تعذر بدء التحميل." }
                        }
                    )
                }
                LaunchedEffect(pager.currentPage, reels.size) {
                    reels.getOrNull(pager.currentPage)?.let { reel ->
                        withContext(Dispatchers.IO) { api.recordReelView(session, reel.id) }
                    }
                    reels.getOrNull(pager.currentPage + 1)?.let { nextReel ->
                        val nextUrl = nextReel.hlsUrl?.takeIf { it.isNotBlank() }
                            ?: nextReel.lowQualityUrl?.takeIf { it.isNotBlank() }
                            ?: nextReel.videoUrl
                        withContext(Dispatchers.IO) { StudentMediaPlayback.prefetchPrefix(context, nextUrl) }
                    }
                    if (pager.currentPage >= reels.lastIndex - 3 && hasMore && !loadingMore) {
                        loadMoreReels()
                    }
                }
            }
        }

        Row(
            Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 8.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            FilledIconButton(
                onClick = onBack,
                colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color.Black.copy(alpha = .35f))
            ) { Icon(Icons.Rounded.ArrowBack, "رجوع", tint = Color.White) }
            if (cfg.bool("reels.upload_enabled", true)) {
                FilledIconButton(
                    onClick = { picker.launch("video/*") },
                    colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color.Black.copy(alpha = .35f))
                ) { Icon(Icons.Rounded.Add, "نشر Reel", tint = Color.White) }
            }
        }

        message?.let {
            Surface(
                Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(top = 58.dp, start = 20.dp, end = 20.dp),
                color = Color.Black.copy(alpha = .72f),
                shape = RoundedCornerShape(16.dp)
            ) { Text(it, Modifier.padding(horizontal = 14.dp, vertical = 9.dp), color = Color.White, fontSize = 12.sp) }
            LaunchedEffect(it) { kotlinx.coroutines.delay(2200); message = null }
        }
    }
}

@Composable
private fun ReelPage(
    reel: ReelItem,
    active: Boolean,
    onProfile: () -> Unit,
    onFollow: () -> Unit,
    onLike: () -> Unit,
    onComments: () -> Unit,
    onShare: () -> Unit,
    onSave: () -> Unit,
    onDownload: () -> Unit
) {
    val cfg = LocalNativeRemoteConfig.current
    val context = LocalContext.current
    val trackSelector = remember(reel.id) { DefaultTrackSelector(context) }
    val loadControl = remember(reel.id) {
        DefaultLoadControl.Builder()
            .setBufferDurationsMs(2_500, 30_000, 750, 1_500)
            .build()
    }
    val player = remember(reel.id) {
        ExoPlayer.Builder(context)
            .setTrackSelector(trackSelector)
            .setMediaSourceFactory(StudentMediaPlayback.mediaSourceFactory(context))
            .setLoadControl(loadControl)
            .build()
    }
    val primarySource = reel.hlsUrl?.takeIf { it.isNotBlank() } ?: reel.videoUrl
    val sourceCandidates = remember(reel.id, reel.hlsUrl, reel.lowQualityUrl, reel.videoUrl) {
        buildList {
            add(primarySource)
            reel.lowQualityUrl?.takeIf { it.isNotBlank() }?.let(::add)
            reel.videoUrl.takeIf { it.isNotBlank() }?.let(::add)
        }.distinct()
    }
    var currentSource by remember(reel.id) { mutableStateOf(primarySource) }
    val failedSources = remember(reel.id) { mutableSetOf<String>() }
    var mediaError by remember(reel.id) { mutableStateOf(false) }
    var paused by remember(reel.id) { mutableStateOf(false) }
    // This is measured from bytes actually transferred by ExoPlayer. Android's
    // linkDownstreamBandwidthKbps is only a link capability estimate and can stay
    // high even when the user's real internet is slow.
    var measuredKbps by remember(reel.id) { mutableIntStateOf(0) }
    val usingFallback = !reel.lowQualityUrl.isNullOrBlank() && currentSource == reel.lowQualityUrl

    fun switchSource(url: String, position: Long = player.currentPosition.coerceAtLeast(0L)) {
        currentSource = url
        mediaError = false
        player.setMediaItem(MediaItem.fromUri(url), position)
        player.prepare()
        if (active && !paused) player.play()
    }

    fun tryNextFallback(): Boolean {
        failedSources += currentSource
        val next = sourceCandidates.firstOrNull { it !in failedSources }
        if (next == null) {
            mediaError = true
            return false
        }
        switchSource(next)
        return true
    }

    fun retryPlayback() {
        failedSources.clear()
        mediaError = false
        switchSource(primarySource, 0L)
    }

    fun applyMeasuredQuality(kbps: Int) {
        if (kbps <= 0) return
        // For a true multi-variant HLS master playlist this cap lets ExoPlayer pick
        // a track that the measured connection can sustain. For ordinary MP4s we
        // additionally switch between original and the stored 360p rendition below.
        val maxBitrate = when {
            kbps < 850 -> 420_000
            kbps < 1600 -> 800_000
            kbps < 3000 -> 1_500_000
            kbps < 5000 -> 2_800_000
            else -> Int.MAX_VALUE
        }
        trackSelector.parameters = trackSelector.buildUponParameters()
            .setMaxVideoBitrate(maxBitrate)
            .build()
    }

    DisposableEffect(reel.id) {
        val playerListener = object : Player.Listener {
            override fun onPlayerError(error: PlaybackException) {
                tryNextFallback()
            }
        }
        val analyticsListener = object : AnalyticsListener {
            override fun onBandwidthEstimate(
                eventTime: AnalyticsListener.EventTime,
                totalLoadTimeMs: Int,
                totalBytesLoaded: Long,
                bitrateEstimate: Long
            ) {
                val kbps = (bitrateEstimate / 1000L).coerceIn(0L, Int.MAX_VALUE.toLong()).toInt()
                measuredKbps = kbps
                applyMeasuredQuality(kbps)
            }
        }
        player.addListener(playerListener)
        player.addAnalyticsListener(analyticsListener)
        player.repeatMode = Player.REPEAT_MODE_ONE
        player.setMediaItem(MediaItem.fromUri(currentSource))
        player.prepare()
        onDispose {
            player.removeAnalyticsListener(analyticsListener)
            player.removeListener(playerListener)
            player.release()
        }
    }

    LaunchedEffect(active, reel.id) {
        if (!active || !reel.hlsUrl.isNullOrBlank() || reel.lowQualityUrl.isNullOrBlank()) return@LaunchedEffect

        // Hysteresis prevents ping-ponging between sources. Two low samples (or
        // sustained buffering) move down; four healthy samples move back up.
        var lowSamples = 0
        var highSamples = 0
        while (active) {
            val kbps = measuredKbps
            val buffering = player.playbackState == Player.STATE_BUFFERING
            when {
                buffering || (kbps in 1..1900) -> {
                    lowSamples++
                    highSamples = 0
                }
                kbps >= 3600 && player.playbackState == Player.STATE_READY -> {
                    highSamples++
                    lowSamples = 0
                }
                else -> {
                    lowSamples = 0
                    highSamples = 0
                }
            }

            val lowUrl = reel.lowQualityUrl?.takeIf { it.isNotBlank() && it !in failedSources }
            val highUrl = reel.videoUrl.takeIf { it.isNotBlank() && it !in failedSources }
            val isLow = !reel.lowQualityUrl.isNullOrBlank() && currentSource == reel.lowQualityUrl
            val shouldLow = when {
                !isLow && lowSamples >= 2 -> true
                isLow && highSamples >= 4 -> false
                else -> isLow
            }
            val target = if (shouldLow) lowUrl else highUrl
            if (target != null && target != currentSource) {
                switchSource(target)
                lowSamples = 0
                highSamples = 0
            }
            kotlinx.coroutines.delay(1000)
        }
    }
    LaunchedEffect(active, paused) { if (active && !paused) player.play() else player.pause() }

    Box(
        Modifier.fillMaxSize().background(Color.Black).clickable { paused = !paused }
    ) {
        AndroidView(
            factory = { ctx -> PlayerView(ctx).apply { useController = false; this.player = player } },
            update = { it.player = player },
            modifier = Modifier.fillMaxSize()
        )
        if (paused) {
            Surface(Modifier.align(Alignment.Center).size(62.dp), shape = CircleShape, color = Color.Black.copy(alpha = .42f)) {
                Box(contentAlignment = Alignment.Center) { Icon(Icons.Rounded.PlayArrow, "تشغيل", tint = Color.White, modifier = Modifier.size(36.dp)) }
            }
        }

        if (mediaError) {
            Surface(
                Modifier.align(Alignment.Center),
                shape = RoundedCornerShape(16.dp),
                color = Color.Black.copy(alpha = .72f)
            ) {
                Column(Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("تعذر تشغيل الفيديو", color = Color.White, fontWeight = FontWeight.Bold)
                    TextButton(onClick = { retryPlayback() }) { Text("إعادة المحاولة", color = Color.White) }
                }
            }
        }

        Column(
            Modifier.align(Alignment.CenterEnd).padding(end = 10.dp, bottom = 92.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(13.dp)
        ) {
            ReelSideButton(if (reel.liked) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder, reel.likeCount.toString(), onLike)
            ReelSideButton(Icons.Rounded.ChatBubbleOutline, reel.commentCount.toString(), onComments)
            ReelSideButton(Icons.Rounded.Send, "مشاركة", onShare)
            ReelSideButton(if (reel.saved) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder, "حفظ", onSave)
            if (cfg.bool("reels.download_enabled", true)) ReelSideButton(Icons.Rounded.Download, "تحميل", onDownload)
        }

        Column(
            Modifier.align(Alignment.BottomStart).fillMaxWidth().padding(start = 14.dp, end = 76.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(7.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.clickable(onClick = onProfile)) {
                    StudentAvatar(reel.authorName, reel.authorAvatarUrl, reel.authorFrameUrl, 38.dp)
                }
                Spacer(Modifier.width(8.dp))
                Column(Modifier.clickable(onClick = onProfile)) {
                    StudentName(reel.authorName, reel.authorVerified, reel.authorVerificationColor)
                    Text("@${reel.authorUsername}", color = Color.White.copy(alpha = .82f), fontSize = 10.sp)
                }
                if (!reel.following) {
                    Spacer(Modifier.width(10.dp))
                    OutlinedButton(
                        onClick = onFollow,
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 2.dp)
                    ) { Text("متابعة", fontSize = 11.sp) }
                }
            }
            if (reel.caption.isNotBlank()) Text(reel.caption, color = Color.White, fontSize = 13.sp, maxLines = 3)
            if (measuredKbps in 1..1800 || usingFallback) {
                Text("توفير البيانات", color = Color.White.copy(alpha = .62f), fontSize = 9.sp)
            }
        }
    }
}

@Composable
private fun ReelSideButton(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        FilledIconButton(onClick = onClick, colors = IconButtonDefaults.filledIconButtonColors(containerColor = Color.Black.copy(alpha = .28f))) {
            Icon(icon, label, tint = Color.White)
        }
        Text(label, color = Color.White, fontSize = 9.sp)
    }
}

@Composable
private fun ReelCommentsSheet(
    api: SupabaseApi,
    session: StudentSession,
    reel: ReelItem,
    onDismiss: () -> Unit,
    onChanged: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var comments by remember(reel.id) { mutableStateOf<List<ReelCommentItem>>(emptyList()) }
    var input by remember { mutableStateOf("") }
    var replyTo by remember { mutableStateOf<ReelCommentItem?>(null) }
    var edit by remember { mutableStateOf<ReelCommentItem?>(null) }
    var deleteConfirm by remember { mutableStateOf<ReelCommentItem?>(null) }
    var busy by remember { mutableStateOf(false) }

    fun refresh() {
        scope.launch {
            busy = true
            withContext(Dispatchers.IO) { api.reelComments(session, reel.id) }
                .onSuccess { comments = it }
                .onFailure { onChanged(it.message ?: "تعذر تحميل التعليقات.") }
            busy = false
        }
    }
    LaunchedEffect(reel.id) { refresh() }

    deleteConfirm?.let { target ->
        AlertDialog(
            onDismissRequest = { if (!busy) deleteConfirm = null },
            title = { Text("حذف التعليق؟") },
            text = { Text("سيتم حذف هذا التعليق نهائيًا. هل أنت متأكد؟") },
            confirmButton = {
                Button(
                    enabled = !busy,
                    onClick = {
                        scope.launch {
                            busy = true
                            val result = withContext(Dispatchers.IO) { api.deleteReelComment(session, target.id) }
                            busy = false
                            result.onSuccess {
                                deleteConfirm = null
                                onChanged("تم حذف التعليق.")
                                refresh()
                            }.onFailure { onChanged(it.message ?: "تعذر حذف التعليق.") }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC62828))
                ) { Text("حذف") }
            },
            dismissButton = {
                TextButton(enabled = !busy, onClick = { deleteConfirm = null }) { Text("إلغاء") }
            }
        )
    }

    ModalBottomSheet(onDismissRequest = { if (!busy && deleteConfirm == null) onDismiss() }) {
        Column(Modifier.fillMaxWidth().heightIn(min = 360.dp, max = 680.dp).navigationBarsPadding()) {
            Text("التعليقات", Modifier.padding(horizontal = 18.dp, vertical = 8.dp), fontWeight = FontWeight.Black, fontSize = 19.sp)
            if (busy && comments.isEmpty()) LinearProgressIndicator(Modifier.fillMaxWidth())
            LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)) {
                items(comments, key = { it.id }) { c ->
                    val isReply = !c.parentId.isNullOrBlank()
                    Row(
                        Modifier.fillMaxWidth().padding(start = if (isReply) 28.dp else 0.dp, top = 7.dp, bottom = 7.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        StudentAvatar(c.authorName, c.authorAvatarUrl, c.authorFrameUrl, 34.dp)
                        Spacer(Modifier.width(8.dp))
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                StudentName(c.authorName, c.authorVerified, c.authorVerificationColor)
                                Spacer(Modifier.width(5.dp))
                                Text("@${c.authorUsername}", color = StudentMuted, fontSize = 9.sp)
                            }
                            Text(c.content, fontSize = 13.sp)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                TextButton(onClick = { replyTo = c; edit = null; input = "" }, contentPadding = PaddingValues(horizontal = 4.dp)) { Text("رد", fontSize = 10.sp) }
                                TextButton(onClick = {
                                    val next = if (c.myReaction == "❤️") null else "❤️"
                                    scope.launch {
                                        withContext(Dispatchers.IO) { api.setReelCommentReaction(session, c.id, next) }
                                            .onSuccess { refresh() }.onFailure { onChanged(it.message ?: "تعذر حفظ التفاعل.") }
                                    }
                                }, contentPadding = PaddingValues(horizontal = 4.dp)) {
                                    Text("${c.myReaction ?: "♡"}${if (c.reactionCount > 0) " ${c.reactionCount}" else ""}", fontSize = 10.sp)
                                }
                                if (c.userId == session.userId) {
                                    TextButton(onClick = { edit = c; replyTo = null; input = c.content }, contentPadding = PaddingValues(horizontal = 4.dp)) { Text("تعديل", fontSize = 10.sp) }
                                    TextButton(
                                        onClick = { deleteConfirm = c },
                                        contentPadding = PaddingValues(horizontal = 4.dp)
                                    ) { Text("حذف", fontSize = 10.sp, color = Color(0xFFC62828)) }
                                }
                            }
                        }
                    }
                }
            }
            (replyTo ?: edit)?.let {
                Surface(color = StudentSoft, modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(if (edit != null) "تعديل التعليق" else "رد على ${it.authorName}", Modifier.weight(1f), fontSize = 11.sp, color = StudentMuted)
                        IconButton(onClick = { replyTo = null; edit = null; input = "" }) { Icon(Icons.Rounded.Close, "إلغاء") }
                    }
                }
            }
            Row(Modifier.fillMaxWidth().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(input, { input = it.take(1500) }, placeholder = { Text("اكتب تعليقًا") }, modifier = Modifier.weight(1f), maxLines = 4)
                Spacer(Modifier.width(6.dp))
                FilledIconButton(onClick = {
                    val body = input.trim()
                    if (body.isBlank()) return@FilledIconButton
                    val editing = edit
                    val parent = replyTo?.id
                    scope.launch {
                        busy = true
                        val r = withContext(Dispatchers.IO) {
                            if (editing != null) api.editReelComment(session, editing.id, body)
                            else api.addReelComment(session, reel.id, body, parent)
                        }
                        busy = false
                        r.onSuccess {
                            input = ""; replyTo = null; edit = null
                            onChanged(if (editing != null) "تم تعديل التعليق." else "تم نشر التعليق.")
                            refresh()
                        }.onFailure { onChanged(it.message ?: "تعذر حفظ التعليق.") }
                    }
                }, enabled = input.isNotBlank() && !busy) { Icon(Icons.Rounded.Send, "إرسال") }
            }
        }
    }
}

@Composable
private fun ReelShareSheet(
    api: SupabaseApi,
    session: StudentSession,
    reel: ReelItem,
    onDismiss: () -> Unit,
    onMessage: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var conversations by remember { mutableStateOf<List<ConversationItem>>(emptyList()) }
    var people by remember { mutableStateOf<List<ProfileSearchItem>>(emptyList()) }
    var query by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var searching by remember { mutableStateOf(false) }
    var sending by remember { mutableStateOf(false) }
    var selectedConversation by remember { mutableStateOf<ConversationItem?>(null) }
    var selectedPerson by remember { mutableStateOf<ProfileSearchItem?>(null) }

    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) { api.conversations(session) }
            .onSuccess { conversations = it }
            .onFailure { onMessage(it.message ?: "تعذر تحميل المحادثات.") }
        loading = false
    }

    LaunchedEffect(query) {
        val q = query.trim()
        if (q.isBlank()) {
            people = emptyList()
            searching = false
        } else {
            searching = true
            delay(280)
            withContext(Dispatchers.IO) { api.searchProfiles(session, q) }
                .onSuccess { people = it.filter { user -> user.id != session.userId } }
                .onFailure { people = emptyList() }
            searching = false
        }
    }

    val targetName = selectedConversation?.title ?: selectedPerson?.fullName
    if (targetName != null) {
        AlertDialog(
            onDismissRequest = { if (!sending) { selectedConversation = null; selectedPerson = null } },
            shape = RoundedCornerShape(24.dp),
            title = { Text("تأكيد الإرسال", fontWeight = FontWeight.Black) },
            text = { Text("إرسال هذا الريل إلى $targetName؟") },
            confirmButton = {
                Button(
                    enabled = !sending,
                    onClick = {
                        val conversation = selectedConversation
                        val person = selectedPerson
                        scope.launch {
                            sending = true
                            val result = withContext(Dispatchers.IO) {
                                runCatching {
                                    val conversationId = conversation?.id
                                        ?: api.startDirectChat(session, person?.id ?: error("المستخدم غير صالح")).getOrThrow()
                                    api.sendReelMessage(session, conversationId, reel).getOrThrow()
                                }
                            }
                            sending = false
                            result.onSuccess {
                                onMessage("تم إرسال الريل.")
                                selectedConversation = null
                                selectedPerson = null
                                onDismiss()
                            }.onFailure {
                                onMessage(it.message ?: "تعذر إرسال الريل.")
                            }
                        }
                    }
                ) {
                    if (sending) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                    else Text("إرسال")
                }
            },
            dismissButton = {
                TextButton(enabled = !sending, onClick = { selectedConversation = null; selectedPerson = null }) {
                    Text("إلغاء")
                }
            }
        )
    }

    ModalBottomSheet(onDismissRequest = { if (!sending) onDismiss() }) {
        Column(
            Modifier.fillMaxWidth().heightIn(max = 700.dp).navigationBarsPadding().padding(bottom = 8.dp)
        ) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(Modifier.weight(1f)) {
                    Text("مشاركة الريل", fontWeight = FontWeight.Black, fontSize = 20.sp)
                    Text("اختر محادثة أو ابحث عن أي مستخدم", color = StudentMuted, fontSize = 12.sp)
                }
                IconButton(onClick = onDismiss, enabled = !sending) { Icon(Icons.Rounded.Close, "إغلاق") }
            }

            OutlinedTextField(
                value = query,
                onValueChange = { query = it.take(80) },
                leadingIcon = { Icon(Icons.Rounded.Search, null) },
                placeholder = { Text("ابحث بالاسم أو اسم المستخدم") },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp),
                singleLine = true,
                shape = RoundedCornerShape(18.dp)
            )

            if (loading || searching) LinearProgressIndicator(Modifier.fillMaxWidth())

            val filteredConversations = conversations.filter {
                query.isBlank() || it.title.contains(query, true)
            }

            LazyColumn(
                Modifier.weight(1f),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                if (filteredConversations.isNotEmpty()) {
                    item { Text("المحادثات", fontWeight = FontWeight.Bold, color = StudentMuted, modifier = Modifier.padding(6.dp)) }
                    items(filteredConversations, key = { "conv-${it.id}" }) { c ->
                        Surface(
                            modifier = Modifier.fillMaxWidth().clickable(enabled = !sending) { selectedConversation = c },
                            shape = RoundedCornerShape(18.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .45f)
                        ) {
                            Row(Modifier.fillMaxWidth().padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                StudentAvatar(c.title, c.avatarUrl, c.profileFrameUrl, 44.dp)
                                Spacer(Modifier.width(9.dp))
                                Column(Modifier.weight(1f)) {
                                    StudentName(c.title, c.isVerified, c.verificationColor)
                                    if (c.lastMessage.isNotBlank()) Text(c.lastMessage, maxLines = 1, color = StudentMuted, fontSize = 11.sp)
                                }
                                Icon(Icons.Rounded.Send, "اختيار", tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }

                if (query.isNotBlank() && people.isNotEmpty()) {
                    item { Text("المستخدمون", fontWeight = FontWeight.Bold, color = StudentMuted, modifier = Modifier.padding(6.dp)) }
                    items(people, key = { "user-${it.id}" }) { user ->
                        Surface(
                            modifier = Modifier.fillMaxWidth().clickable(enabled = !sending) { selectedPerson = user },
                            shape = RoundedCornerShape(18.dp),
                            color = Color.White,
                            border = androidx.compose.foundation.BorderStroke(1.dp, StudentBorder.copy(alpha = .65f))
                        ) {
                            Row(Modifier.fillMaxWidth().padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                StudentAvatar(user.fullName, user.avatarUrl, user.profileFrameUrl, 44.dp)
                                Spacer(Modifier.width(9.dp))
                                Column(Modifier.weight(1f)) {
                                    StudentName(user.fullName, user.isVerified, user.verificationColor)
                                    Text("@${user.username}", color = StudentMuted, fontSize = 11.sp)
                                }
                                Icon(Icons.Rounded.PersonAdd, "اختيار", tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }

                if (!loading && !searching && filteredConversations.isEmpty() && (query.isBlank() || people.isEmpty())) {
                    item {
                        Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            Text(if (query.isBlank()) "لا توجد محادثات بعد." else "لا توجد نتائج.", color = StudentMuted)
                        }
                    }
                }
            }
        }
    }
}


@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
private suspend fun createLowQualityReelCopy(context: Context, input: Uri): Result<File> = runCatching {
    suspendCancellableCoroutine<File?> { cont ->
        val output = File(context.cacheDir, "student_reel_360_${System.currentTimeMillis()}.mp4")
        if (output.exists()) output.delete()
        val completed = AtomicBoolean(false)

        fun finish(value: File?) {
            if (completed.compareAndSet(false, true)) {
                cont.resume(value)
            }
        }

        val edited = EditedMediaItem.Builder(MediaItem.fromUri(input))
            .setEffects(
                Effects(
                    emptyList(),
                    // Produce a genuinely smaller rendition for constrained connections.
                    listOf(Presentation.createForHeight(360))
                )
            )
            .build()

        val transformer = Transformer.Builder(context)
            .setVideoMimeType(MimeTypes.VIDEO_H264)
            .addListener(object : Transformer.Listener {
                override fun onCompleted(composition: Composition, exportResult: ExportResult) {
                    finish(output.takeIf { it.exists() && it.length() > 0L })
                }

                override fun onError(
                    composition: Composition,
                    exportResult: ExportResult,
                    exportException: ExportException
                ) {
                    output.delete()
                    finish(null)
                }
            })
            .build()

        cont.invokeOnCancellation {
            Handler(transformer.applicationLooper).post {
                runCatching { transformer.cancel() }
                output.delete()
            }
        }

        runCatching { transformer.start(edited, output.absolutePath) }
            .onFailure {
                output.delete()
                finish(null)
            }
    } ?: error("low_quality_export_failed")
}

private fun downloadReel(context: Context, url: String, reelId: String) {
    val request = DownloadManager.Request(Uri.parse(url))
        .setTitle("Student Reel")
        .setDescription("جارٍ تحميل الفيديو")
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "Student-Reel-$reelId.mp4")
        .setAllowedOverMetered(true)
        .setAllowedOverRoaming(false)
    (context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
}
