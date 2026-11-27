import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from 'react-aria-components'
import { describe, expect, it, vi } from 'vitest'
import { RoleContext, type RoleContextValue } from '../../RoleContext'
import type { Customer, Inquiry, Quote } from '../../types'
import Quotations from './Quotations'

type User = ReturnType<typeof userEvent.setup>

const customer = (over: Partial<Customer>): Customer => ({
  id: 'c1', name: 'Acme Exports Ltd', location: 'Colombo, Sri Lanka', tier: 'Regular', payment_terms: 'Pay Upfront',
  blacklisted: false, credit_hold: false, min_margin_pct: 0,
  ...over,
} as Customer)

const CUSTOMERS: Customer[] = [
  customer({}),
  customer({ id: 'c2', name: 'Global Trading Co', min_margin_pct: 8, credit_hold: true }),
  customer({ id: 'c3', name: 'Singapore Logistics Pte', tier: 'Key Account' }),
]

const line = { id: 'QL-1', shipping_line: 'MSC', rate_type: 'Spot' as const, base_rate_usd: 1000, transit_days: 20, free_time_days: 10, transshipment_points: 'Direct', destination_charges_usd: 100 }

const quote = (over: Partial<Quote>): Quote => ({
  id: 'QUO-1', customer_name: 'Acme Exports Ltd', origin: 'CNSHA', destination: 'DEHAM', quote_type: 'FCA', margin_pct: 5,
  created_by: 8, created_at: '2026-11-27 10:00', status: 'Draft', lines: [line],
  ...over,
} as Quote)

const QUOTES: Quote[] = [
  quote({ id: 'QUO-1' }),
  quote({ id: 'QUO-2', customer_name: 'Global Trading Co', status: 'Awaiting Approval', approval_reason: 'margin 2% < min 8%' }),
  quote({ id: 'QUO-3', customer_name: 'Singapore Logistics Pte', status: 'Sent' }),
  quote({ id: 'QUO-4', customer_name: 'Acme Exports Ltd', status: 'Confirmed' }),
]

const INQUIRY = {
  id: '6', inq_id: 6, customer_name: 'Acme Exports Ltd', origin: 'CNSHA', destination: 'DEHAM', status: 'pending',
  workflow_stage: 'quotation-prep', containers: [{ quantity: 1, containerType: '40GP' }], preferred_liners: [], preferred_rate: 0,
} as unknown as Inquiry

const role = (allowed: boolean) => ({
  activeEmployee: { id: 9, name: 'IT-AD', role: 'Admin' },
  activeRole: 'Admin',
  hasPermission: () => allowed,
  canAccessPage: () => true,
} as unknown as RoleContextValue)

function renderPage({ quotes = QUOTES, inquiries = [INQUIRY], allowed = true } = {}) {
  const onAddQuote = vi.fn()
  const onSetQuoteStatus = vi.fn()
  const onFlash = vi.fn()
  render(
    <I18nProvider locale="en-GB">
      <RoleContext.Provider value={role(allowed)}>
        <Quotations
          quotes={quotes}
          customers={CUSTOMERS}
          inquiries={inquiries}
          onAddQuote={onAddQuote}
          onSetQuoteStatus={onSetQuoteStatus}
          onFlash={onFlash}
        />
      </RoleContext.Provider>
    </I18nProvider>,
  )
  return { onAddQuote, onSetQuoteStatus, onFlash, user: userEvent.setup({ delay: null }) }
}

const shownIds = () => screen.queryAllByText(/^QUO-\d$/).map(e => e.textContent)
const pick = async (user: User, scope: ReturnType<typeof within> | typeof screen, trigger: RegExp, option: string) => {
  await user.click(scope.getByRole('button', { name: trigger }))
  await user.click(screen.getByRole('option', { name: option }))
}

