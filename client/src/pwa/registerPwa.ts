import { registerSW } from 'virtual:pwa-register'

export type PwaUpdateHandler = (reload: () => void) => void

/** Register the service worker and invoke `onNeedRefresh` when a new build is available. */
export function registerPwa(onNeedRefresh: PwaUpdateHandler): void {
  if (!import.meta.env.PROD) return

  registerSW({
    immediate: true,
    onNeedRefresh() {
      onNeedRefresh(() => {
        window.location.reload()
      })
    },
    onOfflineReady() {
      // App shell cached; no UI needed for this game companion.
    },
  })
}
