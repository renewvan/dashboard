/** Every view the Settings page can show; `list` is the top list and has no `?view=` value. */
export type SettingsView =
  | 'list'
  | 'devices'
  | 'device'
  | 'device-info'
  | 'tanks'
  | 'tank'
  | 'temperature'
  | 'gps'
  | 'relays'
  | 'general'
  | 'firmware'
  | 'about'
  | 'alerts'
  | 'display'
  | 'start-page'
  | 'power-page'
  | 'map-page'
  | 'connectivity'
  | 'cellular'
  | 'hub'
  | 'tailscale'
  | 'van'

/** A view that is a valid `?view=` value: everything below the top list. */
export type SettingsSubView = Exclude<SettingsView, 'list'>
