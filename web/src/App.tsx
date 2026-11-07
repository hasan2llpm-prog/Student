import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  Bell, BookOpen, Check, ChevronLeft, ChevronRight, CircleHelp, Eye, Flame, Heart, Home, Languages,
  LayoutGrid, Menu, MessageCircle, Moon, MoreHorizontal, PanelLeft, Play, Plus, Search, Send, Share2,
  ShoppingBag, Sparkles, Sun, ThumbsUp, UserRound, Volume2, Wallet, X, Zap,
} from 'lucide-react'
import { posts as previewPosts, stories as previewStories, vocabulary, type Post, type Story } from './data'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { addStudentComment, claimStudentStoreTask, completeStudentVocabulary, loadStudentComments, loadStudentConversations, loadStudentHome, loadStudentMessages, loadStudentStore, loadStudentVocabulary, previewHomeData, sendStudentMessage, setStudentPostLiked, translateWithStudentAi, type StudentComment, type StudentConversation, type StudentHomeData, type StudentMessage, type StudentStoreProduct, type StudentStoreTask, type StudentVocabularyWord, type StudentWalletSummary } from './lib/studentData'
import { AuthLoadingScreen, AuthView } from './AuthView'

type Tab = 'home' | 'learn' | 'store' | 'messages' | 'admin'

type StoryState = {
  person: number
  frame: number
}

