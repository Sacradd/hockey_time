import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  deleteUser,
  fetchAllUsers,
  resetUserPassword,
  setRosterAdmin,
  type ResetPasswordResult,
  type SuperUserListItem,
} from '@/api/admin'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ApiError } from '@/api/http'
import { copyToClipboard } from '@/lib/copyToClipboard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import '@/pages/Groups.css'

const PANEL_MS = 500
const PANEL_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

function buildCopyText(res: ResetPasswordResult): string {
  const lines = [
    `Телефон: ${res.phone_display}`,
    res.display_login ? `Ник: ${res.display_login}` : null,
    `Пароль: ${res.temporary_password}`,
    res.login_hint,
  ].filter(Boolean)
  return lines.join('\n')
}

function userIsAdmin(u: SuperUserListItem): boolean {
  return u.role === 'admin' || u.rosters.some((r) => r.is_admin)
}

function matchUser(u: SuperUserListItem, q: string): boolean {
  if (q === '') return true
  const lower = q.toLowerCase()
  const digits = q.replace(/\D/g, '')
  if (u.display_login?.toLowerCase().includes(lower)) return true
  if (u.name.toLowerCase().includes(lower)) return true
  if (digits.length >= 2 && u.phone_display.replace(/\D/g, '').includes(digits)) return true
  return false
}

function scrollToElement(
  el: HTMLElement | null | undefined,
  block: ScrollLogicalPosition = 'start'
) {
  el?.scrollIntoView({ behavior: 'smooth', block, inline: 'nearest' })
}

