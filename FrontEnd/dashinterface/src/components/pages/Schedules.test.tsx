import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from 'react-aria-components'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AggregateScheduleRatesResponse, OceanSchedule } from '../../types'
import { todayISO } from '../ui'
import Schedules from './Schedules'

const api = vi.hoisted(() => ({ apiGetLiners: vi.fn(), apiGetEnrichedScheduleRates: vi.fn(), apiSearchSchedulesBulk: vi.fn() }))
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../api')>()), ...api }))

type User = ReturnType<typeof userEvent.setup>

const rate = (container_type: string, value: number) => ({
  rate_id: value, lin_id: 1, origin: 'LKCMB', destination: 'SGSIN', container_type, rate: value, currency: 'USD',
  valid_from: '2026-11-01', valid_to: '2026-12-31', transit: null, free_time: null, max_weight: null, note: null, special_remark: null,
})

const entry = (id: number, liner: string, dest: string, city: string | null, fak: ReturnType<typeof rate>[] = []) => ({
  schedule: {
    schedule_id: id, liner_name: liner, vessel_name: `${liner} VESSEL ${id}`, voyage_number: `V${id}`,
    origin_unloc: 'LKCMB', origin_city_name: 'Colombo', destination_unloc: dest, destination_city_name: city,
    origin_departure_date: '2026-12-12T10:00:00', destination_arrival_date: '2026-12-30T10:00:00', bk_cutoff: null,
    total_duration: 18, schedule_type: 'direct',
  },
  tariff_rates: [], fak_rates: fak, special_rate: [], vessel_by_vessel_rate: [], nac: [],
})

const ENRICHED = {
  1: entry(1, 'CMA CGM', 'SGSIN', null, [rate('20GP', 825), rate('40GP', 1050)]),
  2: entry(2, 'MSC', 'CNNGB', 'Ningbo'),
  3: entry(3, 'MSC', 'CNNGB', 'Ningbo'),
} as unknown as AggregateScheduleRatesResponse

const SCHEDULES: OceanSchedule[] = [
  { scac: 'MSCU', carrierName: 'MSC', serviceName: 'Himalaya Express', vesselName: 'MSC GULSUN', voyageNumber: 'FA248W', originUnloc: 'LKCMB', originCityName: 'Colombo', destinationUnloc: 'DEHAM', destinationCityName: 'Hamburg', originDepartureDate: '2026-12-14T10:00:00', destinationArrivalDate: '2027-01-05T08:00:00', bkCutoff: '2026-12-10T12:00:00', totalDuration: 22, scheduleType: 'direct' },
  { scac: 'CMDU', carrierName: 'CMA CGM', serviceName: null, vesselName: 'JULES VERNE', voyageNumber: '0FL5', originUnloc: 'LKCMB', originCityName: 'Colombo', destinationUnloc: 'DEHAM', destinationCityName: 'Hamburg', originDepartureDate: '2026-12-12T06:00:00', destinationArrivalDate: '2027-01-08T08:00:00', bkCutoff: null, totalDuration: 27, scheduleType: 'transshipment' },
] as unknown as OceanSchedule[]

function renderPage() {
  const onFlash = vi.fn()
  render(<I18nProvider locale="en-GB"><Schedules onFlash={onFlash} /></I18nProvider>)
  return { onFlash, user: userEvent.setup({ delay: null }) }
}

/** Visible (active tab) elements only: both tabs stay mounted. */
const visible = <T extends HTMLElement>(els: T[]) => els.filter(e => !e.closest('.hidden'))
const port = (name: 'Origin port' | 'Destination port', i = 0) => visible(screen.getAllByRole('combobox', { name }))[i]
const typePort = async (user: User, name: 'Origin port' | 'Destination port', code: string, i = 0) => {
  await user.type(port(name, i), code)
  await user.keyboard('{Escape}')
}
const count = () => screen.getByText(/^\d+ schedules?$|^\d+ of \d+ \(filtered\)$/).textContent

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset()
  api.apiGetLiners.mockResolvedValue([
    { lin_id: 1, name: 'CMA CGM', scac: 'CMDU', is_on_inttra: true, has_portal: false },
    { lin_id: 2, name: 'MSC', scac: 'MSCU', is_on_inttra: true, has_portal: false },
  ])
  api.apiGetEnrichedScheduleRates.mockResolvedValue(ENRICHED)
  api.apiSearchSchedulesBulk.mockResolvedValue(SCHEDULES)
})

