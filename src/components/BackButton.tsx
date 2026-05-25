import { Link } from 'react-router-dom'
import './BackButton.css'

type BackButtonProps = {
  to?: string
  onClick?: () => void
  disabled?: boolean
  ariaLabel?: string
}

export function BackButton({
  to,
  onClick,
  disabled = false,
  ariaLabel = 'Назад',
}: BackButtonProps) {
  if (onClick) {
    return (
      <button
        type="button"
        className="back-btn"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        Назад
      </button>
    )
  }

  if (!to) return null

  return (
    <Link
      to={to}
      className="back-btn"
      aria-label={ariaLabel}
      title={ariaLabel}
      aria-disabled={disabled ? true : undefined}
      tabIndex={disabled ? -1 : undefined}
      onClick={(e) => disabled && e.preventDefault()}
    >
      Назад
    </Link>
  )
}
