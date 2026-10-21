package com.student.core.data

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MediaType
import okhttp3.OkHttpClient
import okhttp3.RequestBody
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.RequestBody.Companion.asRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.Closeable
import java.io.File
import java.io.RandomAccessFile
import android.util.Base64
import okio.BufferedSink
import java.util.concurrent.TimeUnit

class SupabaseApi {
    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS)
        .writeTimeout(120, TimeUnit.SECONDS)
        .callTimeout(180, TimeUnit.SECONDS)
        .pingInterval(20, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    fun nativeRemoteConfig(): Result<NativeRemoteConfig> = runCatching {
        var lastError: Throwable? = null

        // Supabase is the authoritative runtime-config source. This allows UI,
        // labels, colors, ordering and behavior knobs to change without shipping
        // a new APK. Public web config remains only as an emergency fallback.
        try {
            val request = Request.Builder()
                .url("${StudentConfig.SUPABASE_URL}/rest/v1/student_native_runtime_config?id=eq.1&select=config&limit=1")
                .header("apikey", StudentConfig.SUPABASE_KEY)
                .header("Authorization", "Bearer ${StudentConfig.SUPABASE_KEY}")
                .header("Cache-Control", "no-cache")
                .header("Pragma", "no-cache")
                .get()
                .build()
            client.newCall(request).execute().use { response ->
                val raw = response.body?.string().orEmpty()
                if (response.isSuccessful && raw.isNotBlank()) {
                    val rows = JSONArray(raw)
                    if (rows.length() > 0) {
                        val config = rows.optJSONObject(0)?.optJSONObject("config")
                        if (config != null) {
                            val wrapped = JSONObject().put("native_ui", config)
                            return@runCatching NativeRemoteConfig.fromAppConfig(wrapped.toString())
                        }
                    }
                }
                lastError = IllegalStateException("تعذر تحميل إعدادات Student من Supabase (${response.code}).")
            }
        } catch (t: Throwable) {
            lastError = t
        }

        val urls = listOf(StudentConfig.NATIVE_REMOTE_CONFIG_URL, StudentConfig.NATIVE_REMOTE_CONFIG_FALLBACK_URL)
        for (url in urls) {
            try {
                val request = Request.Builder()
                    .url(url)
                    .header("Cache-Control", "no-cache")
                    .header("Pragma", "no-cache")
                    .get()
                    .build()
                client.newCall(request).execute().use { response ->
                    val raw = response.body?.string().orEmpty()
                    if (response.isSuccessful && raw.isNotBlank()) return@runCatching NativeRemoteConfig.fromAppConfig(raw)
                    lastError = IllegalStateException("تعذر تحميل إعدادات Student الاحتياطية (${response.code}).")
                }
            } catch (t: Throwable) {
                lastError = t
            }
        }
        throw (lastError ?: IllegalStateException("تعذر تحميل إعدادات Student."))
    }


    fun runtimeUpdateConfig(): Result<RuntimeUpdateConfig> = runCatching {
        val request = Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/rest/v1/student_runtime_settings?id=eq.1&select=force_update,minimum_version_code,latest_version_code,apk_url,update_message&limit=1")
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .header("Authorization", "Bearer ${StudentConfig.SUPABASE_KEY}")
            .get()
            .build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IllegalStateException(errorMessage(raw, response.code))
            val a = if (raw.isBlank()) JSONArray() else JSONArray(raw)
            if (a.length() == 0) return@runCatching RuntimeUpdateConfig()
            val o = a.getJSONObject(0)
            RuntimeUpdateConfig(
                forceUpdate = o.optBoolean("force_update", false),
                minimumVersionCode = o.optInt("minimum_version_code", 0),
                latestVersionCode = o.optInt("latest_version_code", 0),
                apkUrl = o.optString("apk_url", ""),
                message = o.optString("update_message", "")
            )
        }
    }

    fun markActive(session: StudentSession): Result<Unit> = runCatching {
        rpcRaw(session, "student_mark_active_v20", JSONObject())
        Unit
    }

    fun adminSetRuntimeUpdate(
        session: StudentSession,
        forceUpdate: Boolean,
        minimumVersionCode: Int,
        latestVersionCode: Int,
        apkUrl: String,
        message: String
    ): Result<Unit> = runCatching {
        rpcRaw(
            session,
            "student_admin_set_runtime_update_v19",
            JSONObject()
                .put("p_force_update", forceUpdate)
                .put("p_minimum_version_code", minimumVersionCode)
                .put("p_latest_version_code", latestVersionCode)
                .put("p_apk_url", apkUrl.trim())
                .put("p_update_message", message.trim())
        )
        Unit
    }

    fun sendPasswordRecovery(emailAddress: String): Result<Unit> = runCatching {
        val email = emailAddress.trim()
        require(email.contains("@") && email.contains(".")) { "البريد الإلكتروني غير صالح." }
        val body = JSONObject().put("email", email).toString()
        val redirect = java.net.URLEncoder.encode(StudentConfig.PASSWORD_RECOVERY_REDIRECT, "UTF-8")
        val request = Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/auth/v1/recover?redirect_to=$redirect")
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .post(body.toRequestBody(jsonType))
            .build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IllegalStateException(errorMessage(raw, response.code))
        }
        Unit
    }

    fun updateRecoveredPassword(accessToken: String, newPassword: String): Result<Unit> = runCatching {
        require(accessToken.isNotBlank()) { "رابط الاستعادة غير صالح أو منتهي الصلاحية." }
        require(newPassword.length >= 8) { "كلمة المرور يجب أن تكون 8 أحرف على الأقل." }
        val body = JSONObject().put("password", newPassword).toString()
        val request = Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/auth/v1/user")
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .header("Authorization", "Bearer $accessToken")
            .put(body.toRequestBody(jsonType))
            .build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IllegalStateException(errorMessage(raw, response.code))
        }
        Unit
    }

    fun login(email: String, password: String): Result<StudentSession> = runCatching {
        val body = JSONObject().put("email", email).put("password", password).toString()
        val request = Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/auth/v1/token?grant_type=password")
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .post(body.toRequestBody(jsonType))
            .build()
        executeAuth(request)
    }

    fun googleOAuthUrl(): String {
        val redirect = java.net.URLEncoder.encode(StudentConfig.GOOGLE_AUTH_REDIRECT, "UTF-8")
        return "${StudentConfig.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=$redirect"
    }

    fun sessionFromOAuthTokens(accessToken: String, refreshToken: String): Result<StudentSession> = runCatching {
        require(accessToken.isNotBlank() && refreshToken.isNotBlank()) { "جلسة Google غير مكتملة." }
        val request = Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/auth/v1/user")
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .header("Authorization", "Bearer $accessToken")
            .get()
            .build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IllegalStateException(errorMessage(raw, response.code))
            val user = JSONObject(raw)
            StudentSession(
                accessToken = accessToken,
                refreshToken = refreshToken,
                userId = user.getString("id"),
                email = user.optString("email", "")
            )
        }
    }

    fun register(fullName: String, email: String, password: String, requestedRole: String = "student"): Result<StudentSession?> = runCatching {
        val body = JSONObject()
            .put("email", email)
            .put("password", password)
            .put("data", JSONObject().put("full_name", fullName).put("requested_role", requestedRole))
            .toString()
        val request = Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/auth/v1/signup")
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .post(body.toRequestBody(jsonType))
            .build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IllegalStateException(errorMessage(raw, response.code))
            val root = JSONObject(raw)
            if (!root.has("access_token")) null else sessionFrom(root).also { created ->
                runCatching {
                    requestJson(created, "profiles?id=eq.${created.userId}", "PATCH", JSONObject().put("requested_role", requestedRole), "return=minimal")
                }
            }
        }
    }

    fun refresh(refreshToken: String): Result<StudentSession> = runCatching {
        val body = JSONObject().put("refresh_token", refreshToken).toString()
        val request = Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token")
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .post(body.toRequestBody(jsonType))
            .build()
        executeAuth(request)
    }

    fun profile(session: StudentSession): Result<StudentProfile> = runCatching {
        val arr = getArray(session, "profiles?id=eq.${session.userId}&select=*&limit=1")
        if (arr.length() == 0) throw IllegalStateException("تعذر العثور على ملف الحساب.")
        parseProfile(arr.getJSONObject(0), session.email)
    }

    fun profileById(session: StudentSession, userId: String): Result<StudentProfile> = runCatching {
        val arr = getArray(session, "profiles?id=eq.$userId&select=*&limit=1")
        if (arr.length() == 0) throw IllegalStateException("تعذر العثور على ملف الحساب.")
        parseProfile(arr.getJSONObject(0), "")
    }

    fun updateProfile(
        session: StudentSession,
        fullName: String,
        username: String,
        bio: String,
        accountStatus: String,
        governorate: String = "",
        schoolName: String = "",
        universityName: String = ""
    ): Result<Unit> = runCatching {
        val body = JSONObject()
            .put("full_name", fullName)
            .put("username", username)
            .put("bio", bio)
            .put("account_status", accountStatus)
            .put("governorate", governorate.trim().ifBlank { JSONObject.NULL })
            .put("school_name", schoolName.trim().ifBlank { JSONObject.NULL })
            .put("university_name", universityName.trim().ifBlank { JSONObject.NULL })
        requestJson(session, "profiles?id=eq.${session.userId}", "PATCH", body, "return=minimal")
        Unit
    }

    fun updateAvatar(session: StudentSession, avatarUrl: String): Result<Unit> = runCatching {
        val body = JSONObject().put("avatar_url", avatarUrl)
        requestJson(session, "profiles?id=eq.${session.userId}", "PATCH", body, "return=minimal")
        Unit
    }

    fun feed(session: StudentSession, limit: Int = 40, offset: Int = 0): Result<List<PostItem>> = runCatching {
        val safeLimit = limit.coerceIn(1, 80)
        val safeOffset = offset.coerceAtLeast(0)
        val arr = runCatching { getArray(session, "posts?select=*&post_type=in.(text,image,video)&deleted_at=is.null&order=created_at.desc&limit=$safeLimit&offset=$safeOffset") }
            .getOrElse { getArray(session, "posts?select=*&post_type=in.(text,image,video)&order=created_at.desc&limit=$safeLimit&offset=$safeOffset") }
        val ids = mutableSetOf<String>()
        for (i in 0 until arr.length()) ids += arr.getJSONObject(i).optString("user_id")
        val profiles = profileMap(session, ids.filter { it.isNotBlank() })
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val uid = o.optString("user_id")
                val p = profiles[uid]
                add(
                    PostItem(
                        id = o.optString("id"),
                        userId = uid,
                        postType = o.optString("post_type", "text"),
                        content = o.optString("content", ""),
                        mediaUrl = nullable(o, "media_url"),
                        mediaLowUrl = nullableFirst(o, "media_low_url", "video_low_url"),
                        mediaMime = nullable(o, "media_mime"),
                        createdAt = first(o, "created_at"),
                        authorName = p?.fullName ?: "مستخدم",
                        authorUsername = p?.username ?: "student",
                        authorAvatarUrl = p?.avatarUrl,
                        authorFrameUrl = p?.profileFrameUrl,
                        authorVerified = p?.isVerified ?: false,
                        authorVerificationColor = p?.verificationColor
                    )
                )
            }
        }
    }

    fun stories(session: StudentSession, limit: Int = 80): Result<List<StoryItem>> = runCatching {
        val safeLimit = limit.coerceIn(1, 100)
        val arr = getArray(session, "student_stories_v281?select=*&expires_at=gt.now()&moderation_status=eq.approved&order=created_at.asc&limit=$safeLimit")
        val ids = buildSet { for (i in 0 until arr.length()) add(arr.getJSONObject(i).optString("user_id")) }
        val profiles = profileMap(session, ids.filter { it.isNotBlank() })
        val viewed = getArray(session, "student_story_views_v281?select=story_id&user_id=eq.${session.userId}&limit=500")
            .let { a -> buildSet { for (i in 0 until a.length()) add(a.getJSONObject(i).optString("story_id")) } }
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val uid = o.optString("user_id")
                val p = profiles[uid]
                add(StoryItem(o.optString("id"), uid, nullable(o,"media_url"), o.optString("media_type","text"), o.optString("caption",""), o.optString("background_color","#6D28D9"), o.optInt("duration_seconds",5), first(o,"created_at"), first(o,"expires_at"), p?.fullName ?: "مستخدم", p?.avatarUrl, p?.profileFrameUrl, p?.isVerified ?: false, p?.verificationColor, viewed.contains(o.optString("id"))))
            }
        }
    }

    fun createStory(session: StudentSession, mediaUrl: String?, mediaType: String, caption: String, backgroundColor: String = "#6D28D9", durationSeconds: Int = 5): Result<Unit> = runCatching {
        val safeType = mediaType.lowercase().takeIf { it in setOf("text","image","video") } ?: "text"
        requestJson(session, "student_stories_v281", "POST", JSONObject().put("user_id",session.userId).put("media_url",mediaUrl ?: JSONObject.NULL).put("media_type",safeType).put("caption",caption.take(1000)).put("background_color",backgroundColor).put("duration_seconds",durationSeconds.coerceIn(3,15)), "return=minimal")
        Unit
    }

    fun markStoryViewed(session: StudentSession, storyId: String): Result<Unit> = runCatching {
        requestJson(session, "student_story_views_v281", "POST", JSONObject().put("story_id",storyId).put("user_id",session.userId), "resolution=merge-duplicates,return=minimal")
        Unit
    }

    fun deleteStory(session: StudentSession, storyId: String): Result<Unit> = runCatching {
        requestJson(session, "student_stories_v281?id=eq.$storyId&user_id=eq.${session.userId}", "DELETE", null, "return=minimal")
        Unit
    }

    fun createPost(
        session: StudentSession,
        content: String,
        mediaUrl: String? = null,
        mediaType: String = if (mediaUrl.isNullOrBlank()) "text" else "image",
        mediaLowUrl: String? = null,
        mediaMime: String? = null
    ): Result<Unit> = runCatching {
        val safeType = mediaType.lowercase().takeIf { it in setOf("text", "image", "video") } ?: "text"
        val body = JSONObject()
            .put("user_id", session.userId)
            .put("post_type", safeType)
            .put("content", content.take(12000))
            .put("media_url", mediaUrl ?: JSONObject.NULL)
            .put("media_low_url", mediaLowUrl ?: JSONObject.NULL)
            .put("media_mime", mediaMime ?: JSONObject.NULL)
        requestJson(session, "posts", "POST", body, "return=minimal")
        Unit
    }

    fun deletePost(session: StudentSession, postId: String): Result<Unit> = runCatching {
        val stamp = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }.format(java.util.Date())
        runCatching { requestJson(session, "posts?id=eq.$postId&user_id=eq.${session.userId}", "PATCH", JSONObject().put("deleted_at", stamp), "return=minimal") }
            .getOrElse { requestJson(session, "posts?id=eq.$postId&user_id=eq.${session.userId}", "DELETE", null, "return=minimal") }
        Unit
    }

    fun isPostLiked(session: StudentSession, postId: String): Result<Boolean> = runCatching {
        getArray(session, "post_likes?select=user_id&post_id=eq.$postId&user_id=eq.${session.userId}&limit=1").length() > 0
    }

    fun setPostLiked(session: StudentSession, postId: String, liked: Boolean): Result<Unit> = runCatching {
        if (liked) {
            requestJson(session, "post_likes", "POST", JSONObject().put("post_id", postId).put("user_id", session.userId), "return=minimal")
        } else {
            requestJson(session, "post_likes?post_id=eq.$postId&user_id=eq.${session.userId}", "DELETE", null, "return=minimal")
        }
        Unit
    }

    fun comments(session: StudentSession, postId: String): Result<List<CommentItem>> = runCatching {
        val arr = runCatching { getArray(session, "comments?select=*&post_id=eq.$postId&deleted_at=is.null&order=created_at.asc&limit=200") }
            .getOrElse { getArray(session, "comments?select=*&post_id=eq.$postId&order=created_at.asc&limit=200") }
        val ids = mutableSetOf<String>()
        for (i in 0 until arr.length()) ids += arr.getJSONObject(i).optString("user_id")
        val profiles = profileMap(session, ids.filter { it.isNotBlank() })
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val uid = o.optString("user_id")
                add(CommentItem(o.optString("id"), postId, uid, first(o,"content","body","text"), o.optString("created_at"), profiles[uid]?.fullName ?: "مستخدم", nullableFirst(o,"parent_id","reply_to"), nullable(o,"edited_at")))
            }
        }
    }

    fun addComment(session: StudentSession, postId: String, content: String, parentId: String? = null): Result<Unit> = runCatching {
        val body = JSONObject().put("post_id", postId).put("user_id", session.userId).put("content", content)
        if (!parentId.isNullOrBlank()) body.put("parent_id", parentId)
        requestJson(session, "comments", "POST", body, "return=minimal")
        Unit
    }

    fun postLikeCount(session: StudentSession, postId: String): Result<Int> = runCatching {
        getArray(session, "post_likes?select=user_id&post_id=eq.$postId&limit=5000").length()
    }

    fun postLikeUsers(session: StudentSession, postId: String): Result<List<ProfileSearchItem>> = runCatching {
        val likes = getArray(session, "post_likes?select=user_id&post_id=eq.$postId&limit=5000")
        val ids = buildList {
            for (i in 0 until likes.length()) likes.getJSONObject(i).optString("user_id").takeIf { it.isNotBlank() }?.let(::add)
        }.distinct()
        val profiles = profileMap(session, ids)
        ids.mapNotNull { id -> profiles[id]?.let { p ->
            ProfileSearchItem(p.id, p.fullName, p.username, p.role, p.avatarUrl, p.isVerified, p.verificationColor, p.profileFrameUrl)
        } }
    }

    fun isMutualFollow(session: StudentSession, otherUserId: String): Result<Boolean> = runCatching {
        if (otherUserId == session.userId) return@runCatching true
        val mine = getArray(session, "follows?select=following_id&follower_id=eq.${session.userId}&following_id=eq.$otherUserId&limit=1").length() > 0
        if (!mine) return@runCatching false
        getArray(session, "follows?select=following_id&follower_id=eq.$otherUserId&following_id=eq.${session.userId}&limit=1").length() > 0
    }

    fun editComment(session: StudentSession, commentId: String, content: String): Result<Unit> = runCatching {
        val stamp = java.time.Instant.now().toString()
        requestJson(session, "comments?id=eq.$commentId&user_id=eq.${session.userId}", "PATCH", JSONObject().put("content", content.trim()).put("edited_at", stamp), "return=minimal")
        Unit
    }

    fun deleteComment(session: StudentSession, commentId: String): Result<Unit> = runCatching {
        val stamp = java.time.Instant.now().toString()
        requestJson(session, "comments?id=eq.$commentId&user_id=eq.${session.userId}", "PATCH", JSONObject().put("deleted_at", stamp), "return=minimal")
        Unit
    }

    fun commentReactionCount(session: StudentSession, commentId: String): Result<Int> = runCatching {
        getArray(session, "student_comment_reactions?select=user_id&comment_id=eq.$commentId&limit=5000").length()
    }

    fun myCommentReaction(session: StudentSession, commentId: String): Result<String?> = runCatching {
        val a=getArray(session, "student_comment_reactions?select=emoji&comment_id=eq.$commentId&user_id=eq.${session.userId}&limit=1")
        if(a.length()==0) null else a.getJSONObject(0).optString("emoji").takeIf{it.isNotBlank()}
    }

    fun setCommentReaction(session: StudentSession, commentId: String, emoji: String?): Result<Unit> = runCatching {
        requestJson(session, "student_comment_reactions?comment_id=eq.$commentId&user_id=eq.${session.userId}", "DELETE", null, "return=minimal")
        if(!emoji.isNullOrBlank()) requestJson(session, "student_comment_reactions", "POST", JSONObject().put("comment_id",commentId).put("user_id",session.userId).put("emoji",emoji), "return=minimal")
        Unit
    }

    fun userPosts(session: StudentSession, userId: String, limit: Int = 60): Result<List<PostItem>> = runCatching {
        val safeLimit = limit.coerceIn(1, 100)
        val arr = runCatching {
            getArray(session, "posts?select=*&user_id=eq.$userId&post_type=in.(text,image,video)&deleted_at=is.null&order=created_at.desc&limit=$safeLimit")
        }.getOrElse {
            getArray(session, "posts?select=*&user_id=eq.$userId&post_type=in.(text,image,video)&order=created_at.desc&limit=$safeLimit")
        }
        val profile = profileMap(session, listOf(userId))[userId]
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(PostItem(
                    id = o.optString("id"),
                    userId = userId,
                    postType = o.optString("post_type", "text"),
                    content = o.optString("content", ""),
                    mediaUrl = nullable(o, "media_url"),
                    mediaLowUrl = nullableFirst(o, "media_low_url", "video_low_url"),
                    mediaMime = nullable(o, "media_mime"),
                    createdAt = first(o, "created_at"),
                    authorName = profile?.fullName ?: "مستخدم",
                    authorUsername = profile?.username ?: "student",
                    authorAvatarUrl = profile?.avatarUrl,
                    authorFrameUrl = profile?.profileFrameUrl,
                    authorVerified = profile?.isVerified ?: false,
                    authorVerificationColor = profile?.verificationColor
                ))
            }
        }
    }

    fun reportUser(session: StudentSession, userId: String, reason: String): Result<Unit> = runCatching {
        rpcRaw(session, "student_report_user_v16", JSONObject().put("p_user", userId).put("p_reason", reason.trim()))
        Unit
    }


    fun reels(session: StudentSession, limit: Int = 30, offset: Int = 0): Result<List<ReelItem>> = runCatching {
        val safeLimit = limit.coerceIn(1, 60)
        val safeOffset = offset.coerceAtLeast(0)
        val arr = runCatching {
            getArray(session, "reels?select=id,user_id,video_url,hls_url,video_low_url,thumbnail_url,caption,created_at&order=created_at.desc&limit=$safeLimit&offset=$safeOffset")
        }.getOrElse {
            getArray(session, "reels?select=id,user_id,video_url,thumbnail_url,caption,created_at&order=created_at.desc&limit=$safeLimit&offset=$safeOffset")
        }
        val ids = mutableSetOf<String>()
        val reelIds = mutableListOf<String>()
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            o.optString("user_id").takeIf { it.isNotBlank() }?.let(ids::add)
            o.optString("id").takeIf { it.isNotBlank() }?.let(reelIds::add)
        }
        val profiles = profileMap(session, ids.toList())
        val filter = reelIds.joinToString(",")
        val likes = mutableMapOf<String, Int>()
        val comments = mutableMapOf<String, Int>()
        val views = mutableMapOf<String, Int>()
        val likedByMe = mutableSetOf<String>()
        val savedByMe = mutableSetOf<String>()
        if (filter.isNotBlank()) {
            runCatching { getArray(session, "reel_likes?select=reel_id,user_id&reel_id=in.($filter)&limit=5000") }.getOrNull()?.let { rows ->
                for (i in 0 until rows.length()) {
                    val r = rows.getJSONObject(i); val id = r.optString("reel_id")
                    likes[id] = (likes[id] ?: 0) + 1
                    if (r.optString("user_id") == session.userId) likedByMe += id
                }
            }
            runCatching { getArray(session, "reel_comments?select=reel_id&reel_id=in.($filter)&deleted_at=is.null&limit=5000") }
                .recoverCatching { getArray(session, "reel_comments?select=reel_id&reel_id=in.($filter)&limit=5000") }.getOrNull()?.let { rows ->
                    for (i in 0 until rows.length()) {
                        val id = rows.getJSONObject(i).optString("reel_id"); comments[id] = (comments[id] ?: 0) + 1
                    }
                }
            runCatching { getArray(session, "reel_views?select=reel_id&reel_id=in.($filter)&limit=5000") }.getOrNull()?.let { rows ->
                for (i in 0 until rows.length()) {
                    val id = rows.getJSONObject(i).optString("reel_id"); views[id] = (views[id] ?: 0) + 1
                }
            }
            runCatching { getArray(session, "reel_saves?select=reel_id&user_id=eq.${session.userId}&reel_id=in.($filter)&limit=1000") }.getOrNull()?.let { rows ->
                for (i in 0 until rows.length()) savedByMe += rows.getJSONObject(i).optString("reel_id")
            }
        }
        val following = runCatching {
            getArray(session, "follows?select=following_id&follower_id=eq.${session.userId}&limit=5000")
        }.getOrNull()?.let { rows ->
            buildSet { for (i in 0 until rows.length()) add(rows.getJSONObject(i).optString("following_id")) }
        } ?: emptySet()

        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val uid = o.optString("user_id")
                val p = profiles[uid]
                val id = o.optString("id")
                add(
                    ReelItem(
                        id = id,
                        userId = uid,
                        videoUrl = first(o, "video_url"),
                        hlsUrl = nullable(o, "hls_url"),
                        lowQualityUrl = nullable(o, "video_low_url"),
                        thumbnailUrl = nullable(o, "thumbnail_url"),
                        caption = first(o, "caption"),
                        createdAt = first(o, "created_at"),
                        authorName = p?.fullName ?: "مستخدم",
                        authorUsername = p?.username ?: "student",
                        authorAvatarUrl = p?.avatarUrl,
                        authorFrameUrl = p?.profileFrameUrl,
                        authorVerified = p?.isVerified ?: false,
                        authorVerificationColor = p?.verificationColor,
                        likeCount = likes[id] ?: 0,
                        commentCount = comments[id] ?: 0,
                        viewCount = views[id] ?: 0,
                        liked = id in likedByMe,
                        saved = id in savedByMe,
                        following = uid in following
                    )
                )
            }
        }
    }

    fun createReel(
        session: StudentSession,
        videoUrl: String,
        caption: String,
        thumbnailUrl: String? = null,
        lowQualityUrl: String? = null,
        hlsUrl: String? = null
    ): Result<Unit> = runCatching {
        val body = JSONObject()
            .put("user_id", session.userId)
            .put("video_url", videoUrl)
            .put("caption", caption.trim().take(2200))
            .put("thumbnail_url", thumbnailUrl ?: JSONObject.NULL)
        if (!lowQualityUrl.isNullOrBlank()) body.put("video_low_url", lowQualityUrl)
        if (!hlsUrl.isNullOrBlank()) body.put("hls_url", hlsUrl)
        requestJson(session, "reels", "POST", body, "return=minimal")
        Unit
    }

    fun deleteReel(session: StudentSession, reelId: String): Result<Unit> = runCatching {
        requestJson(session, "reels?id=eq.$reelId&user_id=eq.${session.userId}", "DELETE", null, "return=minimal")
        Unit
    }

    fun setReelLiked(session: StudentSession, reelId: String, liked: Boolean): Result<Unit> = runCatching {
        requestJson(session, "reel_likes?reel_id=eq.$reelId&user_id=eq.${session.userId}", "DELETE", null, "return=minimal")
        if (liked) requestJson(session, "reel_likes", "POST", JSONObject().put("reel_id", reelId).put("user_id", session.userId), "return=minimal")
        Unit
    }

    fun setReelSaved(session: StudentSession, reelId: String, saved: Boolean): Result<Unit> = runCatching {
        requestJson(session, "reel_saves?reel_id=eq.$reelId&user_id=eq.${session.userId}", "DELETE", null, "return=minimal")
        if (saved) requestJson(session, "reel_saves", "POST", JSONObject().put("reel_id", reelId).put("user_id", session.userId), "return=minimal")
        Unit
    }

    fun recordReelView(session: StudentSession, reelId: String): Result<Unit> = runCatching {
        runCatching {
            requestJson(session, "reel_views", "POST", JSONObject().put("reel_id", reelId).put("user_id", session.userId), "return=minimal")
        }
        Unit
    }

    fun reelComments(session: StudentSession, reelId: String): Result<List<ReelCommentItem>> = runCatching {
        val arr = runCatching {
            getArray(session, "reel_comments?select=*&reel_id=eq.$reelId&deleted_at=is.null&order=created_at.asc&limit=500")
        }.getOrElse {
            getArray(session, "reel_comments?select=*&reel_id=eq.$reelId&order=created_at.asc&limit=500")
        }
        val ids = mutableSetOf<String>()
        val commentIds = mutableListOf<String>()
        for (i in 0 until arr.length()) {
            val o=arr.getJSONObject(i); ids += o.optString("user_id"); commentIds += o.optString("id")
        }
        val profiles=profileMap(session, ids.filter { it.isNotBlank() })
        val counts=mutableMapOf<String,Int>(); val mine=mutableMapOf<String,String>()
        val filter=commentIds.joinToString(",")
        if(filter.isNotBlank()) runCatching {
            getArray(session,"reel_comment_reactions?select=comment_id,user_id,emoji&comment_id=in.($filter)&limit=5000")
        }.getOrNull()?.let { rows ->
            for(i in 0 until rows.length()){
                val r=rows.getJSONObject(i); val id=r.optString("comment_id")
                counts[id]=(counts[id]?:0)+1
                if(r.optString("user_id")==session.userId) mine[id]=r.optString("emoji")
            }
        }
        buildList {
            for(i in 0 until arr.length()){
                val o=arr.getJSONObject(i); val uid=o.optString("user_id"); val p=profiles[uid]; val id=o.optString("id")
                add(ReelCommentItem(
                    id=id,reelId=reelId,userId=uid,parentId=nullable(o,"parent_id"),
                    content=first(o,"content","body","text"),createdAt=first(o,"created_at"),updatedAt=nullable(o,"updated_at"),
                    authorName=p?.fullName?:"مستخدم",authorUsername=p?.username?:"student",authorAvatarUrl=p?.avatarUrl,
                    authorFrameUrl=p?.profileFrameUrl,authorVerified=p?.isVerified?:false,authorVerificationColor=p?.verificationColor,
                    reactionCount=counts[id]?:0,myReaction=mine[id]
                ))
            }
        }
    }

    fun addReelComment(session: StudentSession, reelId: String, content: String, parentId: String? = null): Result<Unit> = runCatching {
        val body=JSONObject().put("reel_id",reelId).put("user_id",session.userId).put("content",content.trim())
        if(!parentId.isNullOrBlank()) body.put("parent_id",parentId)
        requestJson(session,"reel_comments","POST",body,"return=minimal"); Unit
    }

    fun editReelComment(session: StudentSession, commentId: String, content: String): Result<Unit> = runCatching {
        requestJson(session,"reel_comments?id=eq.$commentId&user_id=eq.${session.userId}","PATCH",
            JSONObject().put("content",content.trim()).put("updated_at",java.time.Instant.now().toString()),"return=minimal"); Unit
    }

    fun deleteReelComment(session: StudentSession, commentId: String): Result<Unit> = runCatching {
        val stamp=java.time.Instant.now().toString()
        runCatching {
            requestJson(session,"reel_comments?id=eq.$commentId&user_id=eq.${session.userId}","PATCH",JSONObject().put("deleted_at",stamp),"return=minimal")
        }.getOrElse {
            requestJson(session,"reel_comments?id=eq.$commentId&user_id=eq.${session.userId}","DELETE",null,"return=minimal")
        }
        Unit
    }

    fun setReelCommentReaction(session: StudentSession, commentId: String, emoji: String?): Result<Unit> = runCatching {
        requestJson(session,"reel_comment_reactions?comment_id=eq.$commentId&user_id=eq.${session.userId}","DELETE",null,"return=minimal")
        if(!emoji.isNullOrBlank()) requestJson(session,"reel_comment_reactions","POST",
            JSONObject().put("comment_id",commentId).put("user_id",session.userId).put("emoji",emoji),"return=minimal")
        Unit
    }

    fun sendReelMessage(session: StudentSession, conversationId: String, reel: ReelItem): Result<Unit> = runCatching {
        val args = JSONObject()
            .put("p_conversation", conversationId)
            .put("p_body", reel.caption.take(500))
            .put("p_reply_to", JSONObject.NULL)
            .put("p_message_type", "reel")
            .put("p_media_url", reel.thumbnailUrl ?: reel.videoUrl)
            .put("p_file_name", "reel:${reel.id}")
            .put("p_file_size", JSONObject.NULL)

        // Prefer the native reel message type. Some older databases only accept the
        // legacy text message types, so keep a backward-compatible clickable fallback.
        val rich = runCatching { rpcRaw(session, "student_send_message", args) }
        if (rich.isFailure) {
            val fallback = JSONObject()
                .put("p_conversation", conversationId)
                .put("p_body", "🎬 Reel\nstudent://reel/${reel.id}\n${reel.caption.take(420)}".trim())
                .put("p_reply_to", JSONObject.NULL)
                .put("p_message_type", "text")
                .put("p_media_url", reel.thumbnailUrl ?: reel.videoUrl)
                .put("p_file_name", "reel:${reel.id}")
                .put("p_file_size", JSONObject.NULL)
            val legacy = runCatching { rpcRaw(session, "student_send_message", fallback) }
            if (legacy.isFailure) {
                // Last-resort compatibility for very old message schemas: plain text only.
                val plain = JSONObject()
                    .put("p_conversation", conversationId)
                    .put("p_body", "🎬 Reel\nstudent://reel/${reel.id}\n${reel.caption.take(420)}".trim())
                    .put("p_reply_to", JSONObject.NULL)
                    .put("p_message_type", "text")
                    .put("p_media_url", JSONObject.NULL)
                    .put("p_file_name", JSONObject.NULL)
                    .put("p_file_size", JSONObject.NULL)
                rpcRaw(session, "student_send_message", plain)
            }
        }
        Unit
    }

    fun notifications(session: StudentSession, limit: Int = 60): Result<List<StudentNotification>> = runCatching {
        val arr = getArray(session, "notifications?select=*&order=created_at.desc&limit=$limit")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val actorId = nullable(o, "actor_id")
                if (actorId == session.userId) continue
                add(
                    run {
                        val metadata = o.optJSONObject("metadata")
                        StudentNotification(
                            id = o.optString("id"),
                            title = first(o, "title").ifBlank { "Student" },
                            body = first(o, "body"),
                            kind = first(o, "kind").ifBlank { "general" },
                            createdAt = first(o, "created_at"),
                            isRead = o.optBoolean("is_read", false),
                            link = nullable(o, "link"),
                            actorId = nullable(o, "actor_id"),
                            targetType = metadata?.optString("target_type")?.takeIf { it.isNotBlank() }
                                ?: when {
                                    metadata?.has("post_id") == true -> "post"
                                    metadata?.has("reel_id") == true -> "reel"
                                    metadata?.has("conversation_id") == true -> "message"
                                    metadata?.has("comment_id") == true -> "comment"
                                    metadata?.has("subject_id") == true -> "subject"
                                    metadata?.has("lesson_id") == true -> "lesson"
                                    metadata?.has("user_id") == true -> "profile"
                                    else -> null
                                },
                            targetId = metadata?.optString("target_id")?.takeIf { it.isNotBlank() }
                                ?: metadata?.optString("post_id")?.takeIf { it.isNotBlank() }
                                ?: metadata?.optString("reel_id")?.takeIf { it.isNotBlank() }
                                ?: metadata?.optString("conversation_id")?.takeIf { it.isNotBlank() }
                                ?: metadata?.optString("comment_id")?.takeIf { it.isNotBlank() }
                                ?: metadata?.optString("subject_id")?.takeIf { it.isNotBlank() }
                                ?: metadata?.optString("lesson_id")?.takeIf { it.isNotBlank() }
                                ?: metadata?.optString("user_id")?.takeIf { it.isNotBlank() }
                        )
                    }
                )
            }
        }
    }

    fun markNotificationRead(session: StudentSession, notificationId: String): Result<Unit> = runCatching {
        val body = JSONObject().put("is_read", true)
        requestJson(session, "notifications?id=eq.$notificationId", "PATCH", body, "return=minimal")
        Unit
    }

    fun markAllNotificationsRead(session: StudentSession): Result<Unit> = runCatching {
        val body = JSONObject().put("is_read", true)
        requestJson(session, "notifications?is_read=eq.false", "PATCH", body, "return=minimal")
        Unit
    }

    fun updateAccountEmail(session: StudentSession, newEmail: String): Result<Unit> = runCatching {
        val email = newEmail.trim()
        require(email.contains("@") && email.contains(".")) { "البريد الإلكتروني غير صالح." }
        val body = JSONObject().put("email", email).toString()
        val request = Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/auth/v1/user")
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .header("Authorization", "Bearer ${session.accessToken}")
            .put(body.toRequestBody(jsonType))
            .build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IllegalStateException(errorMessage(raw, response.code))
        }
        Unit
    }

    fun dailyLearningReminderEnabled(session: StudentSession): Result<Boolean> = runCatching {
        val arr = getArray(session, "student_notification_preferences?select=daily_learning_reminder&user_id=eq.${session.userId}&limit=1")
        if (arr.length() == 0) true else arr.getJSONObject(0).optBoolean("daily_learning_reminder", true)
    }

    fun setDailyLearningReminderEnabled(session: StudentSession, enabled: Boolean): Result<Unit> = runCatching {
        requestJson(
            session,
            "student_notification_preferences?on_conflict=user_id",
            "POST",
            JSONObject().put("user_id", session.userId).put("daily_learning_reminder", enabled),
            "resolution=merge-duplicates,return=minimal"
        )
        Unit
    }

    fun updateAccountPassword(session: StudentSession, newPassword: String): Result<Unit> = runCatching {
        require(newPassword.length >= 8) { "كلمة المرور يجب أن تكون 8 أحرف على الأقل." }
        val body = JSONObject().put("password", newPassword).toString()
        val request = Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/auth/v1/user")
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .header("Authorization", "Bearer ${session.accessToken}")
            .put(body.toRequestBody(jsonType))
            .build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IllegalStateException(errorMessage(raw, response.code))
        }
        Unit
    }

    fun searchProfiles(session: StudentSession, query: String): Result<List<ProfileSearchItem>> = runCatching {
        val clean = query.trim().replace("%", "").replace(",", "").replace("(", "").replace(")", "")
        if (clean.isBlank()) return@runCatching emptyList()
        val path = "profiles?select=*&or=(full_name.ilike.*$clean*,username.ilike.*$clean*)&limit=30"
        val arr = getArray(session, path)
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(
                    ProfileSearchItem(
                        id = o.optString("id"),
                        fullName = first(o, "full_name", "display_name").ifBlank { "مستخدم" },
                        username = first(o, "username").ifBlank { "student" },
                        role = first(o, "role").ifBlank { "student" },
                        avatarUrl = nullable(o, "avatar_url"),
                        isVerified = o.optBoolean("is_verified", false),
                        verificationColor = nullable(o, "verification_color"),
                        profileFrameUrl = nullable(o, "profile_frame_url")
                    )
                )
            }
        }
    }

    fun profileSuggestions(session: StudentSession, limit: Int = 30): Result<List<FollowSuggestion>> = runCatching {
        val arr = runCatching { rpcArray(session, "student_get_profile_suggestions_v14", JSONObject().put("p_limit", limit)) }
            .getOrElse { rpcArray(session, "student_get_profile_suggestions", JSONObject().put("p_limit", limit)) }
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val reasons = o.optJSONArray("common_reasons")
                val list = buildList { if (reasons != null) for (j in 0 until reasons.length()) add(reasons.optString(j)) }
                add(
                    FollowSuggestion(
                        id = first(o, "id", "user_id"),
                        fullName = first(o, "full_name", "display_name").ifBlank { "طالب" },
                        username = first(o, "username").ifBlank { "student" },
                        avatarUrl = nullable(o, "avatar_url"),
                        isVerified = o.optBoolean("is_verified", false),
                        verificationColor = nullable(o, "verification_color"),
                        profileFrameUrl = nullable(o, "profile_frame_url"),
                        role = first(o, "role").ifBlank { "student" },
                        isFollowing = o.optBoolean("is_following", false),
                        commonReasons = list
                    )
                )
            }
        }
    }

    fun profileStats(session: StudentSession, userId: String): Result<ProfileStats> = runCatching {
        val raw = rpcRaw(session, "get_profile_stats", JSONObject().put("p_user_id", userId))
        val o = parseObjectFromRpc(raw)
        val postsArr = getArray(session, "posts?select=id&user_id=eq.$userId&limit=1000")
        ProfileStats(
            followers = intFirst(o, "followers_count", "followers"),
            following = intFirst(o, "following_count", "following"),
            posts = postsArr.length()
        )
    }

    fun isFollowing(session: StudentSession, otherUserId: String): Result<Boolean> = runCatching {
        val arr = getArray(session, "follows?select=follower_id&follower_id=eq.${session.userId}&following_id=eq.$otherUserId&limit=1")
        arr.length() > 0
    }

    fun setFollowing(session: StudentSession, otherUserId: String, follow: Boolean): Result<Unit> = runCatching {
        if (follow && isBlockedWith(session, otherUserId).getOrDefault(false)) {
            throw IllegalStateException("لا يمكن متابعة حساب محظور أو قام بحظرك.")
        }
        if (follow) {
            // Idempotent follow: never attempt a duplicate insert when the relationship already exists.
            if (!isFollowing(session, otherUserId).getOrDefault(false)) {
                val body = JSONObject().put("follower_id", session.userId).put("following_id", otherUserId)
                requestJson(session, "follows", "POST", body, "return=minimal")
            }
        } else {
            requestJson(session, "follows?follower_id=eq.${session.userId}&following_id=eq.$otherUserId", "DELETE", null, "return=minimal")
        }
        Unit
    }

    fun blockedUserIds(session: StudentSession): Result<Set<String>> = runCatching {
        val arr = getArray(session, "user_blocks?select=blocked_id&blocker_id=eq.${session.userId}&limit=1000")
        buildSet {
            for (i in 0 until arr.length()) {
                arr.getJSONObject(i).optString("blocked_id").takeIf { it.isNotBlank() }?.let(::add)
            }
        }
    }

    fun isBlockedWith(session: StudentSession, otherUserId: String): Result<Boolean> = runCatching {
        val raw = rpcRaw(session, "student_is_blocked_with", JSONObject().put("p_other_user", otherUserId)).trim()
        raw == "true" || raw == "1" || parseObjectFromRpc(raw).optBoolean("student_is_blocked_with", false)
    }

    fun blockUser(session: StudentSession, otherUserId: String): Result<Unit> = runCatching {
        rpcRaw(session, "student_block_user", JSONObject().put("p_user", otherUserId))
        Unit
    }

    fun unblockUser(session: StudentSession, otherUserId: String): Result<Unit> = runCatching {
        rpcRaw(session, "student_unblock_user", JSONObject().put("p_user", otherUserId))
        Unit
    }

    fun conversations(session: StudentSession): Result<List<ConversationItem>> = runCatching {
        val arr = rpcArray(session, "student_get_conversations", JSONObject())
        val peerIds = buildList {
            for (i in 0 until arr.length()) {
                nullableFirst(arr.getJSONObject(i), "other_user_id", "other_id", "peer_id")?.let { add(it) }
            }
        }
        val profiles = profileMap(session, peerIds.distinct())
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val peerId = nullableFirst(o, "other_user_id", "other_id", "peer_id")
                val peer = peerId?.let { profiles[it] }
                add(
                    ConversationItem(
                        id = first(o, "id", "conversation_id"),
                        title = peer?.fullName ?: first(o, "title", "other_name", "name").ifBlank { "المحادثة" },
                        kind = first(o, "kind", "conversation_type").ifBlank { "direct" },
                        otherUserId = peerId,
                        lastMessage = first(o, "last_message", "last_message_body", "body"),
                        lastMessageAt = first(o, "last_message_at", "updated_at", "created_at"),
                        unreadCount = intFirst(o, "unread_count", "unread"),
                        avatarUrl = peer?.avatarUrl ?: nullableFirst(o, "avatar_url", "other_avatar_url"),
                        profileFrameUrl = peer?.profileFrameUrl,
                        isVerified = peer?.isVerified ?: false,
                        verificationColor = peer?.verificationColor,
                        otherRole = peer?.role ?: "student",
                        lastActiveAt = peer?.lastActiveAt ?: nullableFirst(o, "last_active_at", "other_last_active_at")
                    )
                )
            }
        }
    }


    fun messageFollowers(session: StudentSession, limit: Int = 60): Result<List<MessageContact>> = runCatching {
        val arr = rpcArray(session, "student_message_followers_v21", JSONObject().put("p_limit", limit))
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(MessageContact(
                    id = first(o, "id", "user_id"),
                    fullName = first(o, "full_name", "display_name").ifBlank { "مستخدم" },
                    username = first(o, "username").ifBlank { "student" },
                    avatarUrl = nullable(o, "avatar_url"),
                    profileFrameUrl = nullable(o, "profile_frame_url"),
                    isVerified = o.optBoolean("is_verified", false),
                    verificationColor = nullable(o, "verification_color"),
                    lastActiveAt = nullable(o, "last_active_at")
                ))
            }
        }
    }

    fun hideConversationForMe(session: StudentSession, conversationId: String): Result<Unit> = runCatching {
        requestJson(
            session,
            "student_hidden_conversations?on_conflict=user_id,conversation_id",
            "POST",
            JSONObject().put("user_id", session.userId).put("conversation_id", conversationId),
            "resolution=merge-duplicates,return=minimal"
        )
        Unit
    }

    fun hiddenConversationIds(session: StudentSession): Result<Set<String>> = runCatching {
        val arr = getArray(session, "student_hidden_conversations?select=conversation_id&user_id=eq.${session.userId}&limit=2000")
        buildSet { for (i in 0 until arr.length()) arr.getJSONObject(i).optString("conversation_id").takeIf { it.isNotBlank() }?.let(::add) }
    }

    fun startDirectChat(session: StudentSession, otherUserId: String): Result<String> = runCatching {
        if (isBlockedWith(session, otherUserId).getOrDefault(false)) {
            throw IllegalStateException("لا يمكن بدء محادثة بين حسابين يوجد بينهما حظر.")
        }
        val raw = rpcRaw(session, "student_start_direct_chat", JSONObject().put("p_other_user", otherUserId))
        parseIdFromRpc(raw)
    }

    fun messages(session: StudentSession, conversationId: String, limit: Int = 60): Result<List<MessageItem>> = runCatching {
        val args = JSONObject().put("p_conversation", conversationId).put("p_before", JSONObject.NULL).put("p_limit", limit)
        val arr = rpcArray(session, "student_get_messages", args)
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(
                    MessageItem(
                        id = o.optString("id"),
                        conversationId = first(o, "conversation_id", "conversation").ifBlank { conversationId },
                        senderId = first(o, "sender_id", "user_id"),
                        body = first(o, "body"),
                        messageType = first(o, "message_type").ifBlank { "text" },
                        mediaUrl = nullable(o, "media_url"),
                        fileName = nullable(o, "file_name"),
                        createdAt = first(o, "created_at"),
                        editedAt = nullable(o, "edited_at"),
                        deletedAt = nullable(o, "deleted_at"),
                        readCount = intFirst(o, "read_count", "reads"),
                        replyTo = nullableFirst(o, "reply_to", "reply_to_id")
                    )
                )
            }
        }
    }

    fun observeOwnProfile(session: StudentSession, onChange: () -> Unit): Closeable {
        val wsBase = StudentConfig.SUPABASE_URL
            .replaceFirst("https://", "wss://")
            .replaceFirst("http://", "ws://")
        val request = Request.Builder()
            .url("$wsBase/realtime/v1/websocket?apikey=${StudentConfig.SUPABASE_KEY}&vsn=1.0.0")
            .build()
        val topic = "realtime:student-profile-${session.userId}"
        val socket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                val payload = JSONObject()
                    .put("config", JSONObject()
                        .put("broadcast", JSONObject().put("ack", false).put("self", false))
                        .put("presence", JSONObject().put("key", ""))
                        .put("postgres_changes", JSONArray().put(
                            JSONObject()
                                .put("event", "*")
                                .put("schema", "public")
                                .put("table", "profiles")
                                .put("filter", "id=eq.${session.userId}")
                        )))
                    .put("access_token", session.accessToken)
                webSocket.send(JSONObject().put("topic", topic).put("event", "phx_join").put("payload", payload).put("ref", "1").toString())
            }
            override fun onMessage(webSocket: WebSocket, text: String) {
                runCatching {
                    val root = JSONObject(text)
                    if (root.optString("event") == "postgres_changes") onChange()
                }
            }
        })
        return Closeable { socket.close(1000, "profile_closed") }
    }

    fun observeConversationMessages(
        session: StudentSession,
        conversationId: String,
        onChange: () -> Unit
    ): Closeable {
        val wsBase = StudentConfig.SUPABASE_URL
            .replaceFirst("https://", "wss://")
            .replaceFirst("http://", "ws://")
        val request = Request.Builder()
            .url("$wsBase/realtime/v1/websocket?apikey=${StudentConfig.SUPABASE_KEY}&vsn=1.0.0")
            .build()
        val topic = "realtime:student-native-$conversationId"
        val socket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                val payload = JSONObject()
                    .put("config", JSONObject()
                        .put("broadcast", JSONObject().put("ack", false).put("self", false))
                        .put("presence", JSONObject().put("key", ""))
                        .put("postgres_changes", JSONArray().put(
                            JSONObject()
                                .put("event", "*")
                                .put("schema", "public")
                                .put("table", "chat_messages")
                                .put("filter", "conversation_id=eq.$conversationId")
                        )))
                    .put("access_token", session.accessToken)
                val join = JSONObject()
                    .put("topic", topic)
                    .put("event", "phx_join")
                    .put("payload", payload)
                    .put("ref", "1")
                webSocket.send(join.toString())
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                runCatching {
                    val root = JSONObject(text)
                    if (root.optString("event") == "postgres_changes") onChange()
                }
            }
        })
        return Closeable { socket.close(1000, "screen_closed") }
    }

    fun sendMessage(session: StudentSession, conversationId: String, bodyText: String): Result<Unit> = runCatching {
        val args = JSONObject()
            .put("p_conversation", conversationId)
            .put("p_body", bodyText)
            .put("p_reply_to", JSONObject.NULL)
            .put("p_message_type", "text")
            .put("p_media_url", JSONObject.NULL)
            .put("p_file_name", JSONObject.NULL)
            .put("p_file_size", JSONObject.NULL)
        rpcRaw(session, "student_send_message", args)
        Unit
    }

    fun sendMediaMessage(
        session: StudentSession,
        conversationId: String,
        mediaUrl: String,
        messageType: String,
        fileName: String?,
        fileSize: Long
    ): Result<Unit> = runCatching {
        val args = JSONObject()
            .put("p_conversation", conversationId)
            .put("p_body", "")
            .put("p_reply_to", JSONObject.NULL)
            .put("p_message_type", messageType)
            .put("p_media_url", mediaUrl)
            .put("p_file_name", fileName ?: JSONObject.NULL)
            .put("p_file_size", fileSize)
        rpcRaw(session, "student_send_message", args)
        Unit
    }

    fun markConversationRead(session: StudentSession, conversationId: String): Result<Unit> = runCatching {
        rpcRaw(session, "student_mark_conversation_read", JSONObject().put("p_conversation", conversationId))
        Unit
    }


    fun editMessage(session: StudentSession, messageId: String, bodyText: String): Result<Unit> = runCatching {
        require(messageId.isNotBlank()) { "معرّف الرسالة غير صالح." }
        require(bodyText.trim().isNotBlank()) { "نص الرسالة فارغ." }
        rpcRaw(session, "student_edit_message", JSONObject().put("p_message", messageId).put("p_body", bodyText.trim()))
        Unit
    }

    fun deleteMessage(session: StudentSession, messageId: String): Result<Unit> = runCatching {
        require(messageId.isNotBlank()) { "معرّف الرسالة غير صالح." }
        rpcRaw(session, "student_delete_message", JSONObject().put("p_message", messageId))
        Unit
    }


    fun sendMessageReply(session: StudentSession, conversationId: String, bodyText: String, replyTo: String): Result<Unit> = runCatching {
        val args = JSONObject()
            .put("p_conversation", conversationId)
            .put("p_body", bodyText)
            .put("p_reply_to", replyTo)
            .put("p_message_type", "text")
            .put("p_media_url", JSONObject.NULL)
            .put("p_file_name", JSONObject.NULL)
            .put("p_file_size", JSONObject.NULL)
        rpcRaw(session, "student_send_message", args)
        Unit
    }

    fun messageReactionCount(session: StudentSession, messageId: String): Result<Int> = runCatching {
        getArray(session, "student_message_reactions?select=user_id&message_id=eq.$messageId&limit=5000").length()
    }

    fun myMessageReaction(session: StudentSession, messageId: String): Result<String?> = runCatching {
        val a=getArray(session, "student_message_reactions?select=emoji&message_id=eq.$messageId&user_id=eq.${session.userId}&limit=1")
        if(a.length()==0) null else a.getJSONObject(0).optString("emoji").takeIf{it.isNotBlank()}
    }

    fun setMessageReaction(session: StudentSession, messageId: String, emoji: String?): Result<Unit> = runCatching {
        rpcRaw(session, "student_set_message_reaction_v181", JSONObject().put("p_message", messageId).put("p_emoji", emoji ?: JSONObject.NULL))
        Unit
    }

    fun forwardMessage(session: StudentSession, targetConversationId: String, message: MessageItem): Result<Unit> = runCatching {
        val args = JSONObject()
            .put("p_conversation", targetConversationId)
            .put("p_body", message.body)
            .put("p_reply_to", JSONObject.NULL)
            .put("p_message_type", if (message.messageType.isBlank()) "text" else message.messageType)
            .put("p_media_url", message.mediaUrl ?: JSONObject.NULL)
            .put("p_file_name", message.fileName ?: JSONObject.NULL)
            .put("p_file_size", JSONObject.NULL)
        rpcRaw(session, "student_send_message", args)
        Unit
    }

    fun verificationRequestStatus(session: StudentSession): Result<VerificationRequestItem?> = runCatching {
        val arr = getArray(session, "student_verification_requests?select=*&user_id=eq.${session.userId}&order=created_at.desc&limit=1")
        if (arr.length() == 0) null else parseVerificationRequest(arr.getJSONObject(0))
    }

    fun submitVerificationRequest(session: StudentSession, fullName: String, governorate: String, schoolName: String, universityName: String, reason: String): Result<String> = runCatching {
        val raw = rpcRaw(session, "student_submit_verification_request", JSONObject()
            .put("p_full_name", fullName)
            .put("p_governorate", governorate.ifBlank { JSONObject.NULL })
            .put("p_school", schoolName.ifBlank { JSONObject.NULL })
            .put("p_university", universityName.ifBlank { JSONObject.NULL })
            .put("p_reason", reason))
        raw.trim().trim('"')
    }

    fun adminVerificationRequests(session: StudentSession): Result<List<VerificationRequestItem>> = runCatching {
        val arr = getArray(session, "student_verification_requests?select=*&status=eq.pending&order=created_at.asc&limit=200")
        buildList { for (i in 0 until arr.length()) add(parseVerificationRequest(arr.getJSONObject(i))) }
    }

    fun adminReviewVerificationRequest(session: StudentSession, id: String, approve: Boolean, note: String): Result<Unit> = runCatching {
        rpcRaw(session, "student_review_verification_request", JSONObject().put("p_id", id).put("p_approve", approve).put("p_note", note)); Unit
    }


    fun mySupportTickets(session: StudentSession): Result<List<SupportTicketItem>> = runCatching {
        val arr=getArray(session,"student_support_tickets?select=*&user_id=eq.${session.userId}&order=created_at.desc&limit=100")
        buildList { for(i in 0 until arr.length()){ val o=arr.getJSONObject(i); add(parseSupportTicket(o)) } }
    }

    fun submitSupportTicket(session: StudentSession, subject: String, message: String): Result<String> = runCatching {
        val raw=rpcRaw(session,"student_submit_support_ticket",JSONObject().put("p_subject",subject).put("p_message",message)); raw.trim().trim('"')
    }

    fun adminSupportTickets(session: StudentSession): Result<List<SupportTicketItem>> = runCatching {
        val arr=getArray(session,"student_support_tickets?select=*&status=in.(open,answered)&order=created_at.asc&limit=200")
        buildList { for(i in 0 until arr.length()){ add(parseSupportTicket(arr.getJSONObject(i))) } }
    }

    fun adminAnswerSupportTicket(session: StudentSession, id:String, reply:String, close:Boolean=false): Result<Unit> = runCatching {
        rpcRaw(session,"student_admin_answer_support_ticket",JSONObject().put("p_id",id).put("p_reply",reply).put("p_close",close)); Unit
    }

    fun v14FeatureControls(session: StudentSession): Result<Map<String,Boolean>> = runCatching {
        val arr = getArray(session, "student_feature_controls?select=feature_key,enabled&order=feature_key.asc")
        buildMap { for (i in 0 until arr.length()) { val o=arr.getJSONObject(i); put(o.optString("feature_key"),o.optBoolean("enabled",true)) } }
    }

    fun adminSetV14Feature(session: StudentSession, key: String, enabled: Boolean): Result<Unit> = runCatching {
        rpcRaw(session, "student_admin_set_feature", JSONObject().put("p_key", key).put("p_enabled", enabled)); Unit
    }

    fun socialRoomSettings(session: StudentSession): Result<SocialRoomSettings> = runCatching {
        val arr=getArray(session,"student_social_room_settings?select=*&id=eq.1&limit=1")
        if(arr.length()==0) SocialRoomSettings() else arr.getJSONObject(0).let { SocialRoomSettings(it.optInt("group_price_diamonds",50),it.optInt("channel_price_diamonds",100),it.optInt("max_members",500)) }
    }

    fun socialRooms(session: StudentSession): Result<List<SocialRoomItem>> = runCatching {
        val memberships=getArray(session,"student_social_room_members?select=room_id,member_role&user_id=eq.${session.userId}&limit=500")
        val roles=mutableMapOf<String,String>(); val ids=mutableListOf<String>()
        for(i in 0 until memberships.length()){ val o=memberships.getJSONObject(i); val id=o.optString("room_id"); if(id.isNotBlank()){ids+=id;roles[id]=o.optString("member_role","member")} }
        if(ids.isEmpty()) return@runCatching emptyList()
        val filter=ids.joinToString(",")
        val arr=getArray(session,"student_social_rooms?select=*&id=in.($filter)&order=updated_at.desc&limit=500")
        buildList { for(i in 0 until arr.length()){ val o=arr.getJSONObject(i); add(SocialRoomItem(o.optString("id"),o.optString("owner_id"),o.optString("kind","group"),o.optString("name","مجموعة"),o.optString("description",""),nullable(o,"avatar_url"),nullable(o,"username"),o.optBoolean("is_public",true),roles[o.optString("id")]?:"member",o.optString("created_at"))) } }
    }

    fun createSocialRoom(session: StudentSession, kind: String, name: String, description: String, isPublic: Boolean=true): Result<String> = runCatching {
        val raw=rpcRaw(session,"student_create_social_room",JSONObject().put("p_kind",kind).put("p_name",name).put("p_description",description).put("p_public",isPublic)); raw.trim().trim('"')
    }

    fun addSocialRoomMember(session: StudentSession, roomId: String, username: String): Result<Unit> = runCatching {
        rpcRaw(session,"student_add_social_room_member",JSONObject().put("p_room",roomId).put("p_username",username)); Unit
    }

    fun socialRoomMembers(session: StudentSession, roomId: String): Result<List<SocialRoomMember>> = runCatching {
        val arr = getArray(session, "student_social_room_members?select=user_id,member_role&room_id=eq.$roomId&order=joined_at.asc&limit=1000")
        val ids = buildList { for (i in 0 until arr.length()) add(arr.getJSONObject(i).optString("user_id")) }.filter { it.isNotBlank() }
        val profiles = profileMap(session, ids)
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i); val uid = o.optString("user_id"); val p = profiles[uid]
                add(SocialRoomMember(uid,p?.fullName?:"مستخدم",p?.username?:"student",p?.role?:"student",p?.avatarUrl,p?.profileFrameUrl,p?.isVerified?:false,p?.verificationColor,o.optString("member_role","member")))
            }
        }
    }

    fun updateSocialRoom(session: StudentSession, roomId: String, name: String, username: String, description: String, avatarUrl: String?, isPublic: Boolean): Result<Unit> = runCatching {
        rpcRaw(session,"student_update_social_room",JSONObject().put("p_room",roomId).put("p_name",name).put("p_username",username).put("p_description",description).put("p_avatar_url",avatarUrl?:JSONObject.NULL).put("p_public",isPublic)); Unit
    }

    fun setSocialRoomMemberRole(session: StudentSession, roomId: String, username: String, role: String): Result<Unit> = runCatching {
        rpcRaw(session,"student_set_social_room_member_role",JSONObject().put("p_room",roomId).put("p_username",username).put("p_role",role)); Unit
    }

    fun removeSocialRoomMember(session: StudentSession, roomId: String, username: String): Result<Unit> = runCatching {
        rpcRaw(session,"student_remove_social_room_member",JSONObject().put("p_room",roomId).put("p_username",username)); Unit
    }

    fun transferSocialRoomOwnership(session: StudentSession, roomId: String, username: String): Result<Unit> = runCatching {
        rpcRaw(session,"student_transfer_social_room_ownership",JSONObject().put("p_room",roomId).put("p_username",username)); Unit
    }

    fun socialRoomMessages(session: StudentSession, roomId: String): Result<List<SocialRoomMessage>> = runCatching {
        val arr=getArray(session,"student_social_room_messages?select=*&room_id=eq.$roomId&order=created_at.asc&limit=200")
        val senders=mutableSetOf<String>(); for(i in 0 until arr.length()) senders+=arr.getJSONObject(i).optString("sender_id")
        val profiles=profileMap(session,senders.filter{it.isNotBlank()})
        buildList { for(i in 0 until arr.length()){ val o=arr.getJSONObject(i); val sid=o.optString("sender_id"); val p=profiles[sid]; add(SocialRoomMessage(o.optString("id"),roomId,sid,p?.fullName?:"مستخدم",p?.role?:"student",p?.avatarUrl,p?.profileFrameUrl,p?.isVerified?:false,p?.verificationColor,o.optString("body"),o.optString("message_type","text"),nullable(o,"media_url"),nullable(o,"file_name"),nullable(o,"reply_to"),o.optString("created_at"))) } }
    }

    fun sendSocialRoomMessage(session: StudentSession, roomId: String, body: String, type: String="text", mediaUrl: String?=null, fileName: String?=null, replyTo: String?=null): Result<String> = runCatching {
        val raw=rpcRaw(session,"student_send_social_room_message",JSONObject().put("p_room",roomId).put("p_body",body).put("p_type",type).put("p_media_url",mediaUrl?:JSONObject.NULL).put("p_file_name",fileName?:JSONObject.NULL).put("p_reply_to",replyTo?:JSONObject.NULL)); raw.trim().trim('"')
    }

    fun editSocialRoomMessage(session: StudentSession, messageId: String, body: String): Result<Unit> = runCatching {
        rpcRaw(session,"student_edit_social_room_message_v17",JSONObject().put("p_message",messageId).put("p_body",body.trim())); Unit
    }

    fun deleteSocialRoomMessage(session: StudentSession, messageId: String): Result<Unit> = runCatching {
        rpcRaw(session,"student_delete_social_room_message_v17",JSONObject().put("p_message",messageId)); Unit
    }

    fun forwardSocialRoomMessage(session: StudentSession, roomId: String, message: SocialRoomMessage): Result<Unit> = runCatching {
        sendSocialRoomMessage(session,roomId,message.body,message.messageType,message.mediaUrl,message.fileName,null).getOrThrow(); Unit
    }

    fun roomMessageReactionCount(session: StudentSession, messageId: String): Result<Int> = runCatching {
        getArray(session, "student_room_message_reactions?select=user_id&message_id=eq.$messageId&limit=5000").length()
    }

    fun myRoomMessageReaction(session: StudentSession, messageId: String): Result<String?> = runCatching {
        val a=getArray(session, "student_room_message_reactions?select=emoji&message_id=eq.$messageId&user_id=eq.${session.userId}&limit=1")
        if(a.length()==0) null else a.getJSONObject(0).optString("emoji").takeIf{it.isNotBlank()}
    }

    fun setRoomMessageReaction(session: StudentSession, messageId: String, emoji: String?): Result<Unit> = runCatching {
        rpcRaw(session, "student_set_room_message_reaction_v181", JSONObject().put("p_message", messageId).put("p_emoji", emoji ?: JSONObject.NULL))
        Unit
    }

    fun adminSetSocialRoomPrices(session: StudentSession, groupPrice: Int, channelPrice: Int, maxMembers: Int): Result<Unit> = runCatching {
        rpcRaw(session,"student_admin_set_social_room_prices",JSONObject().put("p_group",groupPrice).put("p_channel",channelPrice).put("p_max_members",maxMembers)); Unit
    }

    fun educationStages(session: StudentSession): Result<List<EducationStage>> = runCatching {
        val arr = getArray(session, "education_stages?select=*&order=sort_order.asc")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(EducationStage(o.optString("id"), first(o, "name").ifBlank { "مرحلة" }, o.optString("slug", ""), first(o, "description"), o.optInt("sort_order", i)))
            }
        }
    }

    fun educationLevels(session: StudentSession, stageId: String): Result<List<EducationLevel>> = runCatching {
        val arr = getArray(session, "education_levels?select=*&stage_id=eq.$stageId&order=sort_order.asc")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(EducationLevel(o.optString("id"), o.optString("stage_id", stageId), first(o, "name").ifBlank { "صف" }, o.optString("slug", ""), o.optInt("sort_order", i)))
            }
        }
    }

    fun educationSubjects(session: StudentSession, levelId: String): Result<List<EducationSubject>> = runCatching {
        val links = getArray(session, "education_level_subjects?select=*&level_id=eq.$levelId&order=sort_order.asc")
        val ids = buildList {
            for (i in 0 until links.length()) {
                val id = links.getJSONObject(i).optString("subject_id")
                if (id.isNotBlank()) add(id)
            }
        }
        if (ids.isEmpty()) return@runCatching emptyList()
        val joined = ids.joinToString(",")
        val arr = getArray(session, "education_subjects?select=*&id=in.($joined)&order=sort_order.asc")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(EducationSubject(o.optString("id"), first(o, "name").ifBlank { "مادة" }, o.optString("slug", ""), first(o, "description")))
            }
        }.sortedBy { ids.indexOf(it.id) }
    }

    fun searchEducationMaterials(session: StudentSession, query: String, limit: Int = 40): Result<List<EducationMaterial>> = runCatching {
        val clean = query.trim().replace("%", "").replace(",", "").replace("(", "").replace(")", "").replace(" ", "%20")
        if (clean.isBlank()) return@runCatching emptyList()
        val arr = getArray(session, "education_materials?select=*&status=eq.published&or=(title.ilike.*$clean*,description.ilike.*$clean*)&order=created_at.desc&limit=$limit")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(EducationMaterial(o.optString("id"), first(o,"title").ifBlank{"محتوى تعليمي"}, first(o,"description"), first(o,"material_type").ifBlank{"text"}, nullable(o,"file_url"), nullable(o,"external_url"), first(o,"created_at")))
            }
        }
    }

    fun educationMaterials(session: StudentSession, subjectId: String): Result<List<EducationMaterial>> = runCatching {
        val arr = getArray(session, "education_materials?select=*&subject_id=eq.$subjectId&status=eq.published&order=created_at.desc&limit=100")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(
                    EducationMaterial(
                        id = o.optString("id"),
                        title = first(o, "title").ifBlank { "محتوى تعليمي" },
                        description = first(o, "description"),
                        materialType = first(o, "material_type").ifBlank { "text" },
                        fileUrl = nullable(o, "file_url"),
                        externalUrl = nullable(o, "external_url"),
                        createdAt = first(o, "created_at")
                    )
                )
            }
        }
    }

    fun universities(session: StudentSession): Result<List<UniversityNode>> =
        universityNodes(session, "universities", null, null)

    fun universityColleges(session: StudentSession, universityId: String): Result<List<UniversityNode>> =
        universityNodes(session, "university_colleges", "university_id", universityId)

    fun universityDepartments(session: StudentSession, collegeId: String): Result<List<UniversityNode>> =
        universityNodes(session, "university_departments", "college_id", collegeId)

    fun universityLevels(session: StudentSession, departmentId: String): Result<List<UniversityNode>> =
        universityNodes(session, "university_levels", "department_id", departmentId)

    fun universitySubjects(session: StudentSession, universityLevelId: String): Result<List<EducationSubject>> = runCatching {
        val links = getArray(session, "university_level_subjects?select=*&university_level_id=eq.$universityLevelId&order=sort_order.asc")
        val ids = buildList {
            for (i in 0 until links.length()) {
                val id = links.getJSONObject(i).optString("subject_id")
                if (id.isNotBlank()) add(id)
            }
        }
        if (ids.isEmpty()) return@runCatching emptyList()
        val arr = getArray(session, "university_subjects?select=*&id=in.(${ids.joinToString(",")})&order=sort_order.asc")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(EducationSubject(o.optString("id"), first(o, "name").ifBlank { "مادة" }, o.optString("slug", ""), first(o, "description")))
            }
        }.sortedBy { ids.indexOf(it.id) }
    }

    fun universityMaterials(session: StudentSession, universityLevelId: String, subjectId: String): Result<List<EducationMaterial>> = runCatching {
        val arr = getArray(session, "education_materials?select=*&education_type=eq.university&subject_id=eq.$subjectId&university_level_id=eq.$universityLevelId&status=eq.published&order=created_at.desc&limit=100")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(EducationMaterial(o.optString("id"), first(o, "title").ifBlank { "محتوى تعليمي" }, first(o, "description"), first(o, "material_type").ifBlank { "text" }, nullable(o,"file_url"), nullable(o,"external_url"), first(o, "created_at")))
            }
        }
    }

    private fun universityNodes(session: StudentSession, table: String, parentKey: String?, parentId: String?): Result<List<UniversityNode>> = runCatching {
        val filter = if (!parentKey.isNullOrBlank() && !parentId.isNullOrBlank()) "&$parentKey=eq.$parentId" else ""
        val arr = getArray(session, "$table?select=*&order=sort_order.asc$filter")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(UniversityNode(o.optString("id"), o.optString("name", "عنصر"), o.optString("slug", ""), first(o, "description"), parentId))
            }
        }
    }

    fun storeProducts(session: StudentSession): Result<List<StoreProduct>> = runCatching {
        val arr = getArray(session, "store_products?select=*&is_active=eq.true&order=sort_order.asc")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(
                    StoreProduct(
                        id = o.optString("id"),
                        name = o.optString("name", "منتج"),
                        description = first(o, "description"),
                        productType = o.optString("product_type", "product"),
                        priceMoney = o.optDouble("price_money", 0.0),
                        currency = o.optString("currency", "IQD"),
                        priceDiamonds = o.optInt("price_diamonds", 0),
                        allowMoney = o.optBoolean("allow_money", true),
                        allowDiamonds = o.optBoolean("allow_diamonds", false),
                        imageUrl = nullable(o, "image_url"),
                        frameKey = nullable(o, "frame_key"),
                        frameDurationDays = if (o.has("frame_duration_days") && !o.isNull("frame_duration_days")) o.optInt("frame_duration_days") else null
                    )
                )
            }
        }
    }

    fun walletSummary(session: StudentSession): Result<WalletSummary> = runCatching {
        val raw = rpcRaw(session, "store_get_wallet_summary", JSONObject())
        val o = parseObjectFromRpc(raw)
        WalletSummary(
            availableBalance = doubleFirst(o, "available_balance", "balance"),
            heldBalance = doubleFirst(o, "held_balance"),
            totalSpent = doubleFirst(o, "total_spent"),
            diamonds = intFirst(o, "diamonds", "diamond_balance", "balance_diamonds")
        )
    }

    fun storeOrders(session: StudentSession): Result<List<StoreOrder>> = runCatching {
        val arr = getArray(session, "store_orders?select=*&user_id=eq.${session.userId}&order=created_at.desc&limit=100")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(
                    StoreOrder(
                        id = o.optString("id"),
                        productName = o.optString("product_name", "طلب"),
                        paymentMethod = o.optString("payment_method", ""),
                        moneyAmount = o.optDouble("money_amount", 0.0),
                        diamondAmount = o.optInt("diamond_amount", 0),
                        status = o.optString("status", "pending"),
                        createdAt = first(o, "created_at")
                    )
                )
            }
        }
    }

    fun createStoreOrder(session: StudentSession, productId: String, paymentMethod: String): Result<String> = runCatching {
        val raw = rpcRaw(session, "create_store_order", JSONObject().put("p_product_id", productId).put("p_payment_method", paymentMethod))
        parseIdFromRpc(raw)
    }

    fun confirmStoreMoneyPayment(session: StudentSession, orderId: String, senderName: String, cardLast4: String): Result<Unit> = runCatching {
        rpcRaw(session, "student_confirm_store_money_payment_v181", JSONObject()
            .put("p_order", orderId)
            .put("p_sender_name", senderName.trim())
            .put("p_card_last4", cardLast4.trim()))
        Unit
    }

    fun activateDiamondStoreEntitlement(session: StudentSession, orderId: String, productId: String): Result<Unit> = runCatching {
        rpcRaw(session, "student_activate_diamond_entitlement_v181", JSONObject().put("p_order", orderId).put("p_product", productId))
        Unit
    }

    fun purchaseShortUsername(session: StudentSession, username: String): Result<String> = runCatching {
        val raw = rpcRaw(
            session,
            "student_purchase_username3",
            JSONObject().put("p_username", username.trim().removePrefix("@").lowercase())
        )
        val obj = parseObjectFromRpc(raw)
        obj.optString("username").ifBlank { username.trim().removePrefix("@").lowercase() }
    }

    fun shortUsernameEntitled(session: StudentSession): Result<Boolean> = runCatching {
        val raw = rpcRaw(session, "student_can_use_short_username_v181", JSONObject()).trim()
        raw == "true" || raw == "1"
    }

    fun isAdmin(session: StudentSession): Result<Boolean> = runCatching {
        val raw = rpcRaw(session, "current_user_is_admin", JSONObject()).trim()
        raw == "true" || raw == "1" || runCatching { parseObjectFromRpc(raw).optBoolean("current_user_is_admin", false) }.getOrDefault(false)
    }

    fun adminRecentUsers(session: StudentSession): Result<List<AdminRecentUser>> = runCatching {
        val arr = rpcArray(session, "student_admin_recent_users", JSONObject().put("p_limit", 50))
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(
                    AdminRecentUser(
                        id = o.optString("id"),
                        fullName = first(o, "full_name", "display_name").ifBlank { "مستخدم" },
                        username = first(o, "username").ifBlank { "student" },
                        email = o.optString("email", ""),
                        role = first(o, "role").ifBlank { "student" },
                        createdAt = first(o, "created_at"),
                        isVerified = o.optBoolean("is_verified", false)
                    )
                )
            }
        }
    }

    fun grantVerification(session: StudentSession, userId: String, color: String): Result<Unit> = runCatching {
        runCatching {
            rpcRaw(session, "student_admin_grant_verification_v27", JSONObject().put("p_user", userId).put("p_color", color))
        }.getOrElse {
            rpcRaw(
                session,
                "student_admin_gift_profile_cosmetic",
                JSONObject()
                    .put("p_user", userId)
                    .put("p_kind", "verification")
                    .put("p_value", color)
                    .put("p_label", "هدية من إدارة Student")
                    .put("p_color", color)
            )
        }
        Unit
    }

    fun myProfileFrames(session: StudentSession): Result<List<OwnedProfileFrame>> = runCatching {
        var arr = try { rpcArray(session, "student_get_my_profile_frames", JSONObject()) } catch (_: Exception) { JSONArray() }
        if (arr.length() == 0) {
            arr = getArray(session, "student_profile_frames?select=*&user_id=eq.${session.userId}&order=created_at.desc")
        }
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val id = first(o, "id", "owned_frame_id", "profile_frame_id")
                val key = first(o, "frame_key", "key", "frame")
                if (id.isBlank() || key.isBlank()) continue
                add(
                    OwnedProfileFrame(
                        id = id,
                        frameKey = key,
                        productId = nullableFirst(o, "product_id", "store_product_id"),
                        source = first(o, "source").ifBlank { "store" },
                        expiresAt = nullableFirst(o, "expires_at", "expiry_at"),
                        isActive = when {
                            o.has("is_active") -> o.optBoolean("is_active", false)
                            o.has("active") -> o.optBoolean("active", false)
                            else -> false
                        },
                        createdAt = first(o, "created_at")
                    )
                )
            }
        }
    }

    fun equipProfileFrame(session: StudentSession, ownedFrameId: String): Result<Unit> = runCatching {
        rpcRaw(session, "student_equip_profile_frame", JSONObject().put("p_owned_frame_id", ownedFrameId))
        Unit
    }

    fun clearProfileFrame(session: StudentSession): Result<Unit> = runCatching {
        rpcRaw(session, "student_clear_profile_frame", JSONObject())
        Unit
    }

    fun deleteProfileFrame(session: StudentSession, ownedFrameId: String): Result<Unit> = runCatching {
        rpcRaw(session, "student_delete_profile_frame", JSONObject().put("p_owned_frame_id", ownedFrameId))
        Unit
    }

    fun grantProfileFrame(session: StudentSession, userId: String, frameKey: String, days: Int?): Result<Unit> = runCatching {
        rpcRaw(
            session,
            "student_admin_grant_profile_frame",
            JSONObject().put("p_user", userId).put("p_frame_key", frameKey).put("p_days", days ?: JSONObject.NULL)
        )
        Unit
    }

    fun grantCustomBadge(session: StudentSession, userId: String, label: String, color: String): Result<Unit> = runCatching {
        rpcRaw(
            session,
            "student_admin_gift_profile_cosmetic",
            JSONObject()
                .put("p_user", userId)
                .put("p_kind", "custom_badge")
                .put("p_value", "custom_badge")
                .put("p_label", label.ifBlank { "علامة مميزة" })
                .put("p_color", color.ifBlank { "#7c3aed" })
        )
        Unit
    }

    fun englishVocabulary(session: StudentSession, level: String? = null, limit: Int = 500): Result<List<EnglishVocabularyItem>> = runCatching {
        val levelFilter = level?.takeIf { it.isNotBlank() }?.let { "&level=eq.$it" }.orEmpty()
        val arr = getArray(session, "english_vocabulary?select=*&is_active=eq.true$levelFilter&order=source_rank.asc.nullslast,word.asc&limit=$limit")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(
                    EnglishVocabularyItem(
                        id = o.optString("id"),
                        word = o.optString("word"),
                        meaningAr = o.optString("meaning_ar"),
                        level = o.optString("level", "A1"),
                        exampleEn = o.optString("example_en"),
                        exampleAr = o.optString("example_ar"),
                        source = o.optString("source", "core"),
                        sourceRank = o.optInt("source_rank", 999999),
                        partOfSpeech = o.optString("part_of_speech"),
                        category = o.optString("category")
                    )
                )
            }
        }
    }

    fun vocabularyBatch(session: StudentSession, sequenceIndex: Int): Result<List<EnglishVocabularyItem>> = runCatching {
        val raw = rpcRaw(
            session,
            "student_vocabulary_batch_v210",
            JSONObject().put("p_expected_sequence", sequenceIndex.coerceAtLeast(0))
        )
        val arr = when {
            raw.trim().startsWith("[") -> JSONArray(raw)
            raw.trim().startsWith("{") -> JSONObject(raw).optJSONArray("items") ?: JSONArray()
            else -> JSONArray()
        }
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                add(
                    EnglishVocabularyItem(
                        id = o.optString("id"),
                        word = o.optString("word"),
                        meaningAr = o.optString("meaning_ar"),
                        level = o.optString("level", "A1"),
                        exampleEn = o.optString("example_en"),
                        exampleAr = o.optString("example_ar"),
                        source = o.optString("source", "core"),
                        sourceRank = o.optInt("source_rank", 999999),
                        partOfSpeech = o.optString("part_of_speech"),
                        category = o.optString("category")
                    )
                )
            }
        }
    }

    fun rememberEnglishWord(session: StudentSession, wordKey: String): Result<Unit> = runCatching {
        val normalized = wordKey.trim().lowercase()
        rpcRaw(session, "student_english_remember_word", JSONObject().put("p_word_key", normalized))
        saveItem(
            session = session,
            contentType = "vocabulary",
            contentId = normalized,
            title = wordKey.trim(),
            subtitle = "مفردات للمراجعة",
            source = "english_vocabulary",
            target = "english/vocabulary",
            metadata = JSONObject().put("reminder", true)
        ).getOrThrow()
        Unit
    }

    fun recordEnglishQuiz(session: StudentSession, quizType: String, score: Int, total: Int): Result<Unit> = runCatching {
        requestJson(
            session,
            "english_quiz_attempts",
            "POST",
            JSONObject().put("user_id", session.userId).put("quiz_type", quizType).put("score", score).put("total", total),
            "return=minimal"
        )
        Unit
    }

    fun featureFlags(session: StudentSession): Result<List<FeatureFlag>> = runCatching {
        val arr = getArray(session, "feature_flags?select=*")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val key = first(o, "feature_key", "key", "name")
                if (key.isNotBlank()) add(FeatureFlag(o.optString("id"), o.optString("name", key), key, boolFirst(o, "enabled", "is_enabled", default = true)))
            }
        }
    }


    fun remoteModules(session: StudentSession): Result<List<RemoteModuleItem>> = runCatching {
        val arr = getArray(session, "student_remote_modules?select=id,module_key,title,subtitle,icon_key,target,enabled,sort_order&enabled=eq.true&order=sort_order.asc,title.asc")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val target = o.optString("target").trim()
                val key = o.optString("module_key").trim()
                val title = o.optString("title").trim()
                if (target.isNotBlank() && key.isNotBlank() && title.isNotBlank()) {
                    add(
                        RemoteModuleItem(
                            id = o.optString("id"),
                            moduleKey = key,
                            title = title,
                            subtitle = o.optString("subtitle").takeIf { it.isNotBlank() },
                            iconKey = o.optString("icon_key", "apps").trim().lowercase(),
                            target = target,
                            enabled = o.optBoolean("enabled", true),
                            sortOrder = o.optInt("sort_order", 100)
                        )
                    )
                }
            }
        }
    }

    fun remoteRule(session: StudentSession, ruleKey: String): Result<String> = runCatching {
        val safe = ruleKey.trim().lowercase().replace(Regex("[^a-z0-9_.:-]"), "")
        if (safe.isBlank()) error("remote_rule_invalid")
        val arr = getArray(session, "student_remote_rules?select=value&rule_key=eq.$safe&enabled=eq.true&limit=1")
        if (arr.length() == 0) error("remote_rule_not_found")
        arr.getJSONObject(0).opt("value")?.toString() ?: "{}"
    }

    fun remoteAssets(session: StudentSession, type: String? = null): Result<List<RemoteAssetItem>> = runCatching {
        val safeType = type.orEmpty().trim().lowercase().replace(Regex("[^a-z0-9_]"), "")
        val filter = if (safeType.isBlank()) "" else "&asset_type=eq.$safeType"
        val arr = getArray(session, "student_remote_assets?select=id,asset_key,asset_type,title,uri,data,sort_order&enabled=eq.true$filter&order=sort_order.asc,title.asc")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(RemoteAssetItem(
                    id = o.optString("id"),
                    assetKey = o.optString("asset_key"),
                    assetType = o.optString("asset_type"),
                    title = o.optString("title"),
                    uri = o.optString("uri").takeIf { it.isNotBlank() },
                    dataJson = o.optJSONObject("data")?.toString() ?: "{}",
                    sortOrder = o.optInt("sort_order", 100),
                ))
            }
        }
    }

    fun remoteScreen(session: StudentSession, screenKey: String): Result<RemoteScreenDefinition> = runCatching {
        val safeKey = screenKey.trim().lowercase().replace(Regex("[^a-z0-9_:-]"), "")
        if (safeKey.isBlank()) error("remote_screen_invalid")
        val screens = getArray(session, "student_remote_screens?select=screen_key,title,description,layout,refresh_seconds&screen_key=eq.$safeKey&enabled=eq.true&limit=1")
        if (screens.length() == 0) error("remote_screen_not_found")
        val root = screens.getJSONObject(0)
        val componentsArray = getArray(session, "student_remote_components?select=id,component_key,component_type,title,body,icon_key,target,action_key,visible,sort_order,style&screen_key=eq.$safeKey&visible=eq.true&order=sort_order.asc")
        val components = buildList {
            for (i in 0 until componentsArray.length()) {
                val c = componentsArray.getJSONObject(i)
                val styleObject = c.optJSONObject("style")
                val style = buildMap<String, String> {
                    if (styleObject != null) {
                        val keys = styleObject.keys()
                        while (keys.hasNext()) {
                            val key = keys.next()
                            put(key, styleObject.opt(key)?.toString().orEmpty())
                        }
                    }
                }
                add(
                    RemoteScreenComponent(
                        id = c.optString("id"),
                        componentKey = c.optString("component_key"),
                        type = c.optString("component_type", "text").lowercase(),
                        title = c.optString("title").takeIf { it.isNotBlank() },
                        body = c.optString("body").takeIf { it.isNotBlank() },
                        iconKey = c.optString("icon_key").takeIf { it.isNotBlank() },
                        target = c.optString("target").takeIf { it.isNotBlank() },
                        actionKey = c.optString("action_key").takeIf { it.isNotBlank() },
                        visible = c.optBoolean("visible", true),
                        sortOrder = c.optInt("sort_order", 100),
                        style = style,
                    )
                )
            }
        }
        RemoteScreenDefinition(
            screenKey = root.optString("screen_key", safeKey),
            title = root.optString("title", safeKey),
            description = root.optString("description").takeIf { it.isNotBlank() },
            layout = root.optString("layout", "column"),
            refreshSeconds = root.optInt("refresh_seconds", 30).coerceIn(5, 3600),
            components = components,
        )
    }

    fun remoteAction(session: StudentSession, actionKey: String): Result<RemoteActionDefinition> = runCatching {
        val safeKey = actionKey.trim().lowercase().replace(Regex("[^a-z0-9_:-]"), "")
        if (safeKey.isBlank()) error("remote_action_invalid")
        val actions = getArray(session, "student_remote_actions?select=action_key,title,description,rpc_name,confirm_required,confirm_text,success_message&action_key=eq.$safeKey&enabled=eq.true&limit=1")
        if (actions.length() == 0) error("remote_action_not_found")
        val a = actions.getJSONObject(0)
        val fieldsArray = getArray(session, "student_remote_action_fields?select=field_key,label,field_type,required,placeholder,default_value,options,max_length,sort_order&action_key=eq.$safeKey&enabled=eq.true&order=sort_order.asc")
        val fields = buildList {
            for (i in 0 until fieldsArray.length()) {
                val f = fieldsArray.getJSONObject(i)
                val opts = f.optJSONArray("options")
                add(RemoteActionField(
                    key = f.optString("field_key"),
                    label = f.optString("label"),
                    type = f.optString("field_type", "text").lowercase(),
                    required = f.optBoolean("required", false),
                    placeholder = f.optString("placeholder").takeIf { it.isNotBlank() },
                    defaultValue = f.optString("default_value").takeIf { it.isNotBlank() },
                    options = buildList { if (opts != null) for (j in 0 until opts.length()) add(opts.optString(j)) },
                    maxLength = f.optInt("max_length", 500).coerceIn(1, 10000),
                    sortOrder = f.optInt("sort_order", 100)
                ))
            }
        }
        RemoteActionDefinition(
            actionKey = a.optString("action_key"),
            title = a.optString("title", safeKey),
            description = a.optString("description").takeIf { it.isNotBlank() },
            rpcName = a.optString("rpc_name"),
            confirmRequired = a.optBoolean("confirm_required", true),
            confirmText = a.optString("confirm_text").takeIf { it.isNotBlank() },
            successMessage = a.optString("success_message").takeIf { it.isNotBlank() },
            fields = fields
        ).also { if (it.rpcName.isBlank()) error("remote_action_rpc_missing") }
    }

    fun executeRemoteAction(session: StudentSession, definition: RemoteActionDefinition, values: Map<String, Any?>): Result<String> = runCatching {
        val args = JSONObject()
        definition.fields.forEach { field ->
            val value = values[field.key]
            when (field.type) {
                "number", "integer" -> args.put(field.key, value?.toString()?.toLongOrNull() ?: JSONObject.NULL)
                "slider" -> args.put(field.key, value?.toString()?.toDoubleOrNull() ?: JSONObject.NULL)
                "boolean", "toggle" -> args.put(field.key, value as? Boolean ?: value?.toString()?.toBooleanStrictOrNull() ?: false)
                else -> args.put(field.key, value?.toString() ?: JSONObject.NULL)
            }
        }
        rpcRaw(session, definition.rpcName, args)
    }

    fun uploadObject(
        session: StudentSession,
        bucket: String,
        path: String,
        bytes: ByteArray,
        mimeType: String
    ): Result<String> = runCatching {
        val bodyType = mimeType.toMediaType()
        val request = Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/storage/v1/object/$bucket/$path")
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .header("Authorization", "Bearer ${session.accessToken}")
            .header("x-upsert", "false")
            .post(bytes.toRequestBody(bodyType))
            .build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IllegalStateException(errorMessage(raw, response.code))
        }
        "${StudentConfig.SUPABASE_URL}/storage/v1/object/public/$bucket/$path"
    }

    fun uploadObjectFile(
        session: StudentSession,
        bucket: String,
        path: String,
        file: File,
        mimeType: String
    ): Result<String> = runCatching {
        require(file.exists() && file.length() > 0L) { "تعذر قراءة الملف." }
        // Supabase recommends resumable TUS uploads above 6 MB or whenever
        // network stability is a concern. Community videos commonly cross that
        // threshold, so switch automatically without buffering the file in RAM.
        if (file.length() > TUS_CHUNK_BYTES) {
            uploadObjectFileResumable(session, bucket, path, file, mimeType)
        } else {
            uploadObjectFileStandard(session, bucket, path, file, mimeType)
        }
        "${StudentConfig.SUPABASE_URL}/storage/v1/object/public/$bucket/$path"
    }

    private fun uploadObjectFileStandard(
        session: StudentSession,
        bucket: String,
        path: String,
        file: File,
        mimeType: String
    ) {
        var lastError: Throwable? = null
        repeat(3) { attempt ->
            try {
                val request = Request.Builder()
                    .url("${StudentConfig.SUPABASE_URL}/storage/v1/object/$bucket/$path")
                    .header("apikey", StudentConfig.SUPABASE_KEY)
                    .header("Authorization", "Bearer ${session.accessToken}")
                    .header("x-upsert", "false")
                    .post(file.asRequestBody(mimeType.toMediaType()))
                    .build()
                client.newCall(request).execute().use { response ->
                    val raw = response.body?.string().orEmpty()
                    if (response.isSuccessful) return
                    val error = IllegalStateException(errorMessage(raw, response.code))
                    val transient = response.code == 408 || response.code == 425 || response.code == 429 || response.code in 500..599
                    if (!transient) throw NonRetryableUploadException(error.message ?: "تعذر رفع الملف.")
                    lastError = error
                }
            } catch (t: NonRetryableUploadException) {
                throw t
            } catch (t: Throwable) {
                lastError = t
                if (attempt == 2) throw t
            }
            Thread.sleep((1000L shl attempt).coerceAtMost(4000L))
        }
        throw (lastError ?: IllegalStateException("تعذر رفع الملف."))
    }

    /**
     * TUS resumable upload using Supabase's required 6 MiB chunks. On a dropped
     * connection we ask the upload URL for the committed offset and continue
     * from there instead of restarting a large video from byte zero.
     */
    private fun uploadObjectFileResumable(
        session: StudentSession,
        bucket: String,
        path: String,
        file: File,
        mimeType: String
    ) {
        val endpoint = "${directStorageBaseUrl()}/storage/v1/upload/resumable"
        val metadata = listOf(
            "bucketName ${tusBase64(bucket)}",
            "objectName ${tusBase64(path)}",
            "contentType ${tusBase64(mimeType)}",
            "cacheControl ${tusBase64("3600")}"
        ).joinToString(",")

        val create = Request.Builder()
            .url(endpoint)
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .header("Authorization", "Bearer ${session.accessToken}")
            .header("Tus-Resumable", "1.0.0")
            .header("Upload-Length", file.length().toString())
            .header("Upload-Metadata", metadata)
            .header("x-upsert", "false")
            .post(ByteArray(0).toRequestBody(null))
            .build()

        val uploadUrl = client.newCall(create).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (response.code !in 200..299) throw IllegalStateException(errorMessage(raw, response.code))
            val location = response.header("Location") ?: throw IllegalStateException("لم يُرجع خادم التخزين رابط استكمال الرفع.")
            response.request.url.resolve(location)?.toString() ?: location
        }

        var offset = tusRemoteOffset(session, uploadUrl).coerceIn(0L, file.length())
        var failures = 0
        while (offset < file.length()) {
            val chunk = minOf(TUS_CHUNK_BYTES, file.length() - offset)
            try {
                val request = Request.Builder()
                    .url(uploadUrl)
                    .header("apikey", StudentConfig.SUPABASE_KEY)
                    .header("Authorization", "Bearer ${session.accessToken}")
                    .header("Tus-Resumable", "1.0.0")
                    .header("Upload-Offset", offset.toString())
                    .patch(FileRangeRequestBody(file, offset, chunk, "application/offset+octet-stream".toMediaType()))
                    .build()
                client.newCall(request).execute().use { response ->
                    if (response.code !in 200..299) {
                        val raw = response.body?.string().orEmpty()
                        val transient = response.code == 408 || response.code == 409 || response.code == 423 || response.code == 425 || response.code == 429 || response.code in 500..599
                        if (!transient) throw NonRetryableUploadException(errorMessage(raw, response.code))
                        throw IllegalStateException(errorMessage(raw, response.code))
                    }
                    offset = response.header("Upload-Offset")?.toLongOrNull() ?: (offset + chunk)
                    failures = 0
                }
            } catch (t: NonRetryableUploadException) {
                throw t
            } catch (t: Throwable) {
                failures += 1
                if (failures > 5) throw t
                Thread.sleep(listOf(1000L, 2000L, 4000L, 8000L, 12000L)[failures - 1])
                // HEAD is authoritative after an interrupted PATCH: a server may
                // have persisted all or part of the previous request.
                offset = tusRemoteOffset(session, uploadUrl).coerceIn(0L, file.length())
            }
        }
    }

    private fun tusRemoteOffset(session: StudentSession, uploadUrl: String): Long {
        val request = Request.Builder()
            .url(uploadUrl)
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .header("Authorization", "Bearer ${session.accessToken}")
            .header("Tus-Resumable", "1.0.0")
            .head()
            .build()
        client.newCall(request).execute().use { response ->
            if (response.code !in 200..299) {
                val raw = response.body?.string().orEmpty()
                throw IllegalStateException(errorMessage(raw, response.code))
            }
            return response.header("Upload-Offset")?.toLongOrNull() ?: 0L
        }
    }

    private fun directStorageBaseUrl(): String {
        val base = StudentConfig.SUPABASE_URL.trimEnd('/')
        val suffix = ".supabase.co"
        return if (base.startsWith("https://") && base.endsWith(suffix) && !base.contains(".storage.supabase.co")) {
            base.removeSuffix(suffix) + ".storage.supabase.co"
        } else base
    }

    private fun tusBase64(value: String): String =
        Base64.encodeToString(value.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)

    private class FileRangeRequestBody(
        private val file: File,
        private val offset: Long,
        private val byteCount: Long,
        private val mediaType: MediaType
    ) : RequestBody() {
        override fun contentType(): MediaType = mediaType
        override fun contentLength(): Long = byteCount

        override fun writeTo(sink: BufferedSink) {
            RandomAccessFile(file, "r").use { raf ->
                raf.seek(offset)
                val buffer = ByteArray(64 * 1024)
                var remaining = byteCount
                while (remaining > 0L) {
                    val read = raf.read(buffer, 0, minOf(buffer.size.toLong(), remaining).toInt())
                    if (read < 0) throw IllegalStateException("انتهى الملف قبل اكتمال الرفع.")
                    sink.write(buffer, 0, read)
                    remaining -= read.toLong()
                }
            }
        }
    }

    private class NonRetryableUploadException(message: String) : IllegalStateException(message)

    private companion object {
        const val TUS_CHUNK_BYTES: Long = 6L * 1024L * 1024L
    }

    fun deleteObject(
        session: StudentSession,
        bucket: String,
        path: String
    ): Result<Unit> = runCatching {
        require(bucket.isNotBlank() && path.isNotBlank()) { "مسار الملف غير صالح." }
        val request = Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/storage/v1/object/$bucket/$path")
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .header("Authorization", "Bearer ${session.accessToken}")
            .delete()
            .build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful && response.code != 404) {
                throw IllegalStateException(errorMessage(raw, response.code))
            }
        }
        Unit
    }

    fun savedItems(session: StudentSession): Result<List<SavedItem>> = runCatching {
        val arr = getArray(session, "student_saved_items?select=*&user_id=eq.${session.userId}&order=created_at.desc&limit=500")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(
                    SavedItem(
                        id = o.optString("id"),
                        contentType = o.optString("content_type"),
                        contentId = o.optString("content_id"),
                        createdAt = o.optString("created_at"),
                        title = o.optString("title"),
                        subtitle = o.optString("subtitle"),
                        source = o.optString("source"),
                        target = o.optString("target"),
                        metadataJson = o.optJSONObject("metadata")?.toString() ?: "{}"
                    )
                )
            }
        }
    }

    fun saveItem(
        session: StudentSession,
        contentType: String,
        contentId: String,
        title: String = "",
        subtitle: String = "",
        source: String = "",
        target: String = "",
        metadata: JSONObject = JSONObject()
    ): Result<Unit> = runCatching {
        rpcRaw(
            session,
            "student_saved_upsert_v292",
            JSONObject()
                .put("p_content_type", contentType.trim().lowercase())
                .put("p_content_id", contentId.trim())
                .put("p_title", title.trim())
                .put("p_subtitle", subtitle.trim())
                .put("p_source", source.trim())
                .put("p_target", target.trim())
                .put("p_metadata", metadata)
        )
        Unit
    }

    fun deleteSavedItem(session: StudentSession, savedId: String): Result<Unit> = runCatching {
        requestJson(session, "student_saved_items?id=eq.$savedId&user_id=eq.${session.userId}", "DELETE", null, "return=minimal")
        Unit
    }

    fun removeSavedItem(
        session: StudentSession,
        contentType: String,
        contentId: String
    ): Result<Unit> = runCatching {
        rpcRaw(
            session,
            "student_saved_remove_v292",
            JSONObject()
                .put("p_content_type", contentType.trim().lowercase())
                .put("p_content_id", contentId.trim())
        )
        Unit
    }

    fun clearSavedItems(session: StudentSession, contentType: String? = null): Result<Unit> = runCatching {
        val suffix = contentType?.takeIf { it.isNotBlank() }?.let { "&content_type=eq.${it.trim().lowercase()}" }.orEmpty()
        requestJson(session, "student_saved_items?user_id=eq.${session.userId}$suffix", "DELETE", null, "return=minimal")
        Unit
    }

    fun updateFeatureFlag(session: StudentSession, id: String, enabled: Boolean): Result<Unit> = runCatching {
        val body = JSONObject().put("enabled", enabled)
        requestJson(session, "feature_flags?id=eq.$id", "PATCH", body, "return=minimal")
        Unit
    }

    fun adminBroadcast(session: StudentSession, title: String, bodyText: String, link: String? = null): Result<Unit> = runCatching {
        rpcRaw(
            session,
            "student_admin_broadcast_v2",
            JSONObject().put("p_title", title).put("p_body", bodyText).put("p_link", link ?: JSONObject.NULL)
        )
        Unit
    }

    fun registerPushToken(session: StudentSession, token: String): Result<Unit> = runCatching {
        if (token.isBlank()) return@runCatching Unit

        // Keep only the latest native registration active for this signed-in user.
        // Web/FID registrations are left untouched for the web version.
        runCatching {
            requestJson(
                session,
                "device_push_tokens?user_id=eq.${session.userId}&platform=eq.android-fcm&fcm_token=neq.$token",
                "PATCH",
                JSONObject().put("is_active", false),
                "return=minimal"
            )
        }

        val body = JSONObject()
            .put("user_id", session.userId)
            .put("fcm_token", token)
            .put("platform", "android-fcm")
            .put("is_active", true)
        requestJson(session, "device_push_tokens?on_conflict=fcm_token", "POST", body, "resolution=merge-duplicates,return=minimal")
        Unit
    }


    fun unreadNotificationCount(session: StudentSession): Result<Int> = runCatching {
        getArray(session, "notifications?select=id,actor_id&is_read=eq.false&limit=1000").let { arr ->
            var count = 0
            for (i in 0 until arr.length()) {
                val actor = nullable(arr.getJSONObject(i), "actor_id")
                if (actor == null || actor != session.userId) count++
            }
            count
        }
    }


    fun generateAcademicReport(
        session: StudentSession,
        department: String,
        topic: String,
        language: String,
        pages: Int,
        citationStyle: String,
        mode: String
    ): Result<AcademicReportResult> = runCatching {
        require(topic.trim().length >= 3) { "اكتب موضوع التقرير." }
        val payload = JSONObject()
            .put("department", department.trim())
            .put("topic", topic.trim())
            .put("language", language)
            .put("pages", pages.coerceIn(1, 20))
            .put("citation_style", citationStyle)
            .put("mode", mode)
            .toString()
        val request = Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/functions/v1/academic-report")
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .header("Authorization", "Bearer ${session.accessToken}")
            .post(payload.toRequestBody(jsonType))
            .build()
        // Academic report generation can legitimately take longer than normal API calls,
        // especially when a free routed AI model is busy. Keep normal app requests fast,
        // but allow report generation enough time to complete.
        val reportClient = client.newBuilder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(180, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .callTimeout(200, TimeUnit.SECONDS)
            .build()
        reportClient.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IllegalStateException(errorMessage(raw, response.code))
            val root = JSONObject(raw)
            AcademicReportResult(
                title = root.optString("title").ifBlank { topic.trim() },
                content = root.optString("content").ifBlank { throw IllegalStateException("لم يتم إنشاء التقرير.") },
                mode = root.optString("mode", mode),
                remainingFree = root.optInt("remaining_free", -1).takeIf { it >= 0 },
                remainingCredits = root.optInt("remaining_credits", -1).takeIf { it >= 0 }
            )
        }
    }

    fun callStudentAi(session: StudentSession, mode: String, text: String): Result<String> = runCatching {
        val payload = JSONObject().put("mode", mode).put("prompt", text).put("text", text).toString()
        val request = Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/functions/v1/student-ai")
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .header("Authorization", "Bearer ${session.accessToken}")
            .post(payload.toRequestBody(jsonType))
            .build()
        val aiClient = client.newBuilder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .callTimeout(150, TimeUnit.SECONDS)
            .build()
        aiClient.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IllegalStateException(errorMessage(raw, response.code))
            val root = JSONObject(raw)
            root.optString("answer").ifBlank { throw IllegalStateException("لم تُرجع خدمة Student AI إجابة.") }
        }
    }

    fun aiHistory(session: StudentSession, limit: Int = 80): Result<List<AiChatItem>> = runCatching {
        val arr = getArray(session, "student_ai_messages?select=*&user_id=eq.${session.userId}&order=created_at.asc&limit=$limit")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(AiChatItem(o.optString("id"), o.optString("role", "user"), o.optString("content"), o.optString("mode", "ask"), o.optString("created_at")))
            }
        }
    }

    fun saveAiMessage(session: StudentSession, role: String, content: String, mode: String): Result<Unit> = runCatching {
        requestJson(
            session,
            "student_ai_messages",
            "POST",
            JSONObject().put("user_id", session.userId).put("role", role).put("content", content).put("mode", mode),
            "return=minimal"
        )
        Unit
    }

    fun dailyGrammar(session: StudentSession, day: String): Result<DailyGrammarItem?> = runCatching {
        val arr = rpcArray(session, "student_english_get_daily_grammar", JSONObject().put("p_day", day))
        if (arr.length() == 0) null else arr.getJSONObject(0).let { o ->
            DailyGrammarItem(
                id = first(o, "id").ifBlank { "grammar-$day" },
                title = first(o, "title").ifBlank { "قاعدة اليوم" },
                explanationAr = first(o, "explanation", "explanation_ar"),
                exampleEn = first(o, "example_sentence", "example_en"),
                exampleAr = first(o, "example_ar"),
                level = first(o, "level").ifBlank { "A1" }
            )
        }
    }

    fun verbsBatch(session: StudentSession, sequenceIndex: Int, limit: Int = 10): Result<List<DailyVerbItem>> = runCatching {
        val raw = rpcRaw(
            session,
            "student_english_verbs_batch_v210",
            JSONObject().put("p_expected_sequence", sequenceIndex.coerceAtLeast(0)).put("p_limit", limit.coerceIn(1,20))
        )
        val arr = if (raw.trim().startsWith("[")) JSONArray(raw) else JSONArray()
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(DailyVerbItem(
                    id = o.optString("id"),
                    baseForm = o.optString("base_form"),
                    pastForm = o.optString("past_form"),
                    participle = o.optString("participle"),
                    meaningAr = o.optString("meaning_ar"),
                    exampleEn = o.optString("example_en"),
                    exampleAr = o.optString("example_ar"),
                    irregular = o.optBoolean("irregular", false),
                    level = o.optString("level", "A1")
                ))
            }
        }
    }

    fun dailyVerbs(session: StudentSession, day: String, limit: Int = 10): Result<List<DailyVerbItem>> = runCatching {
        val arr = rpcArray(
            session,
            "student_english_get_daily_verbs",
            JSONObject().put("p_day", day).put("p_limit", limit.coerceIn(1, 20))
        )
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(
                    DailyVerbItem(
                        id = first(o, "id").ifBlank { "verb-$day-$i" },
                        baseForm = first(o, "base_form", "verb"),
                        pastForm = first(o, "past_form", "past"),
                        participle = first(o, "participle", "past_participle"),
                        meaningAr = first(o, "meaning_ar", "meaning"),
                        exampleEn = first(o, "example_en", "example_sentence"),
                        exampleAr = first(o, "example_ar"),
                        irregular = boolFirst(o, "irregular", "is_irregular", default = false),
                        level = first(o, "level").ifBlank { "A1" }
                    )
                )
            }
        }.filter { it.baseForm.isNotBlank() }
    }

    fun learnEnglishContent(session: StudentSession): Result<List<LearnEnglishItem>> = runCatching {
        val today = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Baghdad")).minusHours(8).toLocalDate().toString()
        val daily = mutableListOf<LearnEnglishItem>()
        runCatching {
            val vocab = rpcArray(session, "student_english_get_daily_vocabulary", JSONObject().put("p_day", today))
            for (i in 0 until vocab.length()) {
                val o = vocab.getJSONObject(i)
                val word = first(o, "word", "english_text")
                if (word.isBlank()) continue
                val example = first(o, "example_sentence")
                daily += LearnEnglishItem(
                    id = first(o, "id").ifBlank { "vocab-$i-$today" },
                    title = word,
                    englishText = listOf(word, example).filter { it.isNotBlank() }.joinToString("\n"),
                    arabicText = first(o, "meaning_ar", "arabic_text"),
                    category = "مفردات اليوم",
                    level = first(o, "level").ifBlank { "daily" },
                    sortOrder = i
                )
            }
            val grammar = rpcArray(session, "student_english_get_daily_grammar", JSONObject().put("p_day", today))
            for (i in 0 until grammar.length()) {
                val o = grammar.getJSONObject(i)
                val title = first(o, "title").ifBlank { "قاعدة اليوم" }
                val example = first(o, "example_sentence")
                daily += LearnEnglishItem(
                    id = first(o, "id").ifBlank { "grammar-$i-$today" },
                    title = title,
                    englishText = example.ifBlank { title },
                    arabicText = first(o, "explanation"),
                    category = "قاعدة اليوم",
                    level = first(o, "level").ifBlank { "daily" },
                    sortOrder = 1000 + i
                )
            }
        }
        if (daily.isNotEmpty()) return@runCatching daily

        val arr = getArray(session, "learn_english_content?select=*&is_active=eq.true&order=sort_order.asc,created_at.desc&limit=300")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(
                    LearnEnglishItem(
                        id = o.optString("id"),
                        title = o.optString("title", "English"),
                        englishText = first(o, "english_text", "content_en", "english"),
                        arabicText = first(o, "arabic_text", "content_ar", "arabic"),
                        category = o.optString("category", "عام"),
                        level = o.optString("level", "all"),
                        sortOrder = o.optInt("sort_order", 0)
                    )
                )
            }
        }
    }

    fun adminAddLearnEnglish(
        session: StudentSession,
        title: String,
        englishText: String,
        arabicText: String,
        category: String,
        level: String
    ): Result<Unit> = runCatching {
        requestJson(
            session,
            "learn_english_content",
            "POST",
            JSONObject()
                .put("title", title)
                .put("english_text", englishText)
                .put("arabic_text", arabicText)
                .put("category", category)
                .put("level", level)
                .put("created_by", session.userId)
                .put("is_active", true),
            "return=minimal"
        )
        Unit
    }

    fun myTeacherRequest(session: StudentSession): Result<TeacherRequest?> = runCatching {
        val arr = getArray(session, "teacher_verification_requests?select=*&user_id=eq.${session.userId}&order=created_at.desc&limit=1")
        if (arr.length() == 0) null else parseTeacherRequest(arr.getJSONObject(0))
    }

    fun submitTeacherRequest(
        session: StudentSession,
        fullName: String,
        subject: String,
        educationStage: String,
        experience: String,
        note: String
    ): Result<Unit> = runCatching {
        rpcRaw(
            session,
            "student_submit_teacher_request",
            JSONObject()
                .put("p_full_name", fullName)
                .put("p_subject", subject)
                .put("p_education_stage", educationStage)
                .put("p_experience", experience)
                .put("p_note", note)
        )
        Unit
    }

    fun adminTeacherRequests(session: StudentSession): Result<List<TeacherRequest>> = runCatching {
        val arr = getArray(session, "teacher_verification_requests?select=*&order=created_at.desc&limit=100")
        val base = buildList { for (i in 0 until arr.length()) add(parseTeacherRequest(arr.getJSONObject(i))) }
        val profiles = profileMap(session, base.map { it.userId }.filter { it.isNotBlank() }.distinct())
        base.map { request ->
            val p = profiles[request.userId]
            request.copy(
                fullName = request.fullName.ifBlank { p?.fullName ?: "مستخدم" },
                email = p?.email.orEmpty(),
                username = p?.username.orEmpty()
            )
        }
    }

    fun adminReviewTeacherRequest(session: StudentSession, requestId: String, approve: Boolean, note: String): Result<Unit> = runCatching {
        try {
            rpcRaw(
                session,
                "student_admin_review_teacher_request",
                JSONObject().put("p_request_id", requestId).put("p_approve", approve).put("p_note", note)
            )
        } catch (rpcError: Throwable) {
            // Fallback for older Student deployments where the RPC has not yet been installed.
            val rows = getArray(session, "teacher_verification_requests?select=*&id=eq.$requestId&limit=1")
            require(rows.length() > 0) { "طلب المدرس غير موجود." }
            val row = rows.getJSONObject(0)
            val userId = first(row, "user_id", "teacher_id", "requester_id")
            val now = java.time.Instant.now().toString()
            requestJson(
                session,
                "teacher_verification_requests?id=eq.$requestId",
                "PATCH",
                JSONObject()
                    .put("status", if (approve) "approved" else "rejected")
                    .put("admin_note", note.ifBlank { JSONObject.NULL })
                    .put("reviewed_by", session.userId)
                    .put("reviewed_at", now),
                "return=minimal"
            )
            if (approve && userId.isNotBlank()) {
                requestJson(
                    session,
                    "profiles?id=eq.$userId",
                    "PATCH",
                    JSONObject().put("role", "teacher").put("is_verified", true).put("verification_color", "red"),
                    "return=minimal"
                )
            }
        }
        Unit
    }

    fun homeAds(session: StudentSession): Result<List<HomeAd>> = runCatching {
        val arr = getArray(session, "home_ads?select=*&is_active=eq.true&order=sort_order.asc,created_at.desc&limit=30")
        buildList { for (i in 0 until arr.length()) add(parseHomeAd(arr.getJSONObject(i))) }
    }

    fun adminHomeAds(session: StudentSession): Result<List<HomeAd>> = runCatching {
        val arr = getArray(session, "home_ads?select=*&order=sort_order.asc,created_at.desc&limit=100")
        buildList { for (i in 0 until arr.length()) add(parseHomeAd(arr.getJSONObject(i))) }
    }

    fun adminCreateHomeAd(session: StudentSession, title: String, bodyText: String, imageUrl: String?, actionUrl: String?): Result<Unit> = runCatching {
        requestJson(
            session,
            "home_ads",
            "POST",
            JSONObject().put("title", title).put("body", bodyText)
                .put("image_url", imageUrl ?: JSONObject.NULL)
                .put("action_url", actionUrl ?: JSONObject.NULL)
                .put("is_active", true).put("created_by", session.userId),
            "return=minimal"
        )
        Unit
    }

    fun adminToggleHomeAd(session: StudentSession, adId: String, active: Boolean): Result<Unit> = runCatching {
        requestJson(session, "home_ads?id=eq.$adId", "PATCH", JSONObject().put("is_active", active), "return=minimal")
        Unit
    }

    fun adminDeleteHomeAd(session: StudentSession, adId: String): Result<Unit> = runCatching {
        requestJson(session, "home_ads?id=eq.$adId", "DELETE", null, "return=minimal")
        Unit
    }

    fun submitSuggestion(session: StudentSession, category: String, title: String, bodyText: String): Result<Unit> = runCatching {
        requestJson(
            session,
            "student_feedback",
            "POST",
            JSONObject().put("user_id", session.userId).put("category", category).put("title", title).put("body", bodyText),
            "return=minimal"
        )
        Unit
    }

    fun mySuggestions(session: StudentSession): Result<List<StudentSuggestion>> = runCatching {
        val arr = getArray(session, "student_feedback?select=*&user_id=eq.${session.userId}&order=created_at.desc&limit=100")
        buildList { for (i in 0 until arr.length()) add(parseSuggestion(arr.getJSONObject(i))) }
    }

    fun adminSuggestions(session: StudentSession): Result<List<StudentSuggestion>> = runCatching {
        val arr = getArray(session, "student_feedback?select=*&order=created_at.desc&limit=200")
        buildList { for (i in 0 until arr.length()) add(parseSuggestion(arr.getJSONObject(i))) }
    }

    fun adminReviewSuggestion(session: StudentSession, id: String, status: String, note: String): Result<Unit> = runCatching {
        requestJson(
            session,
            "student_feedback?id=eq.$id",
            "PATCH",
            JSONObject().put("status", status).put("admin_note", note).put("reviewed_by", session.userId),
            "return=minimal"
        )
        Unit
    }

    fun storeTasks(session: StudentSession): Result<List<StoreTask>> = runCatching {
        val arr = getArray(session, "store_tasks?select=*&is_active=eq.true&order=sort_order.asc,created_at.desc&limit=100")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(StoreTask(o.optString("id"), o.optString("title"), o.optString("description"), o.optInt("reward_diamonds"), o.optString("repeat_kind", "once"), o.optString("verification_type", "manual"), o.optBoolean("is_active", true)))
            }
        }
    }

    fun claimStoreTask(session: StudentSession, taskId: String): Result<Int> = runCatching {
        val raw = rpcRaw(session, "claim_store_task", JSONObject().put("p_task_id", taskId))
        val o = parseObjectFromRpc(raw)
        intFirst(o, "new_balance", "balance")
    }

    fun diamondPackages(session: StudentSession): Result<List<DiamondPackage>> = runCatching {
        val arr = getArray(session, "store_diamond_packages?select=*&is_active=eq.true&order=sort_order.asc&limit=100")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(DiamondPackage(o.optString("id"), o.optString("title"), o.optInt("diamonds"), o.optInt("user_price_iqd"), o.optInt("agent_price_iqd"), o.optBoolean("is_active", true)))
            }
        }
    }

    fun requestDiamondPurchase(session: StudentSession, pack: DiamondPackage, paymentReference: String): Result<Unit> = runCatching {
        requestJson(
            session,
            "store_diamond_purchase_requests",
            "POST",
            JSONObject().put("user_id", session.userId).put("package_id", pack.id).put("diamonds", pack.diamonds).put("amount_iqd", pack.userPriceIqd).put("payment_reference", paymentReference),
            "return=minimal"
        )
        Unit
    }

    fun submitDiamondPayment(session: StudentSession, pack: DiamondPackage, senderName: String, cardLast4: String): Result<String> = runCatching {
        require(senderName.trim().length in 2..80) { "اكتب اسم صاحب البطاقة بشكل صحيح." }
        require(Regex("^[0-9]{4}$").matches(cardLast4.trim())) { "اكتب آخر 4 أرقام من البطاقة فقط." }
        val raw = rpcRaw(
            session,
            "store_submit_diamond_payment",
            JSONObject().put("p_package_id", pack.id).put("p_sender_name", senderName.trim()).put("p_card_last4", cardLast4.trim())
        ).trim()
        raw.trim('"').ifBlank { "pending" }
    }

    fun myAgencyApplication(session: StudentSession): Result<AgencyApplication?> = runCatching {
        val arr = getArray(session, "store_agency_applications?select=*&user_id=eq.${session.userId}&order=created_at.desc&limit=1")
        if (arr.length() == 0) null else parseAgency(arr.getJSONObject(0))
    }

    fun submitAgencyApplication(
        session: StudentSession,
        fullName: String,
        province: String,
        phone: String,
        whatsapp: String,
        telegram: String,
        experience: String
    ): Result<Unit> = runCatching {
        requestJson(
            session,
            "store_agency_applications",
            "POST",
            JSONObject().put("user_id", session.userId).put("full_name", fullName).put("province", province).put("phone", phone)
                .put("whatsapp", whatsapp.ifBlank { JSONObject.NULL }).put("telegram", telegram.ifBlank { JSONObject.NULL }).put("experience", experience),
            "return=minimal"
        )
        Unit
    }

    fun walletTransactions(session: StudentSession): Result<List<WalletTransaction>> = runCatching {
        val arr = getArray(session, "store_wallet_transactions?select=*&user_id=eq.${session.userId}&order=created_at.desc&limit=200")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(WalletTransaction(o.optString("id"), o.optDouble("amount"), o.optDouble("balance_after"), o.optString("transaction_type"), o.optString("description"), o.optString("created_at")))
            }
        }
    }

    private fun parseTeacherRequest(o: JSONObject) = TeacherRequest(
        id = o.optString("id"), userId = first(o, "user_id", "teacher_id", "requester_id"),
        fullName = first(o, "full_name", "display_name").ifBlank { "مستخدم" }, subject = first(o, "subject", "teaching_subject"),
        educationStage = first(o, "education_stage", "stage"), experience = o.optString("experience"), note = o.optString("note"),
        status = o.optString("status", "pending"), createdAt = o.optString("created_at"), adminNote = nullable(o, "admin_note")
    )

    private fun parseHomeAd(o: JSONObject) = HomeAd(
        id = o.optString("id"), title = first(o, "title").ifBlank { "Student" }, body = first(o, "body", "description"),
        imageUrl = nullable(o, "image_url"), actionUrl = nullableFirst(o, "action_url", "link"), isActive = o.optBoolean("is_active", true),
        sortOrder = o.optInt("sort_order", 0), createdAt = o.optString("created_at")
    )

    private fun parseSuggestion(o: JSONObject) = StudentSuggestion(
        id = o.optString("id"), userId = o.optString("user_id"), category = o.optString("category", "general"),
        title = o.optString("title"), body = o.optString("body"), status = o.optString("status", "pending"),
        adminNote = nullable(o, "admin_note"), createdAt = o.optString("created_at")
    )

    private fun parseAgency(o: JSONObject) = AgencyApplication(
        id = o.optString("id"),
        fullName = o.optString("full_name"),
        userId = o.optString("user_id"),
        province = o.optString("province"),
        phone = o.optString("phone"),
        whatsapp = nullable(o, "whatsapp"),
        telegram = nullable(o, "telegram"),
        experience = o.optString("experience"),
        status = o.optString("status", "pending"),
        adminNote = nullable(o, "admin_note"),
        createdAt = o.optString("created_at")
    )

    fun adminManagedProducts(session: StudentSession): Result<List<AdminManagedProduct>> = runCatching {
        val arr = getArray(session, "store_products?select=id,name,description,product_type,price_money,price_diamonds,allow_money,allow_diamonds,is_active&order=created_at.desc&limit=300")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(AdminManagedProduct(
                    id = o.optString("id"), name = o.optString("name"), description = o.optString("description"),
                    productType = o.optString("product_type", "physical"), priceMoney = o.optDouble("price_money", 0.0),
                    priceDiamonds = o.optInt("price_diamonds", 0), allowMoney = o.optBoolean("allow_money", true),
                    allowDiamonds = o.optBoolean("allow_diamonds", false), isActive = o.optBoolean("is_active", true)
                ))
            }
        }
    }

    fun adminAllStoreTasks(session: StudentSession): Result<List<StoreTask>> = runCatching {
        val arr = getArray(session, "store_tasks?select=*&order=sort_order.asc,created_at.desc&limit=300")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(StoreTask(o.optString("id"), o.optString("title"), o.optString("description"), o.optInt("reward_diamonds"), o.optString("repeat_kind", "once"), o.optString("verification_type", "manual"), o.optBoolean("is_active", true)))
            }
        }
    }

    fun adminAllDiamondPackages(session: StudentSession): Result<List<DiamondPackage>> = runCatching {
        val arr = getArray(session, "store_diamond_packages?select=*&order=sort_order.asc,created_at.desc&limit=300")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(DiamondPackage(o.optString("id"), o.optString("title"), o.optInt("diamonds"), o.optInt("user_price_iqd"), o.optInt("agent_price_iqd"), o.optBoolean("is_active", true)))
            }
        }
    }

    fun adminSaveProduct(session: StudentSession, id: String?, name: String, description: String, productType: String, priceMoney: Double, priceDiamonds: Int, allowMoney: Boolean, allowDiamonds: Boolean, active: Boolean): Result<String> = runCatching {
        val raw = rpcRaw(session, "student_admin_store_product_upsert", JSONObject()
            .put("p_id", id?.takeIf { it.isNotBlank() } ?: JSONObject.NULL)
            .put("p_name", name.trim()).put("p_description", description.trim()).put("p_product_type", productType)
            .put("p_price_money", priceMoney).put("p_price_diamonds", priceDiamonds)
            .put("p_allow_money", allowMoney).put("p_allow_diamonds", allowDiamonds).put("p_is_active", active))
        raw.trim().trim('"')
    }

    fun adminDeleteProduct(session: StudentSession, id: String): Result<Unit> = runCatching {
        rpcRaw(session, "student_admin_store_product_delete", JSONObject().put("p_id", id)); Unit
    }

    fun adminSaveStoreTask(session: StudentSession, id: String?, title: String, description: String, reward: Int, repeatKind: String, verificationType: String, active: Boolean): Result<String> = runCatching {
        val raw = rpcRaw(session, "student_admin_store_task_upsert", JSONObject()
            .put("p_id", id?.takeIf { it.isNotBlank() } ?: JSONObject.NULL).put("p_title", title.trim())
            .put("p_description", description.trim()).put("p_reward_diamonds", reward).put("p_repeat_kind", repeatKind)
            .put("p_verification_type", verificationType).put("p_is_active", active))
        raw.trim().trim('"')
    }

    fun adminDeleteStoreTask(session: StudentSession, id: String): Result<Unit> = runCatching {
        rpcRaw(session, "student_admin_store_task_delete", JSONObject().put("p_id", id)); Unit
    }

    fun adminSaveDiamondPackage(session: StudentSession, id: String?, title: String, diamonds: Int, userPriceIqd: Int, agentPriceIqd: Int, active: Boolean): Result<String> = runCatching {
        val raw = rpcRaw(session, "student_admin_diamond_package_upsert", JSONObject()
            .put("p_id", id?.takeIf { it.isNotBlank() } ?: JSONObject.NULL).put("p_title", title.trim())
            .put("p_diamonds", diamonds).put("p_user_price_iqd", userPriceIqd).put("p_agent_price_iqd", agentPriceIqd).put("p_is_active", active))
        raw.trim().trim('"')
    }

    fun adminDeleteDiamondPackage(session: StudentSession, id: String): Result<Unit> = runCatching {
        rpcRaw(session, "student_admin_diamond_package_delete", JSONObject().put("p_id", id)); Unit
    }

    fun adminAdjustDiamonds(session: StudentSession, username: String, delta: Int, note: String): Result<Int> = runCatching {
        val raw = rpcRaw(session, "student_admin_adjust_diamonds", JSONObject().put("p_username", username.trim().removePrefix("@")).put("p_delta", delta).put("p_note", note.trim()))
        val o = JSONObject(raw)
        o.optInt("balance")
    }

    fun adminStoreOrders(session: StudentSession): Result<List<AdminStoreOrder>> = runCatching {
        val arr = getArray(session, "store_orders?select=*&order=created_at.desc&limit=200")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(
                    AdminStoreOrder(
                        id = o.optString("id"),
                        userId = o.optString("user_id"),
                        productName = o.optString("product_name", "طلب متجر"),
                        paymentMethod = o.optString("payment_method"),
                        moneyAmount = o.optDouble("money_amount", 0.0),
                        diamondAmount = o.optInt("diamond_amount", 0),
                        status = o.optString("status", "pending"),
                        createdAt = o.optString("created_at")
                    )
                )
            }
        }
    }

    fun adminDiamondPurchaseRequests(session: StudentSession): Result<List<DiamondPurchaseRequest>> = runCatching {
        val arr = getArray(session, "store_diamond_purchase_requests?select=*&order=created_at.desc&limit=200")
        val userIds = buildList { for (i in 0 until arr.length()) arr.getJSONObject(i).optString("user_id").takeIf { it.isNotBlank() }?.let(::add) }.distinct()
        val profiles = profileMap(session, userIds)
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val uid=o.optString("user_id")
                val p=profiles[uid]
                add(
                    DiamondPurchaseRequest(
                        id = o.optString("id"),
                        userId = uid,
                        diamonds = o.optInt("diamonds"),
                        amountIqd = o.optInt("amount_iqd"),
                        paymentReference = nullable(o, "payment_reference"),
                        status = o.optString("status", "pending"),
                        createdAt = o.optString("created_at"),
                        fullName = p?.fullName.orEmpty(),
                        username = p?.username.orEmpty(),
                        email = p?.email.orEmpty()
                    )
                )
            }
        }
    }

    fun adminAgencyApplications(session: StudentSession): Result<List<AgencyApplication>> = runCatching {
        val arr = getArray(session, "store_agency_applications?select=*&order=created_at.desc&limit=200")
        buildList { for (i in 0 until arr.length()) add(parseAgency(arr.getJSONObject(i))) }
    }

    fun adminWallets(session: StudentSession): Result<List<AdminWalletRow>> = runCatching {
        val arr = getArray(session, "store_wallets?select=*&order=updated_at.desc&limit=200")
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(
                    AdminWalletRow(
                        userId = o.optString("user_id"),
                        availableBalance = o.optDouble("available_balance", 0.0),
                        heldBalance = o.optDouble("held_balance", 0.0),
                        totalPurchased = o.optDouble("total_purchased", 0.0),
                        totalSpent = o.optDouble("total_spent", 0.0),
                        updatedAt = o.optString("updated_at")
                    )
                )
            }
        }
    }

    fun adminUpdateStoreOrder(session: StudentSession, orderId: String, status: String): Result<Unit> = runCatching {
        require(status in setOf("pending", "confirmed", "preparing", "shipping", "completed", "cancelled", "refunded")) { "حالة الطلب غير صالحة." }
        rpcRaw(session, "admin_update_store_order", JSONObject().put("p_order_id", orderId).put("p_status", status))
        Unit
    }

    fun adminReviewDiamondRequest(session: StudentSession, requestId: String, approve: Boolean): Result<Unit> = runCatching {
        rpcRaw(session, "admin_review_diamond_request", JSONObject().put("p_request_id", requestId).put("p_approve", approve))
        Unit
    }

    fun adminReviewAgencyApplication(session: StudentSession, applicationId: String, approve: Boolean, note: String): Result<Unit> = runCatching {
        rpcRaw(
            session,
            "admin_review_agency_application",
            JSONObject().put("p_application_id", applicationId).put("p_approve", approve).put("p_note", note.ifBlank { JSONObject.NULL })
        )
        Unit
    }

    fun adminCreateSchoolSubject(
        session: StudentSession,
        levelId: String,
        name: String,
        slug: String,
        description: String
    ): Result<String> = runCatching {
        runCatching {
            rpcRaw(session, "student_admin_create_school_subject", JSONObject()
                .put("p_level_id", levelId)
                .put("p_name", name.trim())
                .put("p_slug", slug.trim())
                .put("p_description", description.trim()))
                .trim().trim('"')
        }.getOrElse {
            val raw = requestJson(
                session,
                "education_subjects",
                "POST",
                JSONObject().put("name", name.trim()).put("slug", slug.trim()).put("description", description.trim()).put("is_active", true).put("is_visible", true),
                "return=representation"
            )
            val arr = JSONArray(raw)
            val id = arr.optJSONObject(0)?.optString("id").orEmpty()
            require(id.isNotBlank()) { "تعذر إنشاء المادة." }
            requestJson(session, "education_level_subjects", "POST", JSONObject().put("level_id", levelId).put("subject_id", id).put("sort_order", 0).put("is_active", true).put("is_visible", true), "return=minimal")
            id
        }
    }

    fun adminCreateUniversitySubject(
        session: StudentSession,
        universityLevelId: String,
        name: String,
        slug: String,
        description: String
    ): Result<String> = runCatching {
        runCatching {
            rpcRaw(session, "student_admin_create_university_subject", JSONObject()
                .put("p_university_level_id", universityLevelId)
                .put("p_name", name.trim())
                .put("p_slug", slug.trim())
                .put("p_description", description.trim()))
                .trim().trim('"')
        }.getOrElse {
            val raw = requestJson(
                session,
                "university_subjects",
                "POST",
                JSONObject().put("name", name.trim()).put("slug", slug.trim()).put("description", description.trim()).put("is_active", true).put("is_visible", true),
                "return=representation"
            )
            val arr = JSONArray(raw)
            val id = arr.optJSONObject(0)?.optString("id").orEmpty()
            require(id.isNotBlank()) { "تعذر إنشاء مادة الجامعة." }
            requestJson(session, "university_level_subjects", "POST", JSONObject().put("university_level_id", universityLevelId).put("subject_id", id).put("sort_order", 0).put("is_active", true).put("is_visible", true), "return=minimal")
            id
        }
    }

    fun publishEducationMaterial(
        session: StudentSession,
        subjectId: String,
        title: String,
        description: String,
        materialType: String,
        externalUrl: String?,
        universityLevelId: String? = null,
        fileUrl: String? = null,
        fileName: String? = null,
        mimeType: String? = null,
        fileSize: Long? = null,
        educationType: String = if (universityLevelId.isNullOrBlank()) "school" else "university",
        levelId: String? = null,
        trackId: String? = null
    ): Result<Unit> = runCatching {
        require(subjectId.isNotBlank() && title.isNotBlank()) { "المادة والعنوان مطلوبان." }
        val role = profile(session).getOrNull()?.role?.lowercase().orEmpty()
        val modernRpc = if (role == "admin") "student_admin_add_education_material" else "student_add_education_material"
        val body = JSONObject()
            .put("p_education_type", educationType)
            .put("p_subject_id", subjectId)
            .put("p_level_id", levelId ?: JSONObject.NULL)
            .put("p_track_id", trackId ?: JSONObject.NULL)
            .put("p_university_level_id", universityLevelId ?: JSONObject.NULL)
            .put("p_title", title.trim())
            .put("p_description", description.trim())
            .put("p_material_type", materialType)
            .put("p_file_url", fileUrl ?: JSONObject.NULL)
            .put("p_external_url", externalUrl ?: JSONObject.NULL)
            .put("p_file_name", fileName ?: JSONObject.NULL)
            .put("p_mime_type", mimeType ?: JSONObject.NULL)
            .put("p_file_size", fileSize ?: JSONObject.NULL)
        try {
            rpcRaw(session, "student_publish_education_material_v191", body)
        } catch (_: Throwable) {
            try {
                rpcRaw(session, modernRpc, body)
            } catch (_: Throwable) {
                // Compatibility fallback for the first Native RPC used by FIX6.
                rpcRaw(
                    session,
                    "student_publish_education_material",
                    JSONObject()
                        .put("p_subject_id", subjectId)
                        .put("p_title", title.trim())
                        .put("p_description", description.trim())
                        .put("p_material_type", materialType)
                        .put("p_external_url", externalUrl ?: fileUrl ?: JSONObject.NULL)
                        .put("p_university_level_id", universityLevelId ?: JSONObject.NULL)
                )
            }
        }
        Unit
    }

    fun adminAddEducationMaterial(
        session: StudentSession,
        subjectId: String,
        title: String,
        description: String,
        materialType: String,
        externalUrl: String?,
        universityLevelId: String? = null
    ): Result<Unit> = publishEducationMaterial(session, subjectId, title, description, materialType, externalUrl, universityLevelId)

    private fun profileMap(session: StudentSession, ids: List<String>): Map<String, StudentProfile> {
        if (ids.isEmpty()) return emptyMap()
        return runCatching {
            val arr = getArray(session, "profiles?select=*&id=in.(${ids.joinToString(",")})")
            buildMap {
                for (i in 0 until arr.length()) {
                    val p = parseProfile(arr.getJSONObject(i), "")
                    put(p.id, p)
                }
            }
        }.getOrDefault(emptyMap())
    }

    private fun parseSupportTicket(o: JSONObject): SupportTicketItem = SupportTicketItem(
        id=o.optString("id"),userId=o.optString("user_id"),subject=o.optString("subject"),message=o.optString("message"),status=o.optString("status","open"),adminReply=nullable(o,"admin_reply"),createdAt=o.optString("created_at")
    )

    private fun parseVerificationRequest(o: JSONObject): VerificationRequestItem = VerificationRequestItem(
        id=o.optString("id"), userId=o.optString("user_id"), fullName=o.optString("full_name"),
        governorate=o.optString("governorate",""), schoolName=o.optString("school_name",""), universityName=o.optString("university_name",""),
        reason=o.optString("reason",""), status=o.optString("status","pending"), adminNote=nullable(o,"admin_note"), createdAt=o.optString("created_at")
    )

    private fun parseProfile(o: JSONObject, fallbackEmail: String): StudentProfile = StudentProfile(
        id = o.optString("id"),
        fullName = first(o, "full_name", "display_name").ifBlank { "مستخدم" },
        username = first(o, "username").ifBlank { "student" },
        email = o.optString("email", fallbackEmail),
        bio = o.optString("bio", ""),
        avatarUrl = nullable(o, "avatar_url"),
        role = first(o, "role").ifBlank { "student" },
        accountStatus = o.optString("account_status", "public"),
        profileFrameUrl = nullable(o, "profile_frame_url"),
        isVerified = o.optBoolean("is_verified", false),
        verificationColor = nullable(o, "verification_color"),
        customBadgeLabel = nullable(o, "custom_badge_label"),
        customBadgeColor = nullable(o, "custom_badge_color"),
        createdAt = nullable(o, "created_at"),
        lastActiveAt = nullable(o, "last_active_at"),
        requestedRole = nullable(o, "requested_role"),
        governorate = first(o, "governorate"),
        schoolName = first(o, "school_name"),
        universityName = first(o, "university_name")
    )


    fun learningProgress(session: StudentSession, sectionKey: String): Result<LearningProgressState> = runCatching {
        val raw = rpcRaw(session, "student_learning_progress_get_v210", JSONObject().put("p_section_key", sectionKey))
        val obj = when {
            raw.trim().startsWith("[") -> JSONArray(raw).optJSONObject(0) ?: JSONObject()
            raw.trim().startsWith("{") -> JSONObject(raw)
            else -> JSONObject()
        }
        LearningProgressState(
            sectionKey = sectionKey,
            sequenceIndex = obj.optInt("sequence_index", 0).coerceAtLeast(0),
            completedForCurrentSlot = obj.optBoolean("completed_for_current_slot", false),
            availableAfter = obj.optString("available_after").takeIf { it.isNotBlank() && it != "null" },
            completedUnits = obj.optInt("completed_units", 0).coerceAtLeast(0),
            totalUnits = obj.optInt("total_units", 0).coerceAtLeast(0),
            completedItems = obj.optInt("completed_items", 0).coerceAtLeast(0),
            totalItems = obj.optInt("total_items", 0).coerceAtLeast(0),
            progressPercent = obj.optDouble("progress_percent", 0.0).coerceIn(0.0, 100.0)
        )
    }

    fun completeLearningSlot(session: StudentSession, sectionKey: String, expectedSequence: Int): Result<LearningProgressState> = runCatching {
        val raw = rpcRaw(session, "student_learning_progress_complete_v210", JSONObject()
            .put("p_section_key", sectionKey)
            .put("p_expected_sequence", expectedSequence))
        val obj = when {
            raw.trim().startsWith("[") -> JSONArray(raw).optJSONObject(0) ?: JSONObject()
            raw.trim().startsWith("{") -> JSONObject(raw)
            else -> JSONObject()
        }
        LearningProgressState(
            sectionKey = sectionKey,
            sequenceIndex = obj.optInt("sequence_index", expectedSequence + 1).coerceAtLeast(0),
            completedForCurrentSlot = obj.optBoolean("completed_for_current_slot", false),
            availableAfter = null,
            completedUnits = obj.optInt("completed_units", expectedSequence + 1).coerceAtLeast(0),
            totalUnits = obj.optInt("total_units", 0).coerceAtLeast(0),
            completedItems = obj.optInt("completed_items", 0).coerceAtLeast(0),
            totalItems = obj.optInt("total_items", 0).coerceAtLeast(0),
            progressPercent = obj.optDouble("progress_percent", 0.0).coerceIn(0.0, 100.0)
        )
    }

    fun voiceRooms(session: StudentSession, query: String = ""): Result<List<VoiceRoomItem>> = runCatching {
        val raw = rpcRaw(session, "student_voice_rooms_list_v26", JSONObject().put("p_query", query.trim()).put("p_limit", 80))
        val arr = if (raw.isBlank()) JSONArray() else JSONArray(raw)
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                add(VoiceRoomItem(
                    id=o.optString("id"), title=o.optString("title"), description=o.optString("description"),
                    ownerId=o.optString("owner_id"), ownerName=o.optString("owner_name", "مستخدم"), ownerAvatarUrl=o.optString("owner_avatar_url").takeIf{it.isNotBlank()&&it!="null"},
                    memberCount=o.optInt("member_count",0), capacity=o.optInt("capacity",50), isLocked=o.optBoolean("is_locked",false), isActive=o.optBoolean("is_active",true), createdAt=o.optString("created_at"),
                    unlockedMics=o.optInt("unlocked_mics",5), backgroundUrl=o.optString("background_url").takeIf{it.isNotBlank()&&it!="null"}, isSaved=o.optBoolean("is_saved",false)
                ))
            }
        }
    }

    fun createVoiceRoom(session: StudentSession, title: String, description: String): Result<String> = runCatching {
        val raw = rpcRaw(session, "student_voice_room_create_v24", JSONObject().put("p_title", title.trim()).put("p_description", description.trim()))
        raw.trim().trim('"')
    }

    fun voiceRoomMembers(session: StudentSession, roomId: String): Result<List<VoiceRoomMember>> = runCatching {
        val raw = rpcRaw(session, "student_voice_room_members_v25", JSONObject().put("p_room_id", roomId))
        val arr = if(raw.isBlank()) JSONArray() else JSONArray(raw)
        buildList {
            for(i in 0 until arr.length()){
                val o=arr.getJSONObject(i)
                add(VoiceRoomMember(o.optString("user_id"),o.optString("full_name","مستخدم"),o.optString("username"),o.optString("avatar_url").takeIf{it.isNotBlank()&&it!="null"},o.optString("role","student"),o.optString("room_role","listener"),o.optString("mic_state","listener"),o.optString("joined_at"),o.optInt("mic_slot",0).takeIf{it>0},o.optBoolean("is_following",false)))
            }
        }
    }

    fun voiceRoomSettings(session: StudentSession): Result<VoiceRoomSettings> = runCatching {
        val arr=getArray(session,"student_voice_room_settings?id=eq.1&select=creation_price_diamonds,max_speakers,rooms_enabled,gifts_enabled,extra_mic_price_diamonds&limit=1")
        if(arr.length()==0) VoiceRoomSettings() else arr.getJSONObject(0).let { o -> VoiceRoomSettings(o.optInt("creation_price_diamonds",100),o.optInt("max_speakers",10),o.optBoolean("rooms_enabled",true),o.optBoolean("gifts_enabled",true),o.optInt("extra_mic_price_diamonds",50)) }
    }

    fun adminSetVoiceRoomSettings(session: StudentSession, settings: VoiceRoomSettings): Result<Unit> = runCatching {
        rpcRaw(session,"student_voice_room_admin_settings_v24",JSONObject().put("p_creation_price",settings.creationPriceDiamonds).put("p_max_speakers",settings.maxSpeakers).put("p_rooms_enabled",settings.roomsEnabled).put("p_gifts_enabled",settings.giftsEnabled)); Unit
    }


    fun adminSetVoiceRoomSettingsV25(session: StudentSession, settings: VoiceRoomSettings): Result<Unit> = runCatching {
        rpcRaw(session,"student_voice_room_admin_settings_v25",JSONObject().put("p_creation_price",settings.creationPriceDiamonds).put("p_extra_mic_price",settings.extraMicPriceDiamonds).put("p_rooms_enabled",settings.roomsEnabled).put("p_gifts_enabled",settings.giftsEnabled)); Unit
    }

    fun adminSetVoiceRoomTier(session: StudentSession, capacity:Int, diamonds:Int, active:Boolean): Result<Unit> = runCatching {
        rpcRaw(session,"student_voice_room_admin_tier_v24",JSONObject().put("p_capacity",capacity).put("p_diamonds",diamonds).put("p_active",active)); Unit
    }

    fun voiceRoomCapacityTiers(session: StudentSession): Result<List<VoiceRoomCapacityTier>> = runCatching {
        val arr=getArray(session,"student_voice_room_capacity_tiers?select=capacity,diamonds&is_active=eq.true&order=capacity.asc")
        buildList { for(i in 0 until arr.length()){ val o=arr.getJSONObject(i); add(VoiceRoomCapacityTier(o.optInt("capacity"),o.optInt("diamonds"))) } }
    }

    fun voiceRoomGiftPacks(session: StudentSession): Result<List<VoiceRoomGiftPack>> = runCatching {
        val arr=getArray(session,"student_voice_room_gift_packs?select=id,name,diamonds,icon_key,sort_order&is_active=eq.true&order=sort_order.asc")
        buildList { for(i in 0 until arr.length()){ val o=arr.getJSONObject(i); add(VoiceRoomGiftPack(o.optString("id"),o.optString("name"),o.optInt("diamonds"),o.optString("icon_key","gift"),o.optInt("sort_order"))) } }
    }

    fun joinVoiceRoom(session: StudentSession, roomId: String): Result<Unit> = runCatching {
        rpcRaw(session,"student_voice_room_join_v24",JSONObject().put("p_room_id",roomId)); Unit
    }

    fun leaveVoiceRoom(session: StudentSession, roomId: String): Result<Unit> = runCatching {
        // v27 explicitly clears any microphone slot before leaving. Fall back to the legacy RPC
        // only on deployments where the v27 migration has not been applied yet.
        runCatching { rpcRaw(session,"student_voice_room_leave_v27",JSONObject().put("p_room_id",roomId)) }
            .getOrElse { rpcRaw(session,"student_voice_room_leave_v24",JSONObject().put("p_room_id",roomId)) }
        Unit
    }

    fun requestVoiceMic(session: StudentSession, roomId: String, slot: Int): Result<Unit> = runCatching {
        rpcRaw(session,"student_voice_room_request_mic_v25",JSONObject().put("p_room_id",roomId).put("p_slot",slot)); Unit
    }

    fun unlockVoiceMic(session: StudentSession, roomId: String): Result<Int> = runCatching {
        val raw=rpcRaw(session,"student_voice_room_unlock_mic_v25",JSONObject().put("p_room_id",roomId))
        val o=parseObjectFromRpc(raw); o.optInt("unlocked_mics",5)
    }

    fun toggleSavedVoiceRoom(session: StudentSession, roomId: String, save: Boolean): Result<Unit> = runCatching {
        rpcRaw(session,"student_voice_room_save_v25",JSONObject().put("p_room_id",roomId).put("p_save",save)); Unit
    }

    fun voiceRoomFeed(session: StudentSession, roomId: String): Result<List<VoiceRoomFeedItem>> = runCatching {
        val raw=rpcRaw(session,"student_voice_room_feed_v26",JSONObject().put("p_room_id",roomId).put("p_limit",80))
        val arr=if(raw.isBlank()) JSONArray() else JSONArray(raw)
        buildList {
            for(i in 0 until arr.length()){
                val o=arr.getJSONObject(i)
                val rx=o.optJSONObject("reactions")
                val reactionMap=buildMap<String,Int>{
                    if(rx!=null){ val keys=rx.keys(); while(keys.hasNext()){ val k=keys.next(); put(k,rx.optInt(k,0)) } }
                }
                add(VoiceRoomFeedItem(
                    id=o.optString("id"),kind=o.optString("kind"),userId=o.optString("user_id"),userName=o.optString("user_name","مستخدم"),
                    targetUserId=o.optString("target_user_id").takeIf{it.isNotBlank()&&it!="null"},
                    targetName=o.optString("target_name").takeIf{it.isNotBlank()&&it!="null"},message=o.optString("message"),
                    giftEmoji=o.optString("gift_emoji").takeIf{it.isNotBlank()&&it!="null"},createdAt=o.optString("created_at"),
                    replyToId=o.optString("reply_to_id").takeIf{it.isNotBlank()&&it!="null"},
                    replyToName=o.optString("reply_to_name").takeIf{it.isNotBlank()&&it!="null"},
                    replyToMessage=o.optString("reply_to_message").takeIf{it.isNotBlank()&&it!="null"},
                    reactions=reactionMap,myReaction=o.optString("my_reaction").takeIf{it.isNotBlank()&&it!="null"}
                ))
            }
        }
    }

    fun sendVoiceRoomMessage(session: StudentSession, roomId: String, message: String, replyToId: String? = null): Result<Unit> = runCatching {
        rpcRaw(session,"student_voice_room_message_v26",JSONObject().put("p_room_id",roomId).put("p_message",message.trim()).put("p_reply_to_id",replyToId ?: JSONObject.NULL)); Unit
    }

    fun reactVoiceRoomMessage(session: StudentSession, roomId: String, feedId: String, reaction: String): Result<Unit> = runCatching {
        rpcRaw(session,"student_voice_room_react_v26",JSONObject().put("p_room_id",roomId).put("p_feed_id",feedId).put("p_reaction",reaction)); Unit
    }

    fun voiceRoomBackgrounds(session: StudentSession): Result<List<VoiceRoomBackground>> = runCatching {
        val raw=rpcRaw(session,"student_voice_room_backgrounds_v25",JSONObject())
        val arr=if(raw.isBlank()) JSONArray() else JSONArray(raw)
        buildList { for(i in 0 until arr.length()){ val o=arr.getJSONObject(i); add(VoiceRoomBackground(o.optString("id"),o.optString("name"),o.optString("image_url"),o.optInt("diamonds",0),o.optBoolean("is_owned",false),o.optBoolean("is_active",true))) } }
    }

    fun purchaseVoiceRoomBackground(session: StudentSession, backgroundId: String): Result<Unit> = runCatching {
        rpcRaw(session,"student_voice_room_background_purchase_v25",JSONObject().put("p_background_id",backgroundId)); Unit
    }

    fun applyVoiceRoomBackground(session: StudentSession, roomId: String, backgroundId: String?): Result<Unit> = runCatching {
        rpcRaw(session,"student_voice_room_background_apply_v25",JSONObject().put("p_room_id",roomId).put("p_background_id",backgroundId ?: JSONObject.NULL)); Unit
    }

    fun applyCustomVoiceRoomBackground(session: StudentSession, roomId: String, imageUrl: String?): Result<Unit> = runCatching {
        rpcRaw(session,"student_voice_room_background_custom_v26",JSONObject().put("p_room_id",roomId).put("p_image_url",imageUrl ?: JSONObject.NULL)); Unit
    }

    fun adminAddVoiceRoomBackground(session: StudentSession, name: String, imageUrl: String, diamonds: Int, active: Boolean=true): Result<Unit> = runCatching {
        rpcRaw(session,"student_voice_room_background_admin_upsert_v25",JSONObject().put("p_id",JSONObject.NULL).put("p_name",name.trim()).put("p_image_url",imageUrl).put("p_diamonds",diamonds).put("p_active",active)); Unit
    }

    fun setVoiceMemberMic(session: StudentSession, roomId: String, userId: String, allow: Boolean): Result<Unit> = runCatching {
        rpcRaw(session,"student_voice_room_set_mic_v25",JSONObject().put("p_room_id",roomId).put("p_user_id",userId).put("p_allow",allow)); Unit
    }

    fun manageVoiceRoomMember(session: StudentSession, roomId: String, userId: String, action: String, reason: String = ""): Result<Unit> = runCatching {
        rpcRaw(
            session,
            "student_voice_room_manage_member_v28",
            JSONObject()
                .put("p_room_id", roomId)
                .put("p_user_id", userId)
                .put("p_action", action)
                .put("p_reason", reason.trim())
        )
        Unit
    }

    fun upgradeVoiceRoom(session: StudentSession, roomId: String, targetCapacity: Int): Result<Unit> = runCatching {
        rpcRaw(session,"student_voice_room_upgrade_v24",JSONObject().put("p_room_id",roomId).put("p_target_capacity",targetCapacity)); Unit
    }

    fun sendVoiceRoomGift(session: StudentSession, roomId: String, packId: String, recipientId: String?): Result<Unit> = runCatching {
        rpcRaw(session,"student_voice_room_send_gift_v26",JSONObject().put("p_room_id",roomId).put("p_pack_id",packId).put("p_recipient_id",recipientId ?: JSONObject.NULL)); Unit
    }

    fun voiceRoomToken(session: StudentSession, roomId: String): Result<VoiceRoomToken> = runCatching {
        val body=JSONObject().put("room_id",roomId).toString()
        val request=Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/functions/v1/livekit-room-token")
            .header("apikey",StudentConfig.SUPABASE_KEY)
            .header("Authorization","Bearer ${session.accessToken}")
            .post(body.toRequestBody(jsonType)).build()
        client.newCall(request).execute().use { response ->
            val raw=response.body?.string().orEmpty()
            if(!response.isSuccessful) throw IllegalStateException(errorMessage(raw,response.code))
            val o=JSONObject(raw)
            VoiceRoomToken(o.getString("url"),o.getString("token"),o.optBoolean("can_publish",false),o.optString("room_role","listener"))
        }
    }

    fun moderatePublicMedia(
        session: StudentSession,
        mediaUrl: String,
        mediaType: String,
        text: String = "",
        previewUrls: List<String> = emptyList()
    ): Result<String> = runCatching {
        val payload = JSONObject()
            .put("media_url", mediaUrl)
            .put("media_type", mediaType)
            .put("text", text.take(1000))
            .put("preview_urls", JSONArray(previewUrls))
            .toString()
        val request = Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/functions/v1/moderate-public-media")
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .header("Authorization", "Bearer ${session.accessToken}")
            .post(payload.toRequestBody(jsonType))
            .build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IllegalStateException(errorMessage(raw, response.code))
            JSONObject(raw).optString("status", "review")
        }
    }

    private fun getArray(session: StudentSession, path: String): JSONArray {
        val raw = requestJson(session, path, "GET", null, null)
        return if (raw.isBlank()) JSONArray() else JSONArray(raw)
    }

    private fun rpcArray(session: StudentSession, name: String, args: JSONObject): JSONArray {
        val raw = rpcRaw(session, name, args).trim()
        if (raw.isBlank() || raw == "null") return JSONArray()
        return when (raw.firstOrNull()) {
            '[' -> JSONArray(raw)
            '{' -> JSONArray().put(JSONObject(raw))
            else -> JSONArray()
        }
    }

    private fun rpcRaw(session: StudentSession, name: String, args: JSONObject): String =
        requestJson(session, "rpc/$name", "POST", args, null)

    private fun requestJson(
        session: StudentSession,
        path: String,
        method: String,
        body: JSONObject?,
        prefer: String?
    ): String {
        val builder = Request.Builder()
            .url("${StudentConfig.SUPABASE_URL}/rest/v1/$path")
            .header("apikey", StudentConfig.SUPABASE_KEY)
            .header("Authorization", "Bearer ${session.accessToken}")
        if (!prefer.isNullOrBlank()) builder.header("Prefer", prefer)
        when (method) {
            "GET" -> builder.get()
            "POST" -> builder.post((body ?: JSONObject()).toString().toRequestBody(jsonType))
            "PATCH" -> builder.patch((body ?: JSONObject()).toString().toRequestBody(jsonType))
            "DELETE" -> builder.delete()
            else -> error("Unsupported HTTP method")
        }
        client.newCall(builder.build()).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IllegalStateException(errorMessage(raw, response.code))
            return raw
        }
    }

    private fun executeAuth(request: Request): StudentSession {
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IllegalStateException(errorMessage(raw, response.code))
            return sessionFrom(JSONObject(raw))
        }
    }

    private fun sessionFrom(root: JSONObject): StudentSession {
        val user = root.optJSONObject("user") ?: throw IllegalStateException("بيانات المستخدم غير مكتملة.")
        return StudentSession(
            accessToken = root.getString("access_token"),
            refreshToken = root.getString("refresh_token"),
            userId = user.getString("id"),
            email = user.optString("email", "")
        )
    }

    private fun parseIdFromRpc(rawValue: String): String {
        val raw = rawValue.trim()
        if (raw.isBlank() || raw == "null") return ""
        if (raw.startsWith("\"")) return raw.trim('"')
        return runCatching {
            val o = parseObjectFromRpc(raw)
            first(o, "id", "conversation_id", "order_id", "result")
        }.getOrDefault(raw)
    }

    private fun parseObjectFromRpc(rawValue: String): JSONObject {
        val raw = rawValue.trim()
        if (raw.startsWith("[")) {
            val a = JSONArray(raw)
            return if (a.length() > 0 && a.opt(0) is JSONObject) a.getJSONObject(0) else JSONObject()
        }
        if (raw.startsWith("{")) return JSONObject(raw)
        return JSONObject()
    }

    private fun nullable(o: JSONObject, key: String): String? =
        if (!o.has(key) || o.isNull(key)) null else o.optString(key).takeIf { it.isNotBlank() && it != "null" }

    private fun first(o: JSONObject, vararg keys: String): String {
        keys.forEach { key ->
            if (o.has(key) && !o.isNull(key)) {
                val value = o.optString(key, "")
                if (value.isNotBlank() && value != "null") return value
            }
        }
        return ""
    }

    private fun nullableFirst(o: JSONObject, vararg keys: String): String? = first(o, *keys).takeIf { it.isNotBlank() }

    private fun intFirst(o: JSONObject, vararg keys: String): Int {
        keys.forEach { if (o.has(it) && !o.isNull(it)) return o.optInt(it, 0) }
        return 0
    }

    private fun doubleFirst(o: JSONObject, vararg keys: String): Double {
        keys.forEach { if (o.has(it) && !o.isNull(it)) return o.optDouble(it, 0.0) }
        return 0.0
    }

    private fun boolFirst(o: JSONObject, vararg keys: String, default: Boolean): Boolean {
        keys.forEach { if (o.has(it) && !o.isNull(it)) return o.optBoolean(it, default) }
        return default
    }

    private fun errorMessage(raw: String, code: Int): String = try {
        val o = JSONObject(raw)
        o.optString("msg").ifBlank { o.optString("message") }.ifBlank { o.optString("error_description") }
            .ifBlank { o.optString("hint") }.ifBlank { "تعذر إكمال العملية ($code)." }
    } catch (_: Exception) {
        "تعذر إكمال العملية ($code)."
    }
}
