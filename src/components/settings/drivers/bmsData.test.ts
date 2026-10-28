import { describe, expect, it } from 'vite-plus/test'
import { bmsGroup } from './bmsData'

const core = { soc_pct: 80, voltage_v: 13.2, current_a: 1, power_w: 13 }

describe('bmsGroup', () => {
  it('is hidden while the battery publishes none of the BMS properties', () => {
    expect(bmsGroup({ soc_pct: 80, voltage_v: 13.2, current_a: 1, power_w: 13 })).toBeUndefined()
  })

  it('reads protections [] as none active, and omits the block while they are absent', () => {
    expect(bmsGroup({ ...core, protections: [] })?.protections).toEqual([])
    expect(bmsGroup({ ...core, allow_charge: true })?.protections).toBeUndefined()
  })

  it('names each active protection from one lookup table', () => {
    expect(
      bmsGroup({ ...core, protections: ['cell_undervoltage', 'short_circuit', 'other'] })
        ?.protections,
    ).toEqual(['Cell undervoltage', 'Short circuit', 'Other protection'])
  })

  it('shows a single allow flag alone, with No in amber', () => {
    expect(bmsGroup({ ...core, allow_discharge: false })?.permissions).toEqual([
      { label: 'Discharging allowed', value: 'No', tone: 'warning' },
    ])
    expect(bmsGroup({ ...core, allow_charge: true })?.permissions).toEqual([
      { label: 'Charging allowed', value: 'Yes' },
    ])
  })

  it('shows the cell extremes without a per-cell array', () => {
    const group = bmsGroup({
      ...core,
      cell_voltage_max_v: 3.352,
      cell_voltage_min_v: 3.31,
      cell_voltage_delta_v: 0.042,
    })
    expect(group?.cells).toBeUndefined()
    expect(group?.extremes).toEqual([
      { label: 'Highest cell', value: '3.352 V' },
      { label: 'Lowest cell', value: '3.310 V' },
      { label: 'Cell delta', value: '0.042 V' },
    ])
  })

  it('shows only the limits the source reports', () => {
    expect(bmsGroup({ ...core, charge_current_limit_a: 50 })?.limits).toEqual([
      { label: 'Charge current limit', value: '50.0 A' },
    ])
  })

  describe('cells', () => {
    it('draws one bar per cell on a scale zoomed to the min-max range', () => {
      const cells = bmsGroup({ ...core, cell_voltages_v: [3.3, 3.35, 3.4, 3.32] })?.cells
      expect(cells?.bars.map((bar) => bar.label)).toEqual(['3.300', '3.350', '3.400', '3.320'])
      const heights = cells?.bars.map((bar) => bar.height ?? NaN) ?? []
      expect(heights[2]).toBeGreaterThan(heights[1])
      expect(heights[1]).toBeGreaterThan(heights[0])
      expect(Math.min(...heights)).toBeGreaterThan(0)
      expect(Math.max(...heights)).toBeLessThanOrEqual(1)
      expect(cells?.axis.low).toBeLessThan(3.3)
      expect(cells?.axis.high).toBeGreaterThan(3.4)
    })

    it('labels the lowest and highest cell with value and 1-based index', () => {
      const cells = bmsGroup({ ...core, cell_voltages_v: [3.3, 3.35, 3.4, 3.32] })?.cells
      expect(cells?.lowest).toEqual({ index: 1, label: '3.300 V' })
      expect(cells?.highest).toEqual({ index: 3, label: '3.400 V' })
    })

    it('draws a null cell as a hollow slot that reads —, never a zero bar', () => {
      const bars = bmsGroup({ ...core, cell_voltages_v: [3.3, null, 3.4] })?.cells?.bars
      expect(bars?.[1]).toMatchObject({ index: 2, label: '—', height: null })
    })

    it('marks balancing only on true; false and null look the same', () => {
      const bars = bmsGroup({
        ...core,
        cell_voltages_v: [3.3, 3.31, 3.32],
        cell_balancing: [true, false, null],
      })?.cells?.bars
      expect(bars?.map((bar) => bar.balancing)).toEqual([true, false, false])
    })

    it('ignores cell_balancing whose length differs from the cells', () => {
      const bars = bmsGroup({
        ...core,
        cell_voltages_v: [3.3, 3.31, 3.32],
        cell_balancing: [true, true],
      })?.cells?.bars
      expect(bars?.map((bar) => bar.balancing)).toEqual([false, false, false])
    })

    it('copes with the extremes of the contract: 4 cells and 32 cells', () => {
      const four = bmsGroup({ ...core, cell_voltages_v: [3.3, 3.3, 3.3, 3.3] })?.cells
      expect(four?.bars).toHaveLength(4)
      expect(four?.bars.every((bar) => bar.height !== null && bar.height > 0)).toBe(true)
      const volts = Array.from({ length: 32 }, (_, i) => 3.2 + i * 0.001)
      expect(bmsGroup({ ...core, cell_voltages_v: volts })?.cells?.bars).toHaveLength(32)
    })

    it('leaves a pack with every cell unreadable as hollow slots with no labels', () => {
      const cells = bmsGroup({ ...core, cell_voltages_v: [null, null] })?.cells
      expect(cells?.bars.map((bar) => bar.height)).toEqual([null, null])
      expect(cells?.lowest).toBeUndefined()
    })
  })

  describe('probes', () => {
    it('lists each probe in °C, with — for a null probe', () => {
      expect(bmsGroup({ ...core, temperatures_c: [21.5, null, 19] })?.probes).toEqual([
        { label: 'Probe 1', value: '21.5 °C' },
        { label: 'Probe 2', value: '—' },
        { label: 'Probe 3', value: '19.0 °C' },
      ])
    })
  })
})
