import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useAutoHide } from './useAutoHide'

const IDLE = 4000

function Probe({ enabled = true }: { enabled?: boolean }) {
  const hidden = useAutoHide(enabled)
  return (
    <div>
      <output data-testid="state">{hidden ? 'hidden' : 'visible'}</output>
      {/* Like a React Aria press target: it handles pointer events and stops them bubbling. */}
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        Press me
      </button>
      <div data-testid="scroller" />
    </div>
  )
}

const state = () => screen.getByTestId('state').textContent

async function wait(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAutoHide', () => {
  it('hides after the idle time with no interaction', async () => {
    render(<Probe />)
    await wait(IDLE - 1)
    expect(state()).toBe('visible')
    await wait(2)
    expect(state()).toBe('hidden')
  })

  it('stays up while the user keeps tapping a button that stops propagation', async () => {
    render(<Probe />)
    const button = screen.getByRole('button', { name: 'Press me' })
    // Ten taps, each just inside the idle window: well past one full idle period in total.
    for (let i = 0; i < 10; i++) {
      await wait(IDLE - 500)
      fireEvent.pointerDown(button)
      fireEvent.pointerUp(button)
      fireEvent.click(button)
    }
    expect(state()).toBe('visible')
    await wait(IDLE + 1)
    expect(state()).toBe('hidden')
  })

  it.each([
    ['a touch drag with no pointermove', (el: HTMLElement) => fireEvent.touchMove(el)],
    ['a touch tap', (el: HTMLElement) => fireEvent.touchEnd(el)],
    ['a wheel scroll', (el: HTMLElement) => fireEvent.wheel(el)],
    [
      'a scroll of an inner scroller (scroll does not bubble)',
      (el: HTMLElement) => fireEvent.scroll(el),
    ],
    ['a key press', (el: HTMLElement) => fireEvent.keyDown(el, { key: 'ArrowRight' })],
  ])('stays up through %s', async (_name, interact) => {
    render(<Probe />)
    const target = screen.getByTestId('scroller')
    for (let i = 0; i < 5; i++) {
      await wait(IDLE - 500)
      interact(target)
    }
    expect(state()).toBe('visible')
  })

  it('is brought back by a press, but not by movement or scrolling', async () => {
    render(<Probe />)
    await wait(IDLE + 1)
    expect(state()).toBe('hidden')

    fireEvent.pointerMove(document.body)
    fireEvent.scroll(screen.getByTestId('scroller'))
    fireEvent.wheel(document.body)
    expect(state()).toBe('hidden')

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Press me' }))
    expect(state()).toBe('visible')
    await wait(IDLE + 1)
    expect(state()).toBe('hidden')
  })

  it('is never hidden while disabled', async () => {
    render(<Probe enabled={false} />)
    await wait(IDLE * 3)
    expect(state()).toBe('visible')
  })
})
