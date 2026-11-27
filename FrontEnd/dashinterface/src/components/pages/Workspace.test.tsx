import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RoleContext, type RoleContextValue } from '../../RoleContext'
import type { KycRequestRecord } from '../../api'
import Workspace from './Workspace'

vi.mock('html2pdf.js', () => ({ default: vi.fn() }))

const api = vi.hoisted(() => ({ apiUpdateKycStage: vi.fn(), apiGetLiners: vi.fn() }))
vi.mock('../../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api')>()),
  apiGetLiners: api.apiGetLiners,
  apiUpdateKycStage: api.apiUpdateKycStage,
}))

const kycRequest: KycRequestRecord = {
  kyc_id: 9, cli_id: 24, name: 'TEST-AUDIT-FIX Client (delete me)', kyc_stage: 'kyc_pending', cli_type: 'Shipper', currency: 'USD',
  docs: { br_form: 'true', vat_certificate: 'true', svat_certificate: 'false', tin_certificate: 'true', form20: 'false' },
}

const role = {
  activeEmployee: { id: 2, name: 'fin-test', role: 'Finance' },
  activeRole: 'Finance',
  hasPermission: () => true,
  canAccessPage: () => true,
} as unknown as RoleContextValue

const CALLBACKS = [
  'onGoTo', 'onAdvanceWorkflow', 'onConfirmBooking', 'onMarkRaAssigned', 'onRevertBookingRequest', 'onAttachReleaseOrder', 'onReleaseBooking', 'onAcknowledgeProcurement', 'onCreateBooking', 'onSetBookingSiCutoff', 'onSetBookingBlCutoff', 'onSetBookingVgmCutoff', 'onSetBookingFilingCutoff', 'onMarkSiRequested', 'onMarkSiSubmitted', 'onAddVesselSchedule', 'onMarkBlVesselConfirmed', 'onMarkBlBookingCreated', 'onMarkDraftBlSent', 'onMarkLinerBlGenerated', 'onMarkPreAdviceSent', 'onMarkPreAlertSent', 'onSetBlStatus', 'onRecordMasterBl', 'onCreateHouseBl', 'onSetQuoteStatus', 'onUpdateCustomerKyc', 'onAutoAdvanceForCustomer', 'onLogActivity', 'onFlash', 'onStartRateCheck', 'onSetKycPendingClients', 'onSetKycRequests', 'onRefreshKycRequests',
] as const

function renderWorkspace() {
  const fns = Object.fromEntries(CALLBACKS.map(k => [k, vi.fn()])) as Record<(typeof CALLBACKS)[number], ReturnType<typeof vi.fn>>
  const props = {
    ...fns,
    inquiries: [], bookings: [], quotes: [], customers: [], clientList: [], activityLog: [], vesselSchedules: [],
    kycPendingClients: [], kycRequests: [kycRequest],
  } as unknown as ComponentProps<typeof Workspace>
  render(<RoleContext.Provider value={role}><Workspace {...props} /></RoleContext.Provider>)
  return { onFlash: fns.onFlash, user: userEvent.setup() }
}

const deferred = () => {
  let resolve!: (v: unknown) => void
  let reject!: (e: unknown) => void
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe('Workspace', () => {
  beforeEach(() => {
    api.apiGetLiners.mockResolvedValue([])
    api.apiUpdateKycStage.mockReset()
  })

  it('list items are buttons that open the step with Enter or Space', async () => {
    const { user } = renderWorkspace()
    const row = screen.getByRole('button', { name: /^TEST-AUDIT-FIX Client \(delete me\)/ })
    expect(row.tagName).toBe('BUTTON')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    row.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('dialog', { name: 'Review KYC' })).toBeInTheDocument()
    expect(row).toHaveAttribute('aria-current', 'true')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    row.focus()
    await user.keyboard(' ')
    expect(await screen.findByRole('dialog', { name: 'Review KYC' })).toBeInTheDocument()
  })

  it('a double click or repeated Enter on submit sends one request, and the modal stays open until it settles', async () => {
    const req = deferred()
    api.apiUpdateKycStage.mockReturnValue(req.promise)
    const { onFlash, user } = renderWorkspace()
    await user.click(screen.getByRole('button', { name: /^TEST-AUDIT-FIX Client/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Review KYC' })
    const submit = screen.getByRole('button', { name: /Verify & Push/ })
    await user.dblClick(submit)
    submit.focus()
    await user.keyboard('{Enter}{Enter}')
    expect(api.apiUpdateKycStage).toHaveBeenCalledTimes(1)
    expect(api.apiUpdateKycStage).toHaveBeenCalledWith(24, 'kyc_completed')
    // Not dismissable while the request is in flight
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(dialog).toBeInTheDocument()
    req.resolve({})
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onFlash).toHaveBeenCalledWith('KYC verified for TEST-AUDIT-FIX Client (delete me)', undefined)
  })

  it('a failed submit keeps the modal open and dismissable again', async () => {
    const req = deferred()
    api.apiUpdateKycStage.mockReturnValue(req.promise)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { onFlash, user } = renderWorkspace()
    await user.click(screen.getByRole('button', { name: /^TEST-AUDIT-FIX Client/ }))
    await screen.findByRole('dialog', { name: 'Review KYC' })
    await user.click(screen.getByRole('button', { name: /Verify & Push/ }))
    req.reject(new Error('Failed to fetch'))
    expect(await screen.findByRole('button', { name: 'Close' })).toBeInTheDocument()
    expect(onFlash).toHaveBeenCalledWith(expect.stringContaining('Could not verify KYC'))
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.apiUpdateKycStage).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalledWith('[Workspace] update KYC stage failed:', expect.any(Error))
    consoleError.mockRestore()
  })
})
