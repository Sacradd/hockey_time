import { useId } from 'react'
import { Button } from '@/components/ui/Button'
import { DateInput } from '@/components/ui/DateInput'
import { Input } from '@/components/ui/Input'
import { GAME_WEEKDAY_OPTIONS } from '@/lib/weekdays'
import './ConfirmDialog.css'
import './GameEditModal.css'

type Props = {
  open: boolean
  title: string
  date: string
  time: string
  weekday: string
  error: string
  busy: boolean
  onTitleChange: (v: string) => void
  onDateChange: (v: string) => void
  onTimeChange: (v: string) => void
  onWeekdayChange: (v: string) => void
  onSave: () => void
  onClose: () => void
  onDeleteClick: () => void
}

export function GameEditModal({
  open,
  title,
  date,
  time,
  weekday,
  error,
  busy,
  onTitleChange,
  onDateChange,
  onTimeChange,
  onWeekdayChange,
  onSave,
  onClose,
  onDeleteClick,
}: Props) {
  const titleId = useId()

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
          Редактирование игры
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
            placeholder="Можно оставить пустым"
            autoComplete="off"
          />
          <DateInput
            label="Дата"
            value={date}
            required
            disabled={busy}
            onChange={onDateChange}
          />
          <Input
            label="Время"
            type="time"
            className="game-edit-modal__time"
            value={time}
            disabled={busy}
            onChange={(e) => onTimeChange(e.target.value)}
          />
          <label className="neo-field">
            <span className="neo-label">День недели</span>
            <select
              className="neo-input"
              value={weekday}
              disabled={busy}
              onChange={(e) => onWeekdayChange(e.target.value)}
            >
              {GAME_WEEKDAY_OPTIONS.map((d) => (
                <option key={d.value} value={String(d.value)}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="game-edit-modal__error">{error}</p> : null}
          <div className="app-confirm__actions game-edit-modal__actions">
            <Button
              type="submit"
              variant="accent"
              className="app-confirm__btn app-confirm__btn--yes"
              disabled={busy || !date}
            >
              Сохранить
            </Button>
            <Button
              type="button"
              className="app-confirm__btn app-confirm__btn--no"
              disabled={busy}
              onClick={onClose}
            >
              Отмена
            </Button>
          </div>
          <div className="game-edit-modal__delete-wrap">
            <button
              type="button"
              className="game-edit-modal__delete-btn"
              disabled={busy}
              onClick={onDeleteClick}
            >
              Удалить игру
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
