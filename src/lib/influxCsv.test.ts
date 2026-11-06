import { describe, expect, it } from 'vite-plus/test'
import { parseFluxCsv } from './influxCsv'

const HEADER = [
  '#datatype,string,long,dateTime:RFC3339,dateTime:RFC3339,dateTime:RFC3339,double,string,string,string',
  '#group,false,false,true,true,false,false,true,true,true',
  '#default,_result,,,,,,,,',
  ',result,table,_start,_stop,_time,_value,_field,_measurement,id',
]

describe('parseFluxCsv', () => {
  it('returns time and value for each row, skipping the annotation lines', () => {
    const csv = [
      ...HEADER,
      ',,0,2026-10-01T00:00:00Z,2026-10-03T00:00:00Z,2026-10-01T00:00:00Z,1234.5,yield_today_wh,solar,x',
      ',,0,2026-10-01T00:00:00Z,2026-10-03T00:00:00Z,2026-10-02T00:00:00Z,980,yield_today_wh,solar,x',
      '',
    ].join('\r\n')
    expect(parseFluxCsv(csv)).toEqual([
      { time: new Date('2026-10-01T00:00:00Z'), value: 1234.5 },
      { time: new Date('2026-10-02T00:00:00Z'), value: 980 },
    ])
  })

  it('keeps an empty window as a null value, not zero', () => {
    const csv = [
      ...HEADER,
      ',,0,2026-10-01T00:00:00Z,2026-10-03T00:00:00Z,2026-10-01T00:00:00Z,,yield_today_wh,solar,x',
    ].join('\n')
    expect(parseFluxCsv(csv)).toEqual([{ time: new Date('2026-10-01T00:00:00Z'), value: null }])
  })

  it('reads every table of a multi-table response, each with its own header', () => {
    const csv = [
      ...HEADER,
      ',,0,2026-10-01T00:00:00Z,2026-10-03T00:00:00Z,2026-10-01T00:00:00Z,10,yield_today_wh,solar,x',
      '',
      ...HEADER,
      ',,1,2026-10-01T00:00:00Z,2026-10-03T00:00:00Z,2026-10-02T00:00:00Z,20,yield_today_wh,solar,y',
    ].join('\n')
    expect(parseFluxCsv(csv).map((p) => p.value)).toEqual([10, 20])
  })

  it('returns nothing for an empty response', () => {
    expect(parseFluxCsv('')).toEqual([])
    expect(parseFluxCsv('\r\n')).toEqual([])
  })

  it('throws on a Flux error table instead of returning no data', () => {
    const csv = [
      '#datatype,string,string',
      '#group,true,true',
      '#default,,',
      ',error,reference',
      ',compilation failed: bad flux,897',
    ].join('\n')
    expect(() => parseFluxCsv(csv)).toThrow(/compilation failed: bad flux/)
  })

  it('treats a non-numeric value as no data, not NaN', () => {
    const csv = [
      ...HEADER,
      ',,0,2026-10-01T00:00:00Z,2026-10-03T00:00:00Z,2026-10-01T00:00:00Z,NaN,yield_today_wh,solar,x',
    ].join('\n')
    expect(parseFluxCsv(csv)).toEqual([{ time: new Date('2026-10-01T00:00:00Z'), value: null }])
  })
})
