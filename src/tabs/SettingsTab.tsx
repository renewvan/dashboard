import { Fragment, useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { AutoSleepTimeoutMinutes, TailscaleStatus } from '../hooks/useRenewvanBus'
import { tailscaleStatusText } from '../lib/tailscale'
import { useSettingsNavStyle, type SettingsNavStyle } from '../hooks/useSettingsNavStyle'
import { Switch } from '../components/ui/switch'
import { Slider } from '../components/ui/slider'
import { Field, FieldLabel, FieldDescription } from '../components/ui/field'
import { Sheet, SheetPopup, SheetHeader, SheetTitle, SheetPanel } from '../components/ui/sheet'
import { Frame, FramePanel } from '../components/ui/frame'
import { Label } from '../components/ui/label'
import { Radio, RadioGroup } from '../components/ui/radio-group'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '../components/ui/breadcrumb'
import { segmentedControlRootClassName, segmentedControlItemVariants } from '../lib/segmented-control'
import { cn } from '../lib/utils'

export interface SettingsTabProps {
  tailscale: TailscaleStatus | null
  /**
   * Display group settings, sourced from `useRenewvanBus` — `null` until
   * the retained topic arrives (wire contract:
   * hub's `.scratch/kiosk-settings-panel/issues/01-settings-mqtt-contract.md`).
   * Controls disable while `null`, matching `DisplayPowerButton`'s existing
   * convention for not-yet-known state.
   */
  remoteSleepAllowed: boolean | null
  brightness: number | null
  autoSleepEnabled: boolean | null
  autoSleepTimeoutMinutes: AutoSleepTimeoutMinutes | null
  onRemoteSleepAllowedChange: (value: boolean) => void
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
}

const TIMEOUT_CHOICES: AutoSleepTimeoutMinutes[] = [1, 5, 15, 30]
const BRIGHTNESS_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const BRIGHTNESS_TICK_SKIP_INTERVAL = 2

function GroupRow({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between px-3.5 py-3 text-left hover:bg-foreground/5"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-xs">{description}</span>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
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

type DisplayFieldsProps = Pick<
  SettingsTabProps,
  | 'remoteSleepAllowed'
  | 'brightness'
  | 'autoSleepEnabled'
  | 'autoSleepTimeoutMinutes'
  | 'onRemoteSleepAllowedChange'
  | 'onBrightnessChange'
  | 'onAutoSleepEnabledChange'
  | 'onAutoSleepTimeoutMinutesChange'
>

function RemoteSleepField({ remoteSleepAllowed, onRemoteSleepAllowedChange }: DisplayFieldsProps) {
  return (
    <Field className="flex-row items-center justify-between px-3.5 py-2.5">
      <div className="flex flex-col gap-0.5">
        <FieldLabel>Remote sleep</FieldLabel>
        <FieldDescription>Allow the dashboard to put the display to sleep. The host can always sleep it either way.</FieldDescription>
      </div>
      <Switch
        checked={remoteSleepAllowed ?? true}
        disabled={remoteSleepAllowed === null}
        onCheckedChange={(checked) => onRemoteSleepAllowedChange(checked)}
      />
    </Field>
  )
}

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
        <FieldLabel className="font-medium text-sm">Brightness</FieldLabel>
        <span className="text-muted-foreground text-xs">{brightness === null ? '—' : `${brightness}%`}</span>
      </div>
            <div className="flex flex-col w-full items-center justify-between gap-1">

      <Slider
        value={value}
        max={100}
        disabled={brightness === null}
        onValueChange={(v) => onBrightnessChange(Array.isArray(v) ? v[0] : v)}
      />
      <div
        aria-label="Brightness scale from 0 to 100"
        className="mt-1 flex w-full items-center justify-between gap-1 px-2.5 font-medium text-muted-foreground text-xs"
        role="group"
      >
        {BRIGHTNESS_TICKS.map((tick, i) => (
          <span className="flex w-0 flex-col items-center justify-center gap-2" key={tick}>
            <span
              className={cn(
                'h-1 w-px bg-muted-foreground/72',
                i % BRIGHTNESS_TICK_SKIP_INTERVAL !== 0 && 'h-0.5',
              )}
            />
            <span className={cn(i % BRIGHTNESS_TICK_SKIP_INTERVAL !== 0 && 'opacity-0')}>{tick}</span>
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
        <div className="flex items-center justify-between border-border border-t px-3.5 py-2.5">
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

function NavStyleSwitcher({ value, onChange }: { value: SettingsNavStyle; onChange: (v: SettingsNavStyle) => void }) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as SettingsNavStyle)} className="w-full gap-2">
      {NAV_STYLE_OPTIONS.map((option) => (
        <Label
          key={option.value}
          className="flex items-start gap-2 rounded-lg border border-border p-3 hover:bg-foreground/5 has-data-checked:border-primary/48 has-data-checked:bg-foreground/5"
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

const CARD_WRAPPER = 'flex flex-1 flex-col h-full overflow-y-auto rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-md'

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
  const { tailscale, portalContainer, active } = props
  const [navStyle, setNavStyle] = useSettingsNavStyle()
  const [view, setView] = useState<'list' | 'display' | 'network' | 'navigation'>('list')

  useEffect(() => {
    if (!active) setView('list')
  }, [active])

  const sheetBg = 'border-white/10 bg-card/40 text-foreground backdrop-blur-md'

  const FRAME_CLASS = 'bg-transparent p-0 gap-0'
  const PANEL_CLASS = 'overflow-hidden border-white/10 bg-card/20 p-0 backdrop-blur-md'

  const groupList = (
    <Frame className={FRAME_CLASS}>
      <FramePanel className={PANEL_CLASS}>
        <GroupRow label="Display" description="Remote sleep, brightness, auto-sleep" onClick={() => setView('display')} />
      </FramePanel>
      <FramePanel className={PANEL_CLASS}>
        <GroupRow label="Network" description={tailscaleStatusText(tailscale)} onClick={() => setView('network')} />
      </FramePanel>
    </Frame>
  )

  const displayFields = (
    <Frame className={FRAME_CLASS}>
      <FramePanel className={PANEL_CLASS}>
        <BrightnessField {...props} />
      </FramePanel>
      <FramePanel className={PANEL_CLASS}>
        <RemoteSleepField {...props} />
      </FramePanel>
      <FramePanel className={PANEL_CLASS}>
        <AutoSleepField {...props} />
      </FramePanel>
      <FramePanel className={PANEL_CLASS}>
        <GroupRow
          label="Navigation"
          description={navStyle === 'subpage' ? 'Subpages' : 'Sheets'}
          onClick={() => setView('navigation')}
        />
      </FramePanel>
    </Frame>
  )

  const networkFields = (
    <Frame className={FRAME_CLASS}>
      <FramePanel className={PANEL_CLASS}>
        <TailscaleRow tailscale={tailscale} />
      </FramePanel>
    </Frame>
  )

  const navigationFields = (
    <Frame className={FRAME_CLASS}>
      <FramePanel className="border-white/10 bg-card/20 backdrop-blur-md">
        <NavStyleSwitcher value={navStyle} onChange={setNavStyle} />
      </FramePanel>
    </Frame>
  )

  if (navStyle === 'sheet') {
    return (
      <div className={CARD_WRAPPER}>
        <h1 className="mb-2 px-1 font-medium text-base">Settings</h1>
        {groupList}

        <Sheet open={view === 'display'} onOpenChange={(open) => setView(open ? 'display' : 'list')}>
          <SheetPopup side="right" className={sheetBg} portalProps={{ container: portalContainer ?? undefined }}>
            <SheetHeader>
              <SheetTitle>Display</SheetTitle>
            </SheetHeader>
            <SheetPanel className="p-4">{displayFields}</SheetPanel>
          </SheetPopup>
        </Sheet>

        <Sheet open={view === 'network'} onOpenChange={(open) => setView(open ? 'network' : 'list')}>
          <SheetPopup side="right" className={sheetBg} portalProps={{ container: portalContainer ?? undefined }}>
            <SheetHeader>
              <SheetTitle>Network</SheetTitle>
            </SheetHeader>
            <SheetPanel className="p-4">{networkFields}</SheetPanel>
          </SheetPopup>
        </Sheet>

        <Sheet open={view === 'navigation'} onOpenChange={(open) => setView(open ? 'navigation' : 'display')}>
          <SheetPopup side="right" className={sheetBg} portalProps={{ container: portalContainer ?? undefined }}>
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
       { /* <NavStyleSwitcher value={navStyle} onChange={changeNavStyle} /> TODO*/}
        <h1 className="mb-2 px-1 font-medium text-base">Settings</h1>
        {groupList}
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
  const content = view === 'display' ? displayFields : view === 'network' ? networkFields : navigationFields
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
      {content}
    </div>
  )
}
