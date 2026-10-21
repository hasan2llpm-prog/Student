package com.student.core.data

data class RuntimeUpdateConfig(
    val forceUpdate: Boolean = false,
    val minimumVersionCode: Int = 0,
    val latestVersionCode: Int = 0,
    val apkUrl: String = "",
    val message: String = ""
)

data class StudentSession(
    val accessToken: String,
    val refreshToken: String,
    val userId: String,
    val email: String
)

data class StudentProfile(
    val id: String,
    val fullName: String,
    val username: String,
    val email: String,
    val bio: String,
    val avatarUrl: String?,
    val role: String,
    val accountStatus: String,
    val profileFrameUrl: String?,
    val isVerified: Boolean = false,
    val verificationColor: String? = null,
    val customBadgeLabel: String? = null,
    val customBadgeColor: String? = null,
    val createdAt: String? = null,
    val lastActiveAt: String? = null,
    val requestedRole: String? = null,
    val governorate: String = "",
    val schoolName: String = "",
    val universityName: String = ""
)

data class PostItem(
    val id: String,
    val userId: String,
    val postType: String,
    val content: String,
    val mediaUrl: String?,
    val mediaLowUrl: String? = null,
    val mediaMime: String? = null,
    val createdAt: String,
    val authorName: String = "مستخدم",
    val authorUsername: String = "student",
    val authorAvatarUrl: String? = null,
    val authorFrameUrl: String? = null,
    val authorVerified: Boolean = false,
    val authorVerificationColor: String? = null
)


data class ReelItem(
    val id: String,
    val userId: String,
    val videoUrl: String,
    val hlsUrl: String? = null,
    val lowQualityUrl: String? = null,
    val thumbnailUrl: String? = null,
    val caption: String = "",
    val createdAt: String = "",
    val authorName: String = "مستخدم",
    val authorUsername: String = "student",
    val authorAvatarUrl: String? = null,
    val authorFrameUrl: String? = null,
    val authorVerified: Boolean = false,
    val authorVerificationColor: String? = null,
    val likeCount: Int = 0,
    val commentCount: Int = 0,
    val viewCount: Int = 0,
    val liked: Boolean = false,
    val saved: Boolean = false,
    val following: Boolean = false
)

data class ReelCommentItem(
    val id: String,
    val reelId: String,
    val userId: String,
    val parentId: String? = null,
    val content: String,
    val createdAt: String,
    val updatedAt: String? = null,
    val authorName: String = "مستخدم",
    val authorUsername: String = "student",
    val authorAvatarUrl: String? = null,
    val authorFrameUrl: String? = null,
    val authorVerified: Boolean = false,
    val authorVerificationColor: String? = null,
    val reactionCount: Int = 0,
    val myReaction: String? = null
)

data class StudentNotification(
    val id: String,
    val title: String,
    val body: String,
    val kind: String,
    val createdAt: String,
    val isRead: Boolean,
    val link: String? = null,
    val actorId: String? = null,
    val targetType: String? = null,
    val targetId: String? = null
)

data class ProfileSearchItem(
    val id: String,
    val fullName: String,
    val username: String,
    val role: String,
    val avatarUrl: String?,
    val isVerified: Boolean,
    val verificationColor: String?,
    val profileFrameUrl: String? = null
)

data class FollowSuggestion(
    val id: String,
    val fullName: String,
    val username: String,
    val avatarUrl: String?,
    val isVerified: Boolean,
    val verificationColor: String?,
    val profileFrameUrl: String? = null,
    val role: String = "student",
    val isFollowing: Boolean = false,
    val commonReasons: List<String> = emptyList()
)

data class ConversationItem(
    val id: String,
    val title: String,
    val kind: String,
    val otherUserId: String?,
    val lastMessage: String,
    val lastMessageAt: String,
    val unreadCount: Int,
    val avatarUrl: String? = null,
    val profileFrameUrl: String? = null,
    val isVerified: Boolean = false,
    val verificationColor: String? = null,
    val otherRole: String = "student",
    val lastActiveAt: String? = null
)

