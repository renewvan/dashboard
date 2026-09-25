import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RadialGauge } from './RadialGauge'

describe('RadialGauge', () => {
  it('renders the rounded percentage, label, and sub text', () => {
    render(<RadialGauge pct={61.7} label="Fresh water" sub="fresh · 62/100 L" />)
    expect(screen.getByText('62%')).toBeInTheDocument()
    expect(screen.getByText('Fresh water')).toBeInTheDocument()
    expect(screen.getByText('fresh · 62/100 L')).toBeInTheDocument()
  })

  it('clamps out-of-range percentages into the displayed value', () => {
    render(<RadialGauge pct={140} label="Battery" />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('clamps negative percentages to zero', () => {
    render(<RadialGauge pct={-5} label="Battery" />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('omits the sub line when not provided', () => {
    render(<RadialGauge pct={50} label="Battery" />)
    expect(screen.queryByText(/L$/)).not.toBeInTheDocument()
  })
})
