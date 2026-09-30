import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomeTab } from './HomeTab'

describe('HomeTab', () => {
  it('renders the waiting-for-hub empty state', () => {
    render(<HomeTab />)
    expect(screen.getByText('No campervan data yet.')).toBeInTheDocument()
    expect(screen.getByText('Waiting for readings from the renewvan hub.')).toBeInTheDocument()
  })
})
