import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IconStatusButton } from './IconStatusButton.heroui'

describe('IconStatusButton', () => {
  it('renders a status trigger labelled by the label prop', () => {
    render(
      <IconStatusButton label="Uplink via LAN" icon={<span data-testid="icon">icon</span>}>
        details
      </IconStatusButton>,
    )
    const trigger = screen.getByRole('button', { name: 'Uplink via LAN' })
    expect(trigger.tagName).toBe('BUTTON')
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('labels the popup with the heading and renders body children', async () => {
    const user = userEvent.setup()
    render(
      <IconStatusButton label="Uplink" icon={<span>icon</span>} title="LTE · O2">
        <span>Uplink details</span>
      </IconStatusButton>,
    )
    await user.click(screen.getByRole('button', { name: 'Uplink' }))
    expect(await screen.findByText('Uplink details')).toBeInTheDocument()
    expect(screen.getByText('LTE · O2')).toBeInTheDocument()
    expect(await screen.findByRole('dialog', { name: 'LTE · O2' })).toBeInTheDocument()
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
    await waitFor(() => expect(screen.queryByText('details')).not.toBeInTheDocument())
  })
})
