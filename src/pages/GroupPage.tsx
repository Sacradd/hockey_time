import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ADD_QUEUE_GUEST,
  addGuestToQueue,
  castVote,
  confirmPayment,
  deleteGame,
  fetchGameDetail,
  markPlayerInLineup,
  markPlayerNotGoing,
  markPlayerPayment,
  setLineupQueuePosition,
  startPayment,
  startVote,
  updateGame,
} from '@/api/games'
import { ApiError } from '@/api/http'
import { fetchRosterMembers } from '@/api/rosters'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { GameEditModal } from '@/components/GameEditModal'
import { InfoHint } from '@/components/InfoHint'
import { InputDialog } from '@/components/InputDialog'
import { MemberSwipeRow } from '@/components/MemberSwipeRow'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { validateDisplayLogin } from '@/lib/displayLogin'
import { groupLabel } from '@/lib/formatDate'
import { weekdayFromIsoDate } from '@/lib/weekdays'
import { PositionPill } from '@/components/PositionPill'
import type {
  GameDetailResponse,
  GameLineup,
  GamePublic,
  LineupMember,
  MyPayment,
} from '@/types/games'
import type { RosterMember } from '@/types/groups'
import './Groups.css'

function findMyLineupMember(
  lineup: GameLineup,
  userId: number
): LineupMember | undefined {
  const all = [
    ...lineup.field_lineup,
    ...lineup.field_reserve,
    ...lineup.field_declined,
    ...lineup.field_pending,
    ...lineup.goalie_lineup,
    ...lineup.goalie_reserve,
    ...lineup.goalie_declined,
    ...lineup.goalie_pending,
  ]
  return all.find((m) => m.user_id === userId)
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
  if (status === 'Вы в игре (вратарь)') {
    return 'my-game-status--success'
  }
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
  titleLeading,
  showPaymentBadge = false,
  onPaymentClick,
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
  titleLeading?: React.ReactNode
  /** Кружок ₽ у полевых (админ, при активной оплате) */
  showPaymentBadge?: boolean
  onPaymentClick?: (member: LineupMember) => void
}) {
  if (members.length === 0 && !emptyHint && !headerAction) return null

  const showCountBadge = showCount && members.length > 0

  return (
    <>
      <div className="lineup-section-head">
        <div className="lineup-section-head__main">
          {titleLeading}
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
        </div>
        {headerAction}
      </div>
      {panelBelowTitle}
      {members.length === 0 ? (
        <p className="groups-page__empty">{emptyHint}</p>
      ) : (
        <ul className="members-list members-list--compact">
          {members.map((m) => {
            const row = (
              <div className="neo-surface member-row member-row--lineup member-row--compact">
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
                  <span className="member-row__name">
                    {m.name}
                    {m.is_guest && (
                      <span className="status-pill status-pill--guest member-row__guest-badge">
                        Гость
                      </span>
                    )}
                  </span>
                </div>
                <PositionPill position={m.position} />
                {showPaymentBadge && m.position !== 'goalie' && (
                  m.paid ? (
                    <span
                      className="lineup-pay-badge lineup-pay-badge--paid"
                      aria-label="Оплатил"
                      title="Оплатил"
                    >
                      ₽
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="lineup-pay-badge"
                      aria-label={`Отметить оплату: ${m.name}`}
                      title="Отметить оплату"
                      onClick={() => onPaymentClick?.(m)}
                    >
                      ₽
                    </button>
                  )
                )}
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
  const navigate = useNavigate()
  const gameId = Number(id)
  const { token, user } = useAuth()

  const [game, setGame] = useState<GamePublic | null>(null)
  const [myVote, setMyVote] = useState<GameDetailResponse['my_vote']>(null)
  const [myPayment, setMyPayment] = useState<MyPayment | null>(null)
  const [lineup, setLineup] = useState<GameLineup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [voteBusy, setVoteBusy] = useState(false)

  const [showStart, setShowStart] = useState(false)
  const [startVoteConfirmOpen, setStartVoteConfirmOpen] = useState(false)
  const [adminPaymentConfirmOpen, setAdminPaymentConfirmOpen] = useState(false)
  const [playerPaymentConfirmOpen, setPlayerPaymentConfirmOpen] = useState(false)
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [markPaymentTarget, setMarkPaymentTarget] = useState<LineupMember | null>(null)
  const [markPaymentBusy, setMarkPaymentBusy] = useState(false)
  const [queueEditTarget, setQueueEditTarget] = useState<LineupMember | null>(null)
  const [queueEditPosition, setQueueEditPosition] = useState('')
  const [queueEditError, setQueueEditError] = useState('')
  const [label1, setLabel1] = useState('Еду')
  const [label2, setLabel2] = useState('Не еду')
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
  const [gameEditOpen, setGameEditOpen] = useState(false)
  const [deleteGameConfirmOpen, setDeleteGameConfirmOpen] = useState(false)
  const [gameEditBusy, setGameEditBusy] = useState(false)
  const [gameEditError, setGameEditError] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editWeekday, setEditWeekday] = useState('3')

  const load = useCallback(() => {
    if (!token || !Number.isFinite(gameId) || gameId < 1) return
    setLoading(true)
    setError('')
    fetchGameDetail(token, gameId)
      .then((res) => {
        setGame(res.game)
        setMyVote(res.my_vote)
        setMyPayment(res.my_payment ?? null)
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
        vote_go_option: 1,
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

  async function applyQueuePosition(userId: number, position: number): Promise<boolean> {
    if (!token || queueBusy) return false
    setQueueBusy(true)
    setError('')
    try {
      const res = await setLineupQueuePosition(token, gameId, userId, position)
      setLineup(res.lineup)
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось изменить очередь')
      return false
    } finally {
      setQueueBusy(false)
    }
  }

  function handlePositionClick(member: LineupMember) {
    setQueueEditError('')
    setQueueEditPosition(String(member.queue_order ?? 1))
    setQueueEditTarget(member)
  }

  function closeQueueEditDialog() {
    if (queueBusy) return
    setQueueEditTarget(null)
    setQueueEditError('')
  }

  function handleConfirmQueueEdit() {
    if (!queueEditTarget || queueBusy) return
    const position = parseInt(queueEditPosition.trim(), 10)
    if (!Number.isFinite(position) || position < 1) {
      setQueueEditError('Укажите позицию от 1')
      return
    }
    setQueueEditError('')
    void applyQueuePosition(queueEditTarget.user_id, position).then((ok) => {
      if (ok) setQueueEditTarget(null)
    })
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

  async function handleConfirmAdminMarkPayment() {
    if (!token || !markPaymentTarget || markPaymentBusy) return
    setMarkPaymentBusy(true)
    setError('')
    setMarkPaymentTarget(null)
    try {
      const res = await markPlayerPayment(token, gameId, markPaymentTarget.user_id)
      setLineup(res.lineup)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отметить оплату')
    } finally {
      setMarkPaymentBusy(false)
    }
  }

  async function handleConfirmPlayerPayment() {
    if (!token || paymentBusy) return
    setPaymentBusy(true)
    setError('')
    setPlayerPaymentConfirmOpen(false)
    try {
      const res = await confirmPayment(token, gameId)
      setMyPayment(res.payment)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось подтвердить оплату')
    } finally {
      setPaymentBusy(false)
    }
  }

  async function handleStartPayment() {
    if (!token || adminBusy) return
    setAdminBusy(true)
    setAdminPaymentConfirmOpen(false)
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

  useEffect(() => {
    if (!gameEditOpen || !game) return
    setEditTitle(game.title ?? '')
    setEditDate(game.group_date)
    setEditTime(game.game_time ?? '')
    setEditWeekday(
      game.weekday !== null
        ? String(game.weekday)
        : String(weekdayFromIsoDate(game.group_date))
    )
  }, [gameEditOpen, game])

  function openGameEdit() {
    if (!game) return
    setGameEditError('')
    setGameEditOpen(true)
  }

  function closeGameEdit() {
    if (gameEditBusy) return
    setGameEditOpen(false)
    setGameEditError('')
  }

  async function handleSaveGameEdit() {
    if (!token || !game || gameEditBusy || !editDate) return
    setGameEditBusy(true)
    setGameEditError('')
    try {
      const res = await updateGame(token, {
        game_id: gameId,
        date: editDate,
        title: editTitle,
        game_time: editTime,
        weekday: parseInt(editWeekday, 10),
      })
      setGame(res.game)
      setGameEditOpen(false)
    } catch (err) {
      setGameEditError(
        err instanceof ApiError ? err.message : 'Не удалось сохранить игру'
      )
    } finally {
      setGameEditBusy(false)
    }
  }

  async function handleConfirmDeleteGame() {
    if (!token || !game || gameEditBusy) return
    setGameEditBusy(true)
    setError('')
    try {
      const res = await deleteGame(token, gameId)
      setDeleteGameConfirmOpen(false)
      setGameEditOpen(false)
      navigate(`/rosters/${res.roster_id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось удалить игру')
      setDeleteGameConfirmOpen(false)
    } finally {
      setGameEditBusy(false)
    }
  }

  const myStatus =
    user && lineup ? findMyLineupStatus(lineup, user.id) : null
  const canManageLineup = !!game?.can_manage
  const showPaymentBadge = canManageLineup && !!game?.payment_active
  const myLineupMember =
    user && lineup ? findMyLineupMember(lineup, user.id) : undefined
  const isFieldPlayer = (myLineupMember?.position ?? user?.position) !== 'goalie'
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
        showPaymentBadge,
        onPaymentClick: (m: LineupMember) => setMarkPaymentTarget(m),
      }
    : { showPaymentBadge: false as const }

  return (
    <div className="groups-page groups-page--game">
      <Link to="/home" className="neo-btn groups-page__back">
        ← На главную
      </Link>

      {game && (
        <header className="groups-page__header">
          <div className="groups-page__title-row">
            <h1 className="groups-page__title">
              {groupLabel(game.group_date, game.title, {
                gameTime: game.game_time,
                weekday: game.weekday,
              })}
            </h1>
            {game.can_manage && (
              <button
                type="button"
                className="profile-edit-btn"
                onClick={openGameEdit}
                aria-label="Редактировать игру"
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
            )}
          </div>
          <p className="groups-page__user">
            {game.roster_title}
            {game.roster_venue ? ` · ${game.roster_venue}` : ''}
          </p>
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

      {!loading && game?.payment_active && !game.can_manage && isFieldPlayer && !myPayment && (
        <section className="payment-panel">
          <Button
            variant="accent"
            className="payment-panel__btn"
            disabled={paymentBusy}
            onClick={() => setPlayerPaymentConfirmOpen(true)}
          >
            Подтверждение оплаты
          </Button>
        </section>
      )}

      {!loading && game?.payment_active && !game.can_manage && isFieldPlayer && myPayment && (
        <p className="my-game-status neo-surface my-game-status--success">
          Оплата подтверждена
        </p>
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
            <Button variant="accent" onClick={() => setStartVoteConfirmOpen(true)}>
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
            <Button
              variant="accent"
              onClick={() => setAdminPaymentConfirmOpen(true)}
              disabled={adminBusy}
            >
              Требование об оплате
            </Button>
          )}
          {game.payment_active && (
            <p className="groups-page__user vote-admin__status">
              Требование об оплате отправлено
            </p>
          )}
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

      <ConfirmDialog
        open={startVoteConfirmOpen}
        message="Запустить голосование для этой игры?"
        titleId="start-vote-confirm-title"
        onConfirm={() => {
          setStartVoteConfirmOpen(false)
          setShowStart(true)
        }}
        onCancel={() => setStartVoteConfirmOpen(false)}
      />

      <ConfirmDialog
        open={adminPaymentConfirmOpen}
        message="Запустить требование об оплате? Голосование продолжится."
        titleId="start-payment-confirm-title"
        busy={adminBusy}
        onConfirm={() => void handleStartPayment()}
        onCancel={() => !adminBusy && setAdminPaymentConfirmOpen(false)}
      />

      <ConfirmDialog
        open={playerPaymentConfirmOpen}
        message="Подтверждаете оплату?"
        titleId="player-payment-confirm-title"
        busy={paymentBusy}
        onConfirm={() => void handleConfirmPlayerPayment()}
        onCancel={() => !paymentBusy && setPlayerPaymentConfirmOpen(false)}
      />

      <ConfirmDialog
        open={markPaymentTarget !== null}
        message={
          markPaymentTarget
            ? `Вы уверены в оплате от ${markPaymentTarget.name}?`
            : ''
        }
        titleId="admin-mark-payment-title"
        busy={markPaymentBusy}
        onConfirm={() => void handleConfirmAdminMarkPayment()}
        onCancel={() => !markPaymentBusy && setMarkPaymentTarget(null)}
      />

      <GameEditModal
        open={gameEditOpen}
        title={editTitle}
        date={editDate}
        time={editTime}
        weekday={editWeekday}
        error={gameEditError}
        busy={gameEditBusy}
        onTitleChange={setEditTitle}
        onDateChange={(d) => {
          setEditDate(d)
          setEditWeekday(String(weekdayFromIsoDate(d)))
        }}
        onTimeChange={setEditTime}
        onWeekdayChange={setEditWeekday}
        onSave={() => void handleSaveGameEdit()}
        onClose={closeGameEdit}
        onDeleteClick={() => setDeleteGameConfirmOpen(true)}
      />

      <ConfirmDialog
        open={deleteGameConfirmOpen}
        message="Точно удалить игру?"
        titleId="delete-game-confirm-title"
        busy={gameEditBusy}
        cancelDanger
        onConfirm={() => void handleConfirmDeleteGame()}
        onCancel={() => !gameEditBusy && setDeleteGameConfirmOpen(false)}
      />

      <InputDialog
        open={queueEditTarget !== null}
        message={
          queueEditTarget
            ? `Позиция в очереди для «${queueEditTarget.name}»`
            : ''
        }
        label="Место в очереди"
        value={queueEditPosition}
        onChange={setQueueEditPosition}
        error={queueEditError}
        busy={queueBusy}
        onConfirm={handleConfirmQueueEdit}
        onCancel={closeQueueEditDialog}
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
            titleLeading={
              canManageLineup ? (
                <InfoHint ariaLabel="Подсказка по управлению составом">
                  <p className="lineup-hint__text">
                    Цифра — место в очереди (нажмите, чтобы изменить).
                  </p>
                  <p className="lineup-hint__text">Для управления составом — свайп.</p>
                </InfoHint>
              ) : undefined
            }
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
            {...lineupAdminProps}
          />
          <LineupSection
            title="Не едут · вратари"
            members={lineup.goalie_declined}
            onRestore={canManageLineup ? (m) => setRestoreTarget(m) : undefined}
          />
          <LineupSection
            title="Ещё не ответили"
            members={[...lineup.field_pending, ...lineup.goalie_pending]}
            {...lineupAdminProps}
          />
        </>
      )}
    </div>
  )
}
