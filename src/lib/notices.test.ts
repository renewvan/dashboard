import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vite-plus/test'
import { notices } from '@/data/notices.generated'
import {
  collectNotices,
  isExcluded,
  listShippedPackages,
  readExcludeList,
  readFallbacks,
  readIncludeList,
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

/** Files under `src` with one of the extensions, as paths relative to the root. */
function sourceFiles(extensions: readonly string[]): string[] {
  return (readdirSync(join(root, 'src'), { recursive: true }) as string[])
    .filter((f) => extensions.some((e) => f.endsWith(e)))
    .map((f) => join('src', f))
    .sort()
}

/** `react/jsx-runtime` is package `react`, `@scope/name/x` is `@scope/name`; relative and alias paths are none. */
function packageOf(specifier: string): string | null {
  if (/^(\.|\/|node:)/.test(specifier)) return null
  const parts = specifier.split('/')
  if (specifier.startsWith('@')) {
    return parts[0].length > 1 && parts[1] ? `${parts[0]}/${parts[1]}` : null
  }
  return parts[0]
}

/** The installed packages a file imports at run time (`import type` is erased), by bare specifier. */
function importedPackages(file: string): string[] {
  const source = readFileSync(join(root, file), 'utf8')
  const patterns = file.endsWith('.css')
    ? [/@import\s+['"]([^'"]+)['"]/g]
    : [
        /(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^'";]*?\sfrom\s*['"]([^'"]+)['"]/g,
        /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,
        /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
      ]
  return patterns
    .flatMap((pattern) => [...source.matchAll(pattern)].map((m) => m[1]))
    .map(packageOf)
    .filter((name): name is string => name !== null && existsSync(join(root, 'node_modules', name)))
}

/**
 * Packages the app imports that are deliberately not credited, each with the reason. The notices
 * exclude list is a claim about the bundle; this is where it is checked against what the CSS and
 * the source really import. Empty unless a package is proven not to ship.
 */
const IMPORTED_BUT_NOT_CREDITED: Record<string, string> = {}

/** One line per group (licence, a hash of the text, packages): a readable diff when it drifts. */
function summary(n: Notices): string[] {
  return n.groups.map((g) => {
    const hash = createHash('sha256').update(g.text).digest('hex').slice(0, 10)
    const packages = g.packages.map((p) => `${p.name}@${p.version}`).join(' ')
    return `${g.licence} [${hash}] ${packages}`
  })
}

describe('checked-in third-party notices', () => {
  let shipped: ProductionPackage[]
  let exclude: string[]
  let fallbacks: Record<string, string>

  beforeAll(() => {
    shipped = listShippedPackages(root)
    exclude = readExcludeList(root)
    fallbacks = readFallbacks(root)
  }, 30_000)

  it(`match the production dependencies (if this fails: ${REGENERATE})`, () => {
    const regenerated = collectNotices({
      packages: shipped,
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
    const withoutFile = shipped.filter(
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

  it('list the extra packages from the include list, which are not production dependencies', () => {
    const listed = new Set(notices.groups.flatMap((g) => g.packages.map((p) => p.name)))
    const included = readIncludeList(root)
    expect(included.length).toBeGreaterThan(0)
    for (const { name, reason } of included) {
      expect(reason, `${name} needs a reason`).not.toBe('')
      expect(listed.has(name), `${name} is in the notices`).toBe(true)
    }
  })

  // The class of bug this guards: a package that is imported (by a stylesheet, or by the source) and
  // so ends up in the build, but is missing from the notices because the exclude list wrongly
  // dropped it or because `--prod` never reported it. The imports are read from the files, not
  // from the lists, so a wrong list cannot hide itself.
  describe('imports', () => {
    const credited = (name: string) =>
      notices.groups.some((g) => g.packages.some((p) => p.name === name))

    // Test files and test helpers are not part of the build.
    const isShipped = (file: string) =>
      !/\.test\.tsx?$/.test(file) && !file.startsWith(join('src', 'test') + '/')

    it('of every stylesheet in src name a package that is in the notices', () => {
      const imported = new Set(sourceFiles(['.css']).flatMap(importedPackages))
      expect([...imported], 'index.css imports packages').toEqual(
        expect.arrayContaining(['tailwindcss', 'tw-animate-css']),
      )
      const missing = [...imported].filter((n) => !credited(n) && !(n in IMPORTED_BUT_NOT_CREDITED))
      expect(missing, `imported by a stylesheet, not in the notices (${REGENERATE})`).toEqual([])
    })

    it('of every non-test source file name a package that is in the notices', () => {
      const imported = new Set(
        sourceFiles(['.ts', '.tsx']).filter(isShipped).flatMap(importedPackages),
      )
      expect([...imported], 'the source imports packages').toEqual(
        expect.arrayContaining(['react', 'maplibre-gl']),
      )
      const missing = [...imported].filter((n) => !credited(n) && !(n in IMPORTED_BUT_NOT_CREDITED))
      expect(missing, `imported by the source, not in the notices (${REGENERATE})`).toEqual([])
    })

    it('keep every deliberate exception a package that really is imported and uncredited', () => {
      const imported = new Set(
        sourceFiles(['.css', '.ts', '.tsx']).filter(isShipped).flatMap(importedPackages),
      )
      for (const [name, reason] of Object.entries(IMPORTED_BUT_NOT_CREDITED)) {
        expect(reason, `${name} needs a reason`).not.toBe('')
        expect(imported.has(name), `${name} is imported`).toBe(true)
        expect(credited(name), `${name} is uncredited`).toBe(false)
      }
    })
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
