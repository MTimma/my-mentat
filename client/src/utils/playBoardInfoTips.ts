export const PLAY_BOARD_INFO_TIPS_STORAGE_KEY = 'myMentat.playBoardInfoTips'

export function getPlayBoardInfoTipsEnabled(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(PLAY_BOARD_INFO_TIPS_STORAGE_KEY) !== 'false'
}

export function setPlayBoardInfoTipsEnabled(enabled: boolean): void {
  localStorage.setItem(PLAY_BOARD_INFO_TIPS_STORAGE_KEY, enabled ? 'true' : 'false')
}
