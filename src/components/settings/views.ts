/** Every view the Settings page can show; `list` is the top list and has no `?view=` value. */
export type SettingsView =
  | 'list'
  | 'nodes'
  | 'node'
  | 'device'
  | 'tanks'
  | 'tank'
  | 'temperature'
  | 'relays'
  | 'general'
  | 'firmware'
  | 'alerts'
  | 'display'
  | 'start-page'
  | 'power-page'
  | 'connectivity'
  | 'cellular'
  | 'hub'
  | 'tailscale'

/** A view that is a valid `?view=` value: everything below the top list. */
export type SettingsSubView = Exclude<SettingsView, 'list'>
