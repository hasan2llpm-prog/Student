import type { User } from '@supabase/supabase-js'
import { posts as previewPosts, stories as previewStories, type Post, type Story } from '../data'
import { supabase } from './supabase'

export type StudentProfile = {
  id: string
  username: string | null
  full_name: string | null
  display_name?: string | null
  avatar_url: string | null
  bio?: string | null
  role?: string | null
  is_verified?: boolean
  verification_color?: string | null
  profile_frame_url?: string | null
}

export type StudentHomeData = {
  profile: StudentProfile | null
  posts: Post[]
  stories: Story[]
  likedIds: string[]
  source: 'supabase' | 'preview'
}

export type StudentConversation = {
  id: string
  title: string
  avatar: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  otherUserId: string | null
}

export type StudentMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
}

export type StudentStoreProduct = {
  id: string
  name: string
  description: string
  productType: string
  priceMoney: number
  currency: string
  priceDiamonds: number
  allowMoney: boolean
  allowDiamonds: boolean
  imageUrl: string | null
}

export type StudentStoreTask = {
  id: string
  title: string
  description: string
  rewardDiamonds: number
  repeatKind: string
  verificationType: string
}

export type StudentWalletSummary = {
  diamonds: number
  availableBalance: number
  heldBalance: number
  totalSpent: number
}

function relativeTime(value: string | null | undefined): string {
  if (!value) return 'الآن'
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'الآن'
  if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} د`
  if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} س`
  return `منذ ${Math.floor(seconds / 86400)} يوم`
}

function profileName(profile: StudentProfile | undefined): string {
  return profile?.full_name?.trim() || profile?.display_name?.trim() || profile?.username?.trim() || 'مستخدم Student'
}

function profileAvatar(profile: StudentProfile | undefined): string {
  return profile?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80'
}

function profileHandle(profile: StudentProfile | undefined): string {
  return profile?.username?.trim() || 'student'
}

export async function loadStudentHome(user: User): Promise<StudentHomeData> {
  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('id,username,full_name,display_name,avatar_url,bio,role,is_verified,verification_color,profile_frame_url')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) throw profileError

  const { data: postRows, error: postsError } = await supabase
    .from('posts')
    .select('id,user_id,content,media_url,media_type,post_type,created_at,moderation_status')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)
  if (postsError) throw postsError

  const rows = postRows ?? []
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))]
  const postIds = rows.map((row) => row.id)
  const [{ data: profiles }, { data: likes }, { data: comments }, { data: myLikes }] = await Promise.all([
    userIds.length ? supabase.from('profiles').select('id,username,full_name,display_name,avatar_url,is_verified,verification_color,profile_frame_url').in('id', userIds) : Promise.resolve({ data: [], error: null }),
    postIds.length ? supabase.from('post_likes').select('post_id').in('post_id', postIds).limit(1000) : Promise.resolve({ data: [], error: null }),
    postIds.length ? supabase.from('comments').select('post_id').in('post_id', postIds).is('deleted_at', null).limit(1000) : Promise.resolve({ data: [], error: null }),
    supabase.from('post_likes').select('post_id').eq('user_id', user.id).limit(1000),
  ])
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile as StudentProfile]))
  const likesCount = new Map<string, number>()
  const commentsCount = new Map<string, number>()
  for (const row of likes ?? []) likesCount.set(row.post_id, (likesCount.get(row.post_id) ?? 0) + 1)
  for (const row of comments ?? []) commentsCount.set(row.post_id, (commentsCount.get(row.post_id) ?? 0) + 1)

  const realPosts: Post[] = rows.map((row) => {
    const author = profileMap.get(row.user_id)
    return {
      id: row.id,
      author: profileName(author),
      handle: profileHandle(author),
      avatar: profileAvatar(author),
      time: relativeTime(row.created_at),
      text: row.content || '',
      images: row.media_url ? [row.media_url] : [],
      likes: likesCount.get(row.id) ?? 0,
      comments: commentsCount.get(row.id) ?? 0,
      shares: 0,
      verified: Boolean(author?.is_verified),
    }
  })

  const { data: storyRows, error: storiesError } = await supabase
    .from('student_stories_v281')
    .select('id,user_id,media_url,media_type,caption,created_at,expires_at')
    .eq('moderation_status', 'approved')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(100)
  if (storiesError) throw storiesError
  const storyUserIds = [...new Set((storyRows ?? []).map((row) => row.user_id).filter(Boolean))]
  const { data: storyProfiles } = storyUserIds.length
    ? await supabase.from('profiles').select('id,username,full_name,display_name,avatar_url,is_verified').in('id', storyUserIds)
    : { data: [] }
  const storyProfileMap = new Map((storyProfiles ?? []).map((profile) => [profile.id, profile as StudentProfile]))
  const grouped = new Map<string, Story>()
  for (const row of storyRows ?? []) {
    const owner = storyProfileMap.get(row.user_id) ?? (row.user_id === user.id ? profileRow as StudentProfile : undefined)
    const found = grouped.get(row.user_id)
    const existing: Story = found ?? {
      id: row.user_id,
      name: row.user_id === user.id ? 'قصتي' : profileName(owner),
      handle: profileHandle(owner),
      avatar: profileAvatar(owner),
      isMine: row.user_id === user.id,
      frames: [],
    }
    existing.frames.push({ image: row.media_url || profileAvatar(owner), caption: row.caption || '', time: relativeTime(row.created_at) })
    grouped.set(row.user_id, existing)
  }
  return {
    profile: profileRow as StudentProfile | null,
    posts: realPosts,
    stories: grouped.size ? [...grouped.values()] : previewStories,
    likedIds: (myLikes ?? []).map((row) => row.post_id),
    source: realPosts.length || grouped.size ? 'supabase' : 'preview',
  }
}

