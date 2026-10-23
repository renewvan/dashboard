import { createHash } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vite-plus/test'
import { notices } from '@/data/notices.generated'
import {
  collectNotices,
  isExcluded,
  listProductionPackages,
  readExcludeList,
  readFallbacks,
  readLicenceFile,
  type Notices,
  type ProductionPackage,
} from '../../scripts/notices.ts'

// The About page lists the licences of the packages that ship. `src/data/notices.generated.ts` is
// generated from the lockfile's production dependencies (`pnpm notices`) and checked in, so a
// dependency change without a regenerate has to fail here, before it ships uncredited.

// Vitest runs from the repository root.
const root = process.cwd()

const REGENERATE = 'run `pnpm notices` and commit src/data/notices.generated.ts'

/** One line per group (licence, a hash of the text, packages): a readable diff when it drifts. */
function summary(n: Notices): string[] {
  return n.groups.map((g) => {
    const hash = createHash('sha256').update(g.text).digest('hex').slice(0, 10)
    const packages = g.packages.map((p) => `${p.name}@${p.version}`).join(' ')
    return `${g.licence} [${hash}] ${packages}`
  })
}

describe('checked-in third-party notices', () => {
  let production: ProductionPackage[]
  let exclude: string[]
  let fallbacks: Record<string, string>

  beforeAll(() => {
    production = listProductionPackages(root)
    exclude = readExcludeList(root)
    fallbacks = readFallbacks(root)
  }, 30_000)

  it(`match the production dependencies (if this fails: ${REGENERATE})`, () => {
    const regenerated = collectNotices({
      packages: production,
      exclude,
      fallbacks,
      readLicence: readLicenceFile,
    })
    expect(summary(notices)).toEqual(summary(regenerated))
    expect(notices).toEqual(regenerated)
  })

  it('list no package from the exclude list', () => {
    const listed = notices.groups.flatMap((g) => g.packages.map((p) => p.name))
    expect(listed.filter((name) => isExcluded(name, exclude))).toEqual([])
  })

  it('show every licence text once, with its copyright line', () => {
    const texts = notices.groups.map((g) => g.text)
    expect(new Set(texts).size).toBe(texts.length)
    for (const g of notices.groups) {
      expect(g.text, `${g.licence}: ${g.packages[0].name}`).toMatch(/copyright|\(c\)|©/i)
    }
  })

  it('give a shipped package with no licence file on disk its checked-in fallback text', () => {
    const withoutFile = production.filter(
      (p) => !isExcluded(p.name, exclude) && readLicenceFile(p.dir) === null,
    )
    // @protomaps/basemaps, pmtiles and murmurhash-js ship and have none; a fallback is only
    // needed while that holds, so the list is checked, not hard-coded.
    expect(withoutFile.map((p) => p.name)).toEqual(expect.arrayContaining(['pmtiles']))
    for (const pkg of withoutFile) {
      const group = notices.groups.find((g) =>
        g.packages.some((p) => p.name === pkg.name && p.version === pkg.version),
      )
      expect(group, `${pkg.name} is listed`).toBeDefined()
      expect(group?.text).toBe(fallbacks[pkg.name].trim())
    }
    const pmtiles = notices.groups.find((g) => g.packages.some((p) => p.name === 'pmtiles'))
    expect(pmtiles?.licence).toBe('BSD-3-Clause')
    expect(pmtiles?.text).toContain('Copyright 2021 Protomaps LLC')
  })
})

describe('collectNotices', () => {
  const pkg = (name: string, version: string, licence = 'MIT'): ProductionPackage => ({
    name,
    version,
    licence,
    dir: `${name}@${version}`,
  })
  const texts: Record<string, string> = {
    'a@1.0.0': 'Copyright (c) A\r\nPermission is hereby granted\n',
    'b@1.0.0': 'Copyright (c) A\nPermission is hereby granted',
    'b@2.0.0': 'Copyright (c) B\nPermission is hereby granted',
    'c@1.0.0': 'Copyright (c) C',
  }
  const readLicence = (dir: string) => texts[dir] ?? null

  it('groups byte-identical texts once, lists every version, and sorts the output', () => {
    const result = collectNotices({
      packages: [pkg('b', '2.0.0'), pkg('b', '1.0.0'), pkg('a', '1.0.0'), pkg('c', '1.0.0', 'ISC')],
      exclude: [],
      fallbacks: {},
      readLicence,
    })
    expect(
      result.groups.map((g) => [g.licence, g.packages.map((p) => `${p.name}@${p.version}`)]),
    ).toEqual([
      ['ISC', ['c@1.0.0']],
      ['MIT', ['a@1.0.0', 'b@1.0.0']],
      ['MIT', ['b@2.0.0']],
    ])
  })

  it('drops excluded packages, by name or by prefix', () => {
    const result = collectNotices({
      packages: [pkg('a', '1.0.0'), pkg('b', '1.0.0'), pkg('tool-linux-x64', '1.0.0')],
      exclude: ['b', 'tool-*'],
      fallbacks: {},
      readLicence: (dir) => (dir.startsWith('tool') ? null : readLicence(dir)),
    })
    expect(result.groups.flatMap((g) => g.packages.map((p) => p.name))).toEqual(['a'])
  })

  it('uses the fallback text only when the package has no licence file', () => {
    const result = collectNotices({
      packages: [pkg('c', '1.0.0'), pkg('d', '1.0.0')],
      exclude: [],
      fallbacks: { c: 'Copyright (c) Fallback C', d: 'Copyright (c) Fallback D' },
      readLicence,
    })
    expect(result.groups.map((g) => g.text)).toEqual([
      'Copyright (c) C',
      'Copyright (c) Fallback D',
    ])
  })

  it('fails when a shipped package has no licence text at all', () => {
    expect(() =>
      collectNotices({ packages: [pkg('d', '1.0.0')], exclude: [], fallbacks: {}, readLicence }),
    ).toThrow(/d@1\.0\.0/)
  })
})
