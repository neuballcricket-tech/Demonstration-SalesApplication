import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from 'react-aria-components'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RoleContext, type RoleContextValue } from '../../RoleContext'
import type { UnifiedRate } from '../../types'
import RateList from './RateList'

const api = vi.hoisted(() => ({ apiFetchAllRates: vi.fn(), apiUpdateRate: vi.fn(), apiGetLiners: vi.fn(), apiGetTradeLanes: vi.fn() }))
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../api')>()), ...api }))

type User = ReturnType<typeof userEvent.setup>

const rate = (over: Partial<UnifiedRate>): UnifiedRate => ({
  id: 'fak:1', source_type: 'FAK', liner_name: 'MSC', trade_lane: 'Asia - North Europe', origin: 'LKCMB', destination: 'SGSIN',
  container_type: '40GP', rate: 825, currency: 'USD', valid_from: '2026-01-01', valid_to: '2026-12-31', is_sold: null,
  service_scope: null, remark: null, vessel_name: null, departure_date: null, client_name: null, employee_name: null,
  commodity_name: null, commodity_type: null,
  ...over,
} as UnifiedRate)

const RATES: UnifiedRate[] = [
  rate({ id: 'nac:902', source_type: 'NAC', liner_name: 'MSC', origin: 'CNSHA', destination: 'USLAX', container_type: '20GP', rate: 1800, valid_from: '2026-11-01', valid_to: '2027-01-31', service_scope: 'Import', client_name: 'Acme' }),
  rate({ id: 'vessel:901', source_type: 'Spot', liner_name: null, trade_lane: null, origin: 'LKCMB', destination: 'DEHAM', container_type: '40HC', rate: 2450, valid_from: '2026-12-01', valid_to: '2026-12-08', is_sold: false, service_scope: 'Export', vessel_name: 'TEST VESSEL', departure_date: '2026-12-10', remark: 'Existing vessel note' }),
  rate({ id: 'fak:4', liner_name: 'Hapag-Lloyd', rate: 875, trade_lane: 'Asia - Mediterranean' }),
]

const roleFor = (activeRole: string) => ({
  activeEmployee: { id: 9, name: 'IT-AD', role: activeRole },
  activeRole,
  hasPermission: () => true,
  canAccessPage: () => true,
} as unknown as RoleContextValue)

function renderList(activeRole = 'Admin') {
  const onFlash = vi.fn()
  render(
    <I18nProvider locale="en-GB">
      <RoleContext.Provider value={roleFor(activeRole)}><RateList onFlash={onFlash} /></RoleContext.Provider>
    </I18nProvider>,
  )
  return { onFlash, user: userEvent.setup({ delay: null }) }
}

const ids = () => screen.getAllByRole('row').slice(1).map(r => within(r).getAllByRole('cell')[0].textContent)
const pick = async (user: User, trigger: RegExp, option: string) => {
  await user.click(screen.getByRole('button', { name: trigger }))
  await user.click(screen.getByRole('option', { name: option }))
}
const typeDate = async (user: User, group: string, ddmmyyyy: string) => {
  const g = within(screen.getByRole('group', { name: group }))
  await user.click(g.getAllByRole('spinbutton')[0])
  await user.keyboard('{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}')
  await user.click(g.getAllByRole('spinbutton')[0])
  await user.keyboard(ddmmyyyy)
}

beforeEach(() => {
  // jsdom has no scrollIntoView (the note shortcut scrolls the note into view)
  Element.prototype.scrollIntoView = vi.fn()
  for (const fn of Object.values(api)) fn.mockReset()
  api.apiFetchAllRates.mockResolvedValue(RATES)
  api.apiUpdateRate.mockResolvedValue({ success: true })
  // The backend repeats liner names; each value must be listed once
  api.apiGetLiners.mockResolvedValue([
    { lin_id: 2, name: 'MSC', scac: 'MSCU', is_on_inttra: true, has_portal: false },
    { lin_id: 7, name: 'MSC', scac: 'MSCU', is_on_inttra: true, has_portal: false },
    { lin_id: 4, name: 'Hapag-Lloyd', scac: null, is_on_inttra: true, has_portal: false },
  ])
  api.apiGetTradeLanes.mockResolvedValue([{ trln_id: 1, trln_name: 'Asia - North Europe' }, { trln_id: 2, trln_name: 'Asia - Mediterranean' }])
})

