import { Sun } from 'lucide-react'
import { PhoneCard } from '@/components/PhoneCard'
import { firstSolar } from '@/components/widgets/solar/solarView'
import { SolarCard } from '../SolarCard'
import type { StartWidgetProps } from './types'

/** The first solar controller's readings and harvest; draws nothing on a van without one. */
export function SolarYieldCard({ solar }: StartWidgetProps) {
  const record = firstSolar(solar)
  if (!record) return null
  return (
    <PhoneCard title="Solar production" icon={<Sun className="size-4" />}>
      <SolarCard solar={record} />
    </PhoneCard>
  )
}