data class MessageContact(
    val id: String,
    val fullName: String,
    val username: String,
    val avatarUrl: String?,
    val profileFrameUrl: String? = null,
    val isVerified: Boolean = false,
    val verificationColor: String? = null,
    val lastActiveAt: String? = null
)

data class MessageItem(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val body: String,
    val messageType: String,
    val mediaUrl: String?,
    val fileName: String?,
    val createdAt: String,
    val editedAt: String?,
    val deletedAt: String?,
    val readCount: Int = 0,
    val replyTo: String? = null
)



data class VerificationRequestItem(
    val id: String,
    val userId: String,
    val fullName: String,
    val governorate: String,
    val schoolName: String,
    val universityName: String,
    val reason: String,
    val status: String,
    val adminNote: String?,
    val createdAt: String
)

data class SupportTicketItem(
    val id: String,
    val userId: String,
    val subject: String,
    val message: String,
    val status: String,
    val adminReply: String?,
    val createdAt: String
)

data class SocialRoomSettings(
    val groupPriceDiamonds: Int = 50,
    val channelPriceDiamonds: Int = 100,
    val maxMembers: Int = 500
)

data class SocialRoomItem(
    val id: String,
    val ownerId: String,
    val kind: String,
    val name: String,
    val description: String,
    val avatarUrl: String?,
    val username: String? = null,
    val isPublic: Boolean,
    val memberRole: String = "member",
    val createdAt: String = ""
)

data class SocialRoomMember(
    val userId: String,
    val fullName: String,
    val username: String,
    val role: String,
    val avatarUrl: String?,
    val profileFrameUrl: String?,
    val isVerified: Boolean,
    val verificationColor: String?,
    val memberRole: String
)

data class SocialRoomMessage(
    val id: String,
    val roomId: String,
    val senderId: String,
    val senderName: String,
    val senderRole: String,
    val senderAvatarUrl: String?,
    val senderFrameUrl: String?,
    val senderVerified: Boolean,
    val senderVerificationColor: String?,
    val body: String,
    val messageType: String,
    val mediaUrl: String?,
    val fileName: String?,
    val replyTo: String?,
    val createdAt: String
)

data class EducationStage(
    val id: String,
    val name: String,
    val slug: String,
    val description: String,
    val sortOrder: Int
)

data class EducationLevel(
    val id: String,
    val stageId: String,
    val name: String,
    val slug: String,
    val sortOrder: Int
)

data class EducationSubject(
    val id: String,
    val name: String,
    val slug: String,
    val description: String
)

data class EducationMaterial(
    val id: String,
    val title: String,
    val description: String,
    val materialType: String,
    val fileUrl: String?,
    val externalUrl: String?,
    val createdAt: String
)

data class StoreProduct(
    val id: String,
    val name: String,
    val description: String,
    val productType: String,
    val priceMoney: Double,
    val currency: String,
    val priceDiamonds: Int,
    val allowMoney: Boolean,
    val allowDiamonds: Boolean,
    val imageUrl: String?,
    val frameKey: String? = null,
    val frameDurationDays: Int? = null
)



data class AdminManagedProduct(
    val id: String,
    val name: String,
    val description: String,
    val productType: String,
    val priceMoney: Double,
    val priceDiamonds: Int,
    val allowMoney: Boolean,
    val allowDiamonds: Boolean,
    val isActive: Boolean
)

data class WalletSummary(
    val availableBalance: Double = 0.0,
    val heldBalance: Double = 0.0,
    val totalSpent: Double = 0.0,
    val diamonds: Int = 0
)

data class StoreOrder(
    val id: String,
    val productName: String,
    val paymentMethod: String,
    val moneyAmount: Double,
    val diamondAmount: Int,
    val status: String,
    val createdAt: String
)

data class AdminRecentUser(
    val id: String,
    val fullName: String,
    val username: String,
    val email: String,
    val role: String,
    val createdAt: String,
    val isVerified: Boolean
)


data class EnglishVocabularyItem(
    val id: String,
    val word: String,
    val meaningAr: String,
    val level: String,
    val exampleEn: String,
    val exampleAr: String,
    val source: String,
    val sourceRank: Int,
    val partOfSpeech: String = "",
    val category: String = ""
)

