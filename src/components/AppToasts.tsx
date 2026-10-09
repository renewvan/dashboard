import { Toast } from '@heroui/react'

/**
 * The app's toast region. `top end`, offset below the header (`App.tsx`
 * publishes its height as `--app-header-height`) so persistent alerts
 * never cover the header controls.
 */
export function AppToasts() {
  return (
    <Toast.Provider
      placement="top end"
      maxVisibleToasts={6}
      style={{ top: 'calc(var(--app-header-height, 0px) + 0.5rem)' }}
    />
  )
}
