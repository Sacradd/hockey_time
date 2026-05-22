import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, id, className = '', ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <label className="neo-field" htmlFor={inputId}>
      {label && <span className="neo-label">{label}</span>}
      <input
        ref={ref}
        id={inputId}
        className={`neo-input ${className}`.trim()}
        {...props}
      />
    </label>
  )
})
