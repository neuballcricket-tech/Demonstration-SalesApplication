import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RoleContext, type RoleContextValue } from '../../RoleContext'
import type { AggregateRate, AggregateScheduleRatesResponse, Inquiry } from '../../types'
import RateCheck, { SelectablePivotRateTable } from './RateCheck'

const api = vi.hoisted(() => ({
  apiFetchAllRates: vi.fn(), apiGetEnrichedScheduleRates: vi.fn(), apiGetAuthEmployees: vi.fn(),
  apiGetPorts: vi.fn(), apiGetLiners: vi.fn(), apiGetTradeLanes: vi.fn(), apiGetEmployeesDb: vi.fn(),
  apiGetIncomingRateRequests: vi.fn(), apiGetAggregateScheduleRates: vi.fn(),
  apiCreateRateRequest: vi.fn(), apiAddRateRequestOption: vi.fn(), apiPatchRateRequestProc: vi.fn(),
  apiCreateVesselRate: vi.fn(), apiCreateFakRate: vi.fn(), apiCreateSpecialRate: vi.fn(),
}))
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../api')>()), ...api }))

// ---- Fixtures ----

type Pivot = ComponentProps<typeof SelectablePivotRateTable>['pivot']
type Row = Pivot['rows'][number]

const cell = (rateId: number, rateTypeKey: string, rate: number) => ({ rateId, rateTypeKey, rate, currency: 'USD', note: null, validFrom: '2026-12-01', validTo: '2026-12-31', freeTime: null, transit: null })
const pivotRow = (scheduleId: number, linerName: string, vesselName: string, originCity: string, rates: Row['rates']): Row => ({
  scheduleId, linerName, vesselName, voyageNumber: '610W', origin: 'LKCMB', destination: 'DEHAM', originCity, destinationCity: 'Hamburg',
  etd: '2026-12-05', eta: '2026-12-29', bkCutoff: null, totalDuration: 24, scheduleType: 'Direct', rates,
})
const PIVOT: Pivot = {
  rows: [
    pivotRow(9101, 'Maersk', 'Vessel A', 'Colombo', { Tariff: { '20GP': [cell(501, 'tariff_rates', 1450)], '40GP': [cell(502, 'tariff_rates', 2350)] } }),
    pivotRow(9102, 'MSC', 'Vessel B', 'Galle', { Tariff: { '20GP': [cell(511, 'tariff_rates', 1500)] } }),
  ],
  rateTypes: ['Tariff'],
  containerTypes: ['20GP', '40GP'],
}

type TableProps = ComponentProps<typeof SelectablePivotRateTable>
const renderTable = (props: Partial<TableProps> = {}) => {
  const handlers = { onToggleGroup: vi.fn(), onToggleRow: vi.fn(), onToggleSchedule: vi.fn() }
  const { unmount } = render(<SelectablePivotRateTable pivot={PIVOT} selectedIds={new Set()} selectedScheduleIds={new Set()} {...handlers} {...props} />)
  return { ...handlers, unmount, user: userEvent.setup() }
}

const rate = (rate_id: number, container_type: string, value: number): AggregateRate => ({
  rate_id, lin_id: 1, origin: 'LKCMB', destination: 'DEHAM', container_type, rate: value, currency: 'USD',
  valid_from: '2026-12-01', valid_to: '2026-12-31', transit: '24', free_time: null, max_weight: null, note: null, special_remark: null,
})
const schedule = (schedule_id: number, liner_name: string, vessel_name: string) => ({
  schedule_id, scac: 'TEST', lin_id: 1, liner_name, vessel_name, voyage_number: '610W', origin_unloc: 'LKCMB', destination_unloc: 'DEHAM',
  origin_departure_date: '2026-12-05T00:00:00', destination_arrival_date: '2026-12-29T00:00:00', total_duration: 24, schedule_type: 'Direct',
})
// Keyed by schedule id, as the brief's schedule-rate lookup expects
const AGGREGATE: AggregateScheduleRatesResponse = {
  9101: { schedule: schedule(9101, 'Maersk', 'TEST-AUDIT-FIX Vessel A'), tariff_rates: [rate(501, '20GP', 1450), rate(502, '40GP', 2350)], fak_rates: [rate(601, '40HC', 2200)], special_rate: [], vessel_by_vessel_rate: [], nac: [], contracted_rates: [] },
  9102: { schedule: schedule(9102, 'MSC', 'TEST-AUDIT-FIX Vessel B'), tariff_rates: [rate(511, '20GP', 1500)], fak_rates: [], special_rate: [], vessel_by_vessel_rate: [], nac: [], contracted_rates: [] },
}

