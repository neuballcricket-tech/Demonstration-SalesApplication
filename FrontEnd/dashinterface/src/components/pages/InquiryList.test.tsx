import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from 'react-aria-components'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RoleContext, type RoleContextValue } from '../../RoleContext'
import type { Inquiry } from '../../types'
import InquiryList from './InquiryList'

const api = vi.hoisted(() => ({ apiGetLiners: vi.fn() }))
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../api')>()), ...api }))

type User = ReturnType<typeof userEvent.setup>

const container = (over: Record<string, unknown> = {}) => ({
  com_id: 41, cont_id: 51, containerType: '20GP', quantity: 5, weight: '', commodityType: 'General', commodityName: '',
  destination: 'DEHAM', isFcl: true, zipCode: '', doorAgents: [], freeTime: '', ...over,
})

const INQUIRIES = [
  {
    id: '4', inq_id: 4, customer_name: 'Hamburg Imports GmbH', origin: 'LKCMB', destination: 'DEHAM', delivery_type: 'port-to-port',
    sbu: 'FCL', employee_id: 5, status: 'pending', created_at: '2026-11-20', priority: 'High', containers: [container()],
  },
  {
    id: '5', inq_id: 5, customer_name: 'Singapore Logistics Pte', origin: 'SGSIN', destination: 'CNSHA', delivery_type: 'port-to-port',
    sbu: 'Ocean Exports', employee_id: 7, status: 'completed', created_at: '2026-11-27', priority: 'Low',
    containers: [container({ com_id: 42, cont_id: 52, destination: 'CNSHA' })],
  },
  {
    id: 'LOCAL-1', customer_name: 'Acme Exports Ltd', origin: 'CNSHA', destination: 'USLAX', delivery_type: 'door-to-door',
    sbu: 'Ocean Imports', employee_id: 5, status: 'pending', created_at: '2026-11-21',
  },
] as unknown as Inquiry[]

const role = {
  activeEmployee: { id: 9, name: 'IT-AD', role: 'Admin' },
  activeRole: 'Admin',
  hasPermission: () => true,
  canAccessPage: () => true,
} as unknown as RoleContextValue

type Props = ComponentProps<typeof InquiryList>

function renderList(over: Partial<Props> = {}) {
  const props: Props = {
    inquiries: INQUIRIES, followups: [], customers: [], quotes: [],
    onCompleteById: vi.fn(), onAdvanceWorkflow: vi.fn(), onUpdateCustomer: vi.fn(), onAddFollowup: vi.fn(),
    onFlash: vi.fn(), onPatchInquiry: vi.fn().mockResolvedValue(undefined), onDeleteInquiry: vi.fn(),
    ...over,
  }
  render(
    <I18nProvider locale="en-GB">
      <RoleContext.Provider value={role}><InquiryList {...props} /></RoleContext.Provider>
    </I18nProvider>,
  )
  return { ...props, user: userEvent.setup({ delay: null }) }
}

const rowNames = () => screen.getAllByRole('row').slice(1).map(r => within(r).queryAllByRole('cell')[1]?.textContent ?? r.textContent)
const pick = async (user: User, trigger: RegExp, option: string) => {
  await user.click(screen.getByRole('button', { name: trigger }))
  await user.click(screen.getByRole('option', { name: option }))
}
const openEdit = async (user: User, customer: string) => {
  const row = screen.getByRole('row', { name: new RegExp(customer) })
  await user.click(within(row).getByRole('button', { name: 'Edit Inquiry' }))
  return screen.getByRole('dialog', { name: 'Edit Inquiry' })
}

beforeEach(() => {
  // jsdom has no scrollIntoView (the follow-up shortcut scrolls the note into view)
  Element.prototype.scrollIntoView = vi.fn()
  api.apiGetLiners.mockReset()
  api.apiGetLiners.mockResolvedValue([
    { lin_id: 3, name: 'Maersk', scac: 'MAEU', is_on_inttra: true, has_portal: false },
    { lin_id: 5, name: 'MSC', scac: 'MSCU', is_on_inttra: true, has_portal: false },
    { lin_id: 6, name: 'MSC', scac: 'MSCU', is_on_inttra: true, has_portal: false },
  ])
})