const stories = previewStories
const posts = previewPosts

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [dark, setDark] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [homeLoading, setHomeLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [homeData, setHomeData] = useState<StudentHomeData>(() => previewHomeData())
  const [story, setStory] = useState<StoryState | null>(null)
  const [storyProgress, setStoryProgress] = useState(0)
  const [storyPaused, setStoryPaused] = useState(false)
  const [storyUiHidden, setStoryUiHidden] = useState(false)
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [commentsPost, setCommentsPost] = useState<Post | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [accent, setAccent] = useState<'us' | 'uk'>('us')
  const [notice, setNotice] = useState('')

  const stories = homeData.stories
  const posts = homeData.posts
  const currentStory = story ? stories[story.person] : null
  const currentFrame = currentStory?.frames[story?.frame ?? 0]

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setAuthError(error.message)
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) return
    let active = true
    setHomeLoading(true)
    loadStudentHome(session.user)
      .then((data) => {
        if (!active) return
        setHomeData(data)
        setLiked(new Set(data.likedIds))
      })
      .catch((error: Error) => {
        if (active) setNotice(error.message || 'تعذر تحميل بيانات Student الآن.')
      })
      .finally(() => {
        if (active) setHomeLoading(false)
      })
    return () => { active = false }
  }, [session?.user.id])

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])

  useEffect(() => {
    if (!story || storyPaused) return
    const timer = window.setInterval(() => {
      setStoryProgress((value) => {
        if (value >= 100) {
          advanceStory(1)
          return 0
        }
        return value + 1.8
      })
    }, 90)
    return () => window.clearInterval(timer)
  }, [story, storyPaused])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2200)
    return () => window.clearTimeout(timer)
  }, [notice])

  function openStory(person: number) {
    setStory({ person, frame: 0 })
    setStoryProgress(0)
    setStoryPaused(false)
    setStoryUiHidden(false)
  }

  function closeStory() {
    setStory(null)
    setStoryProgress(0)
    setStoryPaused(false)
    setStoryUiHidden(false)
  }

  function advanceStory(direction: 1 | -1) {
    if (!story) return
    const active = stories[story.person]
    if (direction === 1 && story.frame < active.frames.length - 1) {
      setStory({ ...story, frame: story.frame + 1 })
      setStoryProgress(0)
      return
    }
    if (direction === -1 && story.frame > 0) {
      setStory({ ...story, frame: story.frame - 1 })
      setStoryProgress(0)
      return
    }
    const nextPerson = story.person + direction
    if (nextPerson >= 0 && nextPerson < stories.length) {
      setStory({ person: nextPerson, frame: direction === 1 ? 0 : stories[nextPerson].frames.length - 1 })
      setStoryProgress(0)
      return
    }
    // Instagram-style boundary behavior: remain in the story and reset its timer.
    setStoryProgress(0)
  }

  function toggleLike(postId: string) {
    const alreadyLiked = liked.has(postId)
    setLiked((current) => {
      const next = new Set(current)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
    if (!session?.user) return
    void setStudentPostLiked(postId, !alreadyLiked).catch(() => setNotice('تعذر تحديث الإعجاب، حاول مرة أخرى.'))
  }

  if (authLoading) return <AuthLoadingScreen />
  if (!session) return <AuthView error={authError} onError={setAuthError} />

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><span /></div>
          <div>
            <strong>Student</strong>
            <small>تعلم، تواصل، تقدّم</small>
          </div>
        </div>
        <div className="top-search"><Search size={17} /><input aria-label="بحث" placeholder="ابحث عن كلمة، طالب، أو درس" /></div>
        <div className="top-actions">
          <button className="icon-button mobile-only" aria-label="القائمة"><Menu size={20} /></button>
          <button className="icon-button" aria-label="تبديل الوضع" onClick={() => setDark((value) => !value)}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
          <button className="icon-button notification-button" aria-label="الإشعارات"><Bell size={19} /><i /></button>
          <button className="mini-profile" title="تسجيل الخروج" onClick={() => void supabase.auth.signOut()}><img src={session.user.user_metadata.avatar_url || previewStories[0].avatar} alt="صورتك" /><span>{homeData.profile?.full_name || session.user.email?.split('@')[0] || 'Student'}</span></button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-section">
            <NavItem active={tab === 'home'} icon={<Home size={19} />} label="الرئيسية" onClick={() => setTab('home')} />
            <NavItem active={tab === 'learn'} icon={<BookOpen size={19} />} label="أكاديمية Student" onClick={() => setTab('learn')} />
            <NavItem active={tab === 'messages'} icon={<MessageCircle size={19} />} label="الرسائل" onClick={() => setTab('messages')} badge="3" />
            <NavItem active={tab === 'store'} icon={<ShoppingBag size={19} />} label="المتجر والمهام" onClick={() => setTab('store')} />
            {homeData.profile?.role === 'admin' && <NavItem active={tab === 'admin'} icon={<LayoutGrid size={19} />} label="لوحة الإدارة" onClick={() => setTab('admin')} />}
          </div>
          <div className="sidebar-divider" />
          <div className="sidebar-label">مساحتك</div>
          <NavItem icon={<Wallet size={19} />} label="المحفظة" onClick={() => setTab('store')} />
          <NavItem icon={<Languages size={19} />} label="الترجمة السريعة" onClick={() => setTab('learn')} />
          <NavItem icon={<LayoutGrid size={19} />} label="المحفوظات" onClick={() => setNotice('المحفوظات جاهزة للربط مع Supabase')} />
          <div className="sidebar-footer"><div className="connection-dot" /> {isSupabaseConfigured ? (homeLoading ? 'جاري مزامنة Student' : 'متصل بـ Supabase') : 'وضع المعاينة'}</div>
        </aside>

        <main className="main-content">
          {tab === 'home' && <HomeView storyItems={stories} postItems={posts} onOpenStory={openStory} liked={liked} onLike={toggleLike} onComments={setCommentsPost} onNotice={setNotice} />}
          {tab === 'learn' && <LearningView accent={accent} setAccent={setAccent} showSuggestions={showSuggestions} setShowSuggestions={setShowSuggestions} onNotice={setNotice} />}
          {tab === 'store' && <StoreView onNotice={setNotice} />}
          {tab === 'messages' && <MessagesView userId={session.user.id} onNotice={setNotice} />}
          {tab === 'admin' && homeData.profile?.role === 'admin' && <AdminView onNotice={setNotice} />}
        </main>

        <aside className="right-rail">
          <div className="rail-card progress-card">
            <div className="rail-card-head"><span>كبسولة اليوم</span><Flame size={17} className="orange-icon" /></div>
            <div className="capsule-progress"><div style={{ width: `${(vocabulary.progress / vocabulary.total) * 100}%` }} /></div>
            <div className="progress-numbers"><strong>{vocabulary.progress}<small>/{vocabulary.total}</small></strong><span>كلمة محفوظة</span></div>
            <p>بقيت 8 كلمات لإكمال هدف اليوم.</p>
            <button className="text-action" onClick={() => setTab('learn')}>تابع التعلم <ChevronLeft size={15} /></button>
          </div>
          <div className="rail-card wallet-card">
            <div className="wallet-orb"><Zap size={21} /></div>
            <div><span>رصيد المحفظة</span><strong>2,480 <small>♦</small></strong></div>
            <button className="icon-button small" onClick={() => setTab('store')}><ChevronLeft size={16} /></button>
          </div>
          <div className="rail-card people-card">
            <div className="rail-card-head"><span>نشاط مجتمعك</span><MoreHorizontal size={17} /></div>
            <ActivityRow image={stories[3].avatar} text="Rasha حفظت كلمة improve" time="منذ 8 د" />
            <ActivityRow image={stories[4].avatar} text="Zainab علّقت على منشورك" time="منذ 21 د" />
            <ActivityRow image={stories[2].avatar} text="Omar بدأ تحدي النطق" time="منذ ساعة" />
          </div>
        </aside>
      </div>

      <nav className="bottom-nav">
        <NavItem active={tab === 'home'} icon={<Home size={19} />} label="الرئيسية" onClick={() => setTab('home')} />
        <NavItem active={tab === 'learn'} icon={<BookOpen size={19} />} label="تعلم" onClick={() => setTab('learn')} />
        <button className="create-button" aria-label="إنشاء"><Plus size={22} /></button>
        <NavItem active={tab === 'messages'} icon={<MessageCircle size={19} />} label="الرسائل" onClick={() => setTab('messages')} />
        <NavItem active={tab === 'store'} icon={<ShoppingBag size={19} />} label="المتجر" onClick={() => setTab('store')} />
      </nav>

      {story && currentStory && currentFrame && <StoryViewer story={story} active={currentStory} frame={currentFrame} progress={storyProgress} paused={storyPaused} uiHidden={storyUiHidden} onClose={closeStory} onAdvance={advanceStory} onPause={(value) => setStoryPaused(value)} onUiHidden={setStoryUiHidden} />}
      {commentsPost && <CommentsSheet post={commentsPost} onClose={() => setCommentsPost(null)} onNotice={setNotice} />}
      {notice && <div className="toast"><Check size={16} />{notice}</div>}
    </div>
  )
}

