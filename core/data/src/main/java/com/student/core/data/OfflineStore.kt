package com.student.core.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

class OfflineStore(context: Context) {
    private val prefs = context.getSharedPreferences("student_native_offline", Context.MODE_PRIVATE)

    fun saveProfile(profile: StudentProfile) {
        val o = JSONObject()
            .put("id", profile.id)
            .put("full_name", profile.fullName)
            .put("username", profile.username)
            .put("email", profile.email)
            .put("bio", profile.bio)
            .put("avatar_url", profile.avatarUrl ?: JSONObject.NULL)
            .put("role", profile.role)
            .put("account_status", profile.accountStatus)
            .put("profile_frame_url", profile.profileFrameUrl ?: JSONObject.NULL)
            .put("is_verified", profile.isVerified)
            .put("verification_color", profile.verificationColor ?: JSONObject.NULL)
            .put("custom_badge_label", profile.customBadgeLabel ?: JSONObject.NULL)
            .put("custom_badge_color", profile.customBadgeColor ?: JSONObject.NULL)
            .put("created_at", profile.createdAt ?: JSONObject.NULL)
            .put("requested_role", profile.requestedRole ?: JSONObject.NULL)
            .put("governorate", profile.governorate)
            .put("school_name", profile.schoolName)
            .put("university_name", profile.universityName)
        prefs.edit().putString("profile", o.toString()).apply()
    }

    fun loadProfile(): StudentProfile? = runCatching {
        val o = JSONObject(prefs.getString("profile", null) ?: return null)
        StudentProfile(
            id = o.optString("id"),
            fullName = o.optString("full_name", "مستخدم"),
            username = o.optString("username", "student"),
            email = o.optString("email", ""),
            bio = o.optString("bio", ""),
            avatarUrl = strOrNull(o, "avatar_url"),
            role = o.optString("role", "student"),
            accountStatus = o.optString("account_status", "public"),
            profileFrameUrl = strOrNull(o, "profile_frame_url"),
            isVerified = o.optBoolean("is_verified", false),
            verificationColor = strOrNull(o, "verification_color"),
            customBadgeLabel = strOrNull(o, "custom_badge_label"),
            customBadgeColor = strOrNull(o, "custom_badge_color"),
            createdAt = strOrNull(o, "created_at"),
            requestedRole = strOrNull(o, "requested_role"),
            governorate = o.optString("governorate", ""),
            schoolName = o.optString("school_name", ""),
            universityName = o.optString("university_name", "")
        )
    }.getOrNull()

    fun savePosts(items: List<PostItem>) {
        val a = JSONArray()
        items.forEach { p ->
            a.put(JSONObject()
                .put("id", p.id).put("user_id", p.userId).put("post_type", p.postType)
                .put("content", p.content).put("media_url", p.mediaUrl ?: JSONObject.NULL)
                .put("media_low_url", p.mediaLowUrl ?: JSONObject.NULL).put("media_mime", p.mediaMime ?: JSONObject.NULL)
                .put("created_at", p.createdAt).put("author_name", p.authorName).put("author_username", p.authorUsername)
                .put("author_avatar_url", p.authorAvatarUrl ?: JSONObject.NULL).put("author_frame_url", p.authorFrameUrl ?: JSONObject.NULL)
                .put("author_verified", p.authorVerified).put("author_verification_color", p.authorVerificationColor ?: JSONObject.NULL))
        }
        prefs.edit().putString("posts", a.toString()).apply()
    }

    fun loadPosts(): List<PostItem> = runCatching {
        val a = JSONArray(prefs.getString("posts", "[]"))
        buildList {
            for (i in 0 until a.length()) {
                val o = a.getJSONObject(i)
                add(PostItem(id=o.optString("id"), userId=o.optString("user_id"), postType=o.optString("post_type", "text"), content=o.optString("content"), mediaUrl=strOrNull(o,"media_url"), mediaLowUrl=strOrNull(o,"media_low_url"), mediaMime=strOrNull(o,"media_mime"), createdAt=o.optString("created_at"), authorName=o.optString("author_name","مستخدم"), authorUsername=o.optString("author_username","student"), authorAvatarUrl=strOrNull(o,"author_avatar_url"), authorFrameUrl=strOrNull(o,"author_frame_url"), authorVerified=o.optBoolean("author_verified", false), authorVerificationColor=strOrNull(o,"author_verification_color")))
            }
        }
    }.getOrDefault(emptyList())

    fun saveNotifications(items: List<StudentNotification>) {
        val a = JSONArray()
        items.forEach { n -> a.put(JSONObject().put("id",n.id).put("title",n.title).put("body",n.body).put("kind",n.kind).put("created_at",n.createdAt).put("is_read",n.isRead).put("link",n.link).put("actor_id",n.actorId).put("target_type",n.targetType).put("target_id",n.targetId)) }
        prefs.edit().putString("notifications",a.toString()).apply()
    }