data class FeatureFlag(
    val id: String,
    val name: String,
    val key: String,
    val enabled: Boolean
)


data class SavedItem(
    val id: String,
    val contentType: String,
    val contentId: String,
    val createdAt: String,
    val title: String = "",
    val subtitle: String = "",
    val source: String = "",
    val target: String = "",
    val metadataJson: String = "{}"
)

data class UniversityNode(
    val id: String,
    val name: String,
    val slug: String,
    val description: String,
    val parentId: String? = null
)

data class ProfileStats(
    val followers: Int = 0,
    val following: Int = 0,
    val posts: Int = 0
)

data class CommentItem(
    val id: String,
    val postId: String,
    val userId: String,
    val content: String,
    val createdAt: String,
    val authorName: String = "مستخدم",
    val parentId: String? = null,
    val editedAt: String? = null
)

data class OwnedProfileFrame(
    val id: String,
    val frameKey: String,
    val productId: String?,
    val source: String,
    val expiresAt: String?,
    val isActive: Boolean,
    val createdAt: String
)

data class AiChatItem(
    val id: String,
    val role: String,
    val content: String,
    val mode: String = "ask",
    val createdAt: String = ""
)

data class LearnEnglishItem(
    val id: String,
    val title: String,
    val englishText: String,
    val arabicText: String,
    val category: String,
    val level: String,
    val sortOrder: Int = 0
)


data class DailyGrammarItem(
    val id: String,
    val title: String,
    val explanationAr: String,
    val exampleEn: String,
    val exampleAr: String,
    val level: String
)

data class DailyVerbItem(
    val id: String,
    val baseForm: String,
    val pastForm: String,
    val participle: String,
    val meaningAr: String,
    val exampleEn: String,
    val exampleAr: String,
    val irregular: Boolean,
    val level: String
)

data class TeacherRequest(
    val id: String,
    val userId: String,
    val fullName: String,
    val subject: String,
    val educationStage: String,
    val experience: String,
    val note: String,
    val status: String,
    val createdAt: String,
    val adminNote: String? = null,
    val email: String = "",
    val username: String = ""
)



data class RemoteModuleItem(
    val id: String,
    val moduleKey: String,
    val title: String,
    val subtitle: String?,
    val iconKey: String,
    val target: String,
    val enabled: Boolean,
    val sortOrder: Int
)
data class HomeAd(
    val id: String,
    val title: String,
    val body: String,
    val imageUrl: String?,
    val actionUrl: String?,
    val isActive: Boolean,
    val sortOrder: Int,
    val createdAt: String
)

data class StudentSuggestion(
    val id: String,
    val userId: String,
    val category: String,
    val title: String,
    val body: String,
    val status: String,
    val adminNote: String?,
    val createdAt: String
)

data class StoreTask(
    val id: String,
    val title: String,
    val description: String,
    val rewardDiamonds: Int,
    val repeatKind: String,
    val verificationType: String,
    val isActive: Boolean
)

data class DiamondPackage(
    val id: String,
    val title: String,
    val diamonds: Int,
    val userPriceIqd: Int,
    val agentPriceIqd: Int,
    val isActive: Boolean
)

data class AgencyApplication(
    val id: String,
    val fullName: String,
    val userId: String = "",
    val province: String,
    val phone: String,
    val whatsapp: String?,
    val telegram: String?,
    val experience: String,
    val status: String,
    val adminNote: String?,
    val createdAt: String
)

data class WalletTransaction(
    val id: String,
    val amount: Double,
    val balanceAfter: Double,
    val transactionType: String,
    val description: String,
    val createdAt: String
)


data class AdminStoreOrder(
    val id: String,
    val userId: String,
    val productName: String,
    val paymentMethod: String,
    val moneyAmount: Double,
    val diamondAmount: Int,
    val status: String,
    val createdAt: String
)

data class DiamondPurchaseRequest(
    val id: String,
    val userId: String,
    val diamonds: Int,
    val amountIqd: Int,
    val paymentReference: String?,
    val status: String,
    val createdAt: String,
    val fullName: String = "",
    val username: String = "",
    val email: String = ""
)

