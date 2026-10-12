import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StubPane } from './StubPane'

describe('StubPane', () => {
  it('renders the title and the placeholder text', () => {
    render(<StubPane id="tanks" title="Tanks" />)
    expect(screen.getByRole('heading', { name: 'Tanks' })).toBeInTheDocument()
    expect(screen.getByText('Not migrated yet.')).toBeInTheDocument()
  })

  it('is a region named by its title', () => {
    render(<StubPane id="alerts" title="Alerts" />)
    expect(screen.getByRole('region', { name: 'Alerts' })).toBeInTheDocument()
  })

  it('renders the optional icon', () => {
    render(<StubPane id="gps" title="GPS" icon={<svg data-testid="icon-gps" />} />)
    expect(screen.getByTestId('icon-gps')).toBeInTheDocument()
  })
})
