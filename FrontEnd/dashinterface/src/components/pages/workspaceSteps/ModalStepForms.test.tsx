import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ModalStepForms, { type ModalStepFormsProps } from './ModalStepForms'
import type { WorkspaceItem } from './types'

vi.mock('html2pdf.js', () => ({ default: vi.fn() }))

const booking = {
  id: 'BKG-1042', customer_name: 'TEST-AUDIT-FIX UI (delete me)', origin: 'LKCMB', destination: 'NLRTM',
  quantity: 2, container_type: '40HC', shipping_line: 'Hapag-Lloyd', delivery_type: 'door-to-door',
  si_cutoff_date: '2026-12-03', bl_cutoff_date: '2026-12-04', master_bl_number: 'HLCU1',
}
const kycRequest = {
  kyc_id: 9, cli_id: 24, name: 'TEST-AUDIT-FIX Client (delete me)', br_number: 'PV-00123', sea_imports: true,
  docs: { br_form: 'true', vat_certificate: 'false', svat_certificate: 'true', tin_certificate: 'true', form20: 'false' },
}
const ctx = {
  id: 1, timestamp: '', actor_role: 'CS', actor_id: 3, action: 'Booking request sent to Procurement.',
  ref_type: 'booking', ref_id: 'BKG-1042', customer_name: 'x', pushed_to: 'Procurement', notes: 'Prefers Hapag-Lloyd',
}

const item = (actionKind: string, extra: Partial<WorkspaceItem> = {}): WorkspaceItem => ({
  type: 'booking', refId: 'BKG-1042', customerName: 'TEST-AUDIT-FIX UI (delete me)', title: `Do ${actionKind}`,
  subtitle: '', urgentFlag: false, createdAt: '', previousContext: null,
  actionLabel: `Label ${actionKind}`, actionKind, sourceData: { booking, kycRequest }, ...extra,
})

function setup(actionKind: string, over: Partial<ModalStepFormsProps> = {}, extra: Partial<WorkspaceItem> = {}) {
  const props: ModalStepFormsProps = {
    actionModal: item(actionKind, extra), setActionModal: vi.fn(),
    formDecision: 'approve', setFormDecision: vi.fn(), formNote: '', setFormNote: vi.fn(),
    formVessel: '', setFormVessel: vi.fn(), formVoyage: '', setFormVoyage: vi.fn(),
    quotationContent: '', setQuotationContent: vi.fn(), quoteCopied: false, setQuoteCopied: vi.fn(),
    selectedRateOptionIds: new Set(), setSelectedRateOptionIds: vi.fn(), bestRateOptionId: null, setBestRateOptionId: vi.fn(),
    optionOverrides: {}, setOptionOverrides: vi.fn(),
    sendMethod: 'email', setSendMethod: vi.fn(), waConfirmed: false, setWaConfirmed: vi.fn(),
    emailConfirmed: false, setEmailConfirmed: vi.fn(), draftCollapsed: false, setDraftCollapsed: vi.fn(),
    customerContactEmail: '', setCustomerContactEmail: vi.fn(), customerContactPhone: '', setCustomerContactPhone: vi.fn(),
    kycSending: false, quotationSending: false,
    blDecision: 'approved', setBlDecision: vi.fn(),
    masterBlNumber: '', setMasterBlNumber: vi.fn(), masterBlShipper: '', setMasterBlShipper: vi.fn(), masterBlConsignee: '', setMasterBlConsignee: vi.fn(),
    houseBlNumber: '', setHouseBlNumber: vi.fn(), houseBlShipper: '', setHouseBlShipper: vi.fn(), houseBlConsignee: '', setHouseBlConsignee: vi.fn(),
    jobRefNumber: '', setJobRefNumber: vi.fn(),
    siIsNvocc: false, siField: () => '', hblField: () => '', mblField: () => '',
    customers: [], linerList: [], activeEmployee: { id: 1, name: 'IT-AD' },
    handleModalSubmit: vi.fn(), submitting: false,
    ...over,
  }
  const view = render(<ModalStepForms {...props} />)
  return { props, view, user: userEvent.setup() }
}

