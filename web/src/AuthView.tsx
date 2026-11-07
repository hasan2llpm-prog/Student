import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LoaderCircle, Mail, LockKeyhole, UserRound } from 'lucide-react'
import { supabase } from './lib/supabase'

type Props = { error: string; onError: (message: string) => void }

function arabicAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
  if (message.includes('Email not confirmed')) return 'تحقق من بريدك الإلكتروني قبل تسجيل الدخول.'
  if (message.includes('User already registered')) return 'هذا البريد مسجل مسبقًا. جرّب تسجيل الدخول.'
  if (message.includes('Password should be')) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'
  return message || 'تعذر إكمال العملية الآن.'
}

export function AuthLoadingScreen() {
  return <main className="auth-shell"><div className="auth-loading"><LoaderCircle size={24} className="spin" /><span>جاري استعادة جلسة Student...</span></div></main>
}

export function AuthView({ error, onError }: Props) {
  const [register, setRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    onError('')
    setMessage('')
    const result = register
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (result.error) onError(arabicAuthError(result.error.message))
    else if (register && !result.data.session) setMessage('تم إنشاء الحساب. افتح بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول.')
  }

  async function google() {
    setBusy(true)
    onError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (oauthError) {
      setBusy(false)
      onError(arabicAuthError(oauthError.message))
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      onError('اكتب بريدك الإلكتروني أولًا لاستعادة كلمة المرور.')
      return
    }
    setBusy(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    setBusy(false)
    if (resetError) onError(arabicAuthError(resetError.message))
    else setMessage('أرسلنا رابط استعادة كلمة المرور إلى بريدك الإلكتروني.')
  }

  return <main className="auth-shell" dir="rtl">
    <section className="auth-card">
      <div className="auth-brand"><div className="brand-mark"><span /></div><div><strong>Student</strong><small>تعلم، تواصل، تقدّم</small></div></div>
      <div className="auth-heading"><span className="eyebrow">الحساب نفسه على كل أجهزتك</span><h1>{register ? 'أنشئ حساب Student' : 'مرحبًا بعودتك'}</h1><p>{register ? 'أنشئ حسابًا جديدًا ليظهر في التطبيق والموقع معًا.' : 'سجّل الدخول للوصول إلى ملفك ومنشوراتك وقصصك الحقيقية.'}</p></div>
      <button className="google-button" onClick={() => void google()} disabled={busy}><span className="google-g">G</span> المتابعة باستخدام Google</button>
      <div className="auth-divider"><span>أو بالبريد الإلكتروني</span></div>
      <form onSubmit={(event) => void submit(event)} className="auth-form">
        <label><span>البريد الإلكتروني</span><div className="auth-input"><Mail size={16} /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="name@example.com" /></div></label>
        <label><span>كلمة المرور</span><div className="auth-input"><LockKeyhole size={16} /><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required minLength={6} placeholder="••••••••" /><button type="button" aria-label="إظهار كلمة المرور" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
        {!register && <button type="button" className="forgot-link" onClick={() => void resetPassword()}>نسيت كلمة المرور؟</button>}
        {(error || message) && <div className={`auth-message ${error ? 'error' : ''}`}>{error || message}</div>}
        <button className="primary-button auth-submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <ArrowLeft size={16} />} {busy ? 'جاري المعالجة...' : register ? 'إنشاء الحساب' : 'تسجيل الدخول'}</button>
      </form>
      <button className="auth-switch" onClick={() => { setRegister((value) => !value); onError(''); setMessage('') }}><UserRound size={15} /> {register ? 'لديك حساب؟ سجّل الدخول' : 'ليس لديك حساب؟ أنشئ حسابًا'}</button>
      <small className="auth-note">لا يتم نقل كلمات المرور أو إنشاء قاعدة حسابات جديدة. Supabase Auth هو المصدر الموحد لتطبيق Student والموقع.</small>
    </section>
  </main>
}