describe('Schedule Rates tab', () => {
  it('searches the valid port pairs, shows a busy button, and the chip and liner filters narrow the rows identically', async () => {
    let resolve!: (v: AggregateScheduleRatesResponse) => void
    api.apiGetEnrichedScheduleRates.mockImplementationOnce(() => new Promise(r => { resolve = r }))
    const { user } = renderPage()
    const search = screen.getByRole('button', { name: 'Search Rates' })
    expect(search).toBeDisabled()

    await typePort(user, 'Origin port', 'LKCMB')
    await typePort(user, 'Destination port', 'SGSIN')
    await user.click(visible(screen.getAllByRole('button', { name: 'Add port pair' }))[0])
    await typePort(user, 'Origin port', 'CNSHA', 1)
    await typePort(user, 'Destination port', 'DEHAM', 1)
    // A third, incomplete pair is left out of the query
    await user.click(visible(screen.getAllByRole('button', { name: 'Add port pair' }))[0])
    await typePort(user, 'Origin port', 'LKCMB', 2)
    await user.click(screen.getByRole('button', { name: 'Remove port pair 2' }))
    expect(visible(screen.getAllByRole('combobox', { name: 'Origin port' })).map(i => (i as HTMLInputElement).value)).toEqual(['LKCMB', 'LKCMB'])
    await user.clear(port('Origin port', 1))
    await user.keyboard('{Escape}')
    await typePort(user, 'Origin port', 'CNSHA', 1)
    await typePort(user, 'Destination port', 'DEHAM', 1)

    await user.dblClick(search)
    expect(api.apiGetEnrichedScheduleRates).toHaveBeenCalledTimes(1)
    expect(api.apiGetEnrichedScheduleRates).toHaveBeenCalledWith({ port_pair: 'LKCMB:SGSIN,CNSHA:DEHAM' })
    expect(search).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Searching schedule rates...')
    resolve(ENRICHED)

    expect(await screen.findByText('3 schedules')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'FAK' })).toBeInTheDocument()
    expect(screen.getByText('USD 825')).toBeInTheDocument()

    // Carrier chip (keyboard): Space opens, Space toggles
    const carrier = screen.getByRole('button', { name: 'Carrier' })
    carrier.focus()
    await user.keyboard(' ')
    expect(carrier).toHaveAttribute('aria-expanded', 'true')
    const msc = screen.getByRole('checkbox', { name: /^MSC/ })
    msc.focus()
    await user.keyboard(' ')
    expect(count()).toBe('2 of 3 (filtered)')
    await user.click(screen.getByRole('checkbox', { name: /^CMA CGM/ }))
    expect(count()).toBe('3 schedules')
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    await user.click(screen.getByRole('checkbox', { name: /^CMA CGM/ }))
    expect(count()).toBe('1 of 3 (filtered)')

    // Destination chip: CMA CGM + Ningbo matches nothing
    await user.click(screen.getByRole('button', { name: 'Destination' }))
    await user.click(screen.getByRole('checkbox', { name: /^Ningbo/ }))
    expect(count()).toBe('0 of 3 (filtered)')
    expect(screen.getByText('No schedules match the active filters.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(count()).toBe('3 schedules')

    // Liner tag filter (parent filter)
    const liner = screen.getByRole('combobox', { name: 'Filter by Liner (optional)' })
    await user.type(liner, 'MSC{Enter}')
    expect(count()).toBe('2 schedules')
  }, 20000)

  it('shows the empty message when a liner filter matches nothing, and flashes a failed search', async () => {
    const { user, onFlash } = renderPage()
    await typePort(user, 'Origin port', 'LKCMB')
    await typePort(user, 'Destination port', 'SGSIN')
    await user.type(screen.getByRole('combobox', { name: 'Filter by Liner (optional)' }), 'Maersk{Enter}')
    await user.click(screen.getByRole('button', { name: 'Search Rates' }))
    expect(await screen.findByText('No schedule rates found for the selected port pairs and liner filter.')).toBeInTheDocument()

    api.apiGetEnrichedScheduleRates.mockRejectedValueOnce(new Error('down'))
    await user.click(screen.getByRole('button', { name: 'Search Rates' }))
    await waitFor(() => expect(onFlash).toHaveBeenCalledWith('Failed to load schedule rates'))
  }, 15000)
})

