import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Booking, ReleaseOrderFields } from '../../../types'
import InlineStepForms, { type InlineStepFormsProps } from './InlineStepForms'
import type { WorkspaceItem } from './types'

vi.mock('html2pdf.js', () => ({ default: vi.fn() }))

const item: WorkspaceItem = {
  type: 'inquiry',
  refId: '33',
  customerName: 'TEST-AUDIT-FIX (delete me)',
  title: 'Record customer response',
  subtitle: '',
  urgentFlag: false,
  createdAt: '',
  previousContext: null,
  actionLabel: 'Record Response',
  actionKind: 'customer-response',
  sourceData: {},
}

// The customer-response branch reads only these props; the rest are irrelevant to it.
const renderResponse = (customerDecision: 'accepted' | 'rejected') =>
  render(
    <InlineStepForms
      {...({
        selectedItem: item,
        actionModal: item,
        customerDecision,
        setCustomerDecision: () => {},
        quotationOptions: [],
        quotationOptionsLoading: false,
        selectedOptionRateId: null,
        setSelectedOptionRateId: () => {},
        formNote: '',
        setFormNote: () => {},
        handleModalSubmit: () => {},
        handleAction: () => {},
      } as unknown as InlineStepFormsProps)}
    />,
  )

describe('InlineStepForms customer-response decision toggles', () => {
  it('shows a selected Accepted toggle in the success colour', () => {
    renderResponse('accepted')
    const accepted = screen.getByRole('button', { name: 'Accepted' })
    const rejected = screen.getByRole('button', { name: 'Rejected' })
    expect(accepted).toHaveAttribute('aria-pressed', 'true')
    expect(accepted).toHaveClass('bg-success', 'border-success', 'text-white')
    expect(rejected).toHaveAttribute('aria-pressed', 'false')
    expect(rejected).not.toHaveClass('bg-danger')
    expect(rejected).not.toHaveClass('bg-primary')
  })

  it('shows a selected Rejected toggle in the danger colour', () => {
    renderResponse('rejected')
    const accepted = screen.getByRole('button', { name: 'Accepted' })
    const rejected = screen.getByRole('button', { name: 'Rejected' })
    expect(rejected).toHaveAttribute('aria-pressed', 'true')
    expect(rejected).toHaveClass('bg-danger', 'border-danger', 'text-white')
    expect(accepted).toHaveAttribute('aria-pressed', 'false')
    expect(accepted).not.toHaveClass('bg-success')
    expect(accepted).not.toHaveClass('bg-primary')
  })
})

// ── Part 2a (booking steps) ─────────────────────────────────────────────────
// These steps have no items in the browser while GET /booking-requests returns 405,
// so their controls are checked here with a minimal booking.

const ro: ReleaseOrderFields = {
  reference_nbr: 'EBKG-TEST-1',
  pickup_empty_date: '2026-12-01',
  validity_expiration_date: '2026-12-10',
  pickup_depot: 'Test Depot',
  pickup_depot_address: '',
  cargo_description: 'Coconut Milk',
  cargo_weight: '16000',
  cut_off_date: '2026-12-05',
  etd: '2026-12-06',
  eta: '2026-12-20',
}

const booking = (over: Partial<Booking> = {}): Booking => ({
  id: 'BKG-TEST', quote_id: '', customer_name: 'TEST-AUDIT-FIX (delete me)', origin: 'Colombo', destination: 'Hamburg',
  shipping_line: 'Maersk', vessel_name: 'TEST VESSEL', voyage_number: 'V001', container_type: '40HC', quantity: 2,
  status: 'Released', is_urgent: false, booked_by: 1, confirmed_by: null, released_by: null, created_at: '',
  confirmed_at: null, released_at: null, procurement_notified: false, notes: '',
  ...over,
} as Booking)

