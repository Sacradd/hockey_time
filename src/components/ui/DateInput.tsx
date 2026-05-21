import { useRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import './DateInput.css'

interface DateInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label?: string
  value: string
  onChange: (value: string) => void
}

function formatDateRu(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return ''
  return `${d}.${m}.${y}`
}

export function DateInput({
  label,
  id,
  value,
  onChange,
  required,
  disabled,
  min,
  max,
  className = '',
  ...rest
}: DateInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const inputRef = useRef<HTMLInputElement>(null)
  const display = value ? formatDateRu(value) : 'Выберите дату'

  function openPicker() {
    if (disabled) return
    const el = inputRef.current
    if (!el) return
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker()
        return
      } catch {
        /* Safari может бросить — fallback ниже */
      }
    }
    el.focus()
  }

  return (
    <div className={`neo-field neo-field--date ${className}`.trim()}>
      {label && (
        <label className="neo-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div
        className="neo-date-shell"
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label ?? 'Дата'}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openPicker()
          }
        }}
      >
        <span
          className={`neo-date-shell__text${value ? '' : ' neo-date-shell__text--empty'}`}
        >
          {display}
        </span>
        <input
          {...rest}
          ref={inputRef}
          id={inputId}
          type="date"
          className="neo-date-shell__input"
          value={value}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            e.stopPropagation()
            openPicker()
          }}
          tabIndex={-1}
          aria-hidden
        />
      </div>
    </div>
  )
}
