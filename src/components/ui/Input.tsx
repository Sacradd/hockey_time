import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <label className="neo-field" htmlFor={inputId}>
      {label && <span className="neo-label">{label}</span>}
      <input id={inputId} className={`neo-input ${className}`.trim()} {...props} />
    </label>
  )
}
