import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface CarouselSlide {
  id: string
  /** Names the slide's dot for a screen reader, e.g. "Power flow". */
  label: string
  content: ReactNode
}

/**
 * A swipeable row of full-width slides with a dot per slide underneath. Native CSS scroll-snap does
 * the swiping, so touch momentum and snapping are the browser's own; the dots only mirror the
 * scroll position and scroll to a slide when pressed. Each dot is 44px tall (see
 * `docs/design-principles.md`) and 20px wide, so the dots sit close together without a tap landing
 * on the wrong one.
 *
 * The track scrolls horizontally only (`overflow-y-hidden`, `touch-pan-x touch-pan-y`): a vertical drag on it
 * scrolls the page, never the slides. A slide is as tall as the tallest one, so the card does not
 * jump as the user swipes.
 */
export function Carousel({ slides, label }: { slides: CarouselSlide[]; label: string }) {
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  // The slide nearest the left edge is the one in view; this follows both swipes and dot presses.
  const sync = useCallback(() => {
    const el = track.current
    if (!el || el.clientWidth === 0) return
    setActive(Math.round(el.scrollLeft / el.clientWidth))
  }, [])

  useEffect(() => {
    const el = track.current
    if (!el) return
    el.addEventListener('scroll', sync, { passive: true })
    return () => el.removeEventListener('scroll', sync)
  }, [sync])

  const goTo = (index: number) => {
    const el = track.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      className="flex w-full flex-col"
    >
      <div
        ref={track}
        data-testid="carousel-track"
        className="flex w-full touch-pan-x touch-pan-y snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overflow-y-hidden overscroll-x-contain [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${slide.label}, ${i + 1} of ${slides.length}`}
            aria-hidden={i === active ? undefined : true}
            className="flex w-full shrink-0 snap-center items-center justify-center"
          >
            {slide.content}
          </div>
        ))}
      </div>
      <div role="group" aria-label={`${label} slides`} className="flex justify-center">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            aria-current={i === active ? 'true' : undefined}
            aria-label={slide.label}
            onClick={() => goTo(i)}
            className="flex h-11 w-5 items-center justify-center"
          >
            <span
              aria-hidden="true"
              className={cn(
                'size-2 rounded-full transition-colors',
                i === active ? 'bg-accent' : 'bg-muted/40',
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