describe('Quotations filters', () => {
  it('narrows by customer text and status with the shared Input and Select, and "All" can be picked again', async () => {
    const { user } = renderPage()
    expect(screen.getByText('Showing 4 of 4')).toBeInTheDocument()

    await pick(user, screen, /By Status/, 'Draft')
    expect(shownIds()).toEqual(['QUO-1'])
    await pick(user, screen, /By Status/, 'Confirmed')
    expect(shownIds()).toEqual(['QUO-4'])
    await pick(user, screen, /By Status/, 'All')
    expect(shownIds()).toEqual(['QUO-1', 'QUO-2', 'QUO-3', 'QUO-4'])

    await user.type(screen.getByRole('textbox', { name: 'By Customer' }), 'ACME')
    expect(shownIds()).toEqual(['QUO-1', 'QUO-4'])
    await pick(user, screen, /By Status/, 'Sent')
    expect(shownIds()).toEqual([])
    expect(screen.getByText('No quotes match these filters.')).toBeInTheDocument()
    expect(screen.getByText('Showing 0 of 4')).toBeInTheDocument()
  })
})

describe('Quotations status actions', () => {
  it('sends the same status transitions from each card', async () => {
    const { user, onSetQuoteStatus } = renderPage()
    await user.click(screen.getByRole('button', { name: 'Approve' }))
    await user.click(screen.getByRole('button', { name: 'Reject' }))
    await user.click(screen.getByRole('button', { name: 'Mark Confirmed' }))
    await user.click(screen.getByRole('button', { name: 'Mark Lost' }))
    expect(onSetQuoteStatus.mock.calls).toEqual([
      ['QUO-2', 'Approved'], ['QUO-2', 'Lost'], ['QUO-3', 'Confirmed'], ['QUO-3', 'Lost'],
    ])
  })

  it('locks every action without permission and keeps the restriction in the title', () => {
    renderPage({ allowed: false })
    expect(screen.getByRole('button', { name: 'New Quote' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'New Quote' })).toHaveAttribute('title', 'Restricted - requires Sales role')
    expect(screen.getByRole('button', { name: 'Generate Quote' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Approve' })).toHaveAttribute('title', 'Restricted - requires Finance role')
    for (const name of ['Approve', 'Reject', 'Copy & Send', 'Mark Confirmed', 'Mark Lost']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }
  })

  it('opens Copy Quotation from the keyboard, returns focus on Escape, and a double click on Mark as Sent sends once', async () => {
    const { user, onSetQuoteStatus } = renderPage()
    const send = screen.getByRole('button', { name: 'Copy & Send' })
    send.focus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: 'Copy Quotation' })
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    expect((within(dialog).getByRole('textbox', { name: 'Quotation text' }) as HTMLTextAreaElement).value).toContain('Quote No:  QUO-1')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(send).toHaveFocus())
    expect(onSetQuoteStatus).not.toHaveBeenCalled()

    await user.click(send)
    await user.dblClick(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Mark as Sent' }))
    expect(onSetQuoteStatus.mock.calls).toEqual([['QUO-1', 'Sent']])
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('Quote builder', () => {
  it('opens from Generate Quote with the keyboard and Escape returns focus', async () => {
    const { user } = renderPage()
    const gen = screen.getByRole('button', { name: 'Generate Quote' })
    gen.focus()
    await user.keyboard(' ')
    const dialog = await screen.findByRole('dialog', { name: 'New Quote' })
    expect(within(dialog).getByRole('combobox', { name: 'Customer' })).toHaveValue('Acme Exports Ltd')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(gen).toHaveFocus())
  })

  it('builds the exact quote payload from every shared control and a double click saves once', async () => {
    const { user, onAddQuote } = renderPage()
    await user.click(screen.getByRole('button', { name: 'Generate Quote' }))
    const d = within(await screen.findByRole('dialog', { name: 'New Quote' }))

    await pick(user, d, /Quote Type/, 'DDP')
    const shipping = d.getByRole('combobox', { name: 'Line 1 shipping line' })
    await user.clear(shipping)
    await user.type(shipping, 'Hap')
    await user.click(screen.getByRole('option', { name: 'Hapag-Lloyd' }))
    expect(shipping).toHaveValue('Hapag-Lloyd')
    await pick(user, d, /Line 1 rate type/, 'Volume-based')
    const set = async (label: string, value: string) => { const el = d.getByLabelText(label); await user.clear(el); await user.type(el, value) }
    await set('Line 1 base rate USD', '1200')
    await set('Line 1 transit days', '21')
    await set('Line 1 free time days', '10')
    await set('Line 1 transshipment via', 'SGSIN')
    await set('Line 1 destination charges USD', '150')
    await user.click(d.getByRole('button', { name: 'Add line' }))
    await set('Line 2 base rate USD', '1100')
    await set('Margin %', '5')
    await pick(user, d, /Created by/, 'sales-test')
    expect(d.getByText('$2,678')).toBeInTheDocument()

    await user.dblClick(d.getByRole('button', { name: 'Save Quote' }))
    expect(onAddQuote).toHaveBeenCalledTimes(1)
    expect(onAddQuote).toHaveBeenCalledWith({
      inquiry_id: '6',
      customer_name: 'Acme Exports Ltd',
      origin: 'CNSHA',
      destination: 'DEHAM',
      quote_type: 'DDP',
      margin_pct: 5,
      created_by: 8,
      lines: [
        { id: expect.stringMatching(/^QL-100-\d+$/), shipping_line: 'Hapag-Lloyd', rate_type: 'Volume-based', base_rate_usd: 1200, transit_days: 21, free_time_days: 10, transshipment_points: 'SGSIN', destination_charges_usd: 150 },
        { id: expect.stringMatching(/^QL-101-\d+$/), shipping_line: 'CMA CGM', rate_type: 'Contractual', base_rate_usd: 1100, transit_days: 7, free_time_days: 14, transshipment_points: 'Direct', destination_charges_usd: 100 },
      ],
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  }, 15000)

  it('picks a customer, flags a margin under the floor for approval, and only saves a complete quote', async () => {
    const { user, onAddQuote } = renderPage({ inquiries: [] })
    await user.click(screen.getByRole('button', { name: 'New Quote' }))
    const d = within(await screen.findByRole('dialog', { name: 'New Quote' }))

    await user.type(d.getByRole('combobox', { name: 'Customer' }), 'glob')
    await user.click(screen.getByRole('option', { name: 'Global Trading Co' }))
    expect(d.getByText(/Regular · Pay Upfront · floor 8%/)).toBeInTheDocument()
    expect(d.getByText('· credit hold')).toBeInTheDocument()

    // The default created-by id (1) is no employee: shown as-is, never rewritten
    expect(d.getByRole('button', { name: /Created by/ })).toHaveTextContent('1')
    // The margin starts at 7%, under this customer's 8% floor
    const save = d.getByRole('button', { name: 'Submit for Approval' })
    expect(save).toBeDisabled() // no destination, base rate 0
    expect(d.getByRole('button', { name: 'Remove line 1' })).toBeDisabled()

    await user.type(d.getByRole('textbox', { name: 'Destination' }), 'USNYC')
    const base = d.getByLabelText('Line 1 base rate USD')
    await user.clear(base)
    await user.type(base, '900')
    const margin = d.getByLabelText('Margin %')
    await user.clear(margin)
    await user.type(margin, '2')
    expect(d.getByText(/This quote will be flagged Awaiting Approval - margin 2% is below Global Trading Co's floor of 8%/)).toBeInTheDocument()

    await user.click(d.getByRole('button', { name: 'Add line' }))
    await user.click(d.getByRole('button', { name: 'Remove line 2' }))
    expect(d.queryByLabelText('Line 2 base rate USD')).not.toBeInTheDocument()

    expect(save).toBeEnabled()
    await user.click(save)
    expect(onAddQuote).toHaveBeenCalledWith(expect.objectContaining({
      customer_name: 'Global Trading Co', origin: 'Colombo', destination: 'USNYC', quote_type: 'FCA', margin_pct: 2, created_by: 1, inquiry_id: undefined,
    }))
  }, 15000)
})