export function previewHomeData(): StudentHomeData {
  return { profile: null, posts: previewPosts, stories: previewStories, likedIds: [], source: 'preview' }
}

export async function loadStudentConversations(): Promise<StudentConversation[]> {
  const { data, error } = await supabase.rpc('student_get_conversations')
  if (error) throw error
  const rows = (data ?? []) as Record<string, unknown>[]
  const peerIds = rows.map((row) => String(row.other_user_id ?? row.other_id ?? row.peer_id ?? '')).filter(Boolean)
  const { data: profiles } = peerIds.length
    ? await supabase.from('profiles').select('id,username,full_name,display_name,avatar_url').in('id', peerIds)
    : { data: [] }
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile as StudentProfile]))
  return rows.map((row) => {
    const otherUserId = String(row.other_user_id ?? row.other_id ?? row.peer_id ?? '') || null
    const peer = otherUserId ? profileMap.get(otherUserId) : undefined
    return {
      id: String(row.id ?? row.conversation_id ?? ''),
      title: peer ? profileName(peer) : String(row.title ?? row.other_name ?? row.name ?? 'المحادثة'),
      avatar: profileAvatar(peer),
      lastMessage: String(row.last_message ?? row.last_message_body ?? row.body ?? ''),
      lastMessageAt: String(row.last_message_at ?? row.updated_at ?? row.created_at ?? ''),
      unreadCount: Number(row.unread_count ?? row.unread ?? 0),
      otherUserId,
    }
  }).filter((conversation) => conversation.id)
}

export async function loadStudentMessages(conversationId: string): Promise<StudentMessage[]> {
  const { data, error } = await supabase.rpc('student_get_messages', { p_conversation: conversationId, p_before: null, p_limit: 60 })
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id ?? crypto.randomUUID()),
    conversationId: String(row.conversation_id ?? row.conversation ?? conversationId),
    senderId: String(row.sender_id ?? row.user_id ?? ''),
    body: String(row.body ?? ''),
    createdAt: String(row.created_at ?? ''),
  }))
}

export async function sendStudentMessage(conversationId: string, body: string): Promise<void> {
  const { error } = await supabase.rpc('student_send_message', { p_conversation: conversationId, p_body: body.trim(), p_reply_to: null, p_message_type: 'text', p_media_url: null, p_file_name: null, p_file_size: null })
  if (error) throw error
}

