import { Fragment, useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type {
  AutoSleepTimeoutMinutes,
  ConnectionStatus,
  RouterHealth,
  TailscaleStatus,
} from '../hooks/useRenewvanBus'
import { BUS_TONE, busStatusText, connectionTier, uplinkHeadline } from '../lib/connection'
import { formatBytes, formatUptime } from '../lib/format'
import { plmnOperatorName } from '../lib/plmn'
import { useNow } from '../hooks/useNow'
import { tailscaleStatusText } from '../lib/tailscale'
import { useSettingsNavStyle, type SettingsNavStyle } from '../hooks/useSettingsNavStyle'
import { Switch } from '../components/ui/switch'
import { Slider } from '../components/ui/slider'
import { Field, FieldLabel } from '../components/ui/field'
import { Sheet, SheetPopup, SheetHeader, SheetTitle, SheetPanel } from '../components/ui/sheet'
import { Frame, FramePanel } from '../components/ui/frame'
import { ScrollArea } from '../components/ui/scroll-area'
import { Label } from '../components/ui/label'
import { Radio, RadioGroup } from '../components/ui/radio-group'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb'
import {
  segmentedControlRootClassName,
  segmentedControlItemVariants,
} from '../lib/segmented-control'
import type { Router } from '../types'
import { cn } from '../lib/utils'

export type SettingsView = 'list' | 'display' | 'network' | 'navigation'

export interface SettingsTabProps {
  tailscale: TailscaleStatus | null
  /**
   * Display group settings, sourced from `useRenewvanBus` — `null` until
   * the retained topic arrives (wire contract:
   * hub's `.scratch/kiosk-settings-panel/issues/01-settings-mqtt-contract.md`).
   * Controls disable while `null`, matching `DisplaySleepButton`'s existing
   * convention for not-yet-known state.
   */
  brightness: number | null
  autoSleepEnabled: boolean | null
  autoSleepTimeoutMinutes: AutoSleepTimeoutMinutes | null
  onBrightnessChange: (value: number) => void
  onAutoSleepEnabledChange: (value: boolean) => void
  onAutoSleepTimeoutMinutesChange: (value: AutoSleepTimeoutMinutes) => void
  /**
   * DOM node sheets portal into, supplied by `App.tsx` from a ref on a
   * direct child of the theme-toggling root -- NOT a descendant of any
   * `backdrop-blur`/`filter`/`transform` ancestor, since those create a
   * CSS containing block that would clip the sheet's `fixed inset-0`
   * viewport to that ancestor's box instead of the real viewport.
   * `null` until that ref mounts; sheets fall back to `document.body`
   * (base-ui default) for that first render.
   */
  portalContainer: HTMLDivElement | null
  /**
   * Whether Settings is the sidebar's current tab. Base UI's `Tabs.Panel`
   * keeps every panel mounted (so inactive tabs don't lose scroll
   * position/state) -- without this, this component's own drill-down
   * `view` state would survive switching to another sidebar tab and back,
   * so tapping the Settings wrench again could silently reopen wherever
   * you last drilled into (e.g. still on Display, or even a `navStyle:
   * 'sheet'` dialog) instead of the top-level list. Reset `view` to
   * `'list'` the moment this goes `false` (not when it next becomes
   * `true`) so the panel is already fresh before its next appearance.
   */
  active: boolean
  /**
   * Router uplink entity (`state.routers[routerId]`) + node health +
   * last-received timestamp — rendered as the Network subpage's detail
   * rows and summarized in the Network group's description. Partial
   * between retained messages, deliberately (see types.ts).
   */
  router: Partial<Router> | undefined
  routerHealth: RouterHealth | null
  routerUpdatedAt: number | undefined
  /** Kiosk MQTT bus-link state — the dot row merged in from the deleted `RouterStatusIcon`. */
  busStatus: ConnectionStatus
  /**
   * Deep-link target: when defined at the moment `active` flips true
   * (the header uplink popover's "Network settings" CTA), the Network
   * subpage opens directly instead of the top-level list. App owns and
   * clears this so a plain sidebar entry never inherits a stale focus.
   */
  focusView?: 'network'
  /** Fired when `focusView` has been applied — App clears the target, so
   * a repeat CTA tap (same value) still re-fires the jump next time. */
  onFocusConsumed?: () => void
}

const TIMEOUT_CHOICES: AutoSleepTimeoutMinutes[] = [1, 5, 15, 30]
const BRIGHTNESS_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const BRIGHTNESS_TICK_SKIP_INTERVAL = 2

function GroupRow({
  label,
  description,
  onClick,
}: {
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-foreground/5 flex w-full items-center justify-between px-3.5 py-3 text-left"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-xs">{description}</span>
      </div>
      <ChevronRight className="text-muted-foreground size-4" />
    </button>
  )
}

function TailscaleRow({ tailscale }: { tailscale: TailscaleStatus | null }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <span className="text-sm">Tailscale</span>
      <div className="flex items-center gap-2" data-testid="tailscale-status">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            tailscale?.connected ? 'bg-success' : 'bg-muted-foreground'
          }`}
        />
        <span className="text-muted-foreground text-xs">{tailscaleStatusText(tailscale)}</span>
      </div>
    </div>
  )
}

/** Status-dot colour shared with the uplink popover's Hub row —
 * `lib/connection.ts`'s `BUS_TONE`. */

function BusStatusRow({ status }: { status: ConnectionStatus }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <span className="text-sm">Hub</span>
      <div className="flex items-center gap-2" data-testid="bus-status">
        <span className={`h-2 w-2 shrink-0 rounded-full ${BUS_TONE[status]}`} />
        <span className="text-muted-foreground text-xs">{busStatusText(status)}</span>
      </div>
    </div>
  )
}

/** One read-only row per field, `—` until that property's retained MQTT
 * message arrives (Partial Router, per types.ts — degrade, don't hide). */
function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <span className="text-sm">{label}</span>
      <span className="text-muted-foreground text-xs tabular-nums">{value ?? '—'}</span>
    </div>
  )
}

/**
 * Every field the router entity publishes (`hub/schema/router.schema.json`):
 * operator, network type, the four signal metrics, uptime, and this
 * month's rx/tx data. Lives in the Network subpage — the uplink
 * popover's CTA lands here.
 */
function RouterDetails({ router }: { router: Partial<Router> | undefined }) {
  return (
    <>
      <DetailRow
        label="Operator"
        value={
          router?.operator !== undefined
            ? (plmnOperatorName(router.operator) ?? router.operator)
            : null
        }
      />
      <DetailRow
        label="Network"
        value={router?.network_type !== undefined ? router.network_type.toUpperCase() : null}
      />
      <DetailRow
        label="RSRP"
        value={router?.signal_rsrp_dbm !== undefined ? `${router.signal_rsrp_dbm} dBm` : null}
      />
      <DetailRow
        label="RSRQ"
        value={router?.signal_rsrq_db !== undefined ? `${router.signal_rsrq_db} dB` : null}
      />
      <DetailRow
        label="SINR"
        value={router?.signal_sinr_db !== undefined ? `${router.signal_sinr_db} dB` : null}
      />
      <DetailRow
        label="RSSI"
        value={router?.signal_rssi_dbm !== undefined ? `${router.signal_rssi_dbm} dBm` : null}
      />
      <DetailRow
        label="Uptime"
        value={router?.uptime_s !== undefined ? formatUptime(router.uptime_s) : null}
      />
      <DetailRow
        label="Data this month"
        value={
          router?.data_used_month_rx_b !== undefined && router?.data_used_month_tx_b !== undefined
            ? `↓ ${formatBytes(router.data_used_month_rx_b)} · ↑ ${formatBytes(router.data_used_month_tx_b)}`
            : null
        }
      />
    </>
  )
}

type DisplayFieldsProps = Pick<
  SettingsTabProps,
  | 'brightness'
  | 'autoSleepEnabled'
  | 'autoSleepTimeoutMinutes'
  | 'onBrightnessChange'
  | 'onAutoSleepEnabledChange'
  | 'onAutoSleepTimeoutMinutesChange'
>

function BrightnessField({ brightness, onBrightnessChange }: DisplayFieldsProps) {
  // Coss UI "slider with ticks" form-integration pattern
  // (https://coss.com/ui/r/p-slider-5), scaled from its 0-12 example range
  // to our 0-100 brightness range (11 ticks every 10, labels every 2nd).
  // Wrapped in Field/FieldLabel (not just a bare aria-label on Slider) so
  // the actual <input type="range"> gets a real accessible name via
  // aria-labelledby -- a bare `aria-label` on Slider.Root only labels its
  // outer role="group" wrapper, never reaching the input itself.
  const value = brightness ?? 0
  return (
    <Field className="gap-5 px-3.5 py-2.5">
      <div className="flex w-full items-center justify-between gap-1">
        <FieldLabel className="text-sm font-medium">Brightness</FieldLabel>
        <span className="text-muted-foreground text-xs">
          {brightness === null ? '—' : `${brightness}%`}
        </span>
      </div>
      <div className="flex w-full flex-col items-center">
        <Slider
          value={value}
          max={100}
          disabled={brightness === null}
          onValueChange={(v) => onBrightnessChange(Array.isArray(v) ? v[0] : v)}
        />
        <div
          aria-label="Brightness scale from 0 to 100"
          className="text-muted-foreground mt-1 flex w-full items-center justify-between gap-1 px-2.5 text-xs font-medium"
          role="group"
        >
          {BRIGHTNESS_TICKS.map((tick, i) => (
            <span className="flex w-0 flex-col items-center justify-center gap-2" key={tick}>
              <span
                className={cn(
                  'bg-muted-foreground/72 h-1 w-px',
                  i % BRIGHTNESS_TICK_SKIP_INTERVAL !== 0 && 'h-0.5',
                )}
              />
              <span className={cn(i % BRIGHTNESS_TICK_SKIP_INTERVAL !== 0 && 'opacity-0')}>
                {tick}
              </span>
            </span>
          ))}
        </div>
      </div>
    </Field>
  )
}

function AutoSleepField({
  autoSleepEnabled,
  autoSleepTimeoutMinutes,
  onAutoSleepEnabledChange,
  onAutoSleepTimeoutMinutesChange,
}: DisplayFieldsProps) {
  return (
    <>
      <Field className="flex-row items-center justify-between px-3.5 py-2.5">
        <FieldLabel>Auto-sleep</FieldLabel>
        <Switch
          checked={autoSleepEnabled ?? false}
          disabled={autoSleepEnabled === null}
          onCheckedChange={(checked) => onAutoSleepEnabledChange(checked)}
        />
      </Field>
      {autoSleepEnabled && (
        <div className="border-border flex items-center justify-between border-t px-3.5 py-2.5">
          <span className="text-muted-foreground text-xs">Sleep after</span>
          <div className={segmentedControlRootClassName}>
            {TIMEOUT_CHOICES.map((m) => (
              <button
                key={m}
                type="button"
                data-checked={autoSleepTimeoutMinutes === m || undefined}
                className={segmentedControlItemVariants({ state: 'checked' })}
                onClick={() => onAutoSleepTimeoutMinutesChange(m)}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

const NAV_STYLE_OPTIONS: { value: SettingsNavStyle; label: string; description: string }[] = [
  { value: 'subpage', label: 'Subpages', description: 'Each group replaces the view in place.' },
  { value: 'sheet', label: 'Sheets', description: 'Each group opens a slide-in flyout.' },
]

function NavStyleSwitcher({
  value,
  onChange,
}: {
  value: SettingsNavStyle
  onChange: (v: SettingsNavStyle) => void
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as SettingsNavStyle)}
      className="w-full gap-2"
    >
      {NAV_STYLE_OPTIONS.map((option) => (
        <Label
          key={option.value}
          className="border-border hover:bg-foreground/5 has-data-checked:border-primary/48 has-data-checked:bg-foreground/5 flex items-start gap-2 rounded-lg border p-3"
        >
          <Radio value={option.value} className="mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{option.label}</span>
            <span className="text-muted-foreground text-xs">{option.description}</span>
          </div>
        </Label>
      ))}
    </RadioGroup>
  )
}

const CARD_WRAPPER =
  'flex flex-1 flex-col h-full overflow-hidden rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-md [clip-path:inset(0_round_var(--radius-2xl))]'

/**
 * Settings panel — Display and Network groups. Two navigation styles are
 * both real, user-selectable options (not a dev prototype switch): sheets
 * (each group opens a slide-in flyout) or subpages (each group replaces
 * the view in place). Picked per `docs/agents` wayfinder ticket 05
 * (hub's `.scratch/kiosk-settings-panel/issues/05-...`) after live
 * comparison; kept as a real toggle rather than a single winner because
 * the decision needs a real touch-display trial to settle for good.
 * Display settings are bus-backed (ticket 06) -- `App.tsx` wires these
 * props from `useRenewvanBus`, publishing to the matching `/set` topics.
 */
export function SettingsTab(props: SettingsTabProps) {
  const { tailscale, portalContainer, active, focusView, onFocusConsumed } = props
  const [navStyle, setNavStyle] = useSettingsNavStyle()
  const [view, setView] = useState<SettingsView>('list')
  // Ticks so the Network group's headline degrades to Offline on a stale
  // feed even with no bus traffic re-rendering the tree.
  const now = useNow(30_000)
  const tier = connectionTier(
    props.router?.signal_rsrp_dbm,
    props.routerHealth,
    props.routerUpdatedAt,
    now,
  )

  useEffect(() => {
    if (!active) setView('list')
  }, [active])

  // Deep-link from the header uplink popover's "Network settings" CTA:
  // jump straight into the Network subpage when Settings appears with a
  // focus target set. Consumed here (App clears it) so a repeat tap on
  // the CTA — same value, no prop change — still re-fires the jump after
  // the user has navigated back to the list.
  useEffect(() => {
    if (active && focusView) {
      setView(focusView)
      onFocusConsumed?.()
    }
  }, [active, focusView, onFocusConsumed])

  const sheetBg = 'border-white/10 bg-card/40 text-foreground backdrop-blur-md'

  const FRAME_CLASS = 'bg-transparent p-0 gap-0'
  const PANEL_CLASS = 'overflow-hidden border-white/10 bg-card/20 p-0 backdrop-blur-md'

  const groupList = (
    <Frame className={FRAME_CLASS}>
      <FramePanel className={PANEL_CLASS}>
        <GroupRow
          label="Display"
          description="Remote sleep, brightness, auto-sleep"
          onClick={() => setView('display')}
        />
      </FramePanel>
      <FramePanel className={PANEL_CLASS}>
        <GroupRow
          label="Network"
          description={uplinkHeadline(props.router, tier)}
          onClick={() => setView('network')}
        />
      </FramePanel>
    </Frame>
  )

  const displayFields = (
    <Frame className={FRAME_CLASS}>
      <FramePanel className={PANEL_CLASS}>
        <BrightnessField {...props} />
      </FramePanel>
      <FramePanel className={PANEL_CLASS}>
        <AutoSleepField {...props} />
      </FramePanel>
      <FramePanel className={PANEL_CLASS}>
        <GroupRow
          label="Navigation style"
          description={navStyle === 'subpage' ? 'Subpages' : 'Sheets'}
          onClick={() => setView('navigation')}
        />
      </FramePanel>
    </Frame>
  )

  const networkFields = (
    <Frame className={FRAME_CLASS}>
      <FramePanel className={PANEL_CLASS}>
        <BusStatusRow status={props.busStatus} />
      </FramePanel>
      <FramePanel className={PANEL_CLASS}>
        <RouterDetails router={props.router} />
      </FramePanel>
      <FramePanel className={PANEL_CLASS}>
        <TailscaleRow tailscale={tailscale} />
      </FramePanel>
    </Frame>
  )

  const navigationFields = (
    <Frame className={FRAME_CLASS}>
      <FramePanel className="bg-card/20 border-white/10 backdrop-blur-md">
        <NavStyleSwitcher value={navStyle} onChange={setNavStyle} />
      </FramePanel>
    </Frame>
  )

  if (navStyle === 'sheet') {
    return (
      <div className={CARD_WRAPPER}>
        <h1 className="mb-2 px-1 text-base font-medium">Settings</h1>
        <ScrollArea
          className="min-h-0 flex-1 **:data-[slot=scroll-area-scrollbar]:hidden"
          overscrollContain
          scrollFade
        >
          {groupList}
        </ScrollArea>

        <Sheet
          open={view === 'display'}
          onOpenChange={(open) => setView(open ? 'display' : 'list')}
        >
          <SheetPopup
            side="right"
            className={sheetBg}
            portalProps={{ container: portalContainer ?? undefined }}
          >
            <SheetHeader>
              <SheetTitle>Display</SheetTitle>
            </SheetHeader>
            <SheetPanel className="p-4">{displayFields}</SheetPanel>
          </SheetPopup>
        </Sheet>

        <Sheet
          open={view === 'network'}
          onOpenChange={(open) => setView(open ? 'network' : 'list')}
        >
          <SheetPopup
            side="right"
            className={sheetBg}
            portalProps={{ container: portalContainer ?? undefined }}
          >
            <SheetHeader>
              <SheetTitle>Network</SheetTitle>
            </SheetHeader>
            <SheetPanel className="p-4">{networkFields}</SheetPanel>
          </SheetPopup>
        </Sheet>

        <Sheet
          open={view === 'navigation'}
          onOpenChange={(open) => setView(open ? 'navigation' : 'display')}
        >
          <SheetPopup
            side="right"
            className={sheetBg}
            portalProps={{ container: portalContainer ?? undefined }}
          >
            <SheetHeader>
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <SheetPanel className="p-4">{navigationFields}</SheetPanel>
          </SheetPopup>
        </Sheet>
      </div>
    )
  }

  // navStyle === 'subpage'
  if (view === 'list') {
    return (
      <div className={CARD_WRAPPER}>
        {/* <NavStyleSwitcher value={navStyle} onChange={changeNavStyle} /> TODO*/}
        <h1 className="mb-2 px-1 text-base font-medium">Settings</h1>
        <ScrollArea
          className="min-h-0 flex-1 **:data-[slot=scroll-area-scrollbar]:hidden"
          overscrollContain
          scrollFade
        >
          {groupList}
        </ScrollArea>
      </div>
    )
  }

  const title = view === 'display' ? 'Display' : view === 'network' ? 'Network' : 'Navigation'
  const crumbs: Array<{ label: string; onClick?: () => void }> =
    view === 'navigation'
      ? [
          { label: 'Settings', onClick: () => setView('list') },
          { label: 'Display', onClick: () => setView('display') },
          { label: 'Navigation' },
        ]
      : [{ label: 'Settings', onClick: () => setView('list') }, { label: title }]
  const content =
    view === 'display' ? displayFields : view === 'network' ? networkFields : navigationFields
  return (
    <div className={CARD_WRAPPER}>
      <Breadcrumb className="mb-3 px-1">
        <BreadcrumbList>
          {crumbs.map((crumb, index) => (
            <Fragment key={crumb.label}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.onClick ? (
                  <BreadcrumbLink onClick={crumb.onClick} className="cursor-pointer">
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <ScrollArea
        className="min-h-0 flex-1 **:data-[slot=scroll-area-scrollbar]:hidden"
        overscrollContain
        scrollFade
      >
        {content}
      </ScrollArea>
    </div>
  )
}
