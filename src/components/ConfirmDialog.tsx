import { Button } from '@/components/ui/Button'
import './ConfirmDialog.css'

type Props = {
  open: boolean
  message: string
  titleId?: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
  /** «Нет» красная (отмена опасного действия) */
  cancelDanger?: boolean
}

export function ConfirmDialog({
  open,
  message,
  titleId = 'app-confirm-title',
  onConfirm,
  onCancel,
  busy = false,
  cancelDanger = false,
}: Props) {
  if (!open) return null

  return (
    <div
      className="app-confirm"
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
        <div className="app-confirm__actions">
          <Button
            type="button"
            className="app-confirm__btn app-confirm__btn--yes"
            disabled={busy}
            onClick={onConfirm}
          >
            Да
          </Button>
          <Button
            type="button"
            className={`app-confirm__btn app-confirm__btn--no${
              cancelDanger ? ' app-confirm__btn--no-danger' : ''
            }`}
            disabled={busy}
            onClick={onCancel}
          >
            Нет
          </Button>
        </div>
      </div>
    </div>
  )
}
