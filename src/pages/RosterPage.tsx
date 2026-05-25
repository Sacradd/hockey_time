import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createGame, deleteRoster, removeMember, updateRoster } from '@/api/admin'
import { archiveGame, deleteGame } from '@/api/games'
import { AdminGameListItem } from '@/components/AdminGameListItem'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { InfoHint } from '@/components/InfoHint'
import { RosterEditModal } from '@/components/RosterEditModal'
import { MemberSwipeRow, SWIPE_JOKE_CLOSE_GUARD_MS } from '@/components/MemberSwipeRow'
import { fetchRosterGames, fetchRosterMembers } from '@/api/rosters'
import { ApiError } from '@/api/http'
import { Button } from '@/components/ui/Button'
import { DateInput } from '@/components/ui/DateInput'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { PositionPill } from '@/components/PositionPill'
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
  const [gameTitle, setGameTitle] = useState('')
  const [gameDate, setGameDate] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [rosterEditOpen, setRosterEditOpen] = useState(false)
  const [editRosterTitle, setEditRosterTitle] = useState('')
  const [rosterEditBaseline, setRosterEditBaseline] = useState('')
  const [rosterEditBusy, setRosterEditBusy] = useState(false)
  const [rosterEditError, setRosterEditError] = useState('')

  const [roster, setRoster] = useState<Roster | null>(null)
  const [members, setMembers] = useState<RosterMember[]>([])
  const [games, setGames] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removeTarget, setRemoveTarget] = useState<{
    user_id: number
    name: string
  } | null>(null)
  const [pendingGameAction, setPendingGameAction] = useState<
    | { type: 'delete'; game: GameSummary }
    | { type: 'archive'; game: GameSummary }
    | null
  >(null)
  const [gameActionBusy, setGameActionBusy] = useState(false)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [deleteRosterOpen, setDeleteRosterOpen] = useState(false)
  const [deleteRosterBusy, setDeleteRosterBusy] = useState(false)
  const [selfJokeOpen, setSelfJokeOpen] = useState(false)
  const selfJokeOpenedAt = useRef(0)

  useEffect(() => {
    if (!selfJokeOpen) return
    const close = () => {
      if (Date.now() - selfJokeOpenedAt.current < SWIPE_JOKE_CLOSE_GUARD_MS) {
        return
      }
      setSelfJokeOpen(false)
    }
    document.addEventListener('pointerdown', close, true)
    document.addEventListener('touchstart', close, true)
    return () => {
      document.removeEventListener('pointerdown', close, true)
      document.removeEventListener('touchstart', close, true)
    }
  }, [selfJokeOpen])

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

  function openRosterEdit() {
    if (!roster) return
    setRosterEditError('')
    setRosterEditBaseline(roster.title)
    setEditRosterTitle(roster.title)
    setRosterEditOpen(true)
  }

  function closeRosterEdit() {
    if (rosterEditBusy) return
    setRosterEditOpen(false)
    setRosterEditError('')
  }

  async function handleSaveRosterEdit() {
    if (!token || !roster || rosterEditBusy || !editRosterTitle.trim()) return
    setRosterEditBusy(true)
    setRosterEditError('')
    try {
      const res = await updateRoster(token, {
        roster_id: rosterId,
        title: editRosterTitle.trim(),
      })
      setRoster(res.roster)
      setRosterEditOpen(false)
    } catch (err) {
      setRosterEditError(
        err instanceof ApiError ? err.message : 'Не удалось сохранить группу'
      )
    } finally {
      setRosterEditBusy(false)
    }
  }

  return (
    <div className="groups-page">
      <header className="roster-page__toolbar">
        {roster ? (
          <div className="roster-name-plate">
            <h1 className="roster-name-plate__title">{roster.title}</h1>
          </div>
        ) : (
          <p className="roster-page__toolbar-loading groups-page__empty">
            {loading ? 'Загрузка…' : ''}
          </p>
        )}
        {roster && canManage ? (
          <button
            type="button"
            className="profile-edit-btn"
            onClick={openRosterEdit}
            aria-label="Редактировать группу"
            title="Редактировать"
          >
            <svg
              className="profile-edit-btn__icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.12L14.62 3.5a1.5 1.5 0 0 0-2.12 0L4 12v8z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
              <path
                d="M13.5 6.5l4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : (
          <span className="roster-page__toolbar-spacer" aria-hidden />
        )}
      </header>

      <h2 className="groups-section-title">Игры</h2>

      {canManage && (
        <p className="roster-members-hint">
          Свайп влево по игре — удалить или в архив.
        </p>
      )}

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
              const title = gameTitle.trim()
              const res = await createGame(token, {
                roster_id: rosterId,
                date: gameDate,
                title: title || undefined,
              })
              navigate(`/groups/${res.game.id}`)
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Не удалось создать игру')
            } finally {
              setCreateBusy(false)
            }
          }}
        >
          <Input
            label="Название"
            value={gameTitle}
            onChange={(e) => setGameTitle(e.target.value)}
            placeholder="Можно оставить пустым"
            autoComplete="off"
          />
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
          <AdminGameListItem
            key={g.id}
            game={g}
            canManage={canManage}
            showRosterMeta={false}
            onDelete={(game) => setPendingGameAction({ type: 'delete', game })}
            onArchive={(game) => setPendingGameAction({ type: 'archive', game })}
          />
        ))}
      </ul>

      <div className="groups-section-head">
        <div className="groups-section-head__main">
          {canManage && (
            <InfoHint ariaLabel="Подсказка по удалению из группы">
              <p className="lineup-hint__text">Свайп влево — удалить из группы.</p>
            </InfoHint>
          )}
          <h2 className="groups-section-title groups-section-title--inline">
            Участники группы
          </h2>
        </div>
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
                {!m.is_active && (
                  <div className="member-row__sub">
                    <span className="member-row__inactive">не активирован</span>
                  </div>
                )}
              </div>
              <PositionPill position={m.position} />
            </div>
          )

          if (!canManage) {
            return <li key={m.user_id}>{row}</li>
          }

          const isSelf = m.user_id === user?.id
          const openSelfJoke = () => {
            selfJokeOpenedAt.current = Date.now()
            setSelfJokeOpen(true)
          }

          return (
            <MemberSwipeRow
              key={m.user_id}
              blockSwipe={isSelf}
              jokeOpen={isSelf && selfJokeOpen}
              jokeMessage={isSelf ? 'Ну себя то зачем удалять)' : undefined}
              onSwipeReveal={isSelf ? openSelfJoke : undefined}
              onRemove={() => {
                if (isSelf) {
                  openSelfJoke()
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

      <RosterEditModal
        open={rosterEditOpen}
        title={editRosterTitle}
        initialTitle={rosterEditBaseline}
        error={rosterEditError}
        busy={rosterEditBusy}
        onTitleChange={setEditRosterTitle}
        onSave={() => void handleSaveRosterEdit()}
        onClose={closeRosterEdit}
        onDeleteClick={() => setDeleteRosterOpen(true)}
      />

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
        open={pendingGameAction?.type === 'delete'}
        message="Удалить игру? Данные по ней будут стёрты."
        titleId="roster-delete-game-title"
        busy={gameActionBusy}
        onConfirm={async () => {
          if (!token || !pendingGameAction || pendingGameAction.type !== 'delete') return
          setGameActionBusy(true)
          setError('')
          try {
            await deleteGame(token, pendingGameAction.game.id)
            setGames((list) => list.filter((g) => g.id !== pendingGameAction.game.id))
            setPendingGameAction(null)
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Не удалось удалить игру')
          } finally {
            setGameActionBusy(false)
          }
        }}
        onCancel={() => !gameActionBusy && setPendingGameAction(null)}
      />

      <ConfirmDialog
        open={pendingGameAction?.type === 'archive'}
        message="Отправить игру в архив? Она пропадёт из списка."
        titleId="roster-archive-game-title"
        busy={gameActionBusy}
        onConfirm={async () => {
          if (!token || !pendingGameAction || pendingGameAction.type !== 'archive') return
          setGameActionBusy(true)
          setError('')
          try {
            await archiveGame(token, pendingGameAction.game.id)
            setGames((list) => list.filter((g) => g.id !== pendingGameAction.game.id))
            setPendingGameAction(null)
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Не удалось отправить в архив')
          } finally {
            setGameActionBusy(false)
          }
        }}
        onCancel={() => !gameActionBusy && setPendingGameAction(null)}
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
            setRosterEditOpen(false)
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
