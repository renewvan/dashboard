import { useNow } from '@/hooks/useNow'
import { SolarHistory } from '@/components/widgets/solar/SolarHistory'
import {
  formatYieldAmount,
  HISTORY_PAGE_DAYS,
  historyDayLabel,
  yieldHistoryView,
} from '@/components/widgets/solar/solarView'
import { DetailList, DetailRow } from '../shared/DetailList'
import { useSettingsData } from '../SettingsContext'

/** The day labels only change at midnight: a slow refresh keeps `Today` right on a screen left open. */
const NOW_REFRESH_MS = 60_000

/**
 * Settings › Devices › Solar › <controller> › History: the controller's own daily harvest, a month at
 * most. The bars are the Power page's chart with its kWh scale, then every day as a row, newest first;
 * a day the controller has no data for reads `—`, which is not the same as a day that harvested
 * nothing (`0 Wh`).
 */
export function SolarHistoryView({ id }: { id: string }) {
  const { solar } = useSettingsData()
  const now = new Date(useNow(NOW_REFRESH_MS))
  const history = solar[id]?.yield_history_wh
  const view = yieldHistoryView(history, HISTORY_PAGE_DAYS)
  if (view === undefined) {
    return (
      <p className="border-border bg-surface text-muted rounded-2xl border px-3.5 py-3 text-sm">
        This controller has not published its history yet.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="border-border bg-surface h-52 rounded-2xl border p-3.5">
        <SolarHistory view={view} scale />
      </div>
      <DetailList label="Daily yield">
        {[...view.days].reverse().map(({ daysAgo, wh }) => {
          const yielded = wh === null ? undefined : formatYieldAmount(wh)
          return (
            <DetailRow
              key={daysAgo}
              label={historyDayLabel(daysAgo, now)}
              value={yielded ? `${yielded.value} ${yielded.unit}` : null}
            />
          )
        })}
      </DetailList>
    </div>
  )
}