const renderStep = (actionKind: string, bkg: Booking, props: Partial<InlineStepFormsProps>) => {
  const stepItem: WorkspaceItem = { ...item, type: 'booking', refId: bkg.id, actionKind, sourceData: { booking: bkg } }
  return render(
    <InlineStepForms
      {...({
        selectedItem: stepItem,
        actionModal: stepItem,
        formNote: '',
        setFormNote: () => {},
        handleModalSubmit: () => {},
        handleAction: () => {},
        activeEmployee: { id: 1, name: 'Tester' },
        linerList: [],
        sendMethod: 'email',
        setSendMethod: () => {},
        emailConfirmed: false,
        setEmailConfirmed: () => {},
        waConfirmed: false,
        setWaConfirmed: () => {},
        customerContactEmail: '',
        setCustomerContactEmail: () => {},
        customerContactPhone: '',
        setCustomerContactPhone: () => {},
        roRefCollapsed: false,
        setRoRefCollapsed: () => {},
        ...props,
      } as unknown as InlineStepFormsProps)}
    />,
  )
}

const fileInput = (container: HTMLElement) => container.querySelector('input[type="file"]') as HTMLInputElement

describe('InlineStepForms record-cutoff', () => {
  const cutoffProps = (over: Partial<InlineStepFormsProps> = {}): Partial<InlineStepFormsProps> => ({
    cutoffLiner: '', setCutoffLiner: () => {},
    cutoffMode: 'paste', setCutoffMode: () => {},
    cutoffContent: '', setCutoffContent: () => {},
    cutoffFileName: '', setCutoffFileName: () => {},
    cutoffNotes: '', setCutoffNotes: () => {},
    cutoffSiDate: '', setCutoffSiDate: () => {},
    setCutoffBlDate: () => {},
    cutoffVgmDate: '', setCutoffVgmDate: () => {},
    cutoffFilingDate: '', setCutoffFilingDate: () => {},
    linerList: [{ lin_id: 1, name: 'Maersk', scac: 'MAEU', is_on_inttra: true, has_portal: false }],
    ...over,
  })

  it('renders labelled controls and the paste textarea', () => {
    renderStep('record-cutoff', booking(), cutoffProps())
    expect(screen.getByRole('combobox', { name: 'Shipping Line / Liner' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Cutoff Schedule' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Cutoff Schedule' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Notes (optional)' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'SI/BL Cutoff Date' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Record Cutoff & Push/ })).toBeEnabled()
  })

  it('the Paste / Upload toggle shows the mode and switches it', async () => {
    const user = userEvent.setup()
    const setCutoffMode = vi.fn()
    renderStep('record-cutoff', booking(), cutoffProps({ setCutoffMode }))
    const paste = screen.getByRole('button', { name: 'Paste' })
    const upload = screen.getByRole('button', { name: 'Upload' })
    expect(paste).toHaveAttribute('aria-pressed', 'true')
    expect(paste).toHaveClass('bg-primary')
    expect(upload).toHaveAttribute('aria-pressed', 'false')
    await user.click(upload)
    expect(setCutoffMode).toHaveBeenCalledWith('upload')
  })

  it('upload mode reads the chosen file into name and data-URL content, and remove clears both', async () => {
    const user = userEvent.setup()
    const setCutoffFileName = vi.fn()
    const setCutoffContent = vi.fn()
    const { container, rerender } = renderStep('record-cutoff', booking(), cutoffProps({ cutoffMode: 'upload', setCutoffFileName, setCutoffContent }))
    expect(fileInput(container)).toHaveAttribute('accept', '.pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.txt')
    const file = new File(['cutoff'], 'cutoff.txt', { type: 'text/plain' })
    await user.upload(fileInput(container), file)
    expect(setCutoffFileName).toHaveBeenCalledWith('cutoff.txt')
    await waitFor(() => expect(setCutoffContent).toHaveBeenCalledWith(expect.stringMatching(/^data:text\/plain;base64,/)))
    rerender(<></>)
    renderStep('record-cutoff', booking(), cutoffProps({ cutoffMode: 'upload', cutoffFileName: 'cutoff.txt', setCutoffFileName, setCutoffContent }))
    expect(screen.getByRole('button', { name: 'Replace file' })).toBeInTheDocument()
    setCutoffFileName.mockClear(); setCutoffContent.mockClear()
    await user.click(screen.getByRole('button', { name: 'Remove cutoff.txt' }))
    expect(setCutoffFileName).toHaveBeenCalledWith('')
    expect(setCutoffContent).toHaveBeenCalledWith('')
  })

  it('the release order reference lists the filled rows and collapses', async () => {
    const user = userEvent.setup()
    const setRoRefCollapsed = vi.fn()
    renderStep('record-cutoff', booking({ release_order_fields: ro }), cutoffProps({ setRoRefCollapsed }))
    const toggle = screen.getByRole('button', { name: /Release Order Reference/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Coconut Milk')).toBeInTheDocument()
    expect(screen.getByText('16000 kg')).toBeInTheDocument()
    expect(screen.queryByText('Depot Address')).not.toBeInTheDocument() // empty value is skipped
    await user.click(toggle)
    expect(setRoRefCollapsed).toHaveBeenCalledWith(true)
  })
})

describe('InlineStepForms request-si', () => {
  const siProps = (over: Partial<InlineStepFormsProps> = {}): Partial<InlineStepFormsProps> => ({
    vgmCertFileName: '', setVgmCertFileName: () => {}, setVgmCertContent: () => {},
    ...over,
  })
  const siBooking = booking({ si_cutoff_date: '2020-01-01', vgm_cutoff_date: '2020-01-02' })

  it('shows the overdue badge and the cutoff rows', () => {
    renderStep('request-si', siBooking, siProps())
    expect(screen.getByText(/^OVERDUE by \d+ day\(s\)$/)).toHaveClass('ui-badge--danger')
    expect(screen.getByText('SI/BL Cutoff')).toBeInTheDocument()
    expect(screen.getByText('VGM Cutoff')).toBeInTheDocument()
  })

  it('the send method toggle switches to WhatsApp and resets the email confirmation', async () => {
    const user = userEvent.setup()
    const setSendMethod = vi.fn()
    const setEmailConfirmed = vi.fn()
    renderStep('request-si', siBooking, siProps({ setSendMethod, setEmailConfirmed }))
    const group = screen.getByRole('group', { name: 'Contact Customer via' })
    expect(within(group).getByRole('button', { name: 'Email' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(group).getByRole('button', { name: 'WhatsApp' }))
    expect(setSendMethod).toHaveBeenCalledWith('whatsapp')
    expect(setEmailConfirmed).toHaveBeenCalledWith(false)
  })

  it('email: submit stays disabled until the address and the confirmation are in', async () => {
    const user = userEvent.setup()
    const setEmailConfirmed = vi.fn()
    const { unmount } = renderStep('request-si', siBooking, siProps({ setEmailConfirmed }))
    expect(screen.getByRole('button', { name: /Send Reminder via Email/ })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Open in Outlook/ })).not.toBeInTheDocument()
    unmount()
    renderStep('request-si', siBooking, siProps({ customerContactEmail: 'a@b.co', setEmailConfirmed }))
    await user.click(screen.getByRole('checkbox', { name: /I confirm that I have sent the cutoff reminder/ }))
    expect(setEmailConfirmed).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', { name: /Send Reminder via Email/ })).toBeDisabled()
  })

  it('email confirmed enables submit', () => {
    renderStep('request-si', siBooking, siProps({ customerContactEmail: 'a@b.co', emailConfirmed: true }))
    expect(screen.getByRole('button', { name: /Send Reminder via Email/ })).toBeEnabled()
  })

  it('the VGM certificate picker passes the chosen file on', async () => {
    const user = userEvent.setup()
    const setVgmCertFileName = vi.fn()
    const setVgmCertContent = vi.fn()
    const { container } = renderStep('request-si', siBooking, siProps({ setVgmCertFileName, setVgmCertContent }))
    expect(screen.getByRole('button', { name: 'Attach VGM certificate' })).toBeInTheDocument()
    await user.upload(fileInput(container), new File(['v'], 'vgm.pdf', { type: 'application/pdf' }))
    expect(setVgmCertFileName).toHaveBeenCalledWith('vgm.pdf')
    await waitFor(() => expect(setVgmCertContent).toHaveBeenCalledWith(expect.stringMatching(/^data:application\/pdf;base64,/)))
  })
})

const paFieldProps = (fields: Record<string, string>, over: Partial<InlineStepFormsProps> = {}): Partial<InlineStepFormsProps> => ({
  paField: (k: string) => fields[k] ?? '',
  setPaField: () => {},
  paCopied: false, setPaCopied: () => {},
  draftCollapsed: false, setDraftCollapsed: () => {},
  ...over,
})

describe('InlineStepForms send-pre-advice', () => {
  const paBooking = booking({ status: 'Liner Confirmed', delivery_type: 'door-to-door', bl_cutoff_date: '2026-12-05' } as Partial<Booking>)

  it('renders labelled fields; read-only ones stay read-only; typing updates the field', async () => {
    const user = userEvent.setup()
    const setPaField = vi.fn()
    renderStep('send-pre-advice', paBooking, paFieldProps({ booking_ref: 'BKG-TEST' }, { setPaField }))
    expect(screen.getByText('BL Cutoff: 2026-12-05')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Booking Ref' })).toHaveAttribute('readonly')
    expect(screen.getByRole('textbox', { name: 'Description of Goods' }).tagName).toBe('TEXTAREA')
    await user.type(screen.getByRole('textbox', { name: 'Agent Name' }), 'A')
    expect(setPaField).toHaveBeenCalledWith('door_agent', 'A')
  })

  it('the generated email copies to the clipboard and collapses; Copy sits outside the toggle', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    const setPaCopied = vi.fn()
    const setDraftCollapsed = vi.fn()
    renderStep('send-pre-advice', paBooking, paFieldProps({ door_agent: 'Door Co' }, { setPaCopied, setDraftCollapsed }))
    const toggle = screen.getByRole('button', { name: 'Generated Email' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const copy = screen.getByRole('button', { name: 'Copy' })
    expect(toggle).not.toContainElement(copy)
    await user.click(copy)
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Dear Door Co,'))
    expect(setPaCopied).toHaveBeenCalledWith(true)
    expect(setDraftCollapsed).not.toHaveBeenCalled()
    await user.click(toggle)
    expect(setDraftCollapsed).toHaveBeenCalledTimes(1)
  })

  it('a collapsed email hides the body and the Copy button', () => {
    renderStep('send-pre-advice', paBooking, paFieldProps({}, { draftCollapsed: true }))
    expect(screen.getByRole('button', { name: 'Generated Email' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Generated Email' })).not.toBeInTheDocument()
  })

  it('switching to WhatsApp resets both confirmations; submit needs the agent and the confirmation', async () => {
    const user = userEvent.setup()
    const setSendMethod = vi.fn(); const setWaConfirmed = vi.fn(); const setEmailConfirmed = vi.fn()
    const { unmount } = renderStep('send-pre-advice', paBooking, paFieldProps({ door_agent: 'Door Co' }, { setSendMethod, setWaConfirmed, setEmailConfirmed }))
    const group = screen.getByRole('group', { name: 'Send to Door Agent' })
    await user.click(within(group).getByRole('button', { name: 'WhatsApp' }))
    expect(setSendMethod).toHaveBeenCalledWith('whatsapp')
    expect(setWaConfirmed).toHaveBeenCalledWith(false)
    expect(setEmailConfirmed).toHaveBeenCalledWith(false)
    expect(screen.getByRole('button', { name: /Send Pre-Advice/ })).toBeDisabled()
    unmount()
    renderStep('send-pre-advice', paBooking, paFieldProps({ door_agent: 'Door Co' }, { sendMethod: 'whatsapp', waConfirmed: true }))
    expect(screen.getByRole('checkbox', { name: /I have sent the pre-advice via WhatsApp/ })).toBeChecked()
    expect(screen.getByRole('button', { name: /Send Pre-Advice/ })).toBeEnabled()
  })
})

describe('InlineStepForms send-pre-alert', () => {
  const praBooking = booking({ pre_advice_sent: true })

  it('issue-term selects show the empty choice as a dash and update the field', async () => {
    const user = userEvent.setup()
    const setPaField = vi.fn()
    renderStep('send-pre-alert', praBooking, paFieldProps({}, { setPaField }))
    const hblIssue = screen.getByRole('button', { name: /HBL Issue Term/ })
    expect(hblIssue).toHaveTextContent('—')
    await user.click(hblIssue)
    await user.click(screen.getByRole('option', { name: 'SURRENDER' }))
    expect(setPaField).toHaveBeenCalledWith('hbl_issue_term', 'SURRENDER')
  })

  it('submit needs the agent name and an email address', () => {
    const { unmount } = renderStep('send-pre-alert', praBooking, paFieldProps({ dest_agent: 'Dest Co', dest_agent_email: 'no-at' }))
    expect(screen.getByRole('button', { name: /Send Pre-Alert/ })).toBeDisabled()
    unmount()
    renderStep('send-pre-alert', praBooking, paFieldProps({ dest_agent: 'Dest Co', dest_agent_email: 'agent@dest.co' }))
    expect(screen.getByRole('button', { name: /Send Pre-Alert/ })).toBeEnabled()
    expect((screen.getByRole('textbox', { name: 'Generated Email' }) as HTMLTextAreaElement).value).toContain('Subject: Pre-Alert')
  })
})

describe('InlineStepForms release-booking', () => {
  const rbBooking = booking({ status: 'Liner Confirmed', release_order_attached: true, release_order_fields: ro })
  const rbProps = (over: Partial<InlineStepFormsProps> = {}): Partial<InlineStepFormsProps> => ({
    releasePhase: 'review', setReleasePhase: () => {},
    releaseDraft: '', setReleaseDraft: () => {},
    mkReleaseOrderDraft: () => 'DRAFT',
    draftCollapsed: false, setDraftCollapsed: () => {},
    ...over,
  })

  it('review: lists the release order and proceeds to the send phase', async () => {
    const user = userEvent.setup()
    const setReleasePhase = vi.fn()
    renderStep('release-booking', rbBooking, rbProps({ setReleasePhase }))
    expect(screen.getByText('Liner Reference')).toBeInTheDocument()
    expect(screen.getByText('Coconut Milk')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Proceed to Release/ }))
    expect(setReleasePhase).toHaveBeenCalledWith('send')
  })

  it('review without a release order: shows the notice and disables Proceed', () => {
    renderStep('release-booking', booking({ status: 'Liner Confirmed' }), rbProps())
    expect(screen.getByText('No Release Order Attached')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Proceed to Release/ })).toBeDisabled()
  })

  it('send: switching method rebuilds the draft and resets both confirmations; Back returns to review', async () => {
    const user = userEvent.setup()
    const setSendMethod = vi.fn(); const setReleaseDraft = vi.fn(); const setWaConfirmed = vi.fn(); const setEmailConfirmed = vi.fn()
    const setReleasePhase = vi.fn()
    const mkReleaseOrderDraft = vi.fn(() => 'WA DRAFT')
    renderStep('release-booking', rbBooking, rbProps({
      releasePhase: 'send', releaseDraft: 'Dear customer', setSendMethod, setReleaseDraft, setWaConfirmed, setEmailConfirmed, setReleasePhase, mkReleaseOrderDraft,
    }))
    await user.click(within(screen.getByRole('group', { name: 'Send via' })).getByRole('button', { name: 'WhatsApp' }))
    expect(setSendMethod).toHaveBeenCalledWith('whatsapp')
    expect(mkReleaseOrderDraft).toHaveBeenCalledWith(rbBooking, 'whatsapp')
    expect(setReleaseDraft).toHaveBeenCalledWith('WA DRAFT')
    expect(setWaConfirmed).toHaveBeenCalledWith(false)
    expect(setEmailConfirmed).toHaveBeenCalledWith(false)
    setReleaseDraft.mockClear()
    await user.type(screen.getByRole('textbox', { name: 'Email Draft' }), '!')
    expect(setReleaseDraft).toHaveBeenCalledWith('Dear customer!')
    await user.click(screen.getByRole('button', { name: /Back to Release Order Review/ }))
    expect(setReleasePhase).toHaveBeenCalledWith('review')
  })

  it('send: submit needs the email, the draft and the confirmation', () => {
    const { unmount } = renderStep('release-booking', rbBooking, rbProps({ releasePhase: 'send', releaseDraft: 'Dear customer', customerContactEmail: 'a@b.co' }))
    expect(screen.getByRole('button', { name: /Send Release Order via Email/ })).toBeDisabled()
    unmount()
    renderStep('release-booking', rbBooking, rbProps({ releasePhase: 'send', releaseDraft: 'Dear customer', customerContactEmail: 'a@b.co', emailConfirmed: true }))
    expect(screen.getByRole('button', { name: /Send Release Order via Email/ })).toBeEnabled()
  })
})

describe('InlineStepForms attach-release-order', () => {
  const emptyRo: ReleaseOrderFields = {
    reference_nbr: '', pickup_empty_date: '', validity_expiration_date: '', pickup_depot: '', pickup_depot_address: '',
    cargo_description: '', cargo_weight: '', cut_off_date: '', etd: '', eta: '',
  }

  it('renders the labelled fields; typing the reference updates roFields; submit needs a reference', async () => {
    const user = userEvent.setup()
    // The updater reads e.target.value, so it is applied while the change event runs, as React does.
    const applied: ReleaseOrderFields[] = []
    const setRoFields = vi.fn((u: ReleaseOrderFields | ((f: ReleaseOrderFields) => ReleaseOrderFields)) => { applied.push(typeof u === 'function' ? u(emptyRo) : u) })
    const { unmount } = renderStep('attach-release-order', booking({ status: 'Liner Confirmed' }), { roFields: emptyRo, setRoFields })
    for (const name of ['Pick Up Empty Date', 'Validity Expiration', 'Cut-Off Date', 'ETD', 'ETA (Destination)']) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('textbox', { name: 'Notes for CS (optional)' }).tagName).toBe('TEXTAREA')
    expect(screen.getByRole('button', { name: /Send Release Order to CS/ })).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: 'Reference Nbr' }), 'E')
    expect(applied).toEqual([{ ...emptyRo, reference_nbr: 'E' }])
    unmount()
    renderStep('attach-release-order', booking({ status: 'Liner Confirmed' }), { roFields: { ...emptyRo, reference_nbr: 'EBKG1' }, setRoFields })
    expect(screen.getByRole('button', { name: /Send Release Order to CS/ })).toBeEnabled()
  })
})

describe('InlineStepForms confirm-liner-booking', () => {
  const cbBooking = booking({ status: 'RA Assigned' })

  it('nothing chosen: both toggles unpressed and submit disabled; clicking sets the choice', async () => {
    const user = userEvent.setup()
    const setLinerBooked = vi.fn()
    renderStep('confirm-liner-booking', cbBooking, { linerBooked: '', setLinerBooked })
    const group = screen.getByRole('group', { name: 'Was the liner booking confirmed?' })
    expect(within(group).getByRole('button', { name: 'Yes, booked' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(group).getByRole('button', { name: "No, couldn't book" })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Confirm Liner Booking' })).toBeDisabled()
    await user.click(within(group).getByRole('button', { name: "No, couldn't book" }))
    expect(setLinerBooked).toHaveBeenCalledWith('no')
  })

  it('yes: success colour and an enabled primary submit', () => {
    renderStep('confirm-liner-booking', cbBooking, { linerBooked: 'yes', setLinerBooked: () => {} })
    expect(screen.getByRole('button', { name: 'Yes, booked' })).toHaveClass('bg-success', 'text-white')
    expect(screen.getByRole('button', { name: "No, couldn't book" })).not.toHaveClass('bg-danger')
    expect(screen.queryByRole('textbox', { name: 'Reason (required)' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm Liner Booking' })).toBeEnabled()
  })

  it('no: danger colour, a required reason, and a danger submit enabled once the reason is in', () => {
    const { unmount } = renderStep('confirm-liner-booking', cbBooking, { linerBooked: 'no', setLinerBooked: () => {} })
    expect(screen.getByRole('button', { name: "No, couldn't book" })).toHaveClass('bg-danger', 'text-white')
    expect(screen.getByRole('textbox', { name: 'Reason (required)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revert to Pending Liner' })).toBeDisabled()
    unmount()
    renderStep('confirm-liner-booking', cbBooking, { linerBooked: 'no', setLinerBooked: () => {}, formNote: 'No space' })
    const submit = screen.getByRole('button', { name: 'Revert to Pending Liner' })
    expect(submit).toBeEnabled()
    expect(submit).toHaveClass('ui-button--danger')
  })
})

// ── Part 2b (SI, vessel, BL and booking request steps) ─────────────────────

describe('InlineStepForms submit-si', () => {
  const siProps = (over: Partial<InlineStepFormsProps> = {}): Partial<InlineStepFormsProps> => ({
    siMode: 'paste', setSiMode: () => {}, siContent: '', setSiContent: () => {},
    siFileName: '', setSiFileName: () => {}, inttraSiLoading: false,
    vgmCertFileName: '', setVgmCertFileName: () => {}, setVgmCertContent: () => {},
    ...over,
  })

  it('needs SI content and no running INTTRA call before Record SI is enabled', () => {
    const { unmount } = renderStep('submit-si', booking(), siProps())
    expect(screen.getByRole('button', { name: 'Record SI' })).toBeDisabled()
    unmount()
    const r2 = renderStep('submit-si', booking(), siProps({ siContent: 'SHIPPER: X', vgmCertFileName: 'vgm.pdf' }))
    expect(screen.getByRole('button', { name: 'Record SI (VGM attached)' })).toBeEnabled()
    r2.unmount()
    renderStep('submit-si', booking(), siProps({ siContent: 'SHIPPER: X', inttraSiLoading: true }))
    expect(screen.getByRole('button', { name: 'Record SI' })).toBeDisabled()
  })

  it('the Paste/Upload toggle is a pressed group, and typing pastes the SI text', async () => {
    const user = userEvent.setup()
    const setSiMode = vi.fn()
    const setSiContent = vi.fn()
    renderStep('submit-si', booking(), siProps({ setSiMode, setSiContent }))
    const group = screen.getByRole('group', { name: 'SI Document' })
    expect(within(group).getByRole('button', { name: 'Paste' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getByRole('button', { name: 'Paste' })).toHaveClass('bg-primary')
    await user.click(within(group).getByRole('button', { name: 'Upload' }))
    expect(setSiMode).toHaveBeenCalledWith('upload')
    await user.type(screen.getByRole('textbox', { name: 'SI Document' }), 'A')
    expect(setSiContent).toHaveBeenCalledWith('A')
  })

  it('upload reads the SI and VGM files into name and data-URL content; remove clears them', async () => {
    const user = userEvent.setup()
    const setSiFileName = vi.fn(), setSiContent = vi.fn(), setVgmCertFileName = vi.fn(), setVgmCertContent = vi.fn()
    const { container, unmount } = renderStep('submit-si', booking(), siProps({ siMode: 'upload', setSiFileName, setSiContent, setVgmCertFileName, setVgmCertContent }))
    const inputs = container.querySelectorAll('input[type="file"]')
    expect(inputs[0]).toHaveAttribute('accept', '.pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.txt,.doc,.docx')
    expect(inputs[1]).toHaveAttribute('accept', '.pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.doc,.docx')
    await user.upload(inputs[0] as HTMLInputElement, new File(['si'], 'si.txt', { type: 'text/plain' }))
    await user.upload(inputs[1] as HTMLInputElement, new File(['v'], 'vgm.pdf', { type: 'application/pdf' }))
    expect(setSiFileName).toHaveBeenCalledWith('si.txt')
    expect(setVgmCertFileName).toHaveBeenCalledWith('vgm.pdf')
    await waitFor(() => expect(setSiContent).toHaveBeenCalledWith(expect.stringMatching(/^data:text\/plain;base64,/)))
    await waitFor(() => expect(setVgmCertContent).toHaveBeenCalledWith(expect.stringMatching(/^data:application\/pdf;base64,/)))
    unmount()
    renderStep('submit-si', booking(), siProps({ siMode: 'upload', siFileName: 'si.txt', vgmCertFileName: 'vgm.pdf', setSiFileName, setSiContent, setVgmCertFileName, setVgmCertContent }))
    await user.click(screen.getByRole('button', { name: 'Remove si.txt' }))
    expect(setSiFileName).toHaveBeenLastCalledWith('')
    expect(setSiContent).toHaveBeenLastCalledWith('')
    await user.click(screen.getByRole('button', { name: 'Remove vgm.pdf' }))
    expect(setVgmCertFileName).toHaveBeenLastCalledWith('')
    expect(setVgmCertContent).toHaveBeenLastCalledWith('')
  })
})
