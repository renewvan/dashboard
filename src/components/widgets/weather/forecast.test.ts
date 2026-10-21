import { describe, expect, it } from 'vite-plus/test'
import { parseForecast } from './forecast'

const response = {
  current: { temperature_2m: 14.2, weather_code: 3 },
  daily: {
    time: ['2026-10-21', '2026-10-22'],
    weather_code: [3, 61],
    temperature_2m_max: [16.1, 12.4],
    temperature_2m_min: [8.3, 7.9],
  },
}

describe('parseForecast', () => {
  it('reads the current conditions and one day per daily entry, in order', () => {
    expect(parseForecast(response)).toEqual({
      temp: 14.2,
      code: 3,
      days: [
        { date: '2026-10-21', code: 3, max: 16.1, min: 8.3 },
        { date: '2026-10-22', code: 61, max: 12.4, min: 7.9 },
      ],
    })
  })

  it.each([
    ['null', null],
    ['an error body', { error: true, reason: 'Invalid latitude' }],
    ['no daily block', { current: response.current }],
    ['a missing current temperature', { ...response, current: { weather_code: 3 } }],
    ['a string temperature', { ...response, current: { temperature_2m: '14', weather_code: 3 } }],
    [
      'a null daily max',
      { ...response, daily: { ...response.daily, temperature_2m_max: [16.1, null] } },
    ],
    [
      'a daily list shorter than time',
      { ...response, daily: { ...response.daily, weather_code: [3] } },
    ],
    [
      'a non-string date',
      { ...response, daily: { ...response.daily, time: [20261021, 20261022] } },
    ],
  ])('reads %s as no weather', (_, data) => {
    expect(parseForecast(data)).toBeUndefined()
  })
})
