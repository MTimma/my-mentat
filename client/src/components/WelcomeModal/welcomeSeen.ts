/** Browser flag so the welcome modal shows once. Invented key, same prefix as other app prefs. */
export const WELCOME_SEEN_STORAGE_KEY = 'myMentat.welcomeSeen'

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(WELCOME_SEEN_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(WELCOME_SEEN_STORAGE_KEY, '1')
  } catch {
    // Private mode or a full quota: the modal can show again next visit.
  }
}
