import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createGame, deleteRoster, removeMember } from '@/api/admin'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { MemberSwipeRow } from '@/components/MemberSwipeRow'
import { fetchRosterGames, fetchRosterMembers } from '@/api/rosters'
import { ApiError } from '@/api/http'
import { Button } from '@/components/ui/Button'
import { DateInput } from '@/components/ui/DateInput'
import { useAuth } from '@/context/AuthContext'
import { groupLabel } from '@/lib/formatDate'
import { positionLabel } from '@/lib/labels'
import { nextWeekdayDate } from '@/lib/nextWeekday'
import type { GameSummary, Roster, RosterMember } from '@/types/groups'
import './Groups.css'

export function RosterPage() {
  const { id } = useParams()
  const rosterId = Number(id)
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [canManage, setCanManage] = useState(false)
  const [showCreateGame, setShowCreateGame] = useState(false)
  const [gameDate, setGameDate] = useState('')
  const [createBusy, setCreateBusy] = useState(false)

  const [roster, setRoster] = useState<Roster | null>(null)
  const [members, setMembers] = useState<RosterMember[]>([])
  const [games, setGames] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removeTarget, setRemoveTarget] = useState<{
    user_id: number
    name: string
  } | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [deleteRosterOpen, setDeleteRosterOpen] = useState(false)
  const [deleteRosterBusy, setDeleteRosterBusy] = useState(false)

  useEffect(() => {
    if (!token || !Number.isFinite(rosterId)) return
    let cancelled = false
    setLoading(true)

    Promise.all([
      fetchRosterMembers(token, rosterId),
      fetchRosterGames(token, rosterId),
    ])
      .then(([memRes, gamesRes]) => {
        if (!cancelled) {
          const r = memRes.roster as Roster
          setRoster(r)
          setMembers(memRes.members)
          setGames(gamesRes.games)
          setCanManage(!!memRes.can_manage)
          if (r.weekday !== null) {
            setGameDate(nextWeekdayDate(r.weekday))
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Ошибка загрузки')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, rosterId])

  return (
    <div className="groups-page">
      <Link to="/home" className="neo-btn groups-page__back">
        ← Назад
      </Link>

      {roster && (
        <header className="groups-page__header">
          <h1 className="groups-page__title">{roster.title}</h1>
          <p className="groups-page__user">{roster.venue ?? 'Пул участников'}</p>
        </header>
      )}

      <h2 className="groups-section-title">Игры</h2>

      {canManage && !showCreateGame && (
        <Button variant="accent" onClick={() => setShowCreateGame(true)}>
          + Игра на дату
        </Button>
      )}

      {canManage && showCreateGame && (
        <form
          className="vote-admin__form neo-surface"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!token || createBusy || !gameDate) return
            setCreateBusy(true)
            setError('')
            try {
              const res = await createGame(token, { roster_id: rosterId, date: gameDate })
              navigate(`/groups/${res.game.id}`)
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Не удалось создать игру')
            } finally {
              setCreateBusy(false)
            }
          }}
        >
          <DateInput
            label="Дата"
            value={gameDate}
            onChange={setGameDate}
            required
          />
          <div className="vote-admin__actions">
            <Button type="submit" variant="accent" disabled={createBusy}>
              Создать
            </Button>
            <Button type="button" onClick={() => setShowCreateGame(false)}>
              Отмена
            </Button>
          </div>
        </form>
      )}

      {loading && <p className="groups-page__empty">Загрузка…</p>}
      {error && <p className="groups-page__error">{error}</p>}

      {!loading && games.length === 0 && (
        <p className="groups-page__empty">Пока нет игр на даты</p>
      )}

      <ul className="groups-list">
        {games.map((g) => (
          <li key={g.id} className="groups-list__item">
            <Link to={`/groups/${g.id}`} className="neo-surface group-card">
              <span className="group-card__date">{groupLabel(g.group_date, g.title)}</span>
              {g.vote_active && (
                <span className="group-card__badge group-card__badge--active">голосование</span>
              )}
              {g.payment_active && (
                <span className="group-card__badge group-card__badge--active">оплата</span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <div className="groups-section-head">
        <h2 className="groups-section-title groups-section-title--inline">
          Участники группы
        </h2>
        {canManage && (
          <Link
            to={`/rosters/${rosterId}/add-player`}
            className="super-add-player-btn super-add-player-btn--accent"
            aria-label="Добавить игрока"
          >
            <span className="super-add-player-btn__glyph" aria-hidden>
              +
            </span>
          </Link>
        )}
      </div>
      {canManage && (
        <p className="groups-page__user roster-members-hint">
          Свайп влево — удалить из группы.
        </p>
      )}
      <ul className="members-list">
        {members.map((m) => {
          const row = (
            <div className="neo-surface member-row">
              <div>
                <div className="member-row__name">
                  {m.name}
                  {m.is_admin && (
                    <span className="status-pill status-pill--guest member-row__admin-badge">
                      админ
                    </span>
                  )}
                </div>
                <div className="member-row__sub">
                  {positionLabel(m.position)}
                  {!m.is_active ? ' · не активирован' : ''}
                </div>
              </div>
              <span
                className={`status-pill ${m.position === 'goalie' ? 'status-pill--guest' : 'status-pill--actual'}`}
              >
                {positionLabel(m.position)}
              </span>
            </div>
          )

          if (!canManage) {
            return <li key={m.user_id}>{row}</li>
          }

          return (
            <MemberSwipeRow
              key={m.user_id}
              disabled={m.user_id === user?.id}
              onRemove={() => {
                if (m.user_id === user?.id) {
                  setError('Нельзя удалить себя из группы')
                  return
                }
                setRemoveTarget({ user_id: m.user_id, name: m.name })
              }}
            >
              {row}
            </MemberSwipeRow>
          )
        })}
      </ul>

      {canManage && (
        <div className="roster-delete-group">
          <button
            type="button"
            className="roster-delete-group__btn"
            disabled={deleteRosterBusy}
            onClick={() => setDeleteRosterOpen(true)}
          >
            Удалить группу
          </button>
        </div>
      )}

      <ConfirmDialog
        open={removeTarget !== null}
        message={
          removeTarget
            ? `Удалить «${removeTarget.name}» из группы?`
            : ''
        }
        titleId="roster-remove-confirm-title"
        busy={removeBusy}
        onCancel={() => {
          if (!removeBusy) setRemoveTarget(null)
        }}
        onConfirm={async () => {
          if (!token || !removeTarget || removeBusy) return
          setRemoveBusy(true)
          setError('')
          try {
            await removeMember(token, rosterId, removeTarget.user_id)
            setMembers((prev) =>
              prev.filter((x) => x.user_id !== removeTarget.user_id)
            )
            setRemoveTarget(null)
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Не удалось удалить')
          } finally {
            setRemoveBusy(false)
          }
        }}
      />

      <ConfirmDialog
        open={deleteRosterOpen}
        message="Вы уверены в удалении группы?"
        titleId="roster-delete-confirm-title"
        busy={deleteRosterBusy}
        cancelDanger
        onCancel={() => {
          if (!deleteRosterBusy) setDeleteRosterOpen(false)
        }}
        onConfirm={async () => {
          if (!token || deleteRosterBusy) return
          setDeleteRosterBusy(true)
          setError('')
          try {
            await deleteRoster(token, rosterId)
            setDeleteRosterOpen(false)
            navigate('/home', { replace: true })
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Не удалось удалить группу')
          } finally {
            setDeleteRosterBusy(false)
          }
        }}
      />
    </div>
  )
}
