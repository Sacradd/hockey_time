import { useEffect, useRef, useState } from 'react'

const REVEAL_PX = 92
const THRESHOLD = 44
const BLOCK_THRESHOLD = 28
/** Задержка перед закрытием по тапу снаружи (Safari: ghost click после свайпа) */
export const SWIPE_JOKE_CLOSE_GUARD_MS = 500
const SWIPE_CLOSE_GUARD_MS = 350

type Props = {
  children: React.ReactNode
  onRemove: () => void | Promise<void>
  removeLabel?: string
  disabled?: boolean
  /** При полном свайпе (без нажатия «Удалить») */
  onSwipeReveal?: () => void
  /** Свайп не двигает строку; только onSwipeReveal */
  blockSwipe?: boolean
  jokeOpen?: boolean
  jokeMessage?: string
  /** danger — красный фон (выбыл); success — зелёный (в состав) */
  variant?: 'danger' | 'success'
}

export function MemberSwipeRow({
  children,
  onRemove,
  removeLabel = 'Удалить',
  disabled = false,
  onSwipeReveal,
  blockSwipe = false,
  jokeOpen = false,
  jokeMessage,
  variant = 'danger',
}: Props) {
  const [offset, setOffset] = useState(0)
  const offsetRef = useRef(0)
  const startX = useRef(0)
  const dragging = useRef(false)
  const pointerIdRef = useRef<number | null>(null)
  const rootRef = useRef<HTMLLIElement>(null)
  const revealedAt = useRef(0)

  function applyOffset(px: number) {
    offsetRef.current = px
    setOffset(px)
  }

  function triggerSwipeReveal() {
    if (!onSwipeReveal) return
    window.setTimeout(() => onSwipeReveal(), 0)
  }

  function updateDrag(clientX: number) {
    const dx = clientX - startX.current
    if (blockSwipe) {
      offsetRef.current = dx > 0 ? 0 : Math.max(dx, -REVEAL_PX)
      return
    }
    if (dx > 0) {
      applyOffset(0)
      return
    }
    applyOffset(Math.max(dx, -REVEAL_PX))
  }

  function finishDrag() {
    dragging.current = false
    pointerIdRef.current = null
    if (disabled) return

    const threshold = blockSwipe ? BLOCK_THRESHOLD : THRESHOLD
    const revealed = offsetRef.current < -threshold
    if (blockSwipe) {
      offsetRef.current = 0
      if (revealed) {
        triggerSwipeReveal()
      }
      return
    }
    if (revealed && onSwipeReveal) {
      triggerSwipeReveal()
      applyOffset(0)
      return
    }
    if (revealed) {
      revealedAt.current = Date.now()
    }
    applyOffset(revealed ? -REVEAL_PX : 0)
  }

  useEffect(() => {
    if (blockSwipe || offset >= 0) return

    const close = () => applyOffset(0)

    const onPointerDown = (e: PointerEvent) => {
      if (Date.now() - revealedAt.current < SWIPE_CLOSE_GUARD_MS) return
      const root = rootRef.current
      if (!root) return
      const target = e.target as Node
      const removeBtn = root.querySelector('.member-swipe__remove')
      if (removeBtn?.contains(target)) return
      close()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('scroll', close, true)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('scroll', close, true)
    }
  }, [offset, blockSwipe])

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled || e.button !== 0) return
    pointerIdRef.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    startX.current = e.clientX
    dragging.current = true
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current || pointerIdRef.current !== e.pointerId) return
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    updateDrag(e.clientX)
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    finishDrag()
  }

  function onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return
    finishDrag()
  }

  return (
    <li
      ref={rootRef}
      className={`member-swipe member-swipe--${variant}${
        blockSwipe ? ' member-swipe--blocked' : ''
      }${blockSwipe && jokeOpen ? ' member-swipe--joke-open' : ''}`}
    >
      <div className="member-swipe__inner">
        {blockSwipe && jokeOpen && jokeMessage && (
          <div className="member-swipe__joke neo-surface" role="status">
            {jokeMessage}
          </div>
        )}
      <div className="member-swipe__actions" aria-hidden={offset === 0}>
        <button
          type="button"
          className={`member-swipe__remove member-swipe__remove--${variant}`}
          onClick={() => {
            void onRemove()
            applyOffset(0)
          }}
        >
          {removeLabel}
        </button>
      </div>
      <div
        className="member-swipe__panel"
        style={{ transform: blockSwipe ? undefined : `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {children}
      </div>
      </div>
    </li>
  )
}
