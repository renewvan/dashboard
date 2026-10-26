import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { PageErrorBoundary } from './PageErrorBoundary'

let broken = true

function Flaky() {
  if (broken) throw new Error('boom')
  return <p>page ok</p>
}

describe('PageErrorBoundary', () => {
  beforeEach(() => {
    broken = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows a retry pane instead of crashing, and recovers on retry', async () => {
    render(
      <PageErrorBoundary name="tanks">
        <Flaky />
      </PageErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()

    broken = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('page ok')).toBeInTheDocument()
  })

  it('renders its children untouched when nothing fails', () => {
    broken = false
    render(
      <PageErrorBoundary name="tanks">
        <Flaky />
      </PageErrorBoundary>,
    )
    expect(screen.getByText('page ok')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
