import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useIsMobile } from '@/hooks/use-media-query'
import { type MatchMediaStub, stubMatchMedia } from './matchMedia'

function Probe() {
  return <p>{useIsMobile() ? 'mobile' : 'kiosk'}</p>
}

describe('stubMatchMedia', () => {
  let stub: MatchMediaStub

  afterEach(() => stub.restore())

  it('resolves useIsMobile as mobile at 799px', () => {
    stub = stubMatchMedia(799)
    render(<Probe />)
    expect(screen.getByText('mobile')).toBeInTheDocument()
  })

  it('resolves useIsMobile as not mobile at 800px', () => {
    stub = stubMatchMedia(800)
    render(<Probe />)
    expect(screen.getByText('kiosk')).toBeInTheDocument()
  })

  it('re-renders subscribers when the viewport crosses the breakpoint', () => {
    stub = stubMatchMedia(800)
    render(<Probe />)
    act(() => stub.setViewportWidth(799))
    expect(screen.getByText('mobile')).toBeInTheDocument()
    act(() => stub.setViewportWidth(800))
    expect(screen.getByText('kiosk')).toBeInTheDocument()
  })
})
