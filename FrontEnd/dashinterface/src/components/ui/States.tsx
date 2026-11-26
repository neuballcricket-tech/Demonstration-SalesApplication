import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'
import { Button } from './Button'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="ui-empty-state flex flex-col items-center gap-2 px-4 py-10 text-center">
      <span aria-hidden="true" className="text-fg-muted">
        {icon ?? <Inbox size={24} />}
      </span>
      <p className="m-0 text-body font-semibold text-fg">{title}</p>
      {description && <p className="m-0 text-control text-fg-muted">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

export interface LoadingStateProps {
  label?: string
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <div role="status" className="ui-loading-state flex items-center justify-center gap-2 px-4 py-10 text-control text-fg-muted">
      <Loader2 aria-hidden="true" size={16} className="animate-spin" />
      {label}
    </div>
  )
}

export interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="ui-error-state flex flex-col items-center gap-2 px-4 py-10 text-center">
      <AlertTriangle aria-hidden="true" size={24} className="text-danger" />
      <p className="m-0 text-control text-fg">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          Retry
        </Button>
      )}
    </div>
  )
}
