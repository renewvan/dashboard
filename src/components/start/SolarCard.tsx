import { formatPower } from '@/components/power/flowModel'
import { SolarHistory } from '@/components/widgets/solar/SolarHistory'
import { formatYieldAmount, yieldHistoryView } from '@/components/widgets/solar/solarView'
import type { Solar } from '@/types'

/**
 * The phone card charts two weeks: more bars, each thinner, in a lower chart than the Power page's
 * ten days, so the bars stay small enough to read as a trend.
 */
const PHONE_HISTORY_DAYS = 14

/**
 * The phone Start page's solar card body: the controller's live power and today's harvest, then its
 * daily harvest history as the Power page's Solar tile draws it. The history is the controller's own
 * log, so a controller that publishes none gets the readings alone.
 */
export function SolarCard({ solar }: { solar: Solar }) {
  const history = yieldHistoryView(solar.yield_history_wh, PHONE_HISTORY_DAYS)
  const power = formatPower(Math.round(solar.power_w))
  const today =
    solar.yield_today_wh === undefined ? undefined : formatYieldAmount(solar.yield_today_wh)

  return (
    <div data-testid="solar-card" className="flex w-full flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span data-testid="solar-watts" className="text-4xl font-semibold tabular-nums">
            {power.value}
          </span>
          <span className="text-muted text-lg font-medium">{power.unit}</span>
        </div>
        <div className="text-muted text-sm">
          <span data-testid="solar-yield" className="text-foreground font-semibold tabular-nums">
            {today?.value ?? '\u2014'}
          </span>{' '}
          {today?.unit ?? 'kWh'} today
        </div>
      </div>
      {history && (
        <div className="h-32">
          <SolarHistory view={history} scale />
        </div>
      )}
    </div>
  )
}