data class AdminWalletRow(
    val userId: String,
    val availableBalance: Double,
    val heldBalance: Double,
    val totalPurchased: Double,
    val totalSpent: Double,
    val updatedAt: String
)

data class AcademicReportResult(
    val title: String,
    val content: String,
    val mode: String,
    val remainingFree: Int? = null,
    val remainingCredits: Int? = null
)

data class LearningProgressState(
    val sectionKey: String,
    val sequenceIndex: Int,
    val completedForCurrentSlot: Boolean,
    val availableAfter: String? = null,
    val completedUnits: Int = 0,
    val totalUnits: Int = 0,
    val completedItems: Int = 0,
    val totalItems: Int = 0,
    val progressPercent: Double = 0.0
)

data class VoiceRoomItem(
    val id: String,
    val title: String,
    val description: String,
    val ownerId: String,
    val ownerName: String,
    val ownerAvatarUrl: String?,
    val memberCount: Int,
    val capacity: Int,
    val isLocked: Boolean,
    val isActive: Boolean,
    val createdAt: String,
    val unlockedMics: Int = 5,
    val backgroundUrl: String? = null,
    val isSaved: Boolean = false
)

data class VoiceRoomMember(
    val userId: String,
    val fullName: String,
    val username: String,
    val avatarUrl: String?,
    val role: String,
    val roomRole: String,
    val micState: String,
    val joinedAt: String,
    val micSlot: Int? = null,
    val isFollowing: Boolean = false
)

data class VoiceRoomGiftPack(
    val id: String,
    val name: String,
    val diamonds: Int,
    val iconKey: String,
    val sortOrder: Int
)



data class VoiceRoomFeedItem(
    val id: String,
    val kind: String,
    val userId: String,
    val userName: String,
    val targetUserId: String?,
    val targetName: String?,
    val message: String,
    val giftEmoji: String?,
    val createdAt: String,
    val replyToId: String? = null,
    val replyToName: String? = null,
    val replyToMessage: String? = null,
    val reactions: Map<String, Int> = emptyMap(),
    val myReaction: String? = null
)

data class VoiceRoomBackground(
    val id: String,
    val name: String,
    val imageUrl: String,
    val diamonds: Int,
    val isOwned: Boolean,
    val isActive: Boolean = true
)

data class VoiceRoomToken(
    val url: String,
    val token: String,
    val canPublish: Boolean,
    val roomRole: String
)

data class VoiceRoomCapacityTier(val capacity: Int, val diamonds: Int)

data class VoiceRoomSettings(
    val creationPriceDiamonds: Int = 100,
    val maxSpeakers: Int = 10,
    val roomsEnabled: Boolean = true,
    val giftsEnabled: Boolean = true,
    val extraMicPriceDiamonds: Int = 50
)



data class RemoteAssetItem(
    val id: String,
    val assetKey: String,
    val assetType: String,
    val title: String,
    val uri: String?,
    val dataJson: String,
    val sortOrder: Int,
)

data class RemoteScreenDefinition(
    val screenKey: String,
    val title: String,
    val description: String?,
    val layout: String,
    val refreshSeconds: Int,
    val components: List<RemoteScreenComponent>,
)

data class RemoteScreenComponent(
    val id: String,
    val componentKey: String,
    val type: String,
    val title: String?,
    val body: String?,
    val iconKey: String?,
    val target: String?,
    val actionKey: String?,
    val visible: Boolean,
    val sortOrder: Int,
    val style: Map<String, String> = emptyMap(),
)

data class RemoteActionField(
    val key: String,
    val label: String,
    val type: String,
    val required: Boolean,
    val placeholder: String?,
    val defaultValue: String?,
    val options: List<String>,
    val maxLength: Int,
    val sortOrder: Int,
)

data class RemoteActionDefinition(
    val actionKey: String,
    val title: String,
    val description: String?,
    val rpcName: String,
    val confirmRequired: Boolean,
    val confirmText: String?,
    val successMessage: String?,
    val fields: List<RemoteActionField>,
)
