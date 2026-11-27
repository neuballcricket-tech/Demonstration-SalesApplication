import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
