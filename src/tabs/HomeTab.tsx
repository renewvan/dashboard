import { Van } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'

export function HomeTab() {
  return (
    <EmptyState
      icon={<Van />}
      title="No campervan data yet."
      description="Waiting for readings from the renewvan hub."
    />
  )
}
