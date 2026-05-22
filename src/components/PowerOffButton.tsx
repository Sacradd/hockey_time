import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
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

      <ConfirmDialog
        open={confirmOpen}
        message="Вы точно хотите выйти?"
        titleId="power-confirm-title"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
