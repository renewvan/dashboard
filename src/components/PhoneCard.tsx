import type { ReactNode } from 'react'
import { Card } from '@heroui/react'

/**
 * A phone page's card: the title row every card on a page shares, then its content, centred. The
 * Start and Power pages stack these on a phone.
 */
export function PhoneCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="shrink-0 gap-0! p-0!">
      <Card.Header className="flex-row! items-center gap-2 px-4 py-3 text-sm font-semibold">
        <span className="text-muted" aria-hidden="true">
          {icon}
        </span>
        {title}
      </Card.Header>
      <Card.Content className="items-center gap-4 px-4 pb-5">{children}</Card.Content>
    </Card>
  )
}
