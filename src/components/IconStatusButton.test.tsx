import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IconStatusButton } from './IconStatusButton'

describe('IconStatusButton', () => {
  it('renders a transparent status trigger labelled by the label prop', () => {
    render(
      <IconStatusButton label="Uplink via LAN" icon={<span data-testid="icon">icon</span>}>
        details
      </IconStatusButton>,
    )
    const trigger = screen.getByRole('button', { name: 'Uplink via LAN' })
    expect(trigger).toHaveClass('rounded-full', 'size-11')
    expect(trigger).not.toHaveClass('bg-foreground/10')
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('labels the popup with PopoverTitle and renders body children', async () => {
    const user = userEvent.setup()
    render(
      <IconStatusButton label="Uplink" icon={<span>icon</span>} title="LTE · O2">
        <span>Uplink details</span>
      </IconStatusButton>,
    )
    await user.click(screen.getByRole('button', { name: 'Uplink' }))
    expect(await screen.findByText('Uplink details')).toBeInTheDocument()
    expect(screen.getByText('LTE · O2')).toBeInTheDocument()
  })

  it('offers a settings action only when onOpenSettings is given, closing first', async () => {
    const onOpenSettings = vi.fn()
    const { rerender } = render(
      <IconStatusButton label="Uplink" icon={<span>icon</span>}>
        details
      </IconStatusButton>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Uplink' }))
    expect(await screen.findByText('details')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open settings/i })).not.toBeInTheDocument()

    rerender(
      <IconStatusButton
        label="Uplink"
        icon={<span>icon</span>}
        settingsLabel="Network settings"
        onOpenSettings={onOpenSettings}
      >
        details
      </IconStatusButton>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: /network settings/i }))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })
})
