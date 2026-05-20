import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import './PowerOffButton.css'

export function PowerOffButton() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleConfirm() {
    setConfirmOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <button
        type="button"
        className="power-btn"
        onClick={() => setConfirmOpen(true)}
        aria-label="Выход"
        title="Выход"
      >
        <svg className="power-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3v6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M7.5 6.8a6.5 6.5 0 1 0 9 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {confirmOpen && (
        <div
          className="power-confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="power-confirm-title"
        >
          <button
            type="button"
            className="power-confirm__backdrop"
            aria-label="Закрыть"
            onClick={() => setConfirmOpen(false)}
          />
          <div className="power-confirm__box neo-surface">
            <p id="power-confirm-title" className="power-confirm__text">
              Вы точно хотите выйти?
            </p>
            <div className="power-confirm__actions">
              <Button
                type="button"
                className="power-confirm__btn power-confirm__btn--yes"
                onClick={handleConfirm}
              >
                Да
              </Button>
              <Button
                type="button"
                className="power-confirm__btn power-confirm__btn--no"
                onClick={() => setConfirmOpen(false)}
              >
                Нет
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