export function SuperUsersPanel({ token }: { token: string }) {
  const navigate = useNavigate()
  const [users, setUsers] = useState<SuperUserListItem[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [openUserId, setOpenUserId] = useState<number | null>(null)
  const [panelUserId, setPanelUserId] = useState<number | null>(null)
  const [shellHeight, setShellHeight] = useState(0)
  const [isClosing, setIsClosing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const userRowRefs = useRef<Map<number, HTMLLIElement>>(new Map())
  const pendingOpenUserId = useRef<number | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    fetchAllUsers(token)
      .then((res) => setUsers(res.users))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Не удалось загрузить пользователей')
      })
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const panelOpen = shellHeight > 0 && !isClosing

  useLayoutEffect(() => {
    if (!panelUserId || isClosing) return
    const el = panelRef.current
    if (!el) return

    const syncHeight = () => {
      const measured = el.scrollHeight
      if (measured > 0) setShellHeight(measured)
    }

    syncHeight()
    const ro = new ResizeObserver(syncHeight)
    ro.observe(el)
    return () => ro.disconnect()
  }, [panelUserId, isClosing])

  useEffect(() => {
    if (!panelOpen) return
    const t = window.setTimeout(() => {
      scrollToElement(panelRef.current, 'start')
    }, PANEL_MS * 0.35)
    return () => clearTimeout(t)
  }, [panelOpen, panelUserId])

  const filtered = useMemo(
    () => users.filter((u) => matchUser(u, searchQ.trim())),
    [users, searchQ]
  )

  const panelUser =
    users.find((u) => u.user_id === panelUserId) ?? null

  async function handleSetRosterAdmin(rosterId: number, isAdmin: boolean) {
    if (!panelUser) return
    setBusy(true)
    setError('')
    try {
      await setRosterAdmin(token, {
        roster_id: rosterId,
        user_id: panelUser.user_id,
        is_admin: isAdmin,
      })
      setUsers((prev) =>
        prev.map((item) =>
          item.user_id === panelUser.user_id
            ? {
                ...item,
                rosters: item.rosters.map((x) =>
                  x.roster_id === rosterId ? { ...x, is_admin: isAdmin } : x
                ),
              }
            : item
        )
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  function clearPanelForm() {
    setResetResult(null)
    setCopied(false)
    setDeleteConfirmOpen(false)
    setTempPassword('')
    setError('')
  }

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  function finalizePanelClose(closedUserId: number) {
    if (panelUserId !== closedUserId) return

    const nextId = pendingOpenUserId.current
    pendingOpenUserId.current = null

    if (nextId !== null) {
      setIsClosing(false)
      setPanelUserId(nextId)
      setOpenUserId(nextId)
      setShellHeight(0)
      return
    }

    setPanelUserId(null)
    scrollToElement(userRowRefs.current.get(closedUserId), 'center')
  }

  function beginOpenPanel(userId: number) {
    clearCloseTimer()
    setIsClosing(false)
    setPanelUserId(userId)
    setOpenUserId(userId)
    setShellHeight(0)
  }

  function beginClosePanel(userId: number) {
    clearCloseTimer()
    const el = panelRef.current
    const currentHeight = el?.scrollHeight ?? shellHeight
    setOpenUserId(null)
    setIsClosing(true)
    setShellHeight(currentHeight)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setShellHeight(0))
    })
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      setIsClosing(false)
      finalizePanelClose(userId)
    }, PANEL_MS)
  }

  function toggleUserPanel(userId: number) {
    if (panelUserId === userId && panelOpen) {
      clearPanelForm()
      beginClosePanel(userId)
      return
    }

    if (panelUserId === userId && (isClosing || shellHeight === 0)) {
      return
    }

    clearPanelForm()

    if (panelUserId !== null && panelOpen) {
      pendingOpenUserId.current = userId
      beginClosePanel(panelUserId)
      return
    }

    beginOpenPanel(userId)
  }

  async function handleReset() {
    if (!panelUser) return
    setBusy(true)
    setError('')
    setResetResult(null)
    setCopied(false)
    try {
      const res = await resetUserPassword(token, {
        user_id: panelUser.user_id,
        password: tempPassword.trim() || undefined,
      })
      setResetResult(res)
      setTempPassword('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка сброса пароля')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!panelUser) return
    setBusy(true)
    setError('')
    try {
      await deleteUser(token, panelUser.user_id)
      setDeleteConfirmOpen(false)
      pendingOpenUserId.current = null
      clearCloseTimer()
      setIsClosing(false)
      setShellHeight(0)
      setOpenUserId(null)
      setPanelUserId(null)
      setResetResult(null)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось удалить')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="groups-section-head">
        <h2 className="groups-section-title groups-section-title--inline">Пользователи</h2>
        <button
          type="button"
          className="super-add-player-btn"
          aria-label="Добавить игрока в пул"
          onClick={() => navigate('/admin/create-user')}
        >
          <span className="super-add-player-btn__glyph" aria-hidden>
            +
          </span>
        </button>
      </div>

      <Input
        label="Поиск"
        type="search"
        placeholder="Телефон или ник"
        value={searchQ}
        onChange={(e) => setSearchQ(e.target.value)}
        autoComplete="off"
      />

      {loading && <p className="groups-page__empty">Загрузка…</p>}
      {error && <p className="groups-page__error">{error}</p>}

      {!loading && filtered.length === 0 && (
        <p className="groups-page__empty">
          {users.length === 0 ? 'Нет пользователей' : 'Никого не найдено'}
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="members-list">
          {filtered.map((u) => (
            <li
              key={u.user_id}
              ref={(el) => {
                if (el) userRowRefs.current.set(u.user_id, el)
                else userRowRefs.current.delete(u.user_id)
              }}
              className="super-user-list__item"
            >
              <button
                type="button"
                className={`member-row reset-user-pick${
                  openUserId === u.user_id
                    ? ' reset-user-pick--active'
                    : ' neo-surface'
                }`}
                onClick={() => toggleUserPanel(u.user_id)}
              >
                <div>
                  <div className="member-row__name">
                    {u.name}
                    {userIsAdmin(u) && (
                      <span className="status-pill status-pill--admin member-row__admin-badge">
                        админ
                      </span>
                    )}
                  </div>
                  <div className="member-row__sub">
                    {u.phone_display}
                    {u.display_login ? ` · @${u.display_login}` : ''}
                    {u.is_active ? (
                      ' · активен'
                    ) : (
                      <>
                        {' · '}
                        <span className="member-row__inactive">не активирован</span>
                      </>
                    )}
                  </div>
                </div>
              </button>

              {panelUserId === u.user_id && panelUser && (
                <div
                  className={`super-user-panel-wrap${
                    panelOpen ? ' super-user-panel-wrap--interactive' : ''
                  }`}
                  style={{
                    height: shellHeight,
                    transition: `height ${PANEL_MS}ms ${PANEL_EASE}`,
                  }}
                  aria-hidden={!panelOpen && shellHeight === 0}
                >
                  <section
                    ref={panelRef}
                    className="super-user-panel neo-surface"
                  >
                    <h3 className="super-user-panel__title">{panelUser.name}</h3>
                    <p className="groups-page__user">
                      {panelUser.phone_display}
                      {panelUser.display_login ? ` · @${panelUser.display_login}` : ''}
                    </p>

                    {(() => {
                      const adminRosters = panelUser.rosters.filter((r) => r.is_admin)
                      const memberRosters = panelUser.rosters.filter((r) => !r.is_admin)

                      if (panelUser.rosters.length === 0) {
                        return (
                          <p className="groups-page__empty">
                            Не в группах — админ добавит из пула в свою группу
                          </p>
                        )
                      }

                      return (
                        <>
                          {adminRosters.length > 0 && (
                            <>
                              <h4 className="groups-section-title">Админ группы</h4>
                              <ul className="super-user-panel__rosters">
                                {adminRosters.map((r) => (
                                  <li
                                    key={r.roster_id}
                                    className="super-user-panel__roster-row"
                                  >
                                    <span className="super-user-panel__roster-name">
                                      {r.title}
                                    </span>
                                    <span className="status-pill status-pill--admin">
                                      админ
                                    </span>
                                    <Button
                                      className="super-user-panel__roster-action"
                                      disabled={busy}
                                      onClick={() =>
                                        void handleSetRosterAdmin(r.roster_id, false)
                                      }
                                    >
                                      Снять
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                          {memberRosters.length > 0 && (
                            <>
                              <h4 className="groups-section-title">
                                Состоит в группах
                              </h4>
                              <ul className="super-user-panel__rosters">
                                {memberRosters.map((r) => (
                                  <li
                                    key={r.roster_id}
                                    className="super-user-panel__roster-row super-user-panel__roster-row--member"
                                  >
                                    <span className="super-user-panel__roster-name">
                                      {r.title}
                                    </span>
                                    <Button
                                      className="super-user-panel__roster-action"
                                      disabled={busy}
                                      onClick={() =>
                                        void handleSetRosterAdmin(r.roster_id, true)
                                      }
                                    >
                                      Назначить админом
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </>
                      )
                    })()}

                    <h4 className="groups-section-title">Сброс пароля</h4>
                    <Input
                      label="Новый временный пароль"
                      placeholder="Пусто — сгенерировать"
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <Button variant="accent" disabled={busy} onClick={handleReset}>
                      Сбросить пароль
                    </Button>

                    {resetResult && (
                      <div className="reset-result">
                        <p className="reset-result__row">
                          <span className="reset-result__label">Пароль</span>
                          <code className="reset-result__code">
                            {resetResult.temporary_password}
                          </code>
                        </p>
                        <p className="reset-result__hint">{resetResult.login_hint}</p>
                        <Button
                          type="button"
                          onClick={() => {
                            try {
                              copyToClipboard(buildCopyText(resetResult))
                              setError('')
                              setCopied(true)
                            } catch {
                              setError('Не удалось скопировать')
                            }
                          }}
                        >
                          {copied ? 'Скопировано' : 'Скопировать для игрока'}
                        </Button>
                      </div>
                    )}

                    <div className="super-user-panel__danger">
                      <Button
                        disabled={busy}
                        onClick={() => setDeleteConfirmOpen(true)}
                      >
                        Удалить пользователя
                      </Button>
                    </div>
                  </section>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen && panelUser !== null}
        message={
          panelUser
            ? `Удалить пользователя «${panelUser.name}»? Это необратимо.`
            : ''
        }
        titleId="super-delete-confirm-title"
        busy={busy}
        onCancel={() => {
          if (!busy) setDeleteConfirmOpen(false)
        }}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}
