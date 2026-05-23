import { useId } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import './ConfirmDialog.css'
import './GameEditModal.css'

type Props = {
  open: boolean
  title: string
  /** Название на момент открытия — для сравнения «есть изменения». */
  initialTitle: string
  error: string
  busy: boolean
  onTitleChange: (v: string) => void
  onSave: () => void
  onClose: () => void
  onDeleteClick: () => void
}

export function RosterEditModal({
  open,
  title,
  initialTitle,
  error,
  busy,
  onTitleChange,
  onSave,
  onClose,
  onDeleteClick,
}: Props) {
  const titleId = useId()
  const hasChanges = title.trim() !== initialTitle.trim()

  if (!open) return null

  return (
    <div
      className="app-confirm game-edit-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="app-confirm__backdrop"
        aria-label="Закрыть"
        disabled={busy}
        onClick={onClose}
      />
      <div className="app-confirm__box neo-surface game-edit-modal__box">
        <h2 id={titleId} className="game-edit-modal__heading">
          Редактирование группы
        </h2>
        <form
          className="game-edit-modal__form"
          onSubmit={(e) => {
            e.preventDefault()
            onSave()
          }}
        >
          <Input
            label="Название"
            value={title}
            disabled={busy}
            onChange={(e) => onTitleChange(e.target.value)}
            required
            autoComplete="off"
          />
          {error ? <p className="game-edit-modal__error">{error}</p> : null}
          <div className="app-confirm__actions game-edit-modal__actions">
            <Button
              type="submit"
              variant={hasChanges ? 'accent' : 'default'}
              className={`app-confirm__btn ${
                hasChanges ? 'app-confirm__btn--no' : 'app-confirm__btn--yes'
              }`}
              disabled={busy || !title.trim() || !hasChanges}
            >
              Да
            </Button>
            <Button
              type="button"
              variant={hasChanges ? 'default' : 'accent'}
              className={`app-confirm__btn ${
                hasChanges ? 'app-confirm__btn--yes' : 'app-confirm__btn--no'
              }`}
              disabled={busy}
              onClick={onClose}
            >
              Нет
            </Button>
          </div>
          <div className="game-edit-modal__delete-wrap">
            <button
              type="button"
              className="game-edit-modal__delete-btn"
              disabled={busy}
              onClick={onDeleteClick}
            >
              Удалить группу
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
