# 0002. Third-party licences are a generated, checked-in file with a drift test

Status: accepted

## Context

The production build strips every legal comment and ships no licence file, so the dashboard credited
none of the open-source software inside it. MIT, ISC and BSD-3-Clause ask for the copyright notice
and permission text to travel with the software, so Settings → General → About lists them, with the
text. `pnpm licenses list --prod` returns 182 packages, but it is a superset of what ships (it
includes Tailwind's build pipeline, type packages, platform binaries and dependencies that are
declared but never imported), and it says nothing about the text.

## Decision

- **A generated file, checked in:** `src/data/notices.generated.ts`, written by one command,
  `pnpm notices` (`scripts/generate-notices.ts`, sharing `scripts/notices.ts` with the test). The
  input is `pnpm licenses list --prod --json` (lockfile and installed packages, no network) plus the
  licence file in each package's folder. Texts are grouped: one group per distinct text, so the page
  shows each once with its packages and versions. Output is deterministic and already formatted.
- **No third-party generator.** The script is under 300 lines under the existing toolchain and the
  result is a reviewable diff; a licence-checker dependency would be one more package to credit and
  to trust.
- **A checked-in exclude list,** `scripts/notices-exclude.json`: exact names or `prefix*` patterns
  (platform binaries differ per OS, and CI is Linux), in groups that each carry a reason. It started
  from a bundle analysis of the real module graph and of the prebuilt files that carry their own
  inlined dependencies (`maplibre-gl`, `mqtt`), because searching the minified bundle for package
  names finds nothing. Exclusion means proven not imported; anything doubtful stays listed, since
  over-crediting is safe and under-crediting is not.
- **Checked-in fallbacks** in `scripts/notices-fallback/<name>.txt` for shipped packages with no
  licence file on disk: `@protomaps/basemaps`, `pmtiles` and `murmurhash-js`. Each is the real upstream
  text and copyright line, with its source and git ref in `sources.json`. A shipped package with no
  licence text at all makes the script fail with what to add.
- **A drift test,** `src/lib/notices.test.ts`, runs under `vp test` and the pre-commit hook. It
  regenerates the notices in memory and fails if they differ from the checked-in file, if an excluded
  package appears, or if a package without a licence file does not get its fallback. A dependency
  change without `pnpm notices` therefore cannot land.
- **A lazy chunk.** `AboutView` loads the file with `import('@/data/notices.generated')`, and nothing
  in the main graph imports it statically, so the build emits it as its own chunk (about 110 kB, 15 kB
  gzipped) fetched only when About opens. The first load is unchanged and the chunk is part of the
  image, so About works offline.

## Consequences

- After any change to production dependencies, run `pnpm notices` and commit the diff. A new package
  that does not ship (a build tool pulled in as a production dependency) goes in the exclude list
  with a reason.
- A bump that changes a package's licence text or copyright line shows up as a diff in review.
- The test and the script need `node_modules` installed and `pnpm` (or `vp`) on the PATH; neither
  touches the network.
- The exclude list is a claim about the bundle, checked once by analysis and not by the test: a
  package that starts being imported while it is excluded is not caught. Review the list when adding
  a dependency that the app imports.
- `murmurhash-js` (MIT) has no licence file, in the package or in its repository; its text is the
  "License (MIT)" section of its README, which is the only text upstream publishes.
