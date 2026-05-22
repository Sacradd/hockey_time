import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ADD_QUEUE_GUEST,
  addGuestToQueue,
  castVote,
  fetchGameDetail,
  markPlayerInLineup,
  markPlayerNotGoing,
  setLineupQueuePosition,
  startPayment,
  startVote,
} from '@/api/games'
import { ApiError } from '@/api/http'
import { fetchRosterMembers } from '@/api/rosters'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { MemberSwipeRow } from '@/components/MemberSwipeRow'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { validateDisplayLogin } from '@/lib/displayLogin'
import { groupLabel } from '@/lib/formatDate'
import { positionLabel } from '@/lib/labels'
import type { GameDetailResponse, GameLineup, GamePublic, LineupMember } from '@/types/games'
import type { RosterMember } from '@/types/groups'
import './Groups.css'

function formatEndsAt(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function findMyLineupStatus(
  lineup: GameLineup,
  userId: number
): string | null {
  const inList = (list: LineupMember[], label: string) =>
    list.some((m) => m.user_id === userId) ? label : null

  return (
    inList(lineup.field_lineup, 'Вы в игре (полевой)') ??
    inList(lineup.field_reserve, 'Вы в резерве (полевой)') ??
    inList(lineup.goalie_lineup, 'Вы в игре (вратарь)') ??
    inList(lineup.goalie_reserve, 'Вратари в игре уже набраны') ??
    inList(lineup.field_declined, 'Вы отметили, что не едете') ??
    inList(lineup.goalie_declined, 'Вы отметили, что не едете') ??
    inList(lineup.field_pending, 'Вы ещё не ответили') ??
    inList(lineup.goalie_pending, 'Вы ещё не ответили') ??
    null
  )
}

function myGameStatusClass(status: string): string {
  if (status.startsWith('Вы в игре') || status.startsWith('Вы в резерве')) {
    return 'my-game-status--ok'
  }
  if (status === 'Вы отметили, что не едете') {
    return 'my-game-status--declined'
  }
  return 'my-game-status--muted'
}

function fieldLineupCountClass(count: number): string {
  if (count >= 20) return 'lineup-count--full'
  if (count >= 16) return 'lineup-count--salad'
  if (count >= 14) return 'lineup-count--mid'
  return 'lineup-count--low'
}

/** Следующее свободное место в очереди полевых «еду». */
function nextFieldQueuePosition(lineup: GameLineup): number {
  const inQueue = [...lineup.field_lineup, ...lineup.field_reserve]
  if (inQueue.length === 0) return 1
  const orders = inQueue
    .map((m) => m.queue_order)
    .filter((n): n is number => n != null && n > 0)
  if (orders.length === 0) return inQueue.length + 1
  return Math.max(...orders) + 1
}

function LineupSection({
  title,
  members,
  emptyHint,
  countClass,
  showCount = true,
  showQueueAdmin = false,
  onRemove,
  onPositionClick,
  onRestore,
  headerAction,
  panelBelowTitle,
}: {
  title: string
  members: LineupMember[]
  emptyHint?: string
  countClass?: string
  showCount?: boolean
  showQueueAdmin?: boolean
  onRemove?: (member: LineupMember) => void
  onPositionClick?: (member: LineupMember) => void
  /** Свайп «В состав» для «не едут» */
  onRestore?: (member: LineupMember) => void
  headerAction?: React.ReactNode
  panelBelowTitle?: React.ReactNode
}) {
  if (members.length === 0 && !emptyHint && !headerAction) return null

  const showCountBadge = showCount && members.length > 0

  return (
    <>
      <div className="lineup-section-head">
        <h2
          className={
            showCountBadge
              ? 'groups-section-title lineup-section-title'
              : 'groups-section-title groups-section-title--inline'
          }
        >
          {showCountBadge ? (
            <>
              <span className="lineup-section-title__label">{title}</span>
              <span className="lineup-section-title__sep" aria-hidden="true">
                —
              </span>
              <span className={countClass ? `lineup-count ${countClass}` : 'lineup-count'}>
                {members.length}
              </span>
            </>
          ) : (
            title
          )}
        </h2>
        {headerAction}
      </div>
      {panelBelowTitle}
      {members.length === 0 ? (
        <p className="groups-page__empty">{emptyHint}</p>
      ) : (
        <ul className="members-list">
          {members.map((m) => {
            const row = (
              <div className="neo-surface member-row member-row--lineup">
                {m.queue_order != null &&
                  (showQueueAdmin && onPositionClick ? (
                    <button
                      type="button"
                      className="lineup-queue-badge lineup-queue-badge--editable"
                      onClick={() => onPositionClick(m)}
                      aria-label={`Позиция ${m.queue_order}, изменить`}
                    >
                      {m.queue_order}
                    </button>
                  ) : (
                    <span className="lineup-queue-badge" aria-hidden>
                      {m.queue_order}
                    </span>
                  ))}
                <div className="member-row__body">
                  <div className="member-row__name">
                    {m.name}
                    {m.is_guest && (
                      <span className="status-pill status-pill--guest member-row__guest-badge">
                        Гость
                      </span>
                    )}
                  </div>
                  <div className="member-row__sub">
                    {positionLabel(m.position === 'goalie' ? 'goalie' : 'player')}
                    {m.voted_at ? ` · ${formatEndsAt(m.voted_at)}` : ''}
                  </div>
                </div>
              </div>
            )

            if (showQueueAdmin && onRemove) {
              return (
                <MemberSwipeRow
                  key={m.user_id}
                  variant="danger"
                  removeLabel={m.is_guest ? 'Удалить' : 'Выбыл'}
                  onRemove={() => onRemove(m)}
                >
                  {row}
                </MemberSwipeRow>
              )
            }

            if (onRestore) {
              return (
                <MemberSwipeRow
                  key={m.user_id}
                  variant="success"
                  removeLabel="В состав"
                  onRemove={() => onRestore(m)}
                >
                  {row}
                </MemberSwipeRow>
              )
            }

            return (
              <li key={m.user_id}>
                {row}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

export function GroupPage() {
  const { id } = useParams()
  const gameId = Number(id)
  const { token, user } = useAuth()

  const [game, setGame] = useState<GamePublic | null>(null)
  const [myVote, setMyVote] = useState<GameDetailResponse['my_vote']>(null)
  const [lineup, setLineup] = useState<GameLineup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [voteBusy, setVoteBusy] = useState(false)

  const [showStart, setShowStart] = useState(false)
  const [label1, setLabel1] = useState('Еду')
  const [label2, setLabel2] = useState('Не еду')
  const [label3, setLabel3] = useState('')
  const [goOption, setGoOption] = useState(1)
  const [hours, setHours] = useState('48')
  const [adminBusy, setAdminBusy] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<LineupMember | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<LineupMember | null>(null)
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [rosterMembers, setRosterMembers] = useState<RosterMember[]>([])
  const [addUserId, setAddUserId] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestNameError, setGuestNameError] = useState('')
  const [guestMemberPosition, setGuestMemberPosition] = useState<'player' | 'goalie'>('player')
  const [addPosition, setAddPosition] = useState('1')
  const [queueBusy, setQueueBusy] = useState(false)
  const [showAddToQueue, setShowAddToQueue] = useState(false)

  const load = useCallback(() => {
    if (!token || !Number.isFinite(gameId) || gameId < 1) return
    setLoading(true)
    setError('')
    fetchGameDetail(token, gameId)
      .then((res) => {
        setGame(res.game)
        setMyVote(res.my_vote)
        setLineup(res.lineup)
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Не удалось загрузить игру')
      })
      .finally(() => setLoading(false))
  }, [token, gameId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!token || !game?.roster_id || !game.can_manage) return
    fetchRosterMembers(token, game.roster_id)
      .then((res) => setRosterMembers(res.members))
      .catch(() => setRosterMembers([]))
  }, [token, game?.roster_id, game?.can_manage])

  useEffect(() => {
    if (showAddToQueue && lineup && guestMemberPosition === 'player') {
      setAddPosition(String(nextFieldQueuePosition(lineup)))
    }
  }, [showAddToQueue, lineup, guestMemberPosition])

  async function handleVote(choice: number) {
    if (!token || voteBusy) return
    setVoteBusy(true)
    setError('')
    try {
      const res = await castVote(token, gameId, choice)
      setMyVote(res.vote)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось проголосовать')
    } finally {
      setVoteBusy(false)
    }
  }

  async function handleStartVote(e: React.FormEvent) {
    e.preventDefault()
    if (!token || adminBusy) return
    setAdminBusy(true)
    setError('')
    try {
      const res = await startVote(token, {
        game_id: gameId,
        vote_label_1: label1.trim(),
        vote_label_2: label2.trim(),
        vote_label_3: label3.trim() || undefined,
        vote_go_option: goOption,
        hours: Math.min(168, Math.max(1, parseInt(hours, 10) || 48)),
      })
      setGame(res.game)
      setShowStart(false)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось запустить голосование')
    } finally {
      setAdminBusy(false)
    }
  }

  async function handleConfirmRestore() {
    if (!token || !restoreTarget || restoreBusy) return
    setRestoreBusy(true)
    setError('')
    try {
      const res = await markPlayerInLineup(token, gameId, restoreTarget.user_id)
      setLineup(res.lineup)
      setRestoreTarget(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось вернуть в состав')
    } finally {
      setRestoreBusy(false)
    }
  }

  async function handleConfirmRemove() {
    if (!token || !removeTarget || removeBusy) return
    setRemoveBusy(true)
    setError('')
    try {
      const res = await markPlayerNotGoing(token, gameId, removeTarget.user_id)
      setLineup(res.lineup)
      setRemoveTarget(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отметить выбывшим')
    } finally {
      setRemoveBusy(false)
    }
  }

  async function applyQueuePosition(userId: number, position: number) {
    if (!token || queueBusy) return
    setQueueBusy(true)
    setError('')
    try {
      const res = await setLineupQueuePosition(token, gameId, userId, position)
      setLineup(res.lineup)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось изменить очередь')
    } finally {
      setQueueBusy(false)
    }
  }

  function handlePositionClick(member: LineupMember) {
    const raw = prompt(
      `Позиция в очереди для «${member.name}»`,
      String(member.queue_order ?? 1)
    )
    if (raw === null) return
    const position = parseInt(raw.trim(), 10)
    if (!Number.isFinite(position) || position < 1) return
    void applyQueuePosition(member.user_id, position)
  }

  function validateGuestNameInput(name: string): string {
    const formatErr = validateDisplayLogin(name)
    if (formatErr) return formatErr
    const lower = name.trim().toLowerCase()
    if (rosterMembers.some((m) => m.name.trim().toLowerCase() === lower)) {
      return 'Такой ник уже есть в группе'
    }
    if (lineup) {
      const onGame = [
        ...lineup.field_lineup,
        ...lineup.field_reserve,
        ...lineup.field_declined,
        ...lineup.field_pending,
      ].some((m) => m.name.trim().toLowerCase() === lower)
      if (onGame) return 'Такое имя уже в списке на эту игру'
    }
    return ''
  }

  async function handleAddToQueue(e: React.FormEvent) {
    e.preventDefault()
    if (!token || queueBusy) return
    const position = parseInt(addPosition, 10)
    const isGuest = addUserId === ADD_QUEUE_GUEST
    const guestIsField = isGuest && guestMemberPosition === 'player'

    if (!isGuest && (!position || position < 1)) {
      setError('Укажите позицию от 1')
      return
    }
    if (guestIsField && (!position || position < 1)) {
      setError('Укажите позицию в очереди от 1')
      return
    }

    if (isGuest) {
      const nameErr = validateGuestNameInput(guestName)
      if (nameErr) {
        setGuestNameError(nameErr)
        return
      }
      setGuestNameError('')
      setQueueBusy(true)
      setError('')
      try {
        const res = await addGuestToQueue(
          token,
          gameId,
          guestName.trim(),
          guestMemberPosition === 'goalie' ? 1 : position,
          guestMemberPosition
        )
        setLineup(res.lineup)
        setGuestName('')
        setGuestMemberPosition('player')
        setAddUserId('')
        setShowAddToQueue(false)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Не удалось добавить гостя')
      } finally {
        setQueueBusy(false)
      }
      return
    }

    const userId = parseInt(addUserId, 10)
    if (!userId) {
      setError('Выберите игрока или гостя')
      return
    }
    await applyQueuePosition(userId, position)
    setAddUserId('')
    setShowAddToQueue(false)
  }

  async function handleStartPayment() {
    if (
      !token ||
      adminBusy ||
      !confirm('Запустить требование об оплате? Голосование будет закрыто.')
    ) {
      return
    }
    setAdminBusy(true)
    setError('')
    try {
      const res = await startPayment(token, gameId)
      setGame(res.game)
      load()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Не удалось запустить оплату'
      )
    } finally {
      setAdminBusy(false)
    }
  }

  const myStatus =
    user && lineup ? findMyLineupStatus(lineup, user.id) : null
  const canManageLineup = !!game?.can_manage
  const inFieldQueue = new Set(
    lineup
      ? [...lineup.field_lineup, ...lineup.field_reserve].map((m) => m.user_id)
      : []
  )
  const addablePlayers = rosterMembers.filter(
    (m) => m.position !== 'goalie' && !inFieldQueue.has(m.user_id)
  )
  const lineupAdminProps = canManageLineup
    ? {
        showQueueAdmin: true as const,
        onRemove: (m: LineupMember) => setRemoveTarget(m),
        onPositionClick: handlePositionClick,
      }
    : {}

  const goLabels = [
    { n: 1, text: label1.trim() || 'Вариант 1' },
    { n: 2, text: label2.trim() || 'Вариант 2' },
    ...(label3.trim() ? [{ n: 3, text: label3.trim() }] : []),
  ]

  return (
    <div className="groups-page">
      <Link to="/home" className="neo-btn groups-page__back">
        ← На главную
      </Link>

      {game && (
        <header className="groups-page__header">
          <h1 className="groups-page__title">{groupLabel(game.group_date, game.title)}</h1>
          <p className="groups-page__user">
            {game.roster_title}
            {game.roster_venue ? ` · ${game.roster_venue}` : ''}
          </p>
          {game.vote_open && game.vote_ends_at && (
            <p className="groups-page__user">До {formatEndsAt(game.vote_ends_at)}</p>
          )}
          {game.payment_active && !game.vote_active && (
            <p className="groups-page__user vote-admin__status">Оплата</p>
          )}
        </header>
      )}

      {loading && <p className="groups-page__empty">Загрузка…</p>}
      {error && <p className="groups-page__error">{error}</p>}

      {!loading && myStatus && (
        <p className={`my-game-status neo-surface ${myGameStatusClass(myStatus)}`}>
          {myStatus}
        </p>
      )}

      {!loading && game && !game.vote_open && !game.vote_active && (
        <p className="groups-page__empty">Голосование закрыто</p>
      )}

      {!loading && game?.vote_open && game.vote_labels.length > 0 && !myVote && (
        <section className="vote-panel neo-surface">
          <div className="vote-panel__buttons">
            {game.vote_labels.map((opt) => (
              <Button
                key={opt.choice}
                variant="default"
                className="vote-panel__btn"
                disabled={voteBusy}
                onClick={() => handleVote(opt.choice)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </section>
      )}

      {!loading && game?.can_manage && (
        <section className="vote-admin">
          {!game.vote_active && !showStart && (
            <Button variant="accent" onClick={() => setShowStart(true)}>
              Запустить голосование
            </Button>
          )}
          {showStart && !game.vote_active && (
            <form className="vote-admin__form neo-surface" onSubmit={handleStartVote}>
              <Input
                label="Вариант «еду»"
                value={label1}
                onChange={(e) => setLabel1(e.target.value)}
                required
              />
              <Input
                label="Вариант «не еду»"
                value={label2}
                onChange={(e) => setLabel2(e.target.value)}
                required
              />
              <Input
                label="Третий вариант (необязательно)"
                value={label3}
                onChange={(e) => setLabel3(e.target.value)}
              />
              <fieldset className="vote-admin__go">
                <legend className="vote-admin__go-legend">Вариант «еду в состав»</legend>
                {goLabels.map((opt) => (
                  <label key={opt.n} className="vote-admin__go-opt">
                    <input
                      type="radio"
                      name="goOption"
                      checked={goOption === opt.n}
                      onChange={() => setGoOption(opt.n)}
                    />
                    {opt.text}
                  </label>
                ))}
              </fieldset>
              <Input
                label="Часов на голосование"
                type="number"
                min={1}
                max={168}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
              <div className="vote-admin__actions">
                <Button type="submit" variant="accent" disabled={adminBusy}>
                  Старт
                </Button>
                <Button type="button" onClick={() => setShowStart(false)}>
                  Отмена
                </Button>
              </div>
            </form>
          )}
          {game.vote_active && !game.payment_active && (
            <Button variant="accent" onClick={handleStartPayment} disabled={adminBusy}>
              Требование об оплате
            </Button>
          )}
          {game.payment_active && !game.vote_active && (
            <p className="groups-page__user vote-admin__status">
              Требование об оплате активно
            </p>
          )}
          <p className="groups-page__user roster-members-hint vote-admin__hint">
            Цифра — место в очереди (нажмите, чтобы изменить).
            <br />
            Для управления составом — свайп.
          </p>
        </section>
      )}

      <ConfirmDialog
        open={removeTarget !== null}
        message={
          removeTarget
            ? removeTarget.is_guest
              ? `Вы уверены в удалении «${removeTarget.name}»?`
              : `${removeTarget.name} выбыл из «еду»? Игрок попадёт в «не едут», состав пересчитается.`
            : ''
        }
        onConfirm={() => void handleConfirmRemove()}
        onCancel={() => !removeBusy && setRemoveTarget(null)}
        busy={removeBusy}
      />

      <ConfirmDialog
        open={restoreTarget !== null}
        message={
          restoreTarget
            ? `Вернуть ${restoreTarget.name} в состав? Место в очереди — по времени занесения.`
            : ''
        }
        onConfirm={() => void handleConfirmRestore()}
        onCancel={() => !restoreBusy && setRestoreTarget(null)}
        busy={restoreBusy}
      />

      {!loading && lineup && (
        <>
          <LineupSection
            title="В игре · вратари"
            members={lineup.goalie_lineup}
            showCount={false}
            showQueueAdmin={canManageLineup}
            onRemove={canManageLineup ? (m) => setRemoveTarget(m) : undefined}
          />
          <LineupSection
            title="В игре · полевые"
            members={lineup.field_lineup}
            countClass={fieldLineupCountClass(lineup.field_lineup.length)}
            emptyHint={lineup.field_lineup.length === 0 ? 'Пока никого в основе' : undefined}
            headerAction={
              canManageLineup ? (
                <button
                  type="button"
                  className="super-add-player-btn super-add-player-btn--accent"
                  aria-label="Добавить в очередь"
                  aria-expanded={showAddToQueue}
                  onClick={() => {
                    setShowAddToQueue((open) => {
                      if (!open && lineup) {
                        setAddPosition(String(nextFieldQueuePosition(lineup)))
                      }
                      return !open
                    })
                  }}
                >
                  <span className="super-add-player-btn__glyph" aria-hidden>
                    +
                  </span>
                </button>
              ) : undefined
            }
            panelBelowTitle={
              canManageLineup && showAddToQueue ? (
                <form
                  className="lineup-queue-add neo-surface"
                  onSubmit={(e) => void handleAddToQueue(e)}
                >
                  <label className="lineup-queue-add__field">
                    <span className="lineup-queue-add__label">Игрок</span>
                    <select
                      className="neo-input lineup-queue-add__select"
                      value={addUserId}
                      onChange={(e) => {
                        setAddUserId(e.target.value)
                        setGuestNameError('')
                        if (e.target.value !== ADD_QUEUE_GUEST) {
                          setGuestName('')
                          setGuestMemberPosition('player')
                        }
                      }}
                      required
                    >
                      <option value="">Выберите…</option>
                      {addablePlayers.map((m) => (
                        <option key={m.user_id} value={String(m.user_id)}>
                          {m.name}
                        </option>
                      ))}
                      <option value={ADD_QUEUE_GUEST}>Гость</option>
                    </select>
                  </label>
                  {addUserId === ADD_QUEUE_GUEST && (
                    <>
                      <Input
                        label="Имя гостя"
                        value={guestName}
                        onChange={(e) => {
                          setGuestName(e.target.value)
                          setGuestNameError(
                            e.target.value.trim() ? validateGuestNameInput(e.target.value) : ''
                          )
                        }}
                        autoComplete="off"
                        required
                      />
                      {guestNameError && (
                        <p className="lineup-queue-add__field-error">{guestNameError}</p>
                      )}
                      <div className="lineup-queue-add__field">
                        <span className="lineup-queue-add__label">Амплуа</span>
                        <div className="guest-role-toggle" role="group" aria-label="Амплуа">
                          <button
                            type="button"
                            className={`guest-role-toggle__btn${
                              guestMemberPosition === 'player'
                                ? ' guest-role-toggle__btn--active'
                                : ''
                            }`}
                            aria-pressed={guestMemberPosition === 'player'}
                            onClick={() => setGuestMemberPosition('player')}
                          >
                            Полевой
                          </button>
                          <button
                            type="button"
                            className={`guest-role-toggle__btn${
                              guestMemberPosition === 'goalie'
                                ? ' guest-role-toggle__btn--active'
                                : ''
                            }`}
                            aria-pressed={guestMemberPosition === 'goalie'}
                            onClick={() => setGuestMemberPosition('goalie')}
                          >
                            Вратарь
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  {addUserId !== ADD_QUEUE_GUEST || guestMemberPosition === 'player' ? (
                    <Input
                      label="Позиция в очереди"
                      type="number"
                      min={1}
                      value={addPosition}
                      onChange={(e) => setAddPosition(e.target.value)}
                      required
                    />
                  ) : (
                    <p className="groups-page__user lineup-queue-add__goalie-hint">
                      Вратарь встанет в очередь вратарей по времени добавления.
                    </p>
                  )}
                  <div className="lineup-queue-add__actions">
                    <Button
                      type="submit"
                      variant="accent"
                      disabled={
                        queueBusy ||
                        (addUserId === ADD_QUEUE_GUEST
                          ? !guestName.trim() || !!guestNameError
                          : !addUserId || addablePlayers.length === 0)
                      }
                    >
                      Вставить
                    </Button>
                    <Button type="button" onClick={() => setShowAddToQueue(false)}>
                      Отмена
                    </Button>
                  </div>
                </form>
              ) : null
            }
            {...lineupAdminProps}
          />
          <LineupSection
            title="Резерв · полевые"
            members={lineup.field_reserve}
            emptyHint="Резерв пуст"
            {...lineupAdminProps}
          />
          <LineupSection
            title="Не едут"
            members={lineup.field_declined}
            onRestore={canManageLineup ? (m) => setRestoreTarget(m) : undefined}
          />
          <LineupSection
            title="Не едут · вратари"
            members={lineup.goalie_declined}
            onRestore={canManageLineup ? (m) => setRestoreTarget(m) : undefined}
          />
          <LineupSection
            title="Ещё не ответили"
            members={[...lineup.field_pending, ...lineup.goalie_pending]}
          />
        </>
      )}
    </div>
  )
}
