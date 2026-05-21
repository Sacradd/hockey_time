import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  deleteUser,
  fetchAllUsers,
  resetUserPassword,
  setRosterAdmin,
  type ResetPasswordResult,
  type SuperUserListItem,
} from '@/api/admin'
import { ApiError } from '@/api/http'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import '@/pages/Groups.css'

function buildCopyText(res: ResetPasswordResult): string {
  const lines = [
    `Телефон: ${res.phone_display}`,
    res.display_login ? `Ник: ${res.display_login}` : null,
    `Пароль: ${res.temporary_password}`,
    res.login_hint,
  ].filter(Boolean)
  return lines.join('\n')
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

export function SuperUsersPanel({ token }: { token: string }) {
  const navigate = useNavigate()
  const [users, setUsers] = useState<SuperUserListItem[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [tempPassword, setTempPassword] = useState('')

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

  const filtered = useMemo(
    () => users.filter((u) => matchUser(u, searchQ.trim())),
    [users, searchQ]
  )

  const selected = users.find((u) => u.user_id === selectedId) ?? null

  async function handleReset() {
    if (!selected) return
    setBusy(true)
    setError('')
    setResetResult(null)
    setCopied(false)
    try {
      const res = await resetUserPassword(token, {
        user_id: selected.user_id,
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

  async function handleDelete() {
    if (!selected) return
    if (!confirm(`Удалить пользователя «${selected.name}»? Это необратимо.`)) return
    setBusy(true)
    setError('')
    try {
      await deleteUser(token, selected.user_id)
      setSelectedId(null)
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
          +
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
            <li key={u.user_id}>
              <button
                type="button"
                className={`neo-surface member-row reset-user-pick${
                  selectedId === u.user_id ? ' reset-user-pick--active' : ''
                }`}
                onClick={() => {
                  setSelectedId(u.user_id)
                  setResetResult(null)
                  setCopied(false)
                  setError('')
                }}
              >
                <div>
                  <div className="member-row__name">{u.name}</div>
                  <div className="member-row__sub">
                    {u.phone_display}
                    {u.display_login ? ` · @${u.display_login}` : ''}
                    {u.is_active ? ' · активен' : ' · не активирован'}
                    {u.rosters.some((r) => r.is_admin) ? ' · админ группы' : ''}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <section className="super-user-panel neo-surface">
          <h3 className="super-user-panel__title">{selected.name}</h3>
          <p className="groups-page__user">
            {selected.phone_display}
            {selected.display_login ? ` · @${selected.display_login}` : ''}
          </p>

          <h4 className="groups-section-title">Админ группы</h4>
          {selected.rosters.length === 0 ? (
            <p className="groups-page__empty">
              Не в группах — админ добавит из пула в свою группу
            </p>
          ) : (
            <ul className="super-user-panel__rosters">
              {selected.rosters.map((r) => (
                <li key={r.roster_id}>
                  <label className="neo-check neo-check--compact">
                    <input
                      type="checkbox"
                      checked={r.is_admin}
                      disabled={busy}
                      onChange={async (e) => {
                        setBusy(true)
                        setError('')
                        try {
                          await setRosterAdmin(token, {
                            roster_id: r.roster_id,
                            user_id: selected.user_id,
                            is_admin: e.target.checked,
                          })
                          setUsers((prev) =>
                            prev.map((u) =>
                              u.user_id === selected.user_id
                                ? {
                                    ...u,
                                    rosters: u.rosters.map((x) =>
                                      x.roster_id === r.roster_id
                                        ? { ...x, is_admin: e.target.checked }
                                        : x
                                    ),
                                  }
                                : u
                            )
                          )
                        } catch (err) {
                          setError(
                            err instanceof ApiError ? err.message : 'Ошибка'
                          )
                        } finally {
                          setBusy(false)
                        }
                      }}
                    />
                    <span>{r.title}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

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
                <code className="reset-result__code">{resetResult.temporary_password}</code>
              </p>
              <p className="reset-result__hint">{resetResult.login_hint}</p>
              <Button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(buildCopyText(resetResult))
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
            <Button disabled={busy} onClick={handleDelete}>
              Удалить пользователя
            </Button>
          </div>
        </section>
      )}
    </>
  )
}
