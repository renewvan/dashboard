import { ArrowDown, ArrowUp } from 'lucide-react'
import { useRef } from 'react'
import { Button, Label, Switch } from '@heroui/react'
import { START_WIDGETS } from '@/components/start/widgets/registry'
import { moveWidget, type StartWidgetId } from '@/hooks/useStartLayout'
import { Group } from '../../shared/Group'

/** Changes to the Show switch closer together than this are one tap delivered twice. */
const SAME_TAP_MS = 300

interface WidgetViewProps {
  id: StartWidgetId
  layout: readonly StartWidgetId[]
  onChange: (layout: readonly StartWidgetId[]) => void
}

/**
 * Settings › General › Widgets › one widget: whether the phone Start page shows it, and where. A
 * widget switched on joins the end of the page; switched off, it leaves a gap for no one.
 */
export function WidgetView({ id, layout, onChange }: WidgetViewProps) {
  const { label } = START_WIDGETS[id]
  const index = layout.indexOf(id)
  const shown = index !== -1

  // One tap can reach a switch twice (its press, then the browser's own click on the label), and
  // the second change undoes the first: the switch looks dead. A real second tap takes longer.
  const lastChange = useRef(0)
  const setShown = (on: boolean) => {
    const now = performance.now()
    if (now - lastChange.current < SAME_TAP_MS) return
    lastChange.current = now
    onChange(on ? [...layout, id] : layout.filter((w) => w !== id))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-surface overflow-hidden rounded-2xl border">
        <Switch className="w-full" isSelected={shown} onChange={setShown}>
          <Switch.Content className="w-full justify-between gap-3 px-3.5 py-3">
            <Label className="flex flex-col items-start gap-0.5 text-sm font-medium">
              Show {label}
              <span className="text-muted text-xs font-normal">
                {shown ? `Position ${index + 1} of ${layout.length}` : 'Not on the Start page'}
              </span>
            </Label>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
      </div>
      <p className="text-muted px-1 text-sm">
        This changes the Start page on a phone, and on the kiosk when its Start view is Grid. The
        Cockpit keeps its dial.
      </p>
      {shown && (
        <Group title="Position">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="min-h-11 flex-1"
              isDisabled={index === 0}
              onPress={() => onChange(moveWidget(layout, id, -1))}
            >
              <ArrowUp aria-hidden="true" />
              Move up
            </Button>
            <Button
              variant="secondary"
              className="min-h-11 flex-1"
              isDisabled={index === layout.length - 1}
              onPress={() => onChange(moveWidget(layout, id, 1))}
            >
              <ArrowDown aria-hidden="true" />
              Move down
            </Button>
          </div>
        </Group>
      )}
    </div>
  )
}
