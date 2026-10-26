import { Ship } from 'lucide-react'
import type { Booking } from '../../../types'

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '24px 28px', maxWidth: 440, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.22)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: 'rgba(8,145,178,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ship size={18} style={{ color: '#0891b2' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              Vessel Schedule Confirmed
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              <strong>{prompt.vesselName}</strong> / <strong>{prompt.voyageNumber}</strong> has been saved.
              <br /><br />
              Would you like to create a booking for this vessel now?
            </div>
          </div>
        </div>
        <div style={{ padding: '10px 12px', background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.12)', borderRadius: 8, fontSize: 11, color: 'var(--text-secondary)', marginBottom: 14, display: 'flex', flexWrap: 'wrap' as const, gap: '2px 14px' }}>
          <span><span style={{ color: 'var(--text-muted)' }}>Vessel:</span> {prompt.vesselName}</span>
          <span><span style={{ color: 'var(--text-muted)' }}>Voyage:</span> {prompt.voyageNumber}</span>
          {prompt.pol && <span><span style={{ color: 'var(--text-muted)' }}>POL:</span> {prompt.pol}</span>}
          {prompt.fpod && <span><span style={{ color: 'var(--text-muted)' }}>FPOD:</span> {prompt.fpod}</span>}
          {prompt.etdPol && <span><span style={{ color: 'var(--text-muted)' }}>ETD:</span> {prompt.etdPol}</span>}
          {prompt.etaFpod && <span><span style={{ color: 'var(--text-muted)' }}>ETA:</span> {prompt.etaFpod}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="db-btn"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            onClick={onDismiss}>
            Not Now
          </button>
          <button className="db-btn"
            style={{ background: '#0891b2', borderColor: '#0891b2', color: '#fff' }}
            onClick={() => {
              const bkg = bookings.find(b => b.id === prompt.bookingId)
              if (!bkg) { onDismiss(); return }
              onCreateBooking(prompt, bkg)
            }}>
            <Ship size={12} style={{ marginRight: 4 }} /> Create Booking
          </button>
        </div>
      </div>
    </div>
  )
}
