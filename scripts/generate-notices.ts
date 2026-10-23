// Regenerates src/data/notices.generated.ts, the third-party licences the About page shows.
//
//   pnpm notices        (or: vp run notices)
//
// Run it after any dependency change and commit the result. src/lib/notices.test.ts fails while the
// checked-in file is out of date. The list is the lockfile's production dependencies
// (`pnpm licenses list --prod`) minus scripts/notices-exclude.json, each with the licence file
// found in its installed folder, or the text in scripts/notices-fallback/ when it ships none.
// Needs node_modules installed; never touches the network.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateNotices, renderNoticesModule } from './notices.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const notices = generateNotices(repoRoot)
writeFileSync(join(repoRoot, 'src/data/notices.generated.ts'), renderNoticesModule(notices))

const packages = notices.groups.reduce((n, g) => n + g.packages.length, 0)
console.log(
  `src/data/notices.generated.ts: ${notices.groups.length} licence texts, ${packages} packages`,
)
