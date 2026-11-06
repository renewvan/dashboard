import { Button } from '@heroui/react'
import { START_WIDGETS } from '@/components/start/widgets/registry'
import {
  DEFAULT_START_LAYOUT,
  START_WIDGET_IDS,
  reorderWidget,
  type StartWidgetId,
} from '@/hooks/useStartLayout'
import { Group } from '../../shared/Group'
import { ReorderRow, type ReorderGrip } from '../../shared/ReorderRow'
import { useDragReorder } from '@/hooks/useDragReorder'

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
  grip?: ReorderGrip
}

/** One widget: a grip to drag it (widgets on the page only), then its name and position, which opens its own page. */
function WidgetRow({ id, description, onOpen, grip }: WidgetRowProps) {
  const { label, icon: Icon } = START_WIDGETS[id]
  return (
    <ReorderRow
      icon={<Icon className="size-6" />}
      label={label}
      description={description}
      onOpen={onOpen}
      grip={grip}
    />
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
