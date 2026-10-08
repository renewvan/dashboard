import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TemperatureSensor } from '../types'
import { HomeTab } from './HomeTab'

const OPEN_METEO = {
  current: { temperature_2m: 18.2, weather_code: 3 },
  daily: {
    time: ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'],
    weather_code: [3, 61, 0, 2],
    temperature_2m_max: [20, 19, 22, 21],
    temperature_2m_min: [11, 10, 12, 13],
  },
}

const probe = (over: Partial<TemperatureSensor> = {}): TemperatureSensor => ({
  name: 'Outdoor',
  unit: 'C',
  source: 'w1',
  temperature_c: 31.4,
  status: 'ok',
  ...over,
})

describe('HomeTab', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => OPEN_METEO })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the waiting-for-hub empty state with no gps or temperature data', () => {
    render(<HomeTab gps={{}} temperatures={{}} tilt={{}} />)
    expect(screen.getByText('No campervan data yet.')).toBeInTheDocument()
    expect(screen.getByText('Waiting for readings from the renewvan hub.')).toBeInTheDocument()
  })

  it('still shows the temperatures on a van with no GPS module', async () => {
    render(
      <HomeTab
        gps={{}}
        tilt={{}}
        temperatures={{
          outdoor: probe({ temperature_c: 31.4 }),
          indoor: probe({ name: 'Indoor', temperature_c: 22.6 }),
        }}
      />,
    )
    const outside = await screen.findByTestId('weather-outside')
    expect(within(outside).getByText('31°')).toBeInTheDocument()
    expect(within(outside).getByText('Outdoor')).toBeInTheDocument()
    expect(within(screen.getByTestId('weather-inside')).getByText('23°')).toBeInTheDocument()
    expect(screen.queryByText('No campervan data yet.')).not.toBeInTheDocument()
  })

  it('falls back to the forecast, labelled, when the outdoor probe is not ok', async () => {
    render(
      <HomeTab
        gps={{}}
        tilt={{}}
        temperatures={{
          // Stale last-retained value must NOT be shown once status != ok.
          outdoor: probe({ status: 'disconnected', temperature_c: 31.4 }),
          indoor: probe({ name: 'Indoor', temperature_c: 22.6 }),
        }}
      />,
    )
    const outside = await screen.findByTestId('weather-outside')
    expect(within(outside).getByText('18°')).toBeInTheDocument()
    expect(within(outside).getByText(/forecast/)).toBeInTheDocument()
    expect(within(outside).queryByText('31°')).not.toBeInTheDocument()
  })

  it("renders each probe in its own unit, converting from the wire's Celsius", async () => {
    render(
      <HomeTab
        gps={{}}
        tilt={{}}
        temperatures={{
          outdoor: probe({ unit: 'F', temperature_c: 0 }),
          indoor: probe({ name: 'Indoor', unit: 'C', temperature_c: 20 }),
        }}
      />,
    )
    expect(
      within(await screen.findByTestId('weather-outside')).getByText('32°'),
    ).toBeInTheDocument()
    expect(within(screen.getByTestId('weather-inside')).getByText('20°')).toBeInTheDocument()
  })

  it('shows a placeholder for a missing indoor probe instead of a made-up number', async () => {
    render(<HomeTab gps={{}} tilt={{}} temperatures={{ outdoor: probe() }} />)
    await screen.findByTestId('weather-outside')
    expect(within(screen.getByTestId('weather-inside')).getByText('--°')).toBeInTheDocument()
  })

  it('shows the van tilt from the node, tinted by the level tolerance', () => {
    render(
      <HomeTab
        gps={{}}
        temperatures={{ outdoor: probe() }}
        tilt={{ tilt: { roll_deg: 0.7, pitch_deg: -2.3, status: 'ok' } }}
      />,
    )
    expect(screen.getByTestId('tilt-pitch')).toHaveTextContent('-2.3°')
    expect(screen.getByTestId('tilt-pitch')).toHaveClass('text-amber-400')
    expect(screen.getByTestId('tilt-roll')).toHaveTextContent('+0.7°')
    expect(screen.getByTestId('tilt-roll')).toHaveClass('text-emerald-400')
  })

  it('does not show stale tilt angles while the sensor is in error', () => {
    render(
      <HomeTab
        gps={{}}
        temperatures={{ outdoor: probe() }}
        tilt={{ tilt: { roll_deg: 4, pitch_deg: 3, status: 'sensor_error' } }}
      />,
    )
    expect(screen.getByTestId('tilt-pitch')).toHaveTextContent('—')
    expect(screen.getByTestId('tilt-roll')).toHaveTextContent('—')
  })
})