export async function loadStudentStore(): Promise<{ products: StudentStoreProduct[]; tasks: StudentStoreTask[]; wallet: StudentWalletSummary }> {
  const [{ data: products, error: productError }, { data: tasks, error: taskError }, walletResult] = await Promise.all([
    supabase.from('store_products').select('id,name,description,product_type,price_money,currency,price_diamonds,allow_money,allow_diamonds,image_url').eq('is_active', true).order('sort_order', { ascending: true }).limit(100),
    supabase.from('store_tasks').select('id,title,description,reward_diamonds,repeat_kind,verification_type').eq('is_active', true).order('sort_order', { ascending: true }).limit(100),
    supabase.rpc('store_get_wallet_summary'),
  ])
  if (productError) throw productError
  if (taskError) throw taskError
  if (walletResult.error) throw walletResult.error
  const walletRow = (walletResult.data ?? {}) as Record<string, unknown>
  return {
    products: (products ?? []).map((row) => ({
      id: row.id, name: row.name || 'منتج Student', description: row.description || '', productType: row.product_type || 'product', priceMoney: Number(row.price_money || 0), currency: row.currency || 'IQD', priceDiamonds: Number(row.price_diamonds || 0), allowMoney: Boolean(row.allow_money), allowDiamonds: Boolean(row.allow_diamonds), imageUrl: row.image_url || null,
    })),
    tasks: (tasks ?? []).map((row) => ({
      id: row.id, title: row.title || 'مهمة Student', description: row.description || '', rewardDiamonds: Number(row.reward_diamonds || 0), repeatKind: row.repeat_kind || 'once', verificationType: row.verification_type || 'manual',
    })),
    wallet: {
      diamonds: Number(walletRow.diamonds ?? walletRow.diamond_balance ?? walletRow.balance_diamonds ?? 0),
      availableBalance: Number(walletRow.available_balance ?? walletRow.balance ?? 0),
      heldBalance: Number(walletRow.held_balance ?? 0),
      totalSpent: Number(walletRow.total_spent ?? 0),
    },
  }
}

export async function claimStudentStoreTask(taskId: string): Promise<number> {
  const { data, error } = await supabase.rpc('claim_store_task', { p_task_id: taskId })
  if (error) throw error
  const row = (data ?? {}) as Record<string, unknown>
  return Number(row.new_balance ?? row.balance ?? 0)
}

export type StudentVocabularyWord = {
  id: string
  word: string
  meaningAr: string
  level: string
  exampleEn: string
  exampleAr: string
  partOfSpeech: string
}

export async function translateWithStudentAi(text: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('student-ai', { body: { mode: 'translate', prompt: text, text } })
  if (error) throw error
  const answer = String((data as Record<string, unknown> | null)?.answer ?? '').trim()
  if (!answer) throw new Error('لم تُرجع خدمة الترجمة نتيجة.')
  return answer
}

export async function loadStudentVocabulary(): Promise<{ words: StudentVocabularyWord[]; sequence: number; progressPercent: number }> {
  const { data: progress, error: progressError } = await supabase.rpc('student_learning_progress_get_v210', { p_section_key: 'vocabulary' })
  if (progressError) throw progressError
  const progressRow = (progress ?? {}) as Record<string, unknown>
  const sequence = Number(progressRow.sequence_index ?? 0)
  const { data, error } = await supabase.rpc('student_vocabulary_batch_v210', { p_expected_sequence: sequence })
  if (error) throw error
  const rows = Array.isArray(data) ? data : ((data as Record<string, unknown> | null)?.items ?? [])
  return {
    words: (rows as Record<string, unknown>[]).map((row) => ({
      id: String(row.id ?? ''), word: String(row.word ?? ''), meaningAr: String(row.meaning_ar ?? ''), level: String(row.level ?? 'A1'), exampleEn: String(row.example_en ?? ''), exampleAr: String(row.example_ar ?? ''), partOfSpeech: String(row.part_of_speech ?? ''),
    })),
    sequence,
    progressPercent: Number(progressRow.progress_percent ?? 0),
  }
}

export async function completeStudentVocabulary(sequence: number): Promise<void> {
  const { error } = await supabase.rpc('student_learning_progress_complete_v210', { p_section_key: 'vocabulary', p_expected_sequence: sequence })
  if (error) throw error
}

export type StudentComment = { id: string; author: string; avatar: string; content: string; createdAt: string }

export async function setStudentPostLiked(postId: string, liked: boolean): Promise<void> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('انتهت جلسة الحساب.')
  if (liked) {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userData.user.id })
    if (error && error.code !== '23505') throw error
  } else {
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userData.user.id)
    if (error) throw error
  }
}

export async function loadStudentComments(postId: string): Promise<StudentComment[]> {
  const { data, error } = await supabase.from('comments').select('id,user_id,content,created_at').eq('post_id', postId).is('deleted_at', null).order('created_at', { ascending: true }).limit(200)
  if (error) throw error
  const ids = [...new Set((data ?? []).map((row) => row.user_id))]
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id,full_name,display_name,username,avatar_url').in('id', ids) : { data: [] }
  const map = new Map((profiles ?? []).map((profile) => [profile.id, profile as StudentProfile]))
  return (data ?? []).map((row) => ({ id: row.id, author: profileName(map.get(row.user_id)), avatar: profileAvatar(map.get(row.user_id)), content: row.content, createdAt: row.created_at }))
}

export async function addStudentComment(postId: string, content: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('انتهت جلسة الحساب.')
  const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: userData.user.id, content: content.trim() })
  if (error) throw error
}
