/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /**
   * Public address of the customer-facing site, used to build the table QR
   * codes. Set this when the admin console is reached on a different host than
   * customers use (a LAN address, a preview deploy, or localhost during
   * development) — otherwise the generated QR points somewhere a phone cannot
   * reach. Falls back to the current origin.
   */
  readonly VITE_PUBLIC_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
