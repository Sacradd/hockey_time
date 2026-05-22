import { useEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  ariaLabel?: string
}

export function InfoHint({ children, ariaLabel = 'Подсказка' }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div className="lineup-hint" ref={rootRef}>
      <button
        type="button"
        className="lineup-hint__btn"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        i
      </button>
      {open && (
        <div className="lineup-hint__popover neo-surface" role="tooltip">
          {children}
        </div>
      )}
    </div>
  )
}
