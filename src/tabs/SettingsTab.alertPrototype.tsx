// PROTOTYPE — throwaway, do not ship.
// Answers: "what should an alert toast look like, and where should it sit
// on screen?" (wayfinder ticket
// .scratch/alert-system/issues/03-toast-ui-variants-prototype.md).
//
// Converged design so far: top-right, card width, opaque background tinted
// with the severity color itself (theme-aware color-mix, not a translucent
// alpha over whatever's behind it — a floating toast needs to read as
// solid). Every fire stacks a new card (Q4: "stack, no summary" — dedupe
// was tried and rejected). Mounted only in dev builds from SettingsTab.
// Capture the winner, then delete this file and the mount point — see the
// ticket for the resolution this is meant to produce.
import { Toast } from '@base-ui/react/toast'
import { CircleAlertIcon, InfoIcon, TriangleAlertIcon, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Severity = 'info' | 'warning' | 'critical'

const SEVERITY_ICON: Record<Severity, typeof InfoIcon> = {
  critical: CircleAlertIcon,
  info: InfoIcon,
  warning: TriangleAlertIcon,
}

const SEVERITY_COPY: Record<Severity, { title: string; description: string }> = {
  critical: { title: 'Relay fault', description: 'Water pump relay failed to close. Check wiring.' },
  info: { title: 'Tailscale connected', description: 'Remote access is available.' },
  warning: { title: 'Fresh tank low', description: '18% remaining — plan a fill-up soon.' },
}

// Solid, theme-aware background: mixes the severity color into the
// existing `--popover` token (which already flips with the theme), so the
// result is always opaque — no photo/backdrop ever shows through — while
// staying dark in dark mode and light in light mode automatically.
const SEVERITY_BG: Record<Severity, string> = {
  critical: 'bg-[color-mix(in_srgb,var(--destructive)_18%,var(--popover))]',
  info: 'bg-[color-mix(in_srgb,var(--info)_18%,var(--popover))]',
  warning: 'bg-[color-mix(in_srgb,var(--warning)_18%,var(--popover))]',
}

// Own manager so this prototype never touches the app's real toast queue
// (none is mounted globally yet — this file is standalone).
const prototypeToastManager = Toast.createToastManager()

// Base UI's Toast.Provider defaults `limit` to 3 — older toasts past that
// get marked `data-limited` (hidden), not removed. That default is what
// capped the earlier demo at 3 visible toasts, not anything chosen here.
const STACK_LIMIT = 6

function fire(severity: Severity) {
  const { title, description } = SEVERITY_COPY[severity]
  // `id` is filled in synchronously below — the closure only runs on a
  // later click, so the capture is safe despite being assigned after the
  // object literal is built.
  let id = ''
  id = prototypeToastManager.add({
    actionProps:
      severity === 'critical'
        ? {
            children: 'Acknowledge',
            // Bug fix: `close()` with no id closes every toast in the
            // stack. Must scope to this toast's own id.
            onClick: () => prototypeToastManager.close(id),
          }
        : undefined,
    description,
    timeout: severity === 'critical' ? 0 : 5000, // ticket 01: critical never auto-dismisses
    title,
    type: severity,
  })
}

function TriggerRow() {
  return (
    <div className="flex flex-wrap gap-2 pt-3">
      <Button onClick={() => fire('info')} size="sm" variant="outline">
        Fire info
      </Button>
      <Button onClick={() => fire('warning')} size="sm" variant="outline">
        Fire warning
      </Button>
      <Button onClick={() => fire('critical')} size="sm" variant="outline">
        Fire critical
      </Button>
      <Button onClick={() => fire('warning')} size="sm" variant="outline">
        Fire warning again (prove stacking)
      </Button>
    </div>
  )
}

function ToastCard({ toast }: { toast: Toast.useToastManager.ReturnValue['toasts'][number] }) {
  const severity = toast.type as Severity
  const Icon = SEVERITY_ICON[severity]
  const autoDismiss = toast.timeout !== 0

  return (
    <Toast.Root
      className={cn(
        'relative w-full max-w-sm overflow-hidden rounded-xl border shadow-lg/10',
        SEVERITY_BG[severity],
        severity === 'critical' && 'border-destructive',
        severity === 'info' && 'border-info',
        severity === 'warning' && 'border-warning',
      )}
      toast={toast}
    >
      <div className="flex items-start gap-2.5 px-4 py-3.5 pr-9">
        <Icon
          className={cn(
            'mt-0.5 size-5 shrink-0',
            severity === 'critical' && 'text-destructive',
            severity === 'info' && 'text-info',
            severity === 'warning' && 'text-warning',
          )}
        />
        <div className="flex flex-1 flex-col gap-0.5">
          <Toast.Title className="font-semibold text-popover-foreground text-sm" />
          <Toast.Description className="text-muted-foreground text-sm">
            {toast.description}
          </Toast.Description>
        </div>
        {toast.actionProps && (
          <Toast.Action className="shrink-0 self-center rounded-md border border-destructive px-3 py-1.5 font-medium text-destructive text-xs">
            {toast.actionProps.children}
          </Toast.Action>
        )}
        {!toast.actionProps && (
          <Toast.Close
            aria-label="Dismiss"
            className="absolute top-2.5 right-2.5 rounded p-0.5 text-muted-foreground opacity-70 hover:opacity-100"
          >
            <X className="size-4" />
          </Toast.Close>
        )}
      </div>
      {autoDismiss && (
        <div
          className={cn(
            'h-0.5 w-full origin-left',
            severity === 'info' && 'bg-info',
            severity === 'warning' && 'bg-warning',
          )}
          style={{
            animation: `alert-prototype-countdown ${(toast.timeout ?? 5000) / 1000}s linear forwards`,
          }}
        />
      )}
    </Toast.Root>
  )
}

function TopRightToasts({ container }: { container: HTMLElement | null }) {
  const { toasts } = Toast.useToastManager()
  return (
    <Toast.Portal container={container}>
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </div>
    </Toast.Portal>
  )
}

// The app applies its `.dark`/`.light` theme class to the `Tabs.Root`
// element (`data-slot="tabs"` in App.tsx), not `<html>`/`<body>`.
// `Toast.Portal` defaults to portaling into `document.body`, which sits
// *outside* that themed subtree — so the toast never sees the theme's CSS
// variables and always rendered with the `:root` (light) defaults
// regardless of the active theme. Fix: portal into the themed root
// instead of body. This is a real finding for the eventual production
// implementation, not just a prototype workaround.
function useThemedPortalContainer(): HTMLElement | null {
  const [container, setContainer] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setContainer(document.querySelector<HTMLElement>('[data-slot="tabs"]'))
  }, [])
  return container
}

export function AlertUiPrototype() {
  const themedContainer = useThemedPortalContainer()

  return (
    <div className="mt-4 rounded-lg border border-dashed border-primary/40 bg-primary/4 p-3.5">
      <p className="mb-1 font-medium text-xs uppercase tracking-wide">
        Prototype — alert toast, top-right (dev only)
      </p>
      <Toast.Provider limit={STACK_LIMIT} toastManager={prototypeToastManager}>
        <TriggerRow />
        <TopRightToasts container={themedContainer} />
        <style>{`
          @keyframes alert-prototype-countdown {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
          }
        `}</style>
      </Toast.Provider>
    </div>
  )
}
