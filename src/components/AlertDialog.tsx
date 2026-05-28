import { Button } from '@/components/ui/Button'
import './AlertDialog.css'
import './ConfirmDialog.css'

type Props = {
  open: boolean
  message: string
  titleId?: string
  buttonLabel?: string
  onClose: () => void
}

/** Сообщение по центру экрана — одна кнопка «Понятно». */
export function AlertDialog({
  open,
  message,
  titleId = 'app-alert-title',
  buttonLabel = 'Понятно',
  onClose,
}: Props) {
  if (!open) return null

  return (
    <div
      className="app-confirm app-alert-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="app-confirm__backdrop"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div className="app-confirm__box neo-surface">
        <p id={titleId} className="app-confirm__text">
          {message}
        </p>
        <div className="app-confirm__actions app-alert-dialog__actions">
          <Button
            type="button"
            variant="accent"
            className="app-confirm__btn app-alert-dialog__btn"
            onClick={onClose}
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
