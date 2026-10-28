import { Zap } from 'lucide-react'
import type { PowerLayout } from '@/hooks/usePowerLayout'
import type { PowerSnapshot } from '@/components/power/flowModel'
import { OrbsLayout } from '@/components/power/OrbsLayout'
import { VanOrbsLayout } from '@/components/power/VanOrbsLayout'
import { VanTilesLayout } from '@/components/power/VanTilesLayout'
import { NoData } from './NoData'

/**
 * The phone Start page's power card body: the Power page's own flow view, in the layout chosen in
 * Settings › Display & Appearance, so the card and the page agree.
 *
 * The Tiles layout is the exception: it is a grid with fixed link columns that needs far more than a
 * phone card's width (its tiles clip at 358px), so a card that would draw Tiles draws Van tiles, the
 * same sources, battery and loads on a canvas that scales down. Until the battery has published there
 * is nothing to place the sources around, so the card says so, as the Power page does.
 *
 * The van layouts are drawn at about a third of their size here, so they raise their text
 * (`compact`). They get no solar controller: the Solar tile's week of harvest is too small to read at
 * this size, so the Start page draws it as its own card.
 *
 * The van layouts fill a box of the card's height and keep their own aspect ratio inside it; the
 * orbs diagram sizes its own box to its shape (`fit`), so it leaves no empty margin.
 */
export function PowerCard({
  flow,
  layout,
  onOpenInstance,
}: {
  flow: PowerSnapshot
  layout: PowerLayout
  /** Opens a source's device in Settings (its `instanceKey`); absent, the sources are readouts. */
  onOpenInstance?: (key: string) => void
}) {
  if (!flow.nodes.battery.present) {
    return <NoData icon={<Zap className="size-4" />} label="Power" />
  }

  if (layout === 'orbs') return <OrbsLayout flow={flow} fit onOpenInstance={onOpenInstance} />

  return (
    <div className="flex w-full flex-col" style={{ height: '16rem' }}>
      {layout === 'van-orbs' ? (
        <VanOrbsLayout flow={flow} compact onOpenInstance={onOpenInstance} />
      ) : (
        <VanTilesLayout flow={flow} compact onOpenInstance={onOpenInstance} />
      )}
    </div>
  )
}
