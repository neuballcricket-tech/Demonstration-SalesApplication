import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Booking } from '../../../types'
import VesselCreatedPrompt, { type VesselPromptData } from './VesselCreatedPrompt'

const prompt: VesselPromptData = {
  vesselName: 'Colombo Express', voyageNumber: 'CE-510W', pol: 'LKCMB', fpod: 'NLRTM',
  etdPol: '2026-12-06', etaFpod: '', bookingId: 'BKG-1042',
}
const booking = { id: 'BKG-1042', customer_name: 'TEST-AUDIT-FIX UI (delete me)' } as Booking

const setup = (bookings: Booking[]) => {
  const onDismiss = vi.fn()
  const onCreateBooking = vi.fn()
  render(<VesselCreatedPrompt prompt={prompt} bookings={bookings} onDismiss={onDismiss} onCreateBooking={onCreateBooking} />)
  return { onDismiss, onCreateBooking, user: userEvent.setup() }
}

describe('VesselCreatedPrompt', () => {
  it('shows the saved vessel details in a dialog', () => {
    setup([booking])
    const dialog = screen.getByRole('dialog', { name: 'Vessel Schedule Confirmed' })
    expect(dialog).toHaveTextContent('Colombo Express / CE-510W has been saved.')
    expect(dialog).toHaveTextContent('ETD: 2026-12-06')
    expect(dialog).not.toHaveTextContent('ETA:')
  })

  it('Create Booking passes the prompt and its booking', async () => {
    const { onCreateBooking, onDismiss, user } = setup([booking])
    await user.click(screen.getByRole('button', { name: 'Create Booking' }))
    expect(onCreateBooking).toHaveBeenCalledWith(prompt, booking)
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('Create Booking dismisses when the booking is not loaded', async () => {
    const { onCreateBooking, onDismiss, user } = setup([])
    await user.click(screen.getByRole('button', { name: 'Create Booking' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onCreateBooking).not.toHaveBeenCalled()
  })

  it('Not Now and Escape dismiss', async () => {
    const { onDismiss, user } = setup([booking])
    await user.click(screen.getByRole('button', { name: 'Not Now' }))
    await user.keyboard('{Escape}')
    expect(onDismiss).toHaveBeenCalledTimes(2)
  })
})