    fun loadNotifications(): List<StudentNotification> = runCatching {
        val a = JSONArray(prefs.getString("notifications", "[]"))
        buildList {
            for (i in 0 until a.length()) {
                val o=a.getJSONObject(i)
                add(StudentNotification(o.optString("id"),o.optString("title","Student"),o.optString("body"),o.optString("kind","general"),o.optString("created_at"),o.optBoolean("is_read",false),strOrNull(o,"link"),strOrNull(o,"actor_id"),strOrNull(o,"target_type"),strOrNull(o,"target_id")))
            }
        }
    }.getOrDefault(emptyList())

    fun saveProducts(items: List<StoreProduct>) {
        val a=JSONArray()
        items.forEach { p -> a.put(JSONObject().put("id",p.id).put("name",p.name).put("description",p.description).put("product_type",p.productType)
            .put("price_money",p.priceMoney).put("currency",p.currency).put("price_diamonds",p.priceDiamonds).put("allow_money",p.allowMoney).put("allow_diamonds",p.allowDiamonds).put("image_url",p.imageUrl ?: JSONObject.NULL)
            .put("frame_key",p.frameKey ?: JSONObject.NULL).put("frame_duration_days",p.frameDurationDays ?: JSONObject.NULL)) }
        prefs.edit().putString("products",a.toString()).apply()
    }

    fun loadProducts(): List<StoreProduct> = runCatching {
        val a=JSONArray(prefs.getString("products","[]"))
        buildList {
            for(i in 0 until a.length()){
                val o=a.getJSONObject(i)
                add(StoreProduct(o.optString("id"),o.optString("name","منتج"),o.optString("description"),o.optString("product_type","product"),o.optDouble("price_money",0.0),o.optString("currency","IQD"),o.optInt("price_diamonds",0),o.optBoolean("allow_money",true),o.optBoolean("allow_diamonds",false),strOrNull(o,"image_url"),strOrNull(o,"frame_key"),if(o.has("frame_duration_days")&&!o.isNull("frame_duration_days")) o.optInt("frame_duration_days") else null))
            }
        }
    }.getOrDefault(emptyList())


    fun saveLearnEnglish(items: List<LearnEnglishItem>) {
        val a = JSONArray()
        items.forEach { x -> a.put(JSONObject().put("id",x.id).put("title",x.title).put("english",x.englishText).put("arabic",x.arabicText).put("category",x.category).put("level",x.level).put("sort",x.sortOrder)) }
        prefs.edit().putString("learn_english", a.toString()).apply()
    }

    fun loadLearnEnglish(): List<LearnEnglishItem> = runCatching {
        val a = JSONArray(prefs.getString("learn_english","[]"))
        buildList { for(i in 0 until a.length()) { val o=a.getJSONObject(i); add(LearnEnglishItem(o.optString("id"),o.optString("title"),o.optString("english"),o.optString("arabic"),o.optString("category"),o.optString("level"),o.optInt("sort"))) } }
    }.getOrDefault(emptyList())

    fun saveEducationStages(items: List<EducationStage>) {
        val a=JSONArray(); items.forEach { x -> a.put(JSONObject().put("id",x.id).put("name",x.name).put("slug",x.slug).put("description",x.description).put("sort",x.sortOrder)) }
        prefs.edit().putString("edu_stages",a.toString()).apply()
    }
    fun loadEducationStages(): List<EducationStage> = runCatching {
        val a=JSONArray(prefs.getString("edu_stages","[]")); buildList { for(i in 0 until a.length()){ val o=a.getJSONObject(i); add(EducationStage(o.optString("id"),o.optString("name"),o.optString("slug"),o.optString("description"),o.optInt("sort"))) } }
    }.getOrDefault(emptyList())

    fun saveEducationLevels(stageId: String, items: List<EducationLevel>) {
        val a=JSONArray(); items.forEach { x -> a.put(JSONObject().put("id",x.id).put("stage_id",x.stageId).put("name",x.name).put("slug",x.slug).put("sort",x.sortOrder)) }
        prefs.edit().putString("edu_levels_$stageId",a.toString()).apply()
    }
    fun loadEducationLevels(stageId: String): List<EducationLevel> = runCatching {
        val a=JSONArray(prefs.getString("edu_levels_$stageId","[]")); buildList { for(i in 0 until a.length()){ val o=a.getJSONObject(i); add(EducationLevel(o.optString("id"),o.optString("stage_id"),o.optString("name"),o.optString("slug"),o.optInt("sort"))) } }
    }.getOrDefault(emptyList())

    fun saveEducationSubjects(key: String, items: List<EducationSubject>) {
        val a=JSONArray(); items.forEach { x -> a.put(JSONObject().put("id",x.id).put("name",x.name).put("slug",x.slug).put("description",x.description)) }
        prefs.edit().putString("edu_subjects_$key",a.toString()).apply()
    }
    fun loadEducationSubjects(key: String): List<EducationSubject> = runCatching {
        val a=JSONArray(prefs.getString("edu_subjects_$key","[]")); buildList { for(i in 0 until a.length()){ val o=a.getJSONObject(i); add(EducationSubject(o.optString("id"),o.optString("name"),o.optString("slug"),o.optString("description"))) } }
    }.getOrDefault(emptyList())

