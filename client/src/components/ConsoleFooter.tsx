import { useTranslation } from 'react-i18next'

/**
 * Attribution line shown at the bottom of the admin and staff consoles.
 *
 * Shared by both shells so the wording and the link can only ever be changed in
 * one place.
 */
export function ConsoleFooter() {
  const { t } = useTranslation()

  return (
    <footer className="shrink-0 border-t border-border/60 bg-card/50 px-4 py-4 sm:px-6 lg:px-8">
      <p className="text-center text-[11px] text-muted-foreground">
        {t('common.developedBy')}{' '}
        <a
          href="https://www.norynt.app"
          target="_blank"
          // `noreferrer` accompanies `noopener` so the new tab cannot reach back
          // through `window.opener`, and the console's URL is not leaked.
          rel="noopener noreferrer"
          className="font-semibold text-[#7C4EEE] underline-offset-2 transition-colors hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Norynt
        </a>
      </p>
    </footer>
  )
}
