import { useEffect, useId, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import './ConfirmDialog.css'
import './InputDialog.css'

type Props = {
  open: boolean
  message: string
  label: string
  value: string
  onChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
  error?: string
  inputMode?: 'numeric' | 'text'
  min?: number
}

export function InputDialog({
  open,
  message,
  label,
  value,
  onChange,
  onConfirm,
  onCancel,
  busy = false,
  error,
  inputMode = 'numeric',
  min = 1,
}: Props) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 0)
      return () => window.clearTimeout(t)
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="app-confirm app-input-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="app-confirm__backdrop"
        aria-label="Закрыть"
        disabled={busy}
        onClick={onCancel}
      />
      <div className="app-confirm__box neo-surface">
        <p id={titleId} className="app-confirm__text">
          {message}
        </p>
        <Input
          ref={inputRef}
          label={label}
          type={inputMode === 'numeric' ? 'number' : 'text'}
          inputMode={inputMode}
          min={inputMode === 'numeric' ? min : undefined}
          value={value}
          disabled={busy}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onConfirm()
            }
          }}
        />
        {error ? <p className="app-input-dialog__error">{error}</p> : null}
        <div className="app-confirm__actions">
          <Button
            type="button"
            className="app-confirm__btn app-confirm__btn--yes"
            disabled={busy}
            onClick={onConfirm}
          >
            Сохранить
          </Button>
          <Button
            type="button"
            className="app-confirm__btn app-confirm__btn--no"
            disabled={busy}
            onClick={onCancel}
          >
            Отмена
          </Button>
        </div>
      </div>
    </div>
  )
}
