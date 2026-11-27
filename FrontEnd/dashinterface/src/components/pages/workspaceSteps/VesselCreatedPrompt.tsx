import { Ship } from 'lucide-react'
import type { Booking } from '../../../types'
import { Button, Modal } from '../../ui'

export interface VesselPromptData {
  vesselName: string
  voyageNumber: string
  pol: string
  fpod: string
  etdPol: string
  etaFpod: string
  bookingId: string
}

interface VesselCreatedPromptProps {
  prompt: VesselPromptData
  bookings: Booking[]
  onDismiss: () => void
  onCreateBooking: (prompt: VesselPromptData, booking: Booking) => void
}

export default function VesselCreatedPrompt({ prompt, bookings, onDismiss, onCreateBooking }: VesselCreatedPromptProps) {
  return (
    <Modal
      isOpen
      onClose={onDismiss}
      title="Vessel Schedule Confirmed"
      size="sm"
      footer={
        <>
          <Button onClick={onDismiss}>Not Now</Button>
          <Button variant="primary" icon={<Ship size={14} aria-hidden="true" />}
            onClick={() => {
              const bkg = bookings.find(b => b.id === prompt.bookingId)
              if (!bkg) { onDismiss(); return }
              onCreateBooking(prompt, bkg)
            }}>
            Create Booking
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-card bg-primary-subtle text-primary">
          <Ship size={18} aria-hidden="true" />
        </div>
        <p className="m-0 text-control leading-normal text-fg-label">
          <strong className="text-fg">{prompt.vesselName}</strong> / <strong className="text-fg">{prompt.voyageNumber}</strong> has been saved.
          <br /><br />
          Would you like to create a booking for this vessel now?
        </p>
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-0.5 rounded-card border border-line-soft bg-canvas px-3 py-2.5 text-label text-fg-label">
        <span><span className="text-fg-muted">Vessel:</span> {prompt.vesselName}</span>
        <span><span className="text-fg-muted">Voyage:</span> {prompt.voyageNumber}</span>
        {prompt.pol && <span><span className="text-fg-muted">POL:</span> {prompt.pol}</span>}
        {prompt.fpod && <span><span className="text-fg-muted">FPOD:</span> {prompt.fpod}</span>}
        {prompt.etdPol && <span><span className="text-fg-muted">ETD:</span> {prompt.etdPol}</span>}
        {prompt.etaFpod && <span><span className="text-fg-muted">ETA:</span> {prompt.etaFpod}</span>}
      </div>
    </Modal>
  )
}
