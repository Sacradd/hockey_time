import { useRef, useState } from 'react'

const REVEAL_PX = 80
const THRESHOLD = 40

type Props = {
  children: React.ReactNode
  onRemove: () => void | Promise<void>
  removeLabel?: string
  disabled?: boolean
}

export function MemberSwipeRow({
  children,
  onRemove,
  removeLabel = 'Убрать',
  disabled = false,
}: Props) {
  const [offset, setOffset] = useState(0)
  const startX = useRef(0)
  const dragging = useRef(false)

  function onTouchStart(e: React.TouchEvent) {
    if (disabled) return
    startX.current = e.touches[0].clientX
    dragging.current = true
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current || disabled) return
    const dx = e.touches[0].clientX - startX.current
    if (dx > 0) {
      setOffset(0)
      return
    }
    setOffset(Math.max(dx, -REVEAL_PX))
  }

  function onTouchEnd() {
    dragging.current = false
    if (disabled) return
    setOffset(offset < -THRESHOLD ? -REVEAL_PX : 0)
  }

  return (
    <li className="member-swipe">
      <div className="member-swipe__actions" aria-hidden={offset === 0}>
        <button
          type="button"
          className="member-swipe__remove"
          onClick={() => {
            void onRemove()
            setOffset(0)
          }}
        >
          {removeLabel}
        </button>
      </div>
      <div
        className="member-swipe__panel"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {children}
      </div>
    </li>
  )
}
