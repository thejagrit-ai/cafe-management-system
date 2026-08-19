import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { AuthField } from '@/components/auth/AuthField'
import { TiltCard } from '@/components/auth/TiltCard'
import { ArrowLeft, Coffee, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utils/lib'
import { prefersLightweightExperience, whenIdle } from '@/utils/deviceCapability'

// three.js is heavy, so the scene loads on its own chunk and only on this
// route. The gradient below shows until it arrives — and stays forever if the
// device has no WebGL, is on a small screen, or is on a metered connection:
// ~860 kB of decoration is not a fair price for signing in from a phone.
const CoffeeScene = lazy(() => import('@/components/auth/CoffeeScene'))

const MIN_PASSWORD_LENGTH = 8

/** Frosted face shared by both sides of the card. */
function Face({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-[28px] border border-white/10 p-8 sm:p-10',
        'bg-[#171313]/70 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl',
        className
      )}
    >
      {/* Gold sheen across the top edge, angled to read as a lit bevel. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/70 to-transparent"
        aria-hidden="true"
      />
      {children}
    </div>
  )
}

export default function AuthPage() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { login, register } = useAuth()

  const [flipped, setFlipped] = useState(pathname === '/register')
  const [isLoading, setIsLoading] = useState(false)
  const [showScene, setShowScene] = useState(false)

  // Deferred to idle so the sign-in form is interactive before the backdrop
  // starts downloading.
  useEffect(() => {
    if (prefersLightweightExperience()) return
    return whenIdle(() => setShowScene(true))
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  /**
   * Flips the card and rewrites the address bar directly. Using the router
   * here would remount this component and cut the flip animation dead.
   */
  const showFace = useCallback((next: 'login' | 'register') => {
    setFlipped(next === 'register')
    window.history.replaceState(null, '', next === 'register' ? '/register' : '/login')
  }, [])

  const routeAfterLogin = (role?: string) => {
    if (role === 'ADMIN') navigate('/admin', { replace: true })
    else if (role === 'STAFF') navigate('/staff', { replace: true })
    else navigate('/', { replace: true })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setIsLoading(true)
    try {
      const user = await login({ email, password })
      toast.success(t('auth.welcomeBack'))
      routeAfterLogin(user?.role)
    } catch (error: any) {
      toast.error(error?.message || t('errors.genericTitle'))
    } finally {
      setIsLoading(false)
    }
  }

  const setField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: e.target.value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!form.firstName.trim()) next.firstName = t('auth.required')
    if (!form.lastName.trim()) next.lastName = t('auth.required')
    if (!form.email.trim()) next.email = t('auth.required')
    if (form.password.length < MIN_PASSWORD_LENGTH) next.password = t('auth.passwordTooShort')
    if (form.confirmPassword !== form.password) {
      next.confirmPassword = t('auth.passwordsDoNotMatch')
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setIsLoading(true)
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
      })
      toast.success(t('auth.accountCreated'))
      navigate('/', { replace: true })
    } catch (error: any) {
      toast.error(error?.message || t('errors.genericTitle'))
    } finally {
      setIsLoading(false)
    }
  }

  const brand = (
    // translateZ lifts the mark off the card surface, so it parallaxes against
    // the panel as the card tilts.
    <div className="mb-7 flex flex-col items-center [transform:translateZ(45px)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gold text-brand-ink shadow-lg shadow-black/40">
        <Coffee className="h-7 w-7 stroke-[1.75]" aria-hidden="true" />
      </div>
      <div className="mt-3 text-center">
        <div className="font-serif text-xl leading-none text-white">The Coffee Bean</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.28em] text-brand-gold">
          Cafe · Roastery
        </div>
      </div>
    </div>
  )

  const submitClass =
    'auth-submit mt-6 flex h-[52px] w-full items-center justify-center rounded-full bg-[#f4f1ec] text-[15px] font-bold text-brand-ink hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 [transform:translateZ(30px)]'

  return (
    <div className="theme-cafe relative min-h-screen w-full overflow-hidden bg-brand-ink">
      {/* Static fallback: also the permanent backdrop where WebGL is absent. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 25% 20%, rgba(199,161,122,0.22) 0%, transparent 50%), radial-gradient(ellipse at 78% 78%, rgba(138,90,51,0.28) 0%, transparent 55%)',
        }}
        aria-hidden="true"
      />

      {showScene && (
        <Suspense fallback={null}>
          <CoffeeScene />
        </Suspense>
      )}

      {/* Keeps text legible over whatever drifts past behind it. */}
      <div className="absolute inset-0 bg-brand-ink/45" aria-hidden="true" />

      <Link
        to="/"
        className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-white/10 bg-brand-ink/60 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur transition-colors hover:border-brand-gold hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('auth.backToSite')}
      </Link>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <TiltCard
          flipped={flipped}
          className="auth-card w-full max-w-[420px]"
          front={
            <Face>
              {brand}

              <h1 className="text-center text-[26px] font-semibold text-white [transform:translateZ(28px)]">
                {t('auth.loginTitle')}
              </h1>
              <p className="mt-1.5 text-center text-sm text-white/45 [transform:translateZ(22px)]">
                {t('auth.loginSubtitle')}
              </p>

              <form onSubmit={handleLogin} className="mt-7 space-y-4 [transform:translateZ(18px)]">
                <AuthField
                  label={t('auth.emailLabel')}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <AuthField
                  label={t('auth.passwordLabel')}
                  revealable
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex cursor-pointer items-center gap-2 text-white/50 hover:text-white/80">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[#c7a17a]"
                    />
                    <span>{t('auth.rememberMe')}</span>
                  </label>
                  <span className="text-white/30">{t('auth.forgotPassword')}</span>
                </div>

                <button type="submit" disabled={isLoading} className={submitClass}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('auth.signingIn')}
                    </>
                  ) : (
                    t('auth.signInButton')
                  )}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-white/45">
                {t('auth.noAccountText')}{' '}
                <button
                  type="button"
                  onClick={() => showFace('register')}
                  className="font-semibold text-brand-gold hover:underline"
                >
                  {t('auth.registerLink')}
                </button>
              </p>
            </Face>
          }
          back={
            <Face>
              {brand}

              <h1 className="text-center text-[26px] font-semibold text-white [transform:translateZ(28px)]">
                {t('auth.registerTitle')}
              </h1>
              <p className="mt-1.5 text-center text-sm text-white/45 [transform:translateZ(22px)]">
                {t('auth.registerSubtitle')}
              </p>

              <form onSubmit={handleRegister} className="mt-7 space-y-3 [transform:translateZ(18px)]">
                <div className="grid grid-cols-2 gap-3">
                  <AuthField
                    label={t('auth.firstNameLabel')}
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={setField('firstName')}
                    error={errors.firstName}
                  />
                  <AuthField
                    label={t('auth.lastNameLabel')}
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={setField('lastName')}
                    error={errors.lastName}
                  />
                </div>

                <AuthField
                  label={t('auth.emailLabel')}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={setField('email')}
                  error={errors.email}
                />
                <AuthField
                  label={t('auth.phoneLabel')}
                  type="tel"
                  autoComplete="tel"
                  placeholder="555-0100"
                  value={form.phone}
                  onChange={setField('phone')}
                />
                <AuthField
                  label={t('auth.passwordLabel')}
                  revealable
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={setField('password')}
                  error={errors.password}
                />
                <AuthField
                  label={t('auth.confirmPasswordLabel')}
                  revealable
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={setField('confirmPassword')}
                  error={errors.confirmPassword}
                />

                <button type="submit" disabled={isLoading} className={submitClass}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('auth.registering')}
                    </>
                  ) : (
                    t('auth.registerButton')
                  )}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-white/45">
                {t('auth.haveAccountText')}{' '}
                <button
                  type="button"
                  onClick={() => showFace('login')}
                  className="font-semibold text-brand-gold hover:underline"
                >
                  {t('auth.loginLink')}
                </button>
              </p>
            </Face>
          }
        />
      </div>
    </div>
  )
}