describe('RateList filters', () => {
  it('filters with the shared Selects and Inputs, swaps the columns per rate type, and "All" can be picked again', async () => {
    const { user } = renderList()
    expect(await screen.findByText('Showing 3 of 3')).toBeInTheDocument()

    await pick(user, /By Rate Type$/, 'Spot')
    expect(ids()).toEqual(['901'])
    expect(screen.getByRole('columnheader', { name: 'Vessel' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Spot Rates' })).toBeInTheDocument()
    await pick(user, /By Rate Type$/, 'All Types')
    expect(screen.queryByRole('columnheader', { name: 'Vessel' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /By Liner$/ }))
    expect(screen.getAllByRole('option', { name: /^MSC/ })).toHaveLength(1)
    await user.click(screen.getByRole('option', { name: 'MSC – MSCU' }))
    expect(ids()).toEqual(['902'])
    await pick(user, /By Liner$/, 'All')

    await pick(user, /By Trade Lane$/, 'Asia - Mediterranean')
    expect(ids()).toEqual(['4'])
    await pick(user, /By Trade Lane$/, 'All')

    await user.type(screen.getByRole('textbox', { name: 'Destination' }), 'deh')
    expect(ids()).toEqual(['901'])
    await user.clear(screen.getByRole('textbox', { name: 'Destination' }))
    await user.type(screen.getByRole('textbox', { name: 'Container Type' }), 'zz')
    expect(screen.getByText('No rates match these filters.')).toBeInTheDocument()
  }, 15000)

  it('limits CS and Sales to FAK, Tariff and Spot rates with no edit action', async () => {
    const { user } = renderList('CS')
    expect(await screen.findByText('Showing 2 of 3')).toBeInTheDocument()
    expect(ids()).toEqual(['901', '4'])
    expect(screen.queryByRole('button', { name: 'Edit Rate' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /By Rate Type$/ }))
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['All Types', 'FAK', 'Tariff Rate', 'Spot'])
  })
})

describe('RateList dialogs', () => {
  it('opens the details from the keyboard and returns focus on Escape', async () => {
    const { user } = renderList()
    const row = await screen.findByRole('row', { name: /901/ })
    const view = within(row).getByRole('button', { name: 'View Details' })
    act(() => view.focus())
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: '$2,450' })
    expect(within(dialog).getByText('Existing vessel note', { selector: 'div' })).toBeInTheDocument()
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(view).toHaveFocus())
  })

  it('saves a note once on a double click from the Add Note shortcut', async () => {
    let resolve!: (v: { success: boolean }) => void
    api.apiUpdateRate.mockImplementation(() => new Promise(r => { resolve = r }))
    const { user } = renderList()
    const row = await screen.findByRole('row', { name: /902/ })
    await user.click(within(row).getByRole('button', { name: 'Add Note' }))
    const note = await screen.findByRole('textbox', { name: 'Add Note' })
    await waitFor(() => expect(note).toHaveFocus())
    const save = screen.getByRole('button', { name: 'Save Note' })
    expect(save).toBeDisabled() // unchanged note
    await user.keyboard('Call before booking')
    await user.dblClick(save)
    expect(api.apiUpdateRate).toHaveBeenCalledTimes(1)
    expect(api.apiUpdateRate).toHaveBeenCalledWith('nac:902', { remark: 'Call before booking' })
    expect(save).toHaveAttribute('aria-busy', 'true')
    await act(async () => resolve({ success: true }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.apiFetchAllRates).toHaveBeenCalledTimes(2)
  })

  it('sends the exact Spot payload, saves once on a double click and cannot be dismissed while saving', async () => {
    let resolve!: (v: { success: boolean }) => void
    api.apiUpdateRate.mockImplementation(() => new Promise(r => { resolve = r }))
    const { user } = renderList()
    const row = await screen.findByRole('row', { name: /901/ })
    await user.click(within(row).getByRole('button', { name: 'Edit Rate' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Rate' })
    const d = within(dialog)

    await user.clear(d.getByRole('spinbutton', { name: 'Rate' }))
    await user.type(d.getByRole('spinbutton', { name: 'Rate' }), '2500')
    await user.clear(d.getByRole('textbox', { name: 'Currency' }))
    await user.type(d.getByRole('textbox', { name: 'Currency' }), 'EUR')
    await user.clear(d.getByRole('textbox', { name: 'Container Type' }))
    await user.type(d.getByRole('textbox', { name: 'Container Type' }), '40GP')
    await user.click(d.getByRole('checkbox', { name: 'Sold' }))
    await typeDate(user, 'Departure Date', '12122026')
    await typeDate(user, 'Valid From', '02122026')
    await typeDate(user, 'Valid To', '09122026')
    await user.clear(d.getByRole('textbox', { name: 'Remark' }))
    await user.type(d.getByRole('textbox', { name: 'Remark' }), 'Spot remark')

    const save = d.getByRole('button', { name: 'Save' })
    await user.dblClick(save)
    await user.keyboard('{Enter}')
    expect(api.apiUpdateRate).toHaveBeenCalledTimes(1)
    expect(api.apiUpdateRate).toHaveBeenCalledWith('vessel:901', {
      rate: 2500, currency: 'EUR', valid_from: '2026-12-02', valid_to: '2026-12-09', remark: 'Spot remark',
      container_type: '40GP', is_sold: true, departure_date: '2026-12-12',
    })
    expect(save).toHaveAttribute('aria-busy', 'true')
    expect(save).toHaveFocus()
    expect(d.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(d.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Edit Rate' })).toBeInTheDocument()

    await act(async () => resolve({ success: true }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.apiUpdateRate).toHaveBeenCalledTimes(1)
  }, 15000)

  it('flashes the error and stays open (and dismissable) after a failed save', async () => {
    api.apiUpdateRate.mockRejectedValue(new Error('boom'))
    const { user, onFlash } = renderList()
    const row = await screen.findByRole('row', { name: /902/ })
    await user.click(within(row).getByRole('button', { name: 'Edit Rate' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Rate' })
    await user.clear(within(dialog).getByRole('textbox', { name: 'Origin' }))
    await user.type(within(dialog).getByRole('textbox', { name: 'Origin' }), 'CNNGB')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onFlash).toHaveBeenCalledWith('Failed to update rate'))
    expect(api.apiUpdateRate).toHaveBeenCalledWith('nac:902', {
      rate: 1800, currency: 'USD', valid_from: '2026-11-01', valid_to: '2027-01-31', remark: null, origin: 'CNNGB', destination: 'USLAX',
    })
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument())
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