    fun saveEducationMaterials(key: String, items: List<EducationMaterial>) {
        val a=JSONArray(); items.forEach { x -> a.put(JSONObject().put("id",x.id).put("title",x.title).put("description",x.description).put("type",x.materialType).put("file",x.fileUrl ?: JSONObject.NULL).put("external",x.externalUrl ?: JSONObject.NULL).put("created_at",x.createdAt)) }
        prefs.edit().putString("edu_materials_$key",a.toString()).apply()
    }
    fun loadEducationMaterials(key: String): List<EducationMaterial> = runCatching {
        val a=JSONArray(prefs.getString("edu_materials_$key","[]")); buildList { for(i in 0 until a.length()){ val o=a.getJSONObject(i); add(EducationMaterial(o.optString("id"),o.optString("title"),o.optString("description"),o.optString("type"),strOrNull(o,"file"),strOrNull(o,"external"),o.optString("created_at"))) } }
    }.getOrDefault(emptyList())

    fun saveUniversityNodes(key: String, items: List<UniversityNode>) {
        val a=JSONArray(); items.forEach { x -> a.put(JSONObject().put("id",x.id).put("name",x.name).put("slug",x.slug).put("description",x.description).put("parent",x.parentId ?: JSONObject.NULL)) }
        prefs.edit().putString("uni_nodes_$key",a.toString()).apply()
    }
    fun loadUniversityNodes(key: String): List<UniversityNode> = runCatching {
        val a=JSONArray(prefs.getString("uni_nodes_$key","[]")); buildList { for(i in 0 until a.length()){ val o=a.getJSONObject(i); add(UniversityNode(o.optString("id"),o.optString("name"),o.optString("slug"),o.optString("description"),strOrNull(o,"parent"))) } }
    }.getOrDefault(emptyList())

    fun saveMessages(conversationId: String, items: List<MessageItem>) {
        val a=JSONArray(); items.forEach { x -> a.put(JSONObject().put("id",x.id).put("conversation",x.conversationId).put("sender",x.senderId).put("body",x.body).put("type",x.messageType).put("media",x.mediaUrl ?: JSONObject.NULL).put("file",x.fileName ?: JSONObject.NULL).put("created",x.createdAt).put("edited",x.editedAt ?: JSONObject.NULL).put("deleted",x.deletedAt ?: JSONObject.NULL).put("reads",x.readCount)) }
        prefs.edit().putString("messages_$conversationId",a.toString()).apply()
    }
    fun loadMessages(conversationId: String): List<MessageItem> = runCatching {
        val a=JSONArray(prefs.getString("messages_$conversationId","[]")); buildList { for(i in 0 until a.length()){ val o=a.getJSONObject(i); add(MessageItem(o.optString("id"),o.optString("conversation"),o.optString("sender"),o.optString("body"),o.optString("type"),strOrNull(o,"media"),strOrNull(o,"file"),o.optString("created"),strOrNull(o,"edited"),strOrNull(o,"deleted"),o.optInt("reads"))) } }
    }.getOrDefault(emptyList())


    data class PendingAction(val id: String, val type: String, val data: JSONObject)

    fun enqueue(type: String, data: JSONObject) {
        val a = runCatching { JSONArray(prefs.getString("pending_actions", "[]")) }.getOrDefault(JSONArray())
        a.put(JSONObject().put("id", System.currentTimeMillis().toString() + "-" + a.length()).put("type", type).put("data", data))
        prefs.edit().putString("pending_actions", a.toString()).apply()
    }

    fun pendingActions(): List<PendingAction> = runCatching {
        val a = JSONArray(prefs.getString("pending_actions", "[]"))
        buildList {
            for (i in 0 until a.length()) {
                val o = a.getJSONObject(i)
                add(PendingAction(o.optString("id"), o.optString("type"), o.optJSONObject("data") ?: JSONObject()))
            }
        }
    }.getOrDefault(emptyList())

    fun removePending(id: String) {
        val remaining = pendingActions().filterNot { it.id == id }
        val a = JSONArray()
        remaining.forEach { a.put(JSONObject().put("id", it.id).put("type", it.type).put("data", it.data)) }
        prefs.edit().putString("pending_actions", a.toString()).apply()
    }

    fun pendingCount(): Int = pendingActions().size

    fun flushPending(api: SupabaseApi, session: StudentSession): Int {
        var sent = 0
        pendingActions().forEach { action ->
            val result = when (action.type) {
                "post_text" -> api.createPost(session, action.data.optString("content"))
                "message_text" -> api.sendMessage(session, action.data.optString("conversation_id"), action.data.optString("body"))
                "comment_text" -> api.addComment(session, action.data.optString("post_id"), action.data.optString("content"))
                else -> Result.failure(IllegalArgumentException("Unknown pending action"))
            }
            if (result.isSuccess) { removePending(action.id); sent++ }
        }
        return sent
    }

    fun clear() = prefs.edit().clear().apply()

    private fun strOrNull(o: JSONObject, key: String): String? = if (!o.has(key) || o.isNull(key)) null else o.optString(key).takeIf { it.isNotBlank() && it != "null" }
}
