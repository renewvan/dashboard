/** Every view the Settings page can show; `list` is the top list and has no `?view=` value. */
export type SettingsView =
  | 'list'
  | 'nodes'
  | 'tanks'
  | 'tank'
  | 'temperature'
  | 'general'
  | 'alerts'
  | 'display'
  | 'navigation'
  | 'connectivity'
  | 'cellular'
  | 'hub'
  | 'tailscale'

/** A view that is a valid `?view=` value: everything below the top list. */
export type SettingsSubView = Exclude<SettingsView, 'list'>
