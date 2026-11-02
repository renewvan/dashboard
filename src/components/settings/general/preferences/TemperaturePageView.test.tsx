import { cleanup, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'
import { renderSettings } from '@/test/renderSettings'

const TEMPERATURES = {
  outdoor: { name: 'Outdoor', status: 'ok', temperature_c: 9 },
  cpu: { name: 'Pi CPU', source: 'cpu', status: 'ok', temperature_c: 38 },
} as const

async function openTemperaturePage(overrides: Parameters<typeof renderSettings>[0]) {
  const rendered = renderSettings(overrides)
  const { user } = rendered
  await user.click(screen.getByRole('button', { name: /^General/ }))
  await user.click(screen.getByRole('button', { name: /^Display/ }))
  await user.click(screen.getByRole('button', { name: /^Temperature page/ }))
  return rendered
}

describe('Settings › General › Display & Appearance › Temperature page', () => {
  it('summarises how many sensors are shown on its row', async () => {
    const { user } = renderSettings({ temperatures: TEMPERATURES, hiddenTemperatures: ['cpu'] })
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(screen.getByRole('button', { name: /^Display/ }))

    expect(screen.getByRole('button', { name: /^Temperature page/ })).toHaveTextContent(
      '1 of 2 sensors shown',
    )
  })

  it('hides a sensor when its switch is turned off', async () => {
    const setHiddenTemperatures = vi.fn()
    const { user } = await openTemperaturePage({
      temperatures: TEMPERATURES,
      hiddenTemperatures: ['cpu'],
      setHiddenTemperatures,
    })

    await user.click(screen.getByRole('switch', { name: /Outdoor/ }))

    expect(setHiddenTemperatures).toHaveBeenCalledWith(['cpu', 'outdoor'])
    cleanup()
  })

  it('shows a hidden sensor again when its switch is turned on', async () => {
    const setHiddenTemperatures = vi.fn()
    const { user } = await openTemperaturePage({
      temperatures: TEMPERATURES,
      hiddenTemperatures: ['cpu'],
      setHiddenTemperatures,
    })

    await user.click(screen.getByRole('switch', { name: /Pi CPU/ }))

    expect(setHiddenTemperatures).toHaveBeenCalledWith([])
  })
})