describe('InquiryList filters', () => {
  it('filters rows with the shared Select, Input and DatePicker controls, and "All" can be picked again', async () => {
    const { user } = renderList()
    expect(screen.getByText('Showing 3 of 3')).toBeInTheDocument()

    await pick(user, /By Status$/, 'Completed')
    expect(rowNames()).toEqual(['Singapore Logistics Pte'])
    await pick(user, /By Status$/, 'All')
    expect(screen.getByText('Showing 3 of 3')).toBeInTheDocument()

    await pick(user, /By Priority$/, 'High')
    expect(rowNames()).toEqual(['Hamburg Imports GmbH'])
    await pick(user, /By Priority$/, 'All')

    await pick(user, /By SBU$/, 'Ocean Imports')
    expect(rowNames()).toEqual(['Acme Exports Ltd'])
    await pick(user, /By SBU$/, 'All')

    await pick(user, /By Salesperson$/, 'cs-test')
    expect(rowNames()).toEqual(['Singapore Logistics Pte'])
    await pick(user, /By Salesperson$/, 'All')

    await user.type(screen.getByRole('textbox', { name: 'By Customer' }), 'acme')
    expect(rowNames()).toEqual(['Acme Exports Ltd'])
    await user.clear(screen.getByRole('textbox', { name: 'By Customer' }))

    await user.click(within(screen.getByRole('group', { name: 'By Date' })).getAllByRole('spinbutton')[0])
    await user.keyboard('21112026')
    expect(rowNames()).toEqual(['Acme Exports Ltd'])
  }, 15000)

  it('shows the empty state when nothing matches', async () => {
    const { user } = renderList()
    await user.type(screen.getByRole('textbox', { name: 'By Customer' }), 'zzz')
    expect(screen.getByText('No inquiries match these filters.')).toBeInTheDocument()
    expect(screen.getByText('Showing 0 of 3')).toBeInTheDocument()
  })
})

