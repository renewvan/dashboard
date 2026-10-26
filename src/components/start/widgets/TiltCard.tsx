import { Move3d } from 'lucide-react'
import { PhoneCard } from '@/components/PhoneCard'
import { TiltWidget } from '@/components/widgets/tilt/TiltWidget'
import type { StartWidgetProps } from './types'

/** The van's tilt; one tilt device per van, so the first record. */
export function TiltCard({ tilt }: StartWidgetProps) {
  return (
    <PhoneCard title="Tilt" icon={<Move3d className="size-4" />}>
      <div className="h-28 w-full">
        <TiltWidget tilt={Object.values(tilt)[0]} />
      </div>
    </PhoneCard>
  )
}
