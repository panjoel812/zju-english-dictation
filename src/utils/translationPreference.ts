const cookieName = 'zju-translation-visible'

export function readTranslationPreference(): boolean {
  try {
    const saved = document.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${cookieName}=`))
    return saved !== `${cookieName}=false`
  } catch {
    return true
  }
}

export function saveTranslationPreference(visible: boolean) {
  try {
    document.cookie = `${cookieName}=${visible}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
  } catch {
    // The current session still works when the browser blocks cookies.
  }
}
