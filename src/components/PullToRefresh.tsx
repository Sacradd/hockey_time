import { useEffect, useRef, useState } from 'react'
import './PullToRefresh.css'

const THRESHOLD_PX = 68
const MAX_PULL_PX = 88

type Props = {
  onRefresh: () => void | Promise<void>
  children: React.ReactNode
  className?: string
  /** Не реагировать на жест (первая загрузка, модалка и т.д.) */
  disabled?: boolean
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
}: Props) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pullRef = useRef(0)
  const startY = useRef(0)
  const startX = useRef(0)
  const tracking = useRef(false)
  const startedAtTop = useRef(false)
  const refreshingRef = useRef(false)

  refreshingRef.current = refreshing

  useEffect(() => {
    if (disabled || !scrollRef.current) return
    const el: HTMLDivElement = scrollRef.current

    function scrollAtTop(): boolean {
      return el.scrollTop <= 1
    }

    function resetPull() {
      tracking.current = false
      startedAtTop.current = false
      pullRef.current = 0
      setPull(0)
    }

    function onTouchStart(e: TouchEvent) {
      if (refreshingRef.current) return
      if (!scrollAtTop()) return
      if (e.touches.length !== 1) return
      startedAtTop.current = true
      startY.current = e.touches[0].clientY
      startX.current = e.touches[0].clientX
      tracking.current = true
    }

    function onTouchMove(e: TouchEvent) {
      if (!tracking.current || !startedAtTop.current || refreshingRef.current) return
      if (!scrollAtTop()) {
        resetPull()
        return
      }
      const touch = e.touches[0]
      const dy = touch.clientY - startY.current
      const dx = touch.clientX - startX.current
      if (Math.abs(dx) > Math.abs(dy) + 10) {
        resetPull()
        return
      }
      if (dy > 0) {
        e.preventDefault()
        const next = Math.min(dy * 0.5, MAX_PULL_PX)
        pullRef.current = next
        setPull(next)
      } else {
        resetPull()
      }
    }

    async function onTouchEnd() {
      if (!tracking.current || !startedAtTop.current || refreshingRef.current) return
      tracking.current = false
      startedAtTop.current = false
      const pulled = pullRef.current
      if (pulled >= THRESHOLD_PX && scrollAtTop()) {
        refreshingRef.current = true
        setRefreshing(true)
        setPull(THRESHOLD_PX * 0.55)
        pullRef.current = THRESHOLD_PX * 0.55
        try {
          await onRefresh()
        } finally {
          setRefreshing(false)
          refreshingRef.current = false
          resetPull()
        }
      } else {
        resetPull()
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [disabled, onRefresh])

  const visible = pull > 6 || refreshing
  const ready = pull >= THRESHOLD_PX && !refreshing

  return (
    <>
      <div
        className={[
          'ptr-indicator',
          visible ? 'ptr-indicator--visible' : '',
          ready ? 'ptr-indicator--ready' : '',
          refreshing ? 'ptr-indicator--busy' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ ['--ptr-pull' as string]: `${pull}px` }}
        aria-live="polite"
        aria-hidden={!visible}
      >
        <span className="ptr-indicator__icon" />
        <span className="ptr-indicator__text">
          {refreshing ? 'Обновление…' : ready ? 'Отпустите' : 'Потяните вниз'}
        </span>
      </div>
      <div ref={scrollRef} className="ptr-scroll-root">
        <div className={className}>{children}</div>
      </div>
    </>
  )
}
