import { render } from '@testing-library/react'
import { memo } from 'react'
import { describe, expect, it, vi } from 'vite-plus/test'
import {
  useSettingsActions,
  useSettingsData,
  useSettingsPreferences,
  type SettingsContextValue,
} from './SettingsContext'
import { SettingsProvider } from './SettingsProvider'
import { settingsSlices } from '@/test/settingsSlices'

const setTheme = () => {}
const base = {
  tanks: {},
  busStatus: 'connected',
  theme: 'dark',
  brightness: 50,
  setTheme,
} as unknown as SettingsContextValue

describe('SettingsProvider', () => {
  it('re-renders a slice reader only when its own slice changes', () => {
    const renders = { data: vi.fn(), preferences: vi.fn(), actions: vi.fn() }
    // `memo`, as `SettingsPage` is: only a context change can re-render a reader.
    const DataReader = memo(function DataReader() {
      useSettingsData()
      renders.data()
      return null
    })
    const PreferenceReader = memo(function PreferenceReader() {
      useSettingsPreferences()
      renders.preferences()
      return null
    })
    const ActionReader = memo(function ActionReader() {
      useSettingsActions()
      renders.actions()
      return null
    })
    const counts = () => ({
      data: renders.data.mock.calls.length,
      preferences: renders.preferences.mock.calls.length,
      actions: renders.actions.mock.calls.length,
    })
    const tree = (value: SettingsContextValue) => (
      <SettingsProvider {...settingsSlices(value)}>
        <DataReader />
        <PreferenceReader />
        <ActionReader />
      </SettingsProvider>
    )
    const { rerender } = render(tree(base))
    rerender(tree({ ...base, busStatus: 'disconnected' } as SettingsContextValue))
    expect(counts()).toEqual({ data: 2, preferences: 1, actions: 1 })
    rerender(tree({ ...base, busStatus: 'disconnected', theme: 'light' } as SettingsContextValue))
    expect(counts()).toEqual({ data: 2, preferences: 2, actions: 1 })
  })
})
