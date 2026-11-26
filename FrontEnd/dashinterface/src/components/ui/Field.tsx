import { useId, type CSSProperties, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { labelClass } from './controlStyles'

export interface FieldControlProps {
  id: string
  'aria-labelledby': string
  'aria-describedby'?: string
  'aria-invalid'?: true
}

export interface FieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: (ids: FieldControlProps) => ReactNode
  className?: string
  style?: CSSProperties
}

export function Field({ label, required, hint, error, children, className, style }: FieldProps) {
  const id = useId()
  const labelId = `${id}-label`
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  return (
    <div className={cn('ui-field flex flex-col gap-1', className)} style={style}>
      <label id={labelId} htmlFor={id} className={labelClass}>
        {label}
        {required && <span aria-hidden="true" className="ml-0.5 text-danger">*</span>}
      </label>
      {children({
        id,
        'aria-labelledby': labelId,
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        ...(error ? { 'aria-invalid': true as const } : {}),
      })}
      {hint && <p id={hintId} className="text-label text-fg-muted">{hint}</p>}
      {error && <p id={errorId} className="text-label text-danger">{error}</p>}
    </div>
  )
}