const inquiry = {
  id: 'INQ-4', inq_id: 4, cli_id: 3, customer_name: 'TEST-AUDIT-FIX Client (delete me)', origin: 'LKCMB', destination: 'DEHAM',
  container_type: '20GP', container_qty: 5, request: 'Port-to-Port', channel: 'Email',
} as unknown as Inquiry

const role = {
  activeEmployee: { id: 9, name: 'IT-AD', role: 'Admin' },
  activeRole: 'Admin',
  hasPermission: () => true,
  canAccessPage: () => true,
} as unknown as RoleContextValue

function renderRateCheck(variant: 'procurement' | 'cs-sales') {
  const props = { onAdvanceWorkflow: vi.fn(), onLogActivity: vi.fn(), onFlash: vi.fn(), onGoBack: vi.fn(), onGoToQuotations: vi.fn() }
  render(<RoleContext.Provider value={role}><RateCheck inquiry={inquiry} customers={[]} variant={variant} {...props} /></RoleContext.Provider>)
  return { ...props, user: userEvent.setup() }
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  for (const fn of Object.values(api)) fn.mockReset()
  api.apiFetchAllRates.mockResolvedValue([])
  api.apiGetAuthEmployees.mockResolvedValue([])
  api.apiGetEnrichedScheduleRates.mockResolvedValue(AGGREGATE)
  api.apiGetPorts.mockResolvedValue([])
  api.apiGetLiners.mockResolvedValue([])
  api.apiGetTradeLanes.mockResolvedValue([])
  api.apiGetEmployeesDb.mockResolvedValue([])
  api.apiGetIncomingRateRequests.mockResolvedValue([
    { request_id: 951, inq_id: 4, emp_id_requested: 6, emp_id_requester: 6, is_given: false, remark: null, schedules: [9101, 9102], created_at: '2026-11-27T08:00:00', schedule_details: [] },
  ])
  api.apiGetAggregateScheduleRates.mockResolvedValue(AGGREGATE)
  api.apiCreateRateRequest.mockResolvedValue({ request_id: 77 })
  api.apiAddRateRequestOption.mockResolvedValue({})
  api.apiPatchRateRequestProc.mockResolvedValue({})
  api.apiCreateVesselRate.mockResolvedValue({ srid: 7001 })
  api.apiCreateFakRate.mockResolvedValue({ fak_id: 7002 })
  api.apiCreateSpecialRate.mockResolvedValue({ sprid: 7003 })
})

/** A promise the test settles by hand, to hold a request in flight. */
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

const clickBox = async (user: ReturnType<typeof userEvent.setup>, name: string) => user.click(await screen.findByRole('checkbox', { name }))

// ---- SelectablePivotRateTable ----

