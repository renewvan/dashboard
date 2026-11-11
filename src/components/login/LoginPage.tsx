import { useState, type FormEvent } from 'react'
import { Button, FieldError, Input, Label, TextField } from '@heroui/react'
import { Bluetooth, Eye, EyeOff } from 'lucide-react'
import { BrandLockup } from '@/components/BrandLockup'
import { safeNext } from '@/lib/session'

const DEFAULT_USER = 'renewvan'

export interface LoginPageProps {
  /** Injected in tests. */
  fetcher?: typeof fetch
  /** Where to go once signed in; the browser's `location.replace` by default. */
  onSignedIn?: (next: string) => void
}

/** Why a sign-in failed, from the login service's answer. */
async function failureMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json()
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      return body.error
    }
  } catch {
    // not JSON: fall through to the generic message
  }
  return 'Could not sign in. Try again.'
}

/**
 * The dashboard's sign-in page, shown instead of the app at `/login`. It talks only to the login service
 * (`/api/login`, set up by the hub): on success the service sets the session cookie and the page goes to
 * `?next=` (see `main.tsx`). Phone first; in landscape (<= 480px tall) it shrinks to fit without scrolling.
 */
export function LoginPage({
  fetcher = fetch,
  onSignedIn = (next) => window.location.replace(next),
}: LoginPageProps) {
  const [user, setUser] = useState(DEFAULT_USER)
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetcher('/api/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, password }),
      })
      if (res.ok) {
        onSignedIn(safeNext(new URLSearchParams(window.location.search).get('next')))
        return
      }
      setError(await failureMessage(res))
    } catch {
      setError('Could not reach the van. Check the connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const input = 'min-h-9 w-full py-1 text-sm'
  return (
    <main
      data-testid="login-page"
      className="bg-background flex min-h-dvh flex-col items-center justify-center p-6 [@media(max-height:480px)]:py-3"
    >
      <div className="flex w-full max-w-sm flex-col gap-6 [@media(max-height:480px)]:gap-3">
        <div className="flex flex-col items-center gap-2 text-center [@media(max-height:480px)]:gap-1">
          <BrandLockup />
          <h1 className="text-xl font-bold [@media(max-height:480px)]:text-base">
            Welcome to your van
          </h1>
          <p className="text-muted text-sm [@media(max-height:480px)]:hidden">
            Sign in to see and control it.
          </p>
        </div>
        <form
          onSubmit={submit}
          className="flex w-full flex-col gap-4 [@media(max-height:480px)]:gap-2"
        >
          <TextField value={user} onChange={setUser} className="flex flex-col gap-1">
            <Label>User</Label>
            <Input autoComplete="username" className={input} />
          </TextField>
          <TextField
            isInvalid={error !== null}
            value={password}
            onChange={(value) => {
              setPassword(value)
              setError(null)
            }}
            className="flex flex-col gap-1"
          >
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                className={`${input} pr-12`}
              />
              <button
                type="button"
                aria-label={show ? 'Hide password' : 'Show password'}
                onClick={() => setShow(!show)}
                className="text-muted absolute inset-y-0 right-0 flex w-11 items-center justify-center"
              >
                {show ? (
                  <EyeOff className="size-5" aria-hidden="true" />
                ) : (
                  <Eye className="size-5" aria-hidden="true" />
                )}
              </button>
            </div>
            <FieldError>{error}</FieldError>
          </TextField>
          <Button type="submit" isDisabled={busy || password === ''} fullWidth className="w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
          {/* The wake page needs no login and runs from the cached shell, so it is one tap from here. */}
          <a
            href="/?page=wake"
            className="border-border text-foreground flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold [@media(max-height:480px)]:min-h-9"
          >
            <Bluetooth className="size-4" aria-hidden="true" />
            Wake the van
          </a>
        </form>
        <p className="text-muted text-center text-xs">
          This dashboard can control the van, so it needs a login.
        </p>
      </div>
    </main>
  )
}
