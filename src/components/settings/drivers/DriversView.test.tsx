import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { renderSettings } from '@/test/renderSettings'
import type { DriverInfo, RenewvanBusState } from '@/types'

const tankInfo: DriverInfo = {
  driver: 'tank',
  product: 'Tank driver',
  source: 'ADS1115',
  publishes: ['tank'],
  version: 'v0.11.0',
}

const drivers: RenewvanBusState['drivers'] = { tank: { info: tankInfo, health: 'online' } }

beforeEach(() => {
  window.localStorage.clear()
})

function openDrivers(width?: number) {
  return renderSettings({}, { url: '/?page=settings&view=drivers', bus: { drivers }, width })
}

describe('Settings Devices sort toggle', () => {
  it('is the same compact pill as the Levels toggle', () => {
    openDrivers()
    const group = screen.getByRole('radiogroup', { name: 'Sort devices by' })
    expect(group).toHaveClass('rounded-full', 'p-1', 'gap-1')
    expect(screen.getByRole('radio', { name: 'By driver' })).toHaveClass('py-1.5', 'px-4')
  })

  it('cancels the page padding above it and sits 12px above the list, like Levels', () => {
    openDrivers()
    const content = screen.getByRole('radiogroup', { name: 'Sort devices by' }).parentElement
    expect(content).toHaveClass('-mt-3', 'gap-3')
  })

  it('looks the same on the phone', () => {
    openDrivers(799)
    const group = screen.getByRole('radiogroup', { name: 'Sort devices by' })
    expect(group).toHaveClass('rounded-full', 'p-1', 'gap-1', 'self-center')
    expect(group.parentElement).toHaveClass('-mt-3', 'gap-3')
  })

  it('still switches between By driver and By entity', async () => {
    const user = userEvent.setup()
    openDrivers()
    expect(screen.getByRole('radio', { name: 'By driver' })).toBeChecked()
    expect(screen.getByRole('list', { name: 'Published drivers' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'By entity' }))
    expect(screen.getByRole('radio', { name: 'By entity' })).toBeChecked()
    expect(screen.queryByRole('list', { name: 'Published drivers' })).not.toBeInTheDocument()
  })
})