describe('InquiryList row actions', () => {
  it('opens the details dialog from the keyboard and returns focus to the row action on Escape', async () => {
    const { user } = renderList()
    const row = screen.getByRole('row', { name: /Hamburg Imports/ })
    const view = within(row).getByRole('button', { name: 'View' })
    act(() => view.focus())
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: 'Hamburg Imports GmbH' })
    expect(within(dialog).getByText('Port to Port')).toBeInTheDocument()
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(view).toHaveFocus())

    // Space on the delete action asks for confirmation; Cancel backs out without deleting
    act(() => within(row).getByRole('button', { name: 'Delete Inquiry' }).focus())
    await user.keyboard(' ')
    expect(within(row).getByText('Delete?')).toBeInTheDocument()
    await user.click(within(row).getByRole('button', { name: 'Cancel' }))
    expect(within(row).queryByText('Delete?')).not.toBeInTheDocument()
  })

  it('disables edit and delete for an inquiry that is not saved to the backend, and Mark Complete for completed ones', () => {
    renderList()
    const local = screen.getByRole('row', { name: /Acme Exports/ })
    expect(within(local).getByRole('button', { name: 'Edit Inquiry (not saved to backend)' })).toBeDisabled()
    expect(within(local).getByRole('button', { name: 'Not saved to backend' })).toBeDisabled()
    const done = screen.getByRole('row', { name: /Singapore Logistics/ })
    expect(within(done).getByRole('button', { name: 'Mark Complete' })).toBeDisabled()
  })

  it('adds a follow-up and keeps focus inside the dialog after the button disables', async () => {
    const { user, onAddFollowup } = renderList()
    const row = screen.getByRole('row', { name: /Hamburg Imports/ })
    await user.click(within(row).getByRole('button', { name: 'Add Follow-up' }))
    const note = await screen.findByRole('textbox', { name: 'Add Follow-up' })
    await waitFor(() => expect(note).toHaveFocus())
    await user.keyboard('Called the client')
    await user.click(screen.getByRole('button', { name: 'Add Note' }))
    expect(onAddFollowup).toHaveBeenCalledWith('Hamburg Imports GmbH', 'Called the client', false, 9)
    expect(note).toHaveValue('')
    expect(note).toHaveFocus()

    await user.keyboard('Done')
    await user.click(screen.getByRole('button', { name: 'Complete & Close' }))
    expect(onAddFollowup).toHaveBeenLastCalledWith('Hamburg Imports GmbH', 'Done', true, 9)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByRole('textbox', { name: 'Add Follow-up' })).not.toBeInTheDocument()
    expect(dialog).toHaveFocus()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('InquiryList edit dialog', () => {
  it('sends the exact patch payload built from the shared controls', async () => {
    const { user, onPatchInquiry } = renderList()
    const dialog = await openEdit(user, 'Hamburg Imports')
    const d = within(dialog)
    await waitFor(() => expect(api.apiGetLiners).toHaveBeenCalled())

    // Values not in the option list (SBU "FCL", commodity "General") show as-is instead of a wrong first option
    expect(d.getByRole('button', { name: / SBU$/ })).toHaveTextContent('FCL')
    expect(d.getByRole('button', { name: / Commodity Type$/ })).toHaveTextContent('General')

    await user.type(d.getByRole('textbox', { name: 'Incoterm' }), 'FOB')
    await pick(user, / SBU$/, 'Ocean Exports')
    await pick(user, / Priority$/, 'Urgent')
    await pick(user, / Delivery Type$/, 'Door to Door')
    await user.click(within(d.getByRole('group', { name: 'Cargo Ready Date' })).getAllByRole('spinbutton')[0])
    await user.keyboard('15122026')
    await user.type(d.getByRole('spinbutton', { name: 'Preferred Rate (USD)' }), '1250.5')
    await user.type(d.getByRole('combobox', { name: 'Preferred Liners' }), 'MS')
    const options = await screen.findAllByRole('option')
    expect(options).toHaveLength(1) // the duplicate MSC record is listed once
    await user.click(options[0])
    expect(d.getByRole('combobox', { name: 'Preferred Liners' })).toHaveValue('MSC')
    await pick(user, / Commodity Type$/, 'Textiles and textile articles')
    await user.type(d.getByRole('textbox', { name: 'HS Code' }), '6205.20')
    await user.type(d.getByRole('spinbutton', { name: 'Weight (kg)' }), '12000')
    await pick(user, / Container Type$/, '40 HC')
    await user.clear(d.getByRole('spinbutton', { name: 'Quantity' }))
    await user.type(d.getByRole('spinbutton', { name: 'Quantity' }), '3')
    await pick(user, / Load Type$/, 'LCL')
    await user.type(d.getByRole('spinbutton', { name: 'Free Time (days)' }), '14')
    await user.type(d.getByRole('spinbutton', { name: /Temperature/ }), '-18')

    await user.click(d.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(onPatchInquiry).toHaveBeenCalledTimes(1))
    expect(onPatchInquiry).toHaveBeenCalledWith(
      4,
      {
        origin: 'LKCMB', sbu: 'Ocean Exports', priority: 'URGENT', service_mode: 'DOOR_TO_DOOR', incoterm: 'FOB',
        cargo_ready_date: '2026-12-15', preferred_rate: 1250.5, preferred_liners: 'MSC',
      },
      [{ com_id: 41, data: { com_type: 'Textiles and textile articles', hs_code: '6205.20', weight: 12000 } }],
      [{ cont_id: 51, data: { container_type: '40HC', qty: 3, destination: 'DEHAM', zip_code: undefined, address: undefined, is_fully_loaded: false, free_time: '14', temperature: -18 } }],
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  }, 15000)

  it('lets SBU and Priority return to the empty choice', async () => {
    const { user, onPatchInquiry } = renderList()
    await openEdit(user, 'Hamburg Imports')
    await pick(user, / Priority$/, 'Medium')
    await pick(user, / Priority$/, '- select -')
    expect(screen.getByRole('button', { name: / Priority$/ })).toHaveTextContent('- select -')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(onPatchInquiry).toHaveBeenCalledTimes(1))
    expect(vi.mocked(onPatchInquiry).mock.calls[0][1].priority).toBeUndefined()
  })

  it('saves once on a double click and cannot be dismissed while saving', async () => {
    let resolve!: () => void
    const onPatchInquiry = vi.fn(() => new Promise<void>(r => { resolve = r }))
    const { user } = renderList({ onPatchInquiry })
    const dialog = await openEdit(user, 'Hamburg Imports')
    const save = within(dialog).getByRole('button', { name: 'Save Changes' })

    await user.dblClick(save)
    await user.keyboard('{Enter}')
    expect(onPatchInquiry).toHaveBeenCalledTimes(1)
    expect(save).toHaveTextContent('Saving…')
    expect(save).toHaveAttribute('aria-busy', 'true')
    expect(save).toHaveFocus()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(within(dialog).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Edit Inquiry' })).toBeInTheDocument()

    await act(async () => resolve())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onPatchInquiry).toHaveBeenCalledTimes(1)
  })

  it('stays open after a failed save and becomes dismissable again', async () => {
    const onPatchInquiry = vi.fn().mockRejectedValue(new Error('boom'))
    const { user } = renderList({ onPatchInquiry })
    const dialog = await openEdit(user, 'Hamburg Imports')
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Save Changes' })).not.toHaveAttribute('aria-busy'))
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeEnabled()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onPatchInquiry).toHaveBeenCalledTimes(1)
  })
})
