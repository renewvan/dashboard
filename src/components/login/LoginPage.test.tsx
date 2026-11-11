import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from './LoginPage'

const reply = (status: number, body?: unknown) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })

function setSearch(search: string) {
  window.history.replaceState(null, '', `/login${search}`)
}

afterEach(() => setSearch(''))

async function signIn(password = 'hunter2') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('LoginPage', () => {
  it('posts the user and password as JSON to the login service', async () => {
    const fetcher = reply(200, { ok: true })
    render(<LoginPage fetcher={fetcher as unknown as typeof fetch} onSignedIn={() => {}} />)
    await signIn()
    expect(fetcher).toHaveBeenCalledWith(
      '/api/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({ user: 'renewvan', password: 'hunter2' }),
      }),
    )
  })

  it('goes to ?next= after signing in', async () => {
    setSearch('?next=%2Frelays')
    const onSignedIn = vi.fn()
    render(
      <LoginPage
        fetcher={reply(200, { ok: true }) as unknown as typeof fetch}
        onSignedIn={onSignedIn}
      />,
    )
    await signIn()
    expect(onSignedIn).toHaveBeenCalledWith('/relays')
  })

  it('never follows a next that leaves the site', async () => {
    setSearch('?next=%2F%2Fevil.test')
    const onSignedIn = vi.fn()
    render(
      <LoginPage
        fetcher={reply(200, { ok: true }) as unknown as typeof fetch}
        onSignedIn={onSignedIn}
      />,
    )
    await signIn()
    expect(onSignedIn).toHaveBeenCalledWith('/')
  })

  it('shows the service message on a wrong password and stays on the page', async () => {
    const onSignedIn = vi.fn()
    render(
      <LoginPage
        fetcher={reply(401, { error: 'Wrong user or password.' }) as unknown as typeof fetch}
        onSignedIn={onSignedIn}
      />,
    )
    await signIn()
    expect(await screen.findByText('Wrong user or password.')).toBeInTheDocument()
    expect(onSignedIn).not.toHaveBeenCalled()
  })

  it('says so when the van cannot be reached', async () => {
    const down = vi.fn().mockRejectedValue(new TypeError('network'))
    render(<LoginPage fetcher={down as unknown as typeof fetch} onSignedIn={() => {}} />)
    await signIn()
    expect(await screen.findByText(/Could not reach the van/)).toBeInTheDocument()
  })

  it('keeps Sign in disabled until a password is typed, and can show the password', async () => {
    render(<LoginPage fetcher={reply(200) as unknown as typeof fetch} onSignedIn={() => {}} />)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Password'), 'abc')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
  })
})
