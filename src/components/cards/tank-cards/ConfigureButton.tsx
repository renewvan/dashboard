import { Settings } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip'

export interface ConfigureButtonProps {
  size?: ButtonProps['size']
  /** Icon-only, no "Configure" text — for row/dense layouts. */
  iconOnly?: boolean
  /** Circular button instead of the default rounded-rectangle. */
  round?: boolean
}

/**
 * Disabled "Configure" button shared by every tank-card variant. No
 * command topic exists yet for tank configuration (see map's Notes), so
 * this is a "coming soon" affordance: disabled with a tooltip. `size`
 * governs the *visible* box (use `icon-xl` for a real 44×44px kiosk
 * touch target per `docs/design-principles.md`, not just the invisible
 * `pointer-coarse` hit-area overlay `Button` adds on top of that).
 */
export function ConfigureButton({
  size = 'default',
  iconOnly = false,
  round = false,
}: ConfigureButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size={size}
            disabled
            className={cn('pointer-events-auto', round && 'rounded-full')}
          >
            <Settings className="size-4" />
            {!iconOnly && 'Configure'}
          </Button>
        }
      />
      <TooltipPopup>Coming soon</TooltipPopup>
    </Tooltip>
  )
}
