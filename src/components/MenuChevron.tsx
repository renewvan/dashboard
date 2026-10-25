import { ChevronRight } from 'lucide-react'

/** The trailing arrow of a drawer row that opens a page (My Van, Alerts, Settings). */
export function MenuChevron() {
  return (
    <ChevronRight
      aria-hidden="true"
      data-testid="menu-chevron"
      className="text-muted size-5 shrink-0"
    />
  )
}
