export type PlayChromeTheme = 'void' | 'blueish'

export const PLAY_CHROME_THEME_STORAGE_KEY = 'myMentat.playChromeTheme'

export const PLAY_CHROME_THEME_LABELS: Record<PlayChromeTheme, string> = {
  void: 'Void',
  blueish: 'Blueish',
}

export function getPlayChromeTheme(): PlayChromeTheme {
  if (typeof window === 'undefined') return 'void'
  const stored = localStorage.getItem(PLAY_CHROME_THEME_STORAGE_KEY)
  return stored === 'blueish' ? 'blueish' : 'void'
}

export function applyPlayChromeTheme(theme: PlayChromeTheme): void {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(PLAY_CHROME_THEME_STORAGE_KEY, theme)
}

export function cyclePlayChromeTheme(): PlayChromeTheme {
  const next: PlayChromeTheme = getPlayChromeTheme() === 'void' ? 'blueish' : 'void'
  applyPlayChromeTheme(next)
  return next
}
