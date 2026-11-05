export const practiceGuideStorageKey = 'zju-practice-guide-seen-v1'
let seenInThisPage = false

export function hasSeenPracticeGuide() {
  if (seenInThisPage) return true
  for (const storage of ['localStorage', 'sessionStorage'] as const) {
    try {
      if (window[storage].getItem(practiceGuideStorageKey) === 'true') return true
    } catch {
      // Keep the guide usable when browser storage is unavailable.
    }
  }
  return false
}

export function acknowledgePracticeGuide() {
  seenInThisPage = true
  for (const storage of ['localStorage', 'sessionStorage'] as const) {
    try {
      window[storage].setItem(practiceGuideStorageKey, 'true')
    } catch {
      // Dismiss for this page even if saving is blocked.
    }
  }
}