describe('SelectablePivotRateTable', () => {
  it('shows the empty message, or the default one, when there are no rows', () => {
    const empty = { rows: [], rateTypes: [], containerTypes: [] }
    const { unmount } = render(<SelectablePivotRateTable pivot={empty} selectedIds={new Set()} selectedScheduleIds={new Set()} onToggleGroup={vi.fn()} onToggleRow={vi.fn()} onToggleSchedule={vi.fn()} emptyMessage="Nothing for this lane." />)
    expect(screen.getByText('Nothing for this lane.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    unmount()
    render(<SelectablePivotRateTable pivot={empty} selectedIds={new Set()} selectedScheduleIds={new Set()} onToggleGroup={vi.fn()} onToggleRow={vi.fn()} onToggleSchedule={vi.fn()} />)
    expect(screen.getByText('No schedule rates available.')).toBeInTheDocument()
  })

  it('marks a group checked, partial (indeterminate) or clear from the selected keys', () => {
    renderTable({ selectedIds: new Set(['9101:tariff_rates:501', '9102:tariff_rates:511']) })
    const maersk = screen.getByRole('checkbox', { name: 'Select Tariff rates for Maersk Vessel A / 610W' })
    const msc = screen.getByRole('checkbox', { name: 'Select Tariff rates for MSC Vessel B / 610W' })
    expect(maersk).toBePartiallyChecked()
    expect(maersk).not.toBeChecked()
    expect(msc).toBeChecked()
    expect(msc).not.toBePartiallyChecked()
  })

  it('passes the row and rate type to onToggleGroup, and the schedule id to onToggleSchedule, from click or Space', async () => {
    const { onToggleGroup, onToggleSchedule, user } = renderTable()
    await user.click(screen.getByRole('checkbox', { name: 'Select Tariff rates for MSC Vessel B / 610W' }))
    expect(onToggleGroup).toHaveBeenCalledTimes(1)
    expect(onToggleGroup.mock.calls[0][0].scheduleId).toBe(9102)
    expect(onToggleGroup.mock.calls[0][1]).toBe('Tariff')

    screen.getByRole('checkbox', { name: 'Select schedule Maersk Vessel A / 610W' }).focus()
    await user.keyboard(' ')
    expect(onToggleSchedule).toHaveBeenCalledWith(9101)
  })

  it('only shows the attach column when onAttachManualRate is given, and calls it with the row', async () => {
    const { unmount } = renderTable()
    expect(screen.queryByRole('button', { name: 'Attach manual rate to this schedule' })).not.toBeInTheDocument()
    unmount()

    const onAttachManualRate = vi.fn()
    const { user } = renderTable({ onAttachManualRate })
    const buttons = screen.getAllByRole('button', { name: 'Attach manual rate to this schedule' })
    expect(buttons).toHaveLength(2)
    buttons[1].focus()
    await user.keyboard('{Enter}')
    expect(onAttachManualRate).toHaveBeenCalledTimes(1)
    expect(onAttachManualRate.mock.calls[0][0].scheduleId).toBe(9102)
  })

  it('filters rows by carrier and clears the filter', async () => {
    const { user } = renderTable()
    expect(screen.getByText('2 schedules')).toBeInTheDocument()
    const carrier = screen.getByRole('button', { name: 'Carrier' })
    expect(carrier).toHaveAttribute('aria-expanded', 'false')
    await user.click(carrier)
    expect(carrier).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('checkbox', { name: /^MSC/ }))
    expect(screen.getByText('1 of 2 (filtered)')).toBeInTheDocument()
    const body = screen.getAllByRole('rowgroup')[1]
    expect(within(body).getByText('MSC')).toBeInTheDocument()
    expect(within(body).queryByText('Maersk')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText('2 schedules')).toBeInTheDocument()
  })

  it('works with the real group toggle semantics when the parent keeps a Set', async () => {
    function Parent() {
      const [sel, setSel] = useState(new Set(['9101:tariff_rates:501']))
      return (
        <SelectablePivotRateTable pivot={PIVOT} selectedIds={sel} selectedScheduleIds={new Set()} onToggleRow={vi.fn()} onToggleSchedule={vi.fn()}
          onToggleGroup={(row, rt) => setSel(prev => {
            const keys = Object.values(row.rates[rt]).flat().map(c => `${row.scheduleId}:${c.rateTypeKey}:${c.rateId}`)
            const next = new Set(prev)
            const all = keys.every(k => next.has(k))
            for (const k of keys) { if (all) next.delete(k); else next.add(k) }
            return next
          })} />
      )
    }
    render(<Parent />)
    const user = userEvent.setup()
    const maersk = screen.getByRole('checkbox', { name: 'Select Tariff rates for Maersk Vessel A / 610W' })
    expect(maersk).toBePartiallyChecked()
    await user.click(maersk)
    expect(maersk).toBeChecked()
    await user.click(maersk)
    expect(maersk).not.toBeChecked()
    expect(maersk).not.toBePartiallyChecked()
  })
})

// ---- RateCheck with the table ----

describe('RateCheck rate selection', () => {
  it('a group toggle selects every rate key in the group and auto-selects its schedule; toggling again clears the keys only', async () => {
    const { user } = renderRateCheck('cs-sales')
    const group = await screen.findByRole('checkbox', { name: 'Select Tariff rates for Maersk TEST-AUDIT-FIX Vessel A / 610W' })
    const sched = screen.getByRole('checkbox', { name: 'Select schedule Maersk TEST-AUDIT-FIX Vessel A / 610W' })
    expect(sched).not.toBeChecked()

    await user.click(group)
    expect(group).toBeChecked()
    expect(sched).toBeChecked()
    expect(screen.getByText('2 selected')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Select FAK rates for Maersk TEST-AUDIT-FIX Vessel A / 610W' }))
    expect(screen.getByText('3 selected')).toBeInTheDocument()

    await user.click(group)
    expect(group).not.toBeChecked()
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(sched).toBeChecked()
  })

  it('the selected keys feed the rate request and its options on submit', async () => {
    const { user } = renderRateCheck('cs-sales')
    await user.click(await screen.findByRole('checkbox', { name: 'Select Tariff rates for MSC TEST-AUDIT-FIX Vessel B / 610W' }))
    await user.click(screen.getByRole('button', { name: /Review & Send/ }))
    const brief = screen.getByText('RATE BRIEF').parentElement!
    expect(brief).toHaveTextContent('Schedule Rates (1)')
    expect(brief).toHaveTextContent('MSC (Tariff)')
    expect(brief).toHaveTextContent('$1,500 USD / 20GP')

    await user.click(screen.getByRole('button', { name: /Go to Quotation \(1 rate\)/ }))
    await waitFor(() => expect(api.apiAddRateRequestOption).toHaveBeenCalledTimes(1))
    expect(api.apiCreateRateRequest).toHaveBeenCalledTimes(1)
    expect(api.apiCreateRateRequest.mock.calls[0][0].selected_schedules.map((s: { vessel_name: string }) => s.vessel_name)).toEqual(['TEST-AUDIT-FIX Vessel B'])
    expect(api.apiAddRateRequestOption).toHaveBeenCalledWith(77, { request_id: 77, rate_type: 'tariff_rates', rate_id: 511, schedule_id: 9102 })
  })

  it('attaching a manual rate to a schedule opens the linked manual entry form', async () => {
    const { user } = renderRateCheck('procurement')
    const attach = await screen.findAllByRole('button', { name: 'Attach manual rate to this schedule' })
    await user.click(attach[0])
    expect(screen.getByText('Attach Rate to Schedule')).toBeInTheDocument()
    expect(screen.getByDisplayValue('TEST-AUDIT-FIX Vessel A')).toBeInTheDocument()
  })
})

// ---- Submit and escalate (main view and review) ----

describe('RateCheck submit and escalation', () => {
  it('a double click on Go to Quotation sends one rate request, with a busy button while it runs', async () => {
    const pending = deferred<{ request_id: number }>()
    api.apiCreateRateRequest.mockReturnValue(pending.promise)
    const { user, onAdvanceWorkflow, onGoToQuotations } = renderRateCheck('cs-sales')
    await user.click(await screen.findByRole('checkbox', { name: 'Select Tariff rates for MSC TEST-AUDIT-FIX Vessel B / 610W' }))
    await user.click(screen.getByRole('button', { name: /Review & Send/ }))
    const go = screen.getByRole('button', { name: /Go to Quotation \(1 rate\)/ })
    await user.dblClick(go)
    expect(api.apiCreateRateRequest).toHaveBeenCalledTimes(1)
    expect(go).toBeDisabled()
    expect(go).toHaveAttribute('aria-busy', 'true')

    pending.resolve({ request_id: 77 })
    await waitFor(() => expect(onGoToQuotations).toHaveBeenCalledTimes(1))
    expect(api.apiCreateRateRequest).toHaveBeenCalledTimes(1)
    expect(api.apiAddRateRequestOption).toHaveBeenCalledTimes(1)
    expect(onAdvanceWorkflow).toHaveBeenCalledWith('INQ-4', 'quotation-prep')
    expect(go).not.toBeDisabled()
  })

  it('Request Rates escalates the selected schedules once, with the note, and goes back', async () => {
    const pending = deferred<{ request_id: number }>()
    api.apiCreateRateRequest.mockReturnValue(pending.promise)
    const { user, onAdvanceWorkflow, onGoBack, onFlash } = renderRateCheck('cs-sales')
    await clickBox(user, 'Select schedule MSC TEST-AUDIT-FIX Vessel B / 610W')
    await user.type(screen.getByRole('textbox', { name: 'Notes (optional)' }), 'Need spot')
    const escalate = screen.getByRole('button', { name: 'Request Rates (1 schedule)' })
    await user.dblClick(escalate)
    expect(escalate).toHaveAttribute('aria-busy', 'true')
    pending.resolve({ request_id: 78 })
    await waitFor(() => expect(onGoBack).toHaveBeenCalledTimes(1))

    expect(api.apiCreateRateRequest).toHaveBeenCalledTimes(1)
    const body = api.apiCreateRateRequest.mock.calls[0][0]
    expect(body).toMatchObject({ inq_id: 4, is_given: false })
    expect(body.remark).toBe('Escalated to Procurement with 1 selected schedule(s) for rate sourcing. 4: LKCMB → DEHAM. Customer: TEST-AUDIT-FIX Client (delete me). Need spot')
    expect(body.selected_schedules.map((s: { vessel_name: string }) => s.vessel_name)).toEqual(['TEST-AUDIT-FIX Vessel B'])
    expect(onAdvanceWorkflow).toHaveBeenCalledWith('INQ-4', 'procurement-request')
    expect(onFlash).toHaveBeenCalledWith('INQ-4 → Escalated to Procurement (1 schedules)')
  })

  it('with no rates found, the review escalates to Procurement from its footer button', async () => {
    api.apiGetEnrichedScheduleRates.mockResolvedValue({})
    const pending = deferred<{ request_id: number }>()
    api.apiCreateRateRequest.mockReturnValue(pending.promise)
    const { user, onAdvanceWorkflow, onGoBack } = renderRateCheck('cs-sales')
    expect(await screen.findByText('No rates found')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Review & Send/ }))
    expect(screen.getByText(/will be escalated to the Procurement team to source rates for LKCMB → DEHAM/)).toBeInTheDocument()
    await user.dblClick(screen.getByRole('button', { name: 'Escalate to Procurement' }))
    pending.resolve({ request_id: 79 })
    await waitFor(() => expect(onGoBack).toHaveBeenCalledTimes(1))
    expect(api.apiCreateRateRequest).toHaveBeenCalledTimes(1)
    expect(api.apiCreateRateRequest.mock.calls[0][0]).toMatchObject({ is_given: false, remark: 'No suitable rates found. Escalating to Procurement for rate sourcing. 4: LKCMB → DEHAM.' })
    expect(onAdvanceWorkflow).toHaveBeenCalledWith('INQ-4', 'procurement-request')
  })

  it('a failed escalation keeps the page and re-enables the button', async () => {
    api.apiCreateRateRequest.mockRejectedValue(new Error('Network down'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { user, onGoBack, onFlash } = renderRateCheck('cs-sales')
    await screen.findByRole('checkbox', { name: 'Select schedule MSC TEST-AUDIT-FIX Vessel B / 610W' })
    await user.click(screen.getByRole('button', { name: 'Escalate to Procurement' }))
    await waitFor(() => expect(onFlash).toHaveBeenCalledWith('Could not escalate to Procurement: Network down'))
    expect(onGoBack).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Escalate to Procurement' })).not.toBeDisabled()
    consoleError.mockRestore()
  })

  it('a double click on Push to Sales patches the incoming request once and links the selected rates', async () => {
    const pending = deferred<object>()
    api.apiPatchRateRequestProc.mockReturnValue(pending.promise)
    const { user, onGoToQuotations } = renderRateCheck('procurement')
    await clickBox(user, 'Select Tariff rates for MSC TEST-AUDIT-FIX Vessel B / 610W')
    await user.click(screen.getByRole('button', { name: /Review & Send/ }))
    await user.dblClick(screen.getByRole('button', { name: 'Push to Sales (1 rate)' }))
    expect(api.apiPatchRateRequestProc).toHaveBeenCalledTimes(1)
    pending.resolve({})
    await waitFor(() => expect(onGoToQuotations).toHaveBeenCalledTimes(1))
    expect(api.apiPatchRateRequestProc.mock.calls[0][0]).toBe(951)
    expect(api.apiAddRateRequestOption).toHaveBeenCalledExactlyOnceWith(951, { request_id: 951, rate_type: 'tariff_rates', rate_id: 511, schedule_id: 9102 })
  })
})

