import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { renderSettings } from '@/test/renderSettings'

const NOTICES = '@/data/notices.generated'

afterEach(() => {
  vi.doUnmock(NOTICES)
  vi.resetModules()
})

// The failure case runs first: a mocked import that never settles (the loading case) stays pending
// in the module loader and would be reused by a later test importing the same module.
describe('About when its licences do not load', () => {
  it('shows a quiet failure note, and the credits are still there', async () => {
    vi.doMock(NOTICES, () => {
      throw new Error('chunk failed to load')
    })

    renderSettings({}, { url: '/?page=settings&view=about' })

    expect(
      await screen.findByText('The software licences could not be loaded.'),
    ).toBeInTheDocument()
    expect(screen.getByText('© OpenStreetMap contributors')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Software licences' })).not.toBeInTheDocument()
  })

  it('shows a quiet loading note while they load, and the credits are already there', async () => {
    vi.doMock(NOTICES, () => new Promise(() => {}))

    renderSettings({}, { url: '/?page=settings&view=about' })

    const software = screen.getByRole('heading', { name: 'Software' }).parentElement!
    expect(within(software).getByText('Loading…')).toBeInTheDocument()
    expect(screen.getByText('© OpenStreetMap contributors')).toBeInTheDocument()
  })
})