function NavItem({ active, icon, label, onClick, badge }: { active?: boolean; icon: React.ReactNode; label: string; onClick: () => void; badge?: string }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{badge && <b>{badge}</b>}</button>
}

function HomeView({ storyItems, postItems, onOpenStory, liked, onLike, onComments, onNotice }: { storyItems: Story[]; postItems: Post[]; onOpenStory: (index: number) => void; liked: Set<string>; onLike: (id: string) => void; onComments: (post: Post) => void; onNotice: (message: string) => void }) {
  return <>
    <div className="section-heading"><div><span className="eyebrow">مساحتك اليوم</span><h1>الخلاصة</h1></div><button className="soft-button"><PanelLeft size={16} /> تخصيص</button></div>
    <StoriesStrip items={storyItems} onOpen={onOpenStory} />
    <div className="feed-layout">
      <section className="feed-column">
        <Composer onNotice={onNotice} />
        {postItems.map((post) => <PostCard key={post.id} post={post} liked={liked.has(post.id)} onLike={() => onLike(post.id)} onComments={() => onComments(post)} onNotice={onNotice} />)}
      </section>
      <div className="feed-side-note"><Sparkles size={17} /><span>اقتراح اليوم</span><strong>اكتب جملة باستخدام improve قبل أن تغلق التطبيق.</strong></div>
    </div>
  </>
}

function StoriesStrip({ items, onOpen }: { items: Story[]; onOpen: (index: number) => void }) {
  return <section className="stories-panel"><div className="stories-panel-head"><span><span className="eyebrow">لحظات قصيرة</span><strong>القصص</strong></span><button className="ghost-link">عرض الكل <ChevronLeft size={15} /></button></div><div className="stories-row">{items.map((item, index) => <button className="story-tile" key={item.id} onClick={() => onOpen(index)}><div className={`story-ring ${item.viewed ? 'viewed' : ''} ${item.isMine ? 'mine' : ''}`}><img src={item.avatar} alt={item.name} />{item.isMine && <span className="story-add"><Plus size={13} /></span>}</div><span>{item.isMine ? 'قصتي' : item.name.split(' ')[0]}</span></button>)}</div></section>
}

function Composer({ onNotice }: { onNotice: (message: string) => void }) {
  return <div className="composer card-surface"><img src={stories[0].avatar} alt="صورتك" /><button onClick={() => onNotice('محرر المنشور سيُربط بـ Supabase في المرحلة التالية')}>بماذا تفكر اليوم؟</button><div className="composer-actions"><button onClick={() => onNotice('رفع الصور جاهز للربط')}><Plus size={17} /> صورة</button><button onClick={() => onNotice('إضافة قصة من هنا قريبًا')}><Play size={16} /> قصة</button></div></div>
}