describe('Search Schedules tab', () => {
  it('sends the same bulk payload from the DatePicker, NumberInput and Checkbox, and a double click searches once', async () => {
    let resolve!: (v: OceanSchedule[]) => void
    api.apiSearchSchedulesBulk.mockImplementationOnce(() => new Promise(r => { resolve = r }))
    const { user } = renderPage()
    const tab = screen.getAllByRole('button', { name: 'Search Schedules' })[0]
    tab.focus()
    await user.keyboard('{Enter}')
    expect(tab).toHaveAttribute('aria-pressed', 'true')

    const date = screen.getByRole('group', { name: /Departure Date/ })
    const [d, m, y] = todayISO().split('-').reverse()
    expect(date).toHaveTextContent(`${d}/${m}/${y}`)

    await typePort(user, 'Origin port', 'LKCMB')
    await typePort(user, 'Destination port', 'DEHAM')
    const carriers = screen.getByRole('combobox', { name: /Carriers/ })
    await user.type(carriers, 'MSC')
    await user.click(await screen.findByRole('option', { name: 'MSC – MSCU' }))
    await user.type(carriers, 'CMDU{Enter}')

    await user.click(within(date).getAllByRole('spinbutton')[0])
    await user.keyboard('10122026')
    const weeks = screen.getByRole('spinbutton', { name: 'Weeks Out' })
    await user.clear(weeks)
    await user.type(weeks, '6')
    await user.click(screen.getByRole('checkbox', { name: 'Direct only' }))

    const search = visible(screen.getAllByRole('button', { name: 'Search Schedules' })).at(-1)!
    await user.dblClick(search)
    expect(api.apiSearchSchedulesBulk).toHaveBeenCalledTimes(1)
    expect(api.apiSearchSchedulesBulk).toHaveBeenCalledWith({
      scacs: 'MSCU,CMDU',
      portPairs: [{ originPort: 'LKCMB', destinationPort: 'DEHAM' }],
      searchDate: '2026-12-10',
      weeksOut: 6,
      directOnly: true,
    })
    expect(search).toHaveAttribute('aria-busy', 'true')
    resolve(SCHEDULES)
    expect(await screen.findByText('2 schedules found')).toBeInTheDocument()

    // Empty weeks falls back to 4; Direct only off is left undefined
    await user.clear(weeks)
    await user.click(screen.getByRole('checkbox', { name: 'Direct only' }))
    await user.click(search)
    expect(api.apiSearchSchedulesBulk).toHaveBeenLastCalledWith(expect.objectContaining({ weeksOut: 4, directOnly: undefined }))
  }, 20000)

  it('toggles a special-rate checkbox and opens the Special Rate Input dialog from the keyboard', async () => {
    const { user, onFlash } = renderPage()
    await user.click(screen.getAllByRole('button', { name: 'Search Schedules' })[0])
    await typePort(user, 'Origin port', 'LKCMB')
    await typePort(user, 'Destination port', 'DEHAM')
    await user.type(screen.getByRole('combobox', { name: /Carriers/ }), 'CMDU{Enter}{Escape}')
    await user.click(visible(screen.getAllByRole('button', { name: 'Search Schedules' })).at(-1)!)

    // Sorted by departure: CMA CGM (12 Dec) first
    const cma = await screen.findByRole('checkbox', { name: 'Special rate for CMA CGM JULES VERNE / 0FL5' })
    cma.focus()
    await user.keyboard(' ')
    expect(cma).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Special rate for MSC MSC GULSUN / FA248W' })).not.toBeChecked()

    const input = screen.getAllByRole('button', { name: 'Input Rate' })[0]
    input.focus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: 'Special Rate Input' })
    expect(dialog).toHaveTextContent('CMA CGM - JULES VERNE / 0FL5')
    expect(dialog).toHaveTextContent('Colombo → Hamburg · ETD 12 Dec')
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(input).toHaveFocus())

    api.apiSearchSchedulesBulk.mockRejectedValueOnce(new Error('down'))
    await user.click(visible(screen.getAllByRole('button', { name: 'Search Schedules' })).at(-1)!)
    await waitFor(() => expect(onFlash).toHaveBeenCalledWith('Failed to search schedules'))
    expect(await screen.findByText('No schedules found for the selected port pairs and carriers.')).toBeInTheDocument()
  }, 15000)
})