describe('ModalStepForms', () => {
  it('renders nothing for kinds handled by the inline step forms', () => {
    setup('send-kyc')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders a labelled dialog with the ref id and title', () => {
    setup('save-draft-bl')
    const dialog = screen.getByRole('dialog', { name: 'Label save-draft-bl' })
    expect(within(dialog).getByText('BKG-1042')).toBeInTheDocument()
    expect(within(dialog).getByText('Do save-draft-bl')).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: 'Job Reference Number' })).toBeInTheDocument()
  })

  it('verify-kyc: decision toggles use success/danger and are keyboard operable', async () => {
    const { props, user } = setup('verify-kyc')
    const verified = screen.getByRole('button', { name: 'Verified' })
    const flag = screen.getByRole('button', { name: 'Flag Issues' })
    expect(verified).toHaveAttribute('aria-pressed', 'true')
    expect(verified).toHaveClass('bg-success')
    expect(flag).toHaveAttribute('aria-pressed', 'false')
    flag.focus()
    await user.keyboard(' ')
    expect(props.setFormDecision).toHaveBeenLastCalledWith('reject')
    await user.keyboard('{Enter}')
    expect(props.setFormDecision).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: /Verify & Push/ })).toHaveClass('ui-button--primary')
    // Document checklist exposes the status as text, not only colour
    expect(screen.getByText('VAT Certificate').parentElement).toHaveTextContent('(missing)')
    expect(screen.getByText('BR Form').parentElement).toHaveTextContent('(submitted)')
  })

  it('verify-kyc reject: danger submit with the reject copy and the issues field', async () => {
    const { props, user } = setup('verify-kyc', { formDecision: 'reject' })
    expect(screen.getByRole('button', { name: 'Flag Issues' })).toHaveClass('bg-danger')
    const submit = screen.getByRole('button', { name: 'Flag & Return to CS' })
    expect(submit).toHaveClass('ui-button--danger')
    await user.type(screen.getByRole('textbox', { name: 'Issues Found' }), 'x')
    expect(props.setFormNote).toHaveBeenLastCalledWith('x')
    await user.click(submit)
    expect(props.handleModalSubmit).toHaveBeenCalledTimes(1)
  })

  it('cannot be dismissed while submitting', async () => {
    const { props, user } = setup('approve-quote', { submitting: true })
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(props.setActionModal).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('can be dismissed with Escape, Close and Cancel when idle', async () => {
    const { props, user } = setup('approve-quote')
    await user.keyboard('{Escape}')
    expect(props.setActionModal).toHaveBeenLastCalledWith(null)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.setActionModal).toHaveBeenCalledTimes(3)
  })

  it('shows the sending state and disables submit while KYC is sending', () => {
    setup('verify-kyc', { kycSending: true })
    expect(screen.getByRole('button', { name: /Sending\.\.\./ })).toBeDisabled()
  })

  it('confirm-booking: context notes, vessel setter and disabled rule', async () => {
    const { props, user } = setup('confirm-booking', {}, { previousContext: ctx as never })
    expect(screen.getByText('Prefers Hapag-Lloyd')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirm & Push/ })).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: 'Vessel Name' }), 'M')
    expect(props.setFormVessel).toHaveBeenLastCalledWith('M')
  })

  it('confirm-booking with a vessel enables the manual confirm submit', () => {
    setup('confirm-booking', { formVessel: 'Maersk Seletar' })
    expect(screen.getByRole('button', { name: /Confirm Manually & Send to CS/ })).toBeEnabled()
  })

  it('bl-approval: Changes Requested needs change details', async () => {
    const { props, user } = setup('bl-approval')
    await user.click(screen.getByRole('button', { name: 'Changes Requested' }))
    expect(props.setBlDecision).toHaveBeenLastCalledWith('changes-requested')
    expect(screen.getByText('Customer Response to House BL')).toBeInTheDocument()
  })

  it('bl-approval changes-requested: submit disabled until a note is typed', () => {
    const { view, props } = setup('bl-approval', { blDecision: 'changes-requested' })
    expect(screen.getByRole('button', { name: 'Changes Requested' })).toHaveClass('bg-warning')
    expect(screen.getByRole('button', { name: /Record Changes Requested/ })).toBeDisabled()
    view.rerender(<ModalStepForms {...props} formNote="Fix consignee" />)
    expect(screen.getByRole('button', { name: /Record Changes Requested/ })).toBeEnabled()
  })

  it('record-master-bl: required number and consignee', () => {
    const { view, props } = setup('record-master-bl')
    expect(screen.getByRole('button', { name: /Record Master BL/ })).toBeDisabled()
    view.rerender(<ModalStepForms {...props} masterBlNumber="MAEU1" masterBlConsignee="RFBV" />)
    expect(screen.getByRole('button', { name: /Record Master BL/ })).toBeEnabled()
  })

  it('create-house-bl: send method switch resets the email confirmation', async () => {
    const { props, user } = setup('create-house-bl')
    expect(screen.getByRole('button', { name: 'Email' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Open in Outlook' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'WhatsApp' }))
    expect(props.setSendMethod).toHaveBeenLastCalledWith('whatsapp')
    expect(props.setEmailConfirmed).toHaveBeenLastCalledWith(false)
  })

  it('create-house-bl email: Outlook button and the confirm checkbox gate submit', async () => {
    const filled = { houseBlNumber: 'HB1', houseBlConsignee: 'Cons', customerContactEmail: 'a@b.co' }
    const { props, view, user } = setup('create-house-bl', filled)
    expect(screen.getByRole('button', { name: 'Open in Outlook' })).toBeInTheDocument()
    const submit = screen.getByRole('button', { name: /Create & Send House BL via Email/ })
    expect(submit).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /I confirm that I have sent the House BL/ }))
    expect(props.setEmailConfirmed).toHaveBeenLastCalledWith(true)
    view.rerender(<ModalStepForms {...props} emailConfirmed />)
    expect(screen.getByRole('button', { name: /Create & Send House BL via Email/ })).toBeEnabled()
  })

  it('create-house-bl whatsapp: confirm checkbox sets waConfirmed', async () => {
    const { props, user } = setup('create-house-bl', { sendMethod: 'whatsapp', houseBlNumber: 'HB1', houseBlConsignee: 'Cons' })
    expect(screen.getByRole('button', { name: /Create & Confirm House BL Sent/ })).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /via WhatsApp/ }))
    expect(props.setWaConfirmed).toHaveBeenLastCalledWith(true)
  })
})
