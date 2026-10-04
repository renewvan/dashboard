import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HomeTab } from './HomeTab'

describe('HomeTab', () => {
  // import.meta.env.DEV is true under Vitest by default, which would hit
  // HomeTab's dev-only GPS-widget prototype branch instead of the real
  // production fallback this test exercises — stub it false so the test
  // covers the lasting behavior, not the throwaway prototype scaffolding
  // (see HomeTab.tsx's PROTOTYPE SCAFFOLDING comment).
  beforeEach(() => {
    vi.stubEnv('DEV', false)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders the waiting-for-hub empty state with no gps data', () => {
    render(<HomeTab gps={{}} />)
    expect(screen.getByText('No campervan data yet.')).toBeInTheDocument()
    expect(screen.getByText('Waiting for readings from the renewvan hub.')).toBeInTheDocument()
  })
})
