import type { ComponentProps } from 'react'
import { CircleUser, Clapperboard, LayoutGrid, Settings, SquareSparkles, Van } from 'lucide-react'
import { DrawerGroup } from '@/components/DrawerGroup'
import { DrawerRow } from '@/components/DrawerRow'
import { DisplaySleepButton } from '@/components/DisplaySleepButton'
import { ThemeToggleButton } from '@/components/ThemeToggleButton'
import { UplinkStatusButton } from '@/components/UplinkStatusButton'

/** The phone drawer's body: two groups of rows. Profile has My Account, My Van and Widgets; System
 * has Automations, Scenes and Settings (not a bottom-bar tab on a phone). My Van and Widgets open their Settings pages; the rest are disabled
 * placeholders. */
export function DrawerMenuControls({
  close,
  activePage,
  onGoToPage,
  onOpenVan,
  onOpenWidgets,
}: {
  close: () => void
  activePage: string
  onGoToPage: (id: string) => void
  onOpenVan: () => void
  onOpenWidgets: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <DrawerGroup title="Profile">
        <DrawerRow icon={<CircleUser className="size-5" />} label="My Account" disabled />
        <DrawerRow
          icon={<Van className="size-5" />}
          label="My Van"
          navigates
          data-testid="my-van-button"
          onPress={() => {
            close()
            onOpenVan()
          }}
        />
        <DrawerRow
          icon={<LayoutGrid className="size-5" />}
          label="Widgets"
          navigates
          data-testid="widgets-button"
          onPress={() => {
            close()
            onOpenWidgets()
          }}
        />
      </DrawerGroup>
      <DrawerGroup title="System">
        <DrawerRow icon={<SquareSparkles className="size-5" />} label="Automations" disabled />
        <DrawerRow icon={<Clapperboard className="size-5" />} label="Scenes" disabled />
        <DrawerRow
          icon={<Settings className="size-5" />}
          label="Settings"
          navigates
          active={activePage === 'settings'}
          data-testid="settings-button"
          onPress={() => {
            close()
            onGoToPage('settings')
          }}
        />
      </DrawerGroup>
    </div>
  )
}

interface DrawerMenuFooterProps {
  close: () => void
  uplink: ComponentProps<typeof UplinkStatusButton>
  theme: ComponentProps<typeof ThemeToggleButton>['theme']
  onThemeChange: ComponentProps<typeof ThemeToggleButton>['onThemeChange']
  displayPower: ComponentProps<typeof DisplaySleepButton>['displayPower']
  onSleep: () => void
  onWake: () => void
}

/**
 * The phone drawer's footer, pinned to the bottom and in the reverse of reading order:
 * a row of icon tiles (Connection, Theme, Sleep).
 * Rows that navigate close the drawer. The Connection tile opens its popover in place and the theme
 * toggle leaves the drawer open so the change can be seen; Sleep closes it, as the display goes dark.
 */
export function DrawerMenuFooter({
  close,
  uplink,
  theme,
  onThemeChange,
  displayPower,
  onSleep,
  onWake,
}: DrawerMenuFooterProps) {
  return (
    <>
      <div className="flex w-full gap-2">
        <UplinkStatusButton
          {...uplink}
          onOpenSettings={() => {
            close()
            uplink.onOpenSettings()
          }}
          tile
        />
        <ThemeToggleButton theme={theme} onThemeChange={onThemeChange} tile />
        <DisplaySleepButton
          displayPower={displayPower}
          onSleep={() => {
            close()
            onSleep()
          }}
          onWake={onWake}
          tile
        />
      </div>
    </>
  )
}
