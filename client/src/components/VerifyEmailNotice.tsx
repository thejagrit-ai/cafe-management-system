import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { MailWarning, Check } from 'lucide-react'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Prompts a customer whose address has not been confirmed to request a new
 * link. Renders nothing once the address is verified, so it disappears on its
 * own the moment the link is followed.
 */
export function VerifyEmailNotice() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [sent, setSent] = useState(false)

  const resend = useMutation({
    mutationFn: () => authApi.resendVerification(),
    onSuccess: () => {
      setSent(true)
      toast.success(t('verifyEmail.resent'))
    },
    onError: (error: any) => {
      toast.error(error?.message || t('verifyEmail.resendFailed'))
    },
  })

  // `emailVerified` is absent on older cached sessions; only an explicit
  // `false` means the address is known to be unconfirmed.
  if (!user || user.emailVerified !== false) return null

  return (
    <div className="flex flex-col gap-3 border border-amber-500/40 bg-amber-500/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <MailWarning
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-foreground">{t('verifyEmail.noticeTitle')}</p>
          <p className="mt-0.5 text-muted-foreground">
            {t('verifyEmail.noticeBody', { email: user.email })}
          </p>
        </div>
      </div>

      {sent ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          {t('verifyEmail.resent')}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => resend.mutate()}
          disabled={resend.isPending}
          className="btn-cafe shrink-0 whitespace-nowrap text-xs disabled:opacity-60"
        >
          {resend.isPending ? t('verifyEmail.sending') : t('verifyEmail.resend')}
        </button>
      )}
    </div>
  )
}
