import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, MailWarning, Loader2 } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'
import Separator from '@/components/home/Separator'

type Outcome = 'checking' | 'verified' | 'failed'

/**
 * Landing page for the link in a verification email.
 *
 * Reachable without signing in, because the link is often opened on a different
 * device from the one that registered.
 */
export default function VerifyEmailPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const { refreshUser } = useAuth()
  const token = params.get('token')

  const [outcome, setOutcome] = useState<Outcome>(token ? 'checking' : 'failed')
  const [message, setMessage] = useState<string>('')

  // React 18 mounts effects twice in development. The token is single-use, so
  // a second call would report the link as already spent and show a failure on
  // a verification that actually succeeded.
  const attempted = useRef(false)

  useEffect(() => {
    if (!token || attempted.current) return
    attempted.current = true

    authApi
      .verifyEmail(token)
      .then(async () => {
        setOutcome('verified')
        // Refreshes the cached session so the "confirm your address" prompt
        // disappears for anyone already signed in on this device.
        await refreshUser().catch(() => undefined)
      })
      .catch((error: any) => {
        setMessage(error?.message || '')
        setOutcome('failed')
      })
  }, [token, refreshUser])

  return (
    <div className="container mx-auto flex flex-col items-center py-24 text-center">
      {outcome === 'checking' && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-brand-gold" aria-hidden="true" />
          <h1 className="h3 mt-6">{t('verifyEmail.checking')}</h1>
        </>
      )}

      {outcome === 'verified' && (
        <>
          <CheckCircle2 className="h-12 w-12 text-emerald-600" aria-hidden="true" />
          <h1 className="h2 mt-6">{t('verifyEmail.successTitle')}</h1>
          <Separator className="mt-5" />
          <p className="mt-5 max-w-md text-muted-foreground">{t('verifyEmail.successBody')}</p>
          <Link to="/menu" className="btn-cafe mt-8">
            {t('home.exploreMenu')}
          </Link>
        </>
      )}

      {outcome === 'failed' && (
        <>
          <MailWarning className="h-12 w-12 text-amber-600" aria-hidden="true" />
          <h1 className="h2 mt-6">{t('verifyEmail.failedTitle')}</h1>
          <Separator className="mt-5" />
          <p className="mt-5 max-w-md text-muted-foreground">
            {message || t('verifyEmail.failedBody')}
          </p>
          <Link to="/account" className="btn-cafe mt-8">
            {t('navigation.account')}
          </Link>
        </>
      )}
    </div>
  )
}
