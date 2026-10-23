import { useEffect, useState, type ReactNode } from 'react'
import type { NoticeGroup } from '@/data/notices.generated'
import { Group } from '../../shared/Group'

/** What About loads when it opens: the generated notices and the asset licence texts. */
interface AboutTexts {
  groups: NoticeGroup[]
  notoSans: string
  sprites: string
}

type TextsState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; texts: AboutTexts }

/**
 * The licence texts are big (the notices alone are hundreds of KB), so they are dynamic imports
 * made when About mounts: the dashboard's first load never carries them, and being part of the
 * build they still load with no internet.
 */
function useAboutTexts(): TextsState {
  const [state, setState] = useState<TextsState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    Promise.all([import('@/data/notices.generated'), import('./aboutTexts')]).then(
      ([{ notices }, { NOTO_SANS_LICENCE, SPRITES_LICENCE }]) => {
        if (cancelled) return
        setState({
          status: 'ready',
          texts: { groups: notices.groups, notoSans: NOTO_SANS_LICENCE, sprites: SPRITES_LICENCE },
        })
      },
      () => {
        if (!cancelled) setState({ status: 'failed' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border">
      {children}
    </div>
  )
}

function Quiet({ children }: { children: ReactNode }) {
  return <p className="text-muted px-1 text-sm">{children}</p>
}

const LOADING = 'Loading…'

/** A collapsed licence text: native disclosure with a 44px hit area; the text is in the DOM either way. */
function LicenceText({ text }: { text: string }) {
  return (
    <details>
      <summary className="text-accent flex min-h-11 cursor-pointer items-center text-sm">
        Licence text
      </summary>
      <pre className="text-muted pb-2 font-sans text-xs break-words whitespace-pre-wrap">
        {text}
      </pre>
    </details>
  )
}

function Credit({
  title,
  children,
  link,
}: {
  title: string
  children: ReactNode
  link?: { href: string; label: string }
}) {
  return (
    <li className="flex flex-col gap-0.5 px-3.5 pt-3 pb-3 has-[a]:pb-0">
      <span className="text-sm font-medium">{title}</span>
      <span className="text-muted text-xs">{children}</span>
      {link !== undefined && (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent inline-flex min-h-11 items-center self-start text-xs underline"
        >
          {link.label}
        </a>
      )}
    </li>
  )
}

function DataCredits() {
  return (
    <Group title="Data credits">
      <Card>
        <ul className="divide-border divide-y">
          <Credit
            title="© OpenStreetMap contributors"
            link={{
              href: 'https://www.openstreetmap.org/copyright',
              label: 'openstreetmap.org/copyright',
            }}
          >
            Map data, under the Open Database Licence (ODbL).
          </Credit>
          <Credit title="Protomaps">
            Map design and tile schema. Code under BSD-3-Clause, design under CC0.
          </Credit>
          <Credit title="Natural Earth">Public domain.</Credit>
          <Credit title="ESA WorldCover">
            Land cover, a data source of the map file, under CC BY 4.0.
          </Credit>
        </ul>
      </Card>
    </Group>
  )
}

function Software({ state }: { state: TextsState }) {
  return (
    <Group title="Software">
      {state.status === 'ready' ? (
        <Card>
          <ul aria-label="Software licences" className="divide-border divide-y">
            {state.texts.groups.map((group) => (
              <li key={group.text} className="flex flex-col gap-1 px-3.5 pt-3">
                <h3 className="text-sm font-medium">{group.licence}</h3>
                <p className="text-muted text-xs break-words">
                  {group.packages.map((pkg) => pkg.name).join(', ')}
                </p>
                <LicenceText text={group.text} />
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Quiet>
          {state.status === 'loading' ? LOADING : 'The software licences could not be loaded.'}
        </Quiet>
      )}
    </Group>
  )
}

/** One asset credit: its title, what it is, and its licence text once the texts have loaded. */
function Asset({
  title,
  state,
  text,
  children,
}: {
  title: string
  state: TextsState
  text: (texts: AboutTexts) => string
  children: ReactNode
}) {
  return (
    <li className="flex flex-col gap-1 px-3.5 pt-3">
      <span className="text-sm font-medium">{title}</span>
      <span className="text-muted text-xs">{children}</span>
      {state.status === 'ready' ? (
        <LicenceText text={text(state.texts)} />
      ) : (
        <p className="text-muted pb-3 text-xs">
          {state.status === 'loading' ? LOADING : 'The licence text could not be loaded.'}
        </p>
      )}
    </li>
  )
}

function Assets({ state }: { state: TextsState }) {
  return (
    <Group title="Assets">
      <Card>
        <ul className="divide-border divide-y">
          <Asset title="Noto Sans" state={state} text={(texts) => texts.notoSans}>
            Map label font, SIL Open Font License 1.1. Copyright 2022 The Noto Project Authors
            (https://github.com/notofonts)
          </Asset>
          <Asset title="Map sprites" state={state} text={(texts) => texts.sprites}>
            Map icons from protomaps/basemaps-assets, derived from tangrams/icons (MIT, © 2017
            Mapzen), as that repository states.
          </Asset>
        </ul>
      </Card>
    </Group>
  )
}

/**
 * Settings › General › System › About: who made the map and the software the dashboard is built
 * from. Read-only, three blocks: data credits, the licences of the packages that ship (each
 * distinct text once, with its packages) and asset credits. Versions are not here: Firmware has them.
 */
export function AboutView() {
  const state = useAboutTexts()

  return (
    <div className="flex flex-col gap-4">
      <DataCredits />
      <Software state={state} />
      <Assets state={state} />
    </div>
  )
}
