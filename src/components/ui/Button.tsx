import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'default' | 'accent' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

export function Button({
  variant = 'default',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const classes = [
    'neo-btn',
    variant === 'accent' && 'neo-btn--accent',
    variant === 'icon' && 'neo-btn--icon',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  )
}
