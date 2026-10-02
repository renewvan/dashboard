import { ChevronsLeftRightEllipsis, CloudOff, Loader2, ShieldLock, Wifi } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TailscaleStatus, UplinkStatus } from '../hooks/useRenewvanBus'
import { tailscaleStatusText } from '../lib/tailscale'
import { IconStatusButton } from './IconStatusButton'

export interface UplinkStatusButtonProps {
  uplink: UplinkStatus | null
  tailscale: TailscaleStatus | null
  onOpenSettings: () => void
}

interface UplinkPresentation {
  Icon: LucideIcon
  iconClass: string
  label: string
  online: boolean | null // null = still checking
}

/**
 * Header button for the van's uplink (`CONTEXT.md`) — the internet path
 * as seen by the hub, not the kiosk's bus link (`RouterStatusIcon`). One
 * morphing icon per the visual-states decision (spec §6.1, prototype on
 * the `prototype/uplink-button-visual-states` branch): a dedicated glyph
 * per path while online, collapsing to the universal `CloudOff` the
 * instant `online` is false regardless of the last-known path.
 * `CloudOff` is reserved exclusively for this button so the two red
 * header icons never share a shape.
 */
function present(uplink: UplinkStatus | null): UplinkPresentation {
  if (uplink === null) {
    // No retained message yet — the hub's first probe hasn't landed.
    return {
      Icon: Loader2,
      iconClass: 'text-warning animate-spin',
      label: 'Checking uplink…',
      online: null,
    }
  }
  if (!uplink.online) {
    return { Icon: CloudOff, iconClass: 'text-destructive', label: 'Uplink offline', online: false }
  }
  if (uplink.path === 'lan') {
    return {
      Icon: ChevronsLeftRightEllipsis,
      iconClass: 'text-success',
      label: 'Uplink via LAN',
      online: true,
    }
  }
  if (uplink.path === 'wifi') {
    return {
      Icon: Wifi,
      iconClass: 'text-success',
      label: `Uplink via WiFi${uplink.ssid ? ` (${uplink.ssid})` : ''}`,
      online: true,
    }
  }
  return {
    Icon: ShieldLock,
    iconClass: 'text-success',
    label: 'Uplink via Tailscale',
    online: true,
  }
}

function FieldRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="text-muted-foreground flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="text-foreground">{value ?? '—'}</span>
    </div>
  )
}

export function UplinkStatusButton({ uplink, tailscale, onOpenSettings }: UplinkStatusButtonProps) {
  const { Icon, iconClass, label, online } = present(uplink)
  return (
    <IconStatusButton
      label={label}
      data-testid="uplink-status-button"
      data-state={uplink === null ? 'checking' : online ? 'online' : 'offline'}
      icon={<Icon className={`size-5 ${iconClass}`} />}
      onOpenSettings={onOpenSettings}
      popoverContent={
        <div className="flex flex-col gap-1.5">
          {uplink === null ? (
            'Checking…'
          ) : (
            <>
              <div className="font-medium">{online ? 'Online' : 'Offline'}</div>
              {uplink.path === 'wifi' && <FieldRow label="Wi-Fi network" value={uplink.ssid} />}
              {online && (
                <>
                  <FieldRow label="Interface" value={uplink.interface} />
                  <FieldRow label="Local IP" value={uplink.ip} />
                </>
              )}
            </>
          )}
          <FieldRow label="Tailscale" value={tailscaleStatusText(tailscale)} />
        </div>
      }
    />
  )
}
