import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'
import { HubUnreachableBanner } from './HubUnreachableBanner'

describe('HubUnreachableBanner', () => {
  it('says the hub is unreachable and links to the wake page', () => {
    render(<HubUnreachableBanner />)
    expect(screen.getByRole('status')).toHaveTextContent('Can’t reach the hub')
    expect(screen.getByRole('link', { name: 'Wake the van' })).toHaveAttribute(
      'href',
      '/?page=wake',
    )
  })
})
