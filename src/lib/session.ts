/**
 * Whether this browser holds a valid login session (hub docs/adr/0029-dashboard-login-is-a-session-cookie.md).
 * Only an explicit 401 means "signed out". The kiosk (plain nginx, no login service), local dev and any
 * network failure all count as signed in: the page must never lock itself out of a hub it can't ask.
 */
export async function isSignedOut(fetcher: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetcher('/api/session', { credentials: 'same-origin', cache: 'no-store' })
    return res.status === 401
  } catch {
    return false
  }
}

/** Where to go after signing in: a path on this site only, never another origin or the login page. */
export function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/login')) return '/'
  return raw
}

/** The login page URL for a signed-out visitor to `path`. */
export function loginUrl(path: string): string {
  return `/login?next=${encodeURIComponent(path)}`
}