function PostCard({ post, liked, onLike, onComments, onNotice }: { post: Post; liked: boolean; onLike: () => void; onComments: () => void; onNotice: (message: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  return <article className="post-card card-surface">
    <div className="post-head"><img src={post.avatar} alt={post.author} /><div className="post-author"><strong>{post.author} {post.verified && <span className="verified"><Check size={10} /></span>}</strong><span>@{post.handle} · {post.time}</span></div><button className="icon-button"><MoreHorizontal size={19} /></button></div>
    <div className="post-copy"><p className={expanded ? '' : 'clamp-copy'}>{post.text}</p>{post.text.length > 120 && <button className="read-more" onClick={() => setExpanded((value) => !value)}>{expanded ? 'عرض أقل' : 'عرض المزيد'}</button>}</div>
    <div className={`media-grid media-count-${Math.min(post.images.length, 4)}`}>{post.images.slice(0, 4).map((image, index) => <div className="media-item" key={image}><img src={image} alt="محتوى المنشور" />{index === 3 && post.images.length > 4 && <span className="more-media">+{post.images.length - 3}</span>}</div>)}</div>
    <div className="engagement"><span><span className="reaction-dots"><i>♥</i><i>✦</i></span> {post.likes + (liked ? 1 : 0)}</span><span>{post.comments} تعليق · {post.shares} مشاركة</span></div>
    <div className="post-actions"><button className={liked ? 'selected' : ''} onClick={onLike}><ThumbsUp size={17} /> إعجاب</button><button onClick={onComments}><MessageCircle size={17} /> تعليق</button><button onClick={() => onNotice('مشاركة المنشور ستُرسل عبر Supabase')}><Share2 size={17} /> مشاركة</button></div>
  </article>
}

function AdminView({ onNotice }: { onNotice: (message: string) => void }) {
  const [alerts, setAlerts] = useState<Record<string, unknown>[]>([])
  const [flags, setFlags] = useState<Record<string, unknown>[]>([])
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  async function refresh() {
    setLoading(true)
    try {
      const [{ data: alertRows, error: alertError }, { data: flagRows, error: flagError }, { count, error: usersError }] = await Promise.all([
        supabase.from('notifications').select('id,title,body,created_at,is_read,metadata').eq('kind', 'admin_student_ai_error').order('created_at', { ascending: false }).limit(20),
        supabase.from('feature_flags').select('id,name,feature_key,enabled,updated_at').order('name').limit(100),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ])
      if (alertError) throw alertError
      if (flagError) throw flagError
      if (usersError) throw usersError
      setAlerts(alertRows ?? []); setFlags(flagRows ?? []); setUserCount(count ?? 0)
    } catch (error) { onNotice((error as Error).message || 'تعذر تحميل لوحة الإدارة.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [])
  async function toggleFlag(flag: Record<string, unknown>) {
    const next = !Boolean(flag.enabled)
    const { error } = await supabase.from('feature_flags').update({ enabled: next }).eq('id', flag.id)
    if (error) { onNotice(error.message); return }
    setFlags((current) => current.map((item) => item.id === flag.id ? { ...item, enabled: next } : item))
  }
  return <div className="admin-page"><div className="section-heading"><div><span className="eyebrow">مركز التحكم</span><h1>إدارة Student</h1></div><button className="soft-button" onClick={() => void refresh()}>{loading ? 'جاري التحديث...' : 'تحديث البيانات'}</button></div><div className="admin-metrics"><div className="admin-metric"><span>المستخدمون</span><strong>{userCount.toLocaleString('ar-IQ')}</strong><small>من profiles</small></div><div className="admin-metric"><span>تنبيهات Ask AI</span><strong>{alerts.length}</strong><small>آخر 20 تنبيهًا</small></div><div className="admin-metric"><span>الميزات</span><strong>{flags.filter((flag) => flag.enabled).length}</strong><small>مفعلة الآن</small></div></div><div className="admin-columns"><section className="card-surface admin-panel"><div className="panel-heading"><strong>مراقبة Ask AI</strong><span className="status-chip">من قاعدة البيانات</span></div>{alerts.length ? alerts.map((alert) => <div className="admin-alert" key={String(alert.id)}><span className="alert-dot" /><div><strong>{String(alert.title ?? 'تعطل Ask AI')}</strong><p>{String(alert.body ?? '')}</p><small>{alert.created_at ? new Date(String(alert.created_at)).toLocaleString('ar-IQ') : ''}</small></div></div>) : <div className="empty-state">لا توجد تنبيهات Ask AI مسجلة.</div>}</section><section className="card-surface admin-panel"><div className="panel-heading"><strong>أعلام الميزات</strong><span className="status-chip">Feature flags</span></div>{flags.length ? flags.map((flag) => <div className="flag-row" key={String(flag.id)}><span><strong>{String(flag.name ?? flag.feature_key)}</strong><small>{String(flag.feature_key ?? '')}</small></span><button className={`toggle-flag ${flag.enabled ? 'on' : ''}`} onClick={() => void toggleFlag(flag)}>{flag.enabled ? 'مفعل' : 'متوقف'}</button></div>) : <div className="empty-state">لا توجد أعلام ميزات.</div>}</section></div></div>
}

function LearningView({ accent, setAccent, showSuggestions, setShowSuggestions, onNotice }: { accent: 'us' | 'uk'; setAccent: (value: 'us' | 'uk') => void; showSuggestions: boolean; setShowSuggestions: (value: boolean) => void; onNotice: (message: string) => void }) {
  const [sourceText, setSourceText] = useState('Small habits improve your English.')
  const [translation, setTranslation] = useState('')
  const [translating, setTranslating] = useState(false)
  const [words, setWords] = useState<StudentVocabularyWord[]>([])
  const [sequence, setSequence] = useState(0)
  const [progressPercent, setProgressPercent] = useState(0)
  const [vocabularyLoading, setVocabularyLoading] = useState(true)
  const currentWord = words[0]

  async function loadWords() {
    setVocabularyLoading(true)
    try {
      const data = await loadStudentVocabulary()
      setWords(data.words); setSequence(data.sequence); setProgressPercent(data.progressPercent)
    } catch (error) { onNotice((error as Error).message || 'تعذر تحميل مفردات اليوم.') }
    finally { setVocabularyLoading(false) }
  }
  useEffect(() => { void loadWords() }, [])

  async function translate() {
    if (!sourceText.trim() || translating) return
    setTranslating(true)
    try { setTranslation(await translateWithStudentAi(sourceText)) }
    catch (error) { onNotice((error as Error).message || 'تعذر الوصول إلى الترجمة.') }
    finally { setTranslating(false) }
  }
  function speak(text: string) {
    if (!('speechSynthesis' in window)) { onNotice('النطق غير مدعوم في هذا المتصفح.'); return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = accent === 'us' ? 'en-US' : 'en-GB'
    utterance.rate = .92
    window.speechSynthesis.speak(utterance)
  }
  async function completeWord() {
    if (!currentWord) return
    try { await completeStudentVocabulary(sequence); onNotice(`تم تثبيت ${currentWord.word} وانتقلت إلى الدفعة التالية.`); await loadWords() }
    catch (error) { onNotice((error as Error).message || 'تعذر تثبيت الكلمة.') }
  }

  return <div className="learning-page"><div className="section-heading"><div><span className="eyebrow">مسار اللغة</span><h1>تعلّم بذكاء</h1></div><div className="streak-pill"><Flame size={16} /> {Math.round(progressPercent)}% من المسار</div></div><div className="learning-grid"><section className="translation-card card-surface"><div className="card-title-row"><span className="eyebrow">الترجمة السريعة</span><button className="icon-button small" onClick={() => void translate()} aria-label="ترجمة"><Languages size={16} /></button></div><textarea className="translation-input" value={sourceText} onChange={(event) => setSourceText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) void translate() }} /><div className="translation-result"><strong>{translating ? 'جاري الترجمة...' : translation || 'اضغط ترجمة للحصول على النتيجة.'}</strong><div className="translation-tools"><button className={accent === 'us' ? 'accent-active' : ''} onClick={() => setAccent('us')}>🇺🇸</button><button className={accent === 'uk' ? 'accent-active' : ''} onClick={() => setAccent('uk')}>🇬🇧</button><button onClick={() => speak(translation || sourceText)} aria-label="نطق"><Volume2 size={16} /></button></div></div><button className="primary-button translate-button" onClick={() => void translate()} disabled={translating}>{translating ? 'جاري الترجمة...' : 'ترجم الآن'}</button><button className="suggestion-trigger" onClick={() => setShowSuggestions(!showSuggestions)}><Sparkles size={15} /> اقتراحات السياق</button>{showSuggestions && <div className="suggestions-popover"><strong>{currentWord?.word || 'improve'}</strong><span>{currentWord?.partOfSpeech || 'word'} · {currentWord?.meaningAr || 'تحسين وتطوير'}</span><p>{currentWord?.exampleEn || 'Small habits improve your English every day.'}</p></div>}</section><section className="daily-capsule card-surface"><div className="capsule-top"><div className="capsule-icon"><BookOpen size={21} /></div><span>كبسولة اليوم<small>{vocabularyLoading ? 'جاري التحميل...' : `${words.length} كلمة متاحة`}</small></span><span className="capsule-percent">{Math.round(progressPercent)}%</span></div>{currentWord ? <><div className="capsule-word">{currentWord.word}<span>{currentWord.meaningAr} · {currentWord.level}</span></div><p>{currentWord.exampleEn}<br /><small>{currentWord.exampleAr}</small></p><div className="capsule-actions"><button className="primary-button" onClick={() => void completeWord()}><Check size={16} /> تثبيت الكلمة</button><button className="outline-button" onClick={() => speak(currentWord.word)}><Volume2 size={16} /></button></div></> : <div className="empty-state">لا توجد كلمات متاحة لهذه الدفعة.</div>}</section></div><div className="learning-lower"><div className="lesson-row"><LessonCard icon={<Languages size={18} />} title="ترجمة ونطق" meta="متصل بـ Student AI" progress={translation ? 100 : 0} /><LessonCard icon={<Zap size={18} />} title="كبسولة المفردات" meta={`${words.length} كلمة`} progress={progressPercent} /><LessonCard icon={<BookOpen size={18} />} title="المستوى الحالي" meta={currentWord?.level || 'A1'} progress={progressPercent} /></div></div></div>
}

function LessonCard({ icon, title, meta, progress }: { icon: React.ReactNode; title: string; meta: string; progress: number }) {
  return <div className="lesson-card card-surface"><div className="lesson-icon">{icon}</div><div><strong>{title}</strong><span>{meta}</span></div><div className="mini-progress"><i style={{ width: `${progress}%` }} /></div><small>{progress}%</small></div>
}

function StoreView({ onNotice }: { onNotice: (message: string) => void }) {
  const [products, setProducts] = useState<StudentStoreProduct[]>([])
  const [tasks, setTasks] = useState<StudentStoreTask[]>([])
  const [wallet, setWallet] = useState<StudentWalletSummary>({ diamonds: 0, availableBalance: 0, heldBalance: 0, totalSpent: 0 })
  const [loading, setLoading] = useState(true)
  const [busyTask, setBusyTask] = useState<string | null>(null)
  const [busyProduct, setBusyProduct] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const data = await loadStudentStore()
      setProducts(data.products); setTasks(data.tasks); setWallet(data.wallet)
    } catch (error) { onNotice((error as Error).message || 'تعذر تحميل المتجر.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [])

  async function claim(task: StudentStoreTask) {
    if (busyTask) return
    setBusyTask(task.id)
    try {
      const balance = await claimStudentStoreTask(task.id)
      setWallet((current) => ({ ...current, diamonds: balance }))
      onNotice(`تمت المطالبة بالمكافأة. رصيدك الآن ${balance} ♦`)
    } catch (error) { onNotice((error as Error).message || 'المهمة غير جاهزة للمطالبة بعد.') }
    finally { setBusyTask(null) }
  }

  async function buyWithDiamonds(product: StudentStoreProduct) {
    if (busyProduct) return
    setBusyProduct(product.id)
    try {
      const { data: order, error: orderError } = await supabase.rpc('create_store_order', { p_product_id: product.id, p_payment_method: 'diamonds' })
      if (orderError) throw orderError
      const raw = typeof order === 'string' ? order : (order as Record<string, unknown> | null)
      const orderId = typeof raw === 'string' ? raw.replaceAll('"', '') : String(raw?.id ?? raw?.order_id ?? '')
      if (!orderId) throw new Error('لم يُرجع النظام رقم الطلب.')
      const { error: activateError } = await supabase.rpc('student_activate_diamond_entitlement_v181', { p_order: orderId, p_product: product.id })
      if (activateError) throw activateError
      onNotice('تم شراء المنتج وتفعيل الميزة في حسابك.')
      await refresh()
    } catch (error) { onNotice((error as Error).message || 'تعذر إتمام الشراء.') }
    finally { setBusyProduct(null) }
  }

  return <div className="store-page"><div className="section-heading"><div><span className="eyebrow">مساحتك الرقمية</span><h1>المتجر والمهام</h1></div><div className="store-balance"><Wallet size={16} /> {wallet.diamonds.toLocaleString('ar-IQ')} ♦</div></div>{loading ? <div className="empty-state card-surface">جاري تحميل المنتجات والمهام من Student...</div> : <div className="store-grid">{products.map((product) => <div className="store-tile product-tile" key={product.id}>{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <Sparkles size={20} />}<span>{product.productType}</span><strong>{product.name}</strong><small>{product.description}</small><div className="store-price">{product.allowDiamonds && product.priceDiamonds ? `${product.priceDiamonds.toLocaleString('ar-IQ')} ♦` : product.allowMoney ? `${product.priceMoney.toLocaleString('ar-IQ')} ${product.currency}` : 'متاح قريبًا'}</div>{product.allowDiamonds && product.priceDiamonds > 0 ? <button disabled={busyProduct === product.id} onClick={() => void buyWithDiamonds(product)}>{busyProduct === product.id ? 'جارٍ التنفيذ...' : 'شراء بالألماس'}</button> : <button onClick={() => onNotice('الدفع النقدي سيُفعل عبر بوابة الدفع المعتمدة.')}>تفاصيل المنتج</button>}</div>)}{tasks.map((task) => <div className="store-tile task-tile" key={task.id}><Flame size={20} /><span>مهمة {task.repeatKind === 'daily' ? 'يومية' : 'Student'}</span><strong>{task.title}</strong><small>{task.description}</small><div className="store-price">+{task.rewardDiamonds.toLocaleString('ar-IQ')} ♦</div><button disabled={busyTask === task.id} onClick={() => void claim(task)}>{busyTask === task.id ? 'جارٍ التحقق...' : 'المطالبة بالمكافأة'}</button></div>)}</div>}</div>
}

function MessagesView({ userId, onNotice }: { userId: string; onNotice: (message: string) => void }) {
  const [conversations, setConversations] = useState<StudentConversation[]>([])
  const [selected, setSelected] = useState<StudentConversation | null>(null)
  const [messages, setMessages] = useState<StudentMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  async function refreshConversations() {
    setLoading(true)
    try {
      const next = await loadStudentConversations()
      setConversations(next)
      if (selected) setSelected(next.find((item) => item.id === selected.id) ?? selected)
    } catch (error) {
      onNotice((error as Error).message || 'تعذر تحميل المحادثات.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void refreshConversations() }, [userId])
  useEffect(() => {
    if (!selected) { setMessages([]); return }
    let active = true
    loadStudentMessages(selected.id).then((items) => { if (active) setMessages(items) }).catch((error: Error) => onNotice(error.message || 'تعذر تحميل الرسائل.'))
    return () => { active = false }
  }, [selected?.id])

  async function send() {
    const body = draft.trim()
    if (!selected || !body || sending) return
    setSending(true)
    try {
      await sendStudentMessage(selected.id, body)
      setDraft('')
      setMessages(await loadStudentMessages(selected.id))
      await refreshConversations()
    } catch (error) { onNotice((error as Error).message || 'تعذر إرسال الرسالة.') }
    finally { setSending(false) }
  }

  if (selected) return <div className="messages-page"><div className="section-heading"><div><button className="ghost-link" onClick={() => setSelected(null)}><ChevronRight size={15} /> كل المحادثات</button><h1>{selected.title}</h1></div><img className="conversation-avatar" src={selected.avatar} alt={selected.title} /></div><section className="conversation-panel card-surface"><div className="conversation-messages">{messages.length ? messages.map((message) => <div key={message.id} className={`bubble ${message.senderId === userId ? 'mine' : ''}`}><p>{message.body}</p><small>{message.createdAt ? new Date(message.createdAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }) : ''}</small></div>) : <div className="empty-state">لا توجد رسائل بعد. ابدأ المحادثة.</div>}</div><form className="conversation-composer" onSubmit={(event) => { event.preventDefault(); void send() }}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="اكتب رسالة..." /><button className="primary-button" disabled={sending || !draft.trim()}><Send size={16} /></button></form></section></div>

  return <div className="messages-page"><div className="section-heading"><div><span className="eyebrow">تواصل بهدوء</span><h1>الرسائل</h1></div><button className="primary-button" onClick={() => onNotice('ابدأ محادثة من قائمة متابعيك في التطبيق حاليًا')}><Plus size={16} /> محادثة جديدة</button></div><div className="message-list card-surface">{loading ? <div className="empty-state">جاري تحميل محادثاتك...</div> : conversations.length ? conversations.map((conversation) => <MessageRow key={conversation.id} image={conversation.avatar} name={conversation.title} preview={conversation.lastMessage || 'لا توجد رسالة بعد'} time={conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleDateString('ar-IQ') : ''} unread={conversation.unreadCount > 0} onClick={() => setSelected(conversation)} />) : <div className="empty-state">لا توجد محادثات بعد.</div>}</div></div>
}

function MessageRow({ image, name, preview, time, unread, onClick }: { image: string; name: string; preview: string; time: string; unread?: boolean; onClick?: () => void }) {
  return <button className="message-row" onClick={onClick}><img src={image} alt={name} /><span><strong>{name}</strong><small>{preview}</small></span><time>{time}</time>{unread && <i />}</button>
}

function ActivityRow({ image, text, time }: { image: string; text: string; time: string }) {
  return <div className="activity-row"><img src={image} alt="" /><span>{text}<small>{time}</small></span></div>
}

function StoryViewer({ story, active, frame, progress, paused, uiHidden, onClose, onAdvance, onPause, onUiHidden }: { story: StoryState; active: Story; frame: { image: string; caption: string; time: string }; progress: number; paused: boolean; uiHidden: boolean; onClose: () => void; onAdvance: (direction: 1 | -1) => void; onPause: (value: boolean) => void; onUiHidden: (value: boolean) => void }) {
  const holdTimer = useRef<number | null>(null)
  const didHold = useRef(false)
  const startY = useRef<number | null>(null)
  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    startY.current = event.clientY
    didHold.current = false
    holdTimer.current = window.setTimeout(() => {
      didHold.current = true
      onPause(true)
      onUiHidden(true)
    }, 420)
  }
  function pointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (holdTimer.current) window.clearTimeout(holdTimer.current)
    if (startY.current !== null && event.clientY - startY.current > 110) { onClose(); return }
    if (didHold.current) { onPause(false); onUiHidden(false); return }
    const target = event.currentTarget.getBoundingClientRect()
    onAdvance(event.clientX - target.left < target.width / 2 ? 1 : -1)
  }
  return <div className="story-overlay" onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={() => { if (holdTimer.current) window.clearTimeout(holdTimer.current); onPause(false); onUiHidden(false) }}><div className="story-backdrop" style={{ backgroundImage: `url(${frame.image})` }} /><div className={`story-gradient ${uiHidden ? 'hidden' : ''}`} /><div className={`story-ui ${uiHidden ? 'hidden' : ''}`}><div className="story-progress-bars">{active.frames.map((_, index) => <span key={index}><i style={{ width: index < story.frame ? '100%' : index === story.frame ? `${progress}%` : '0%' }} /></span>)}</div><div className="story-topline"><div className="story-identity"><img src={active.avatar} alt={active.name} /><span><strong>{active.name}</strong><small>{frame.time}</small></span></div><button className="story-close" onPointerUp={(event) => { event.stopPropagation(); onClose() }}><X size={21} /></button></div><div className="story-caption"><p>{frame.caption}</p><div><button onPointerUp={(event) => event.stopPropagation()}><Heart size={18} /></button><button onPointerUp={(event) => event.stopPropagation()}><Send size={17} /></button><span>أرسل ردًا سريعًا...</span></div></div></div>{paused && <div className="pause-indicator"><Play size={18} fill="currentColor" /></div>}</div>
}

function CommentsSheet({ post, onClose, onNotice }: { post: Post; onClose: () => void; onNotice: (message: string) => void }) {
  const [comments, setComments] = useState<StudentComment[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  async function refresh() {
    setLoading(true)
    try { setComments(await loadStudentComments(post.id)) }
    catch (error) { onNotice((error as Error).message || 'تعذر تحميل التعليقات.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [post.id])
  async function send() {
    if (!draft.trim() || sending) return
    setSending(true)
    try { await addStudentComment(post.id, draft); setDraft(''); await refresh() }
    catch (error) { onNotice((error as Error).message || 'تعذر إرسال التعليق.') }
    finally { setSending(false) }
  }
  return <div className="sheet-backdrop" onClick={onClose}><section className="comments-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><div className="sheet-head"><strong>التعليقات</strong><button className="icon-button" onClick={onClose}><X size={19} /></button></div><div className="comments-scroll">{loading ? <div className="empty-state">جاري تحميل التعليقات...</div> : comments.length ? comments.map((comment) => <div className="comment-item" key={comment.id}><img src={comment.avatar} alt={comment.author} /><span><strong>{comment.author}</strong><p>{comment.content}</p><small>{comment.createdAt ? new Date(comment.createdAt).toLocaleString('ar-IQ') : ''}</small></span></div>) : <div className="empty-state">كن أول من يعلّق.</div>}</div><form className="comment-input" onSubmit={(event) => { event.preventDefault(); void send() }}><img src={post.avatar} alt="صورتك" /><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="اكتب تعليقًا..." /><button aria-label="إرسال" disabled={sending || !draft.trim()}><Send size={17} /></button></form></section></div>
}

export default App
