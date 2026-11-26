import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmptyState, ErrorState, LoadingState } from './States'

describe('EmptyState', () => {
  it('renders the title, description and action', () => {
    render(<EmptyState title="No rates yet" description="Upload a rate sheet." action={<button>Upload</button>} />)
    expect(screen.getByText('No rates yet')).toBeInTheDocument()
    expect(screen.getByText('Upload a rate sheet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()
  })

  it('renders only the title when nothing else is given', () => {
    render(<EmptyState title="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders a custom icon', () => {
    render(<EmptyState title="Nothing" icon={<svg data-testid="custom-icon" />} />)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })
})

describe('LoadingState', () => {
  it('is a status region with the default label', () => {
    render(<LoadingState />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
  })

  it('shows a custom label', () => {
    render(<LoadingState label="Fetching rates…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Fetching rates…')
  })
})

describe('ErrorState', () => {
  it('is an alert with the message and no retry button by default', () => {
    render(<ErrorState message="Could not load rates." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load rates.')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onRetry when Retry is pressed', async () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Boom" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
