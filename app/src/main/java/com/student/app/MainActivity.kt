package com.student.app

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import com.google.firebase.messaging.FirebaseMessaging
import com.student.core.data.*
import com.student.feature.auth.AuthScreen
import com.student.feature.auth.ResetPasswordScreen
import com.student.feature.home.HomeScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    private val api = SupabaseApi()
    private var pendingDestination by mutableStateOf<String?>(null)
    private var pendingRecoveryToken by mutableStateOf<String?>(null)
    private var pendingOAuthTokens by mutableStateOf<Pair<String, String>?>(null)
    private lateinit var store: SessionStore
    private lateinit var offline: OfflineStore

    private val notificationPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    private fun destinationFromIntent(intent: Intent?): String? {
        if (intent == null) return null
        if (intent.getStringExtra("student_destination") in setOf("update_ready", "update_downloading")) return null
        val data = intent.data
        if (data?.scheme == "student") {
            val id = data.pathSegments.firstOrNull().orEmpty()
            when (data.host.orEmpty().lowercase()) {
                "post" -> if (id.isNotBlank()) return "post/$id"
                "reel" -> if (id.isNotBlank()) return "reel/$id"
                "profile" -> if (id.isNotBlank()) return "profile/$id"
                "room" -> if (id.isNotBlank()) return "room/$id"
            }
        }
        return intent.getStringExtra("student_destination")?.takeIf { it.isNotBlank() }
            ?: intent.getStringExtra("link")?.takeIf { it.isNotBlank() }
            ?: intent.getStringExtra("student_link")?.takeIf { it.isNotBlank() }
            ?: intent.getStringExtra("kind")?.takeIf { it.isNotBlank() }
            ?: intent.getStringExtra("student_kind")?.takeIf { it.isNotBlank() }
            ?: intent.getStringExtra("notification_id")?.takeIf { it.isNotBlank() }?.let { "notifications/$it" }
    }

    private fun recoveryTokenFromIntent(intent: Intent?): String? {
        val data = intent?.data ?: return null
        if (data.scheme != "student" || data.host != "reset-password") return null

        fun fromUri(uri: Uri): String? = uri.getQueryParameter("access_token")?.takeIf { it.isNotBlank() }

        fromUri(data)?.let { return it }
        val fragment = data.fragment.orEmpty()
        if (fragment.isNotBlank()) {
            val fragmentUri = Uri.parse("student://recovery?$fragment")
            val type = fragmentUri.getQueryParameter("type")
            if (type == null || type == "recovery") {
                fromUri(fragmentUri)?.let { return it }
            }
        }
        return null
    }

    private fun captureRecoveryIntent(intent: Intent?) {
        recoveryTokenFromIntent(intent)?.let { pendingRecoveryToken = it }
    }

    private fun oauthTokensFromIntent(intent: Intent?): Pair<String, String>? {
        val data = intent?.data ?: return null
        if (data.scheme != "student" || data.host != "oauth-callback") return null
        fun read(uri: Uri): Pair<String, String>? {
            val access = uri.getQueryParameter("access_token").orEmpty()
            val refresh = uri.getQueryParameter("refresh_token").orEmpty()
            return access.takeIf { it.isNotBlank() }?.let { a ->
                refresh.takeIf { it.isNotBlank() }?.let { a to it }
            }
        }
        read(data)?.let { return it }
        val fragment = data.fragment.orEmpty()
        return if (fragment.isBlank()) null else read(Uri.parse("student://oauth?$fragment"))
    }

    private fun captureOAuthIntent(intent: Intent?) {
        oauthTokensFromIntent(intent)?.let { pendingOAuthTokens = it }
    }

    /** The ready notification opens the verified, already downloaded APK installer. */
    private fun installReadyUpdateFromIntent(incoming: Intent?) {
        if (incoming?.getStringExtra("student_destination") != "update_ready") return
        lifecycleScope.launch {
            kotlinx.coroutines.delay(350)
            val ready = StudentUpdateManager.infoFromPrefs(this@MainActivity) ?: return@launch
            if (StudentUpdateManager.status(this@MainActivity, ready) == UpdateDownloadStatus.READY) {
                StudentUpdateManager.install(this@MainActivity, ready)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = SessionStore(this)
        offline = OfflineStore(this)
        pendingDestination = destinationFromIntent(intent)
        captureRecoveryIntent(intent)
        captureOAuthIntent(intent)
        installReadyUpdateFromIntent(intent)
        FirebaseMessaging.getInstance().isAutoInitEnabled = true
        if (Build.VERSION.SDK_INT >= 33) notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        setContent {
            StudentTheme {
                Surface(Modifier.fillMaxSize()) { StudentRoot() }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingDestination = destinationFromIntent(intent)
        captureRecoveryIntent(intent)
        captureOAuthIntent(intent)
        installReadyUpdateFromIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        val current = if (::store.isInitialized) store.load() else null
        if (current != null) {
            registerPush(current)
            lifecycleScope.launch(Dispatchers.IO) { api.markActive(current) }
        }
    }

    @Composable
    private fun StudentRoot() {
        val scope = rememberCoroutineScope()
        var session by remember { mutableStateOf<StudentSession?>(store.load()) }
        var profile by remember { mutableStateOf(offline.loadProfile()) }
        var busy by remember { mutableStateOf(false) }
        var message by remember { mutableStateOf<String?>(null) }
        var offlineMode by remember { mutableStateOf(false) }
        var updateChecked by remember { mutableStateOf(false) }
        var forcedUpdate by remember { mutableStateOf<ForcedUpdateInfo?>(null) }
        var downloadedUpdate by remember { mutableStateOf<ForcedUpdateInfo?>(null) }

        LaunchedEffect(Unit) {
            val prefs = getSharedPreferences("student_update_gate", MODE_PRIVATE)
            val runtime = withContext(Dispatchers.IO) { api.runtimeUpdateConfig() }.getOrNull()
            val remote = if (runtime == null) withContext(Dispatchers.IO) { api.nativeRemoteConfig() }.getOrNull() else null
            val force: Boolean
            val minimum: Int
            val latest: Int
            val url: String
            val updateMessage: String
            if (runtime != null) {
                force = runtime.forceUpdate
                minimum = runtime.minimumVersionCode
                latest = runtime.latestVersionCode
                url = runtime.apkUrl
                updateMessage = runtime.message.ifBlank { "يتوفر تحديث ضروري لمتابعة استخدام Student." }
                prefs.edit()
                    .putBoolean("force", force)
                    .putInt("minimum", minimum)
                    .putInt("latest", latest)
                    .putString("url", url)
                    .putString("message", updateMessage)
                    .apply()
            } else if (remote != null) {
                force = remote.bool("update.force_update", false)
                minimum = remote.int("update.minimum_version_code", 0, 0, 1000000)
                latest = remote.int("update.latest_version_code", minimum, 0, 1000000)
                url = remote.string("update.apk_url", "")
                updateMessage = remote.string("update.message", "يتوفر تحديث ضروري لمتابعة استخدام Student.")
                prefs.edit()
                    .putBoolean("force", force)
                    .putInt("minimum", minimum)
                    .putInt("latest", latest)
                    .putString("url", url)
                    .putString("message", updateMessage)
                    .apply()
            } else {
                force = prefs.getBoolean("force", false)
                minimum = prefs.getInt("minimum", 0)
                latest = prefs.getInt("latest", minimum)
                url = prefs.getString("url", "").orEmpty()
                updateMessage = prefs.getString("message", "يتوفر تحديث ضروري لمتابعة استخدام Student.").orEmpty()
            }
            val currentVersionCode = runCatching {
                val packageInfo = packageManager.getPackageInfo(packageName, 0)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    packageInfo.longVersionCode.toInt()
                } else {
                    @Suppress("DEPRECATION")
                    packageInfo.versionCode
                }
            }.getOrDefault(0)
            if (latest > currentVersionCode && url.isNotBlank()) {
                val info = ForcedUpdateInfo(minimum, latest, url, updateMessage)
                val downloadId = StudentUpdateManager.ensureDownload(this@MainActivity, info)
                var state = StudentUpdateManager.status(this@MainActivity, info)
                when (state) {
                    UpdateDownloadStatus.READY -> {
                        StudentUpdateManager.notifyReadyOnce(this@MainActivity, info)
                        if (force && currentVersionCode < minimum) downloadedUpdate = info
                    }
                    UpdateDownloadStatus.FAILED -> if (force && currentVersionCode < minimum) forcedUpdate = info
                    else -> Unit
                }
                // The app remains usable while the APK downloads quietly. As soon as the
                // download completes, installation becomes the only available path.
                if (downloadId != null && state == UpdateDownloadStatus.DOWNLOADING) {
                    scope.launch {
                        while (true) {
                            kotlinx.coroutines.delay(1200)
                            state = StudentUpdateManager.status(this@MainActivity, info)
                            when (state) {
                                UpdateDownloadStatus.READY -> {
                                    StudentUpdateManager.notifyReadyOnce(this@MainActivity, info)
                                    if (force && currentVersionCode < minimum) downloadedUpdate = info
                                    break
                                }
                                UpdateDownloadStatus.FAILED -> {
                                    if (force && currentVersionCode < minimum) forcedUpdate = info
                                    break
                                }
                                else -> Unit
                            }
                        }
                    }
                }
            } else if (force && currentVersionCode < minimum) {
                // Safety fallback for a bad/missing download URL.
                forcedUpdate = ForcedUpdateInfo(minimum, latest, url, updateMessage)
            }
            updateChecked = true
        }

        if (!updateChecked) {
            Surface(Modifier.fillMaxSize()) {
                androidx.compose.foundation.layout.Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                    androidx.compose.material3.CircularProgressIndicator()
                }
            }
            return
        }
        downloadedUpdate?.let {
            DownloadedUpdateScreen(it)
            return
        }
        forcedUpdate?.let {
            ForcedUpdateScreen(it)
            return
        }

        LaunchedEffect(pendingOAuthTokens) {
            val tokens = pendingOAuthTokens ?: return@LaunchedEffect
            pendingOAuthTokens = null
            busy = true
            message = null
            withContext(Dispatchers.IO) { api.sessionFromOAuthTokens(tokens.first, tokens.second) }
                .onSuccess {
                    store.save(it)
                    session = it
                    message = "تم تسجيل الدخول بحساب Google."
                }
                .onFailure { message = it.message ?: "تعذر إكمال تسجيل الدخول بحساب Google." }
            busy = false
        }

        LaunchedEffect(message) { if (message != null && !offlineMode) { kotlinx.coroutines.delay(3000); message = null } }

        fun loadProfile(current: StudentSession) {
            scope.launch {
                busy = true
                val pair = withContext(Dispatchers.IO) {
                    var active = current
                    var result = api.profile(active)
                    if (result.isFailure && active.refreshToken.isNotBlank()) {
                        api.refresh(active.refreshToken).getOrNull()?.let { fresh ->
                            active = fresh
                            store.save(fresh)
                            result = api.profile(fresh)
                        }
                    }
                    active to result
                }
                session = pair.first
                val freshProfile = pair.second.getOrNull()
                if (freshProfile != null) {
                    profile = freshProfile
                    offline.saveProfile(freshProfile)
                    offlineMode = false
                    val flushed = withContext(Dispatchers.IO) { offline.flushPending(api, pair.first) }
                    message = if (flushed > 0) "تمت مزامنة $flushed عملية محفوظة من وضع Offline." else null
                } else {
                    val cached = offline.loadProfile()
                    if (cached != null) {
                        profile = cached
                        offlineMode = true
                        message = "وضع Offline: نعرض آخر بيانات محفوظة."
                    } else {
                        message = pair.second.exceptionOrNull()?.message ?: "تعذر تحميل الحساب."
                    }
                }
                busy = false
                registerPush(session ?: current)
            }
        }

        LaunchedEffect(session?.accessToken) {
            session?.let { loadProfile(it) }
        }
        DisposableEffect(session?.accessToken) {
            val current = session
            val observer = if (current != null) api.observeOwnProfile(current) {
                scope.launch {
                    withContext(Dispatchers.IO) { api.profile(current) }.onSuccess { fresh ->
                        profile = fresh
                        offline.saveProfile(fresh)
                    }
                }
            } else null
            onDispose { observer?.close() }
        }

        val recoveryToken = pendingRecoveryToken
        if (recoveryToken != null) {
            ResetPasswordScreen(
                busy = busy,
                message = message,
                onSave = { newPassword ->
                    scope.launch {
                        busy = true
                        message = null
                        val result = withContext(Dispatchers.IO) {
                            api.updateRecoveredPassword(recoveryToken, newPassword)
                        }
                        result.onSuccess {
                            store.clear()
                            offline.clear()
                            session = null
                            profile = null
                            pendingRecoveryToken = null
                            offlineMode = false
                            message = "تم تغيير كلمة المرور. سجّل الدخول بكلمة المرور الجديدة."
                        }.onFailure {
                            message = it.message ?: "تعذر تغيير كلمة المرور. اطلب رابط استعادة جديدًا."
                        }
                        busy = false
                    }
                },
                onCancel = {
                    if (!busy) {
                        pendingRecoveryToken = null
                        message = null
                    }
                }
            )
        } else if (session == null) {
            AuthScreen(
                busy = busy,
                message = message,
                onLogin = { email, password ->
                    scope.launch {
                        busy = true
                        message = null
                        val result = withContext(Dispatchers.IO) { api.login(email, password) }
                        result.onSuccess {
                            store.save(it)
                            session = it
                        }.onFailure { message = it.message ?: "تعذر تسجيل الدخول." }
                        busy = false
                    }
                },
                onRegister = { name, email, password, requestedRole ->
                    scope.launch {
                        busy = true
                        message = null
                        val result = withContext(Dispatchers.IO) { api.register(name, email, password, requestedRole) }
                        result.onSuccess { created ->
                            if (created == null) message = "تم إنشاء الحساب. أكّد البريد ثم سجّل الدخول."
                            else {
                                store.save(created)
                                session = created
                            }
                        }.onFailure { message = it.message ?: "تعذر إنشاء الحساب." }
                        busy = false
                    }
                },
                onForgotPassword = { email ->
                    scope.launch {
                        busy = true
                        message = null
                        val result = withContext(Dispatchers.IO) { api.sendPasswordRecovery(email) }
                        result.onSuccess {
                            message = "تم إرسال رابط استعادة كلمة المرور إلى بريدك."
                        }.onFailure { message = it.message ?: "تعذر إرسال رسالة الاستعادة." }
                        busy = false
                    }
                }
            )
        } else {
            HomeScreen(
                api = api,
                session = session!!,
                profile = profile,
                loadingProfile = busy,
                offlineMode = offlineMode,
                rootMessage = message,
                initialDestination = pendingDestination,
                onInitialDestinationConsumed = { pendingDestination = null },
                onProfileChanged = { fresh ->
                    profile = fresh
                    offline.saveProfile(fresh)
                },
                onRefreshProfile = { session?.let { loadProfile(it) } },
                onLogout = {
                    store.clear()
                    offline.clear()
                    profile = null
                    session = null
                    message = null
                    offlineMode = false
                },
                onExitApp = { finishAndRemoveTask() }
            )
        }
    }

    private fun registerPush(session: StudentSession) {
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            getSharedPreferences("student_push", MODE_PRIVATE).edit().putString("fcm_token", token).apply()
            Thread { api.registerPushToken(session, token) }.start()
        }
    }
}
