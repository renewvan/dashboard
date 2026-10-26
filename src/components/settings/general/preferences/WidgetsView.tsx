import { ChevronRight, GripVertical } from 'lucide-react'
import { Button } from '@heroui/react'
import { START_WIDGETS } from '@/components/start/widgets/registry'
import {
  DEFAULT_START_LAYOUT,
  START_WIDGET_IDS,
  reorderWidget,
  type StartWidgetId,
} from '@/hooks/useStartLayout'
import { cn } from '@/lib/utils'
import { Group } from '../../shared/Group'
import { useDragReorder } from './useDragReorder'

interface WidgetsViewProps {
  layout: readonly StartWidgetId[]
  onChange: (layout: readonly StartWidgetId[]) => void
  onOpen: (id: StartWidgetId) => void
}

function isDefaultLayout(layout: readonly StartWidgetId[]): boolean {
  return (
    layout.length === DEFAULT_START_LAYOUT.length &&
    layout.every((id, i) => id === DEFAULT_START_LAYOUT[i])
  )
}

interface WidgetRowProps {
  id: StartWidgetId
  description: string
  onOpen: () => void
  /** Present on a widget that is on the page: the grip that drags it. */
  grip?: {
    props: ReturnType<ReturnType<typeof useDragReorder>['handleProps']>
    onKeyDown: (key: 'ArrowUp' | 'ArrowDown') => void
    dragging: boolean
  }
}

/**
 * One widget: a grip to drag it (widgets on the page only), then its name and position, which opens
 * its own page. Every control is 44px.
 */
function WidgetRow({ id, description, onOpen, grip }: WidgetRowProps) {
  const { label, icon: Icon } = START_WIDGETS[id]
  return (
    <div
      className={cn(
        'border-border bg-surface flex items-center overflow-hidden rounded-2xl border select-none',
        grip?.dragging && 'shadow-lg',
      )}
    >
      {grip ? (
        <button
          type="button"
          aria-label={`Reorder ${label}`}
          {...grip.props}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              grip.onKeyDown(e.key)
            }
          }}
          className="text-muted flex size-11 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
        >
          <GripVertical aria-hidden="true" className="size-5" />
        </button>
      ) : (
        <span aria-hidden="true" className="size-11 shrink-0" />
      )}
      <Button
        variant="ghost"
        fullWidth
        onPress={onOpen}
        className="h-auto! min-h-11 min-w-0 flex-1 justify-between! gap-3! rounded-none! py-3! pr-3.5! pl-1! whitespace-normal! md:h-auto!"
      >
        <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
          <Icon className="size-6" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-muted text-xs">{description}</span>
        </span>
        <ChevronRight aria-hidden="true" className="text-muted size-4 shrink-0" />
      </Button>
    </div>
  )
}

/**
 * Settings › General › Display & Appearance › Widgets: the phone Start page's widgets. The ones on
 * the page come first, in the order the page shows them, and are dragged by their grip (or moved
 * with the arrow keys on it) to reorder; the rest are available. Each row opens that widget's page,
 * where it is shown or hidden. Reset puts back the shipped page.
 */
export function WidgetsView({ layout, onChange, onOpen }: WidgetsViewProps) {
  const available = START_WIDGET_IDS.filter((id) => !layout.includes(id))
  const { rowRef, rowStyle, handleProps, draggingIndex } = useDragReorder(
    layout.length,
    (from, to) => onChange(reorderWidget(layout, from, to)),
  )

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted px-1 text-sm">
        Choose what the Start page shows on a phone. Drag the grip to reorder. The kiosk keeps its
        dial.
      </p>
      <Group title="On the Start page">
        {layout.length === 0 ? (
          <p className="text-muted px-1 text-sm">
            No widgets. Open one from the list below to add it.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {layout.map((id, i) => (
              <li key={id} ref={rowRef(i)} style={rowStyle(i)} data-widget-row={id}>
                <WidgetRow
                  id={id}
                  description={`Position ${i + 1} of ${layout.length}`}
                  onOpen={() => onOpen(id)}
                  grip={{
                    props: handleProps(i),
                    dragging: draggingIndex === i,
                    onKeyDown: (key) =>
                      onChange(reorderWidget(layout, i, i + (key === 'ArrowUp' ? -1 : 1))),
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </Group>
      {available.length > 0 && (
        <Group title="Available">
          <ul className="flex flex-col gap-2">
            {available.map((id) => (
              <li key={id} data-widget-row={id}>
                <WidgetRow id={id} description="Not shown" onOpen={() => onOpen(id)} />
              </li>
            ))}
          </ul>
        </Group>
      )}
      <Group title="Reset">
        <Button
          variant="secondary"
          fullWidth
          className="min-h-11"
          isDisabled={isDefaultLayout(layout)}
          onPress={() => onChange(DEFAULT_START_LAYOUT)}
        >
          Reset to default
        </Button>
      </Group>
    </div>
  )
}
