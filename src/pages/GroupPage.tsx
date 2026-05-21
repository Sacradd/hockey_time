import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { castVote, fetchGameDetail, startVote, stopVote } from '@/api/games'
import { ApiError } from '@/api/http'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { groupLabel } from '@/lib/formatDate'
import { positionLabel } from '@/lib/labels'
import type { GameDetailResponse, GameLineup, GamePublic, LineupMember } from '@/types/games'
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
    inList(lineup.goalie_reserve, 'Вы в резерве (вратарь)') ??
    inList(lineup.field_declined, 'Вы отметили, что не едете') ??
    inList(lineup.goalie_declined, 'Вы отметили, что не едете') ??
    inList(lineup.field_pending, 'Вы ещё не ответили') ??
    inList(lineup.goalie_pending, 'Вы ещё не ответили') ??
    null
  )
}

function LineupSection({
  title,
  members,
  emptyHint,
}: {
  title: string
  members: LineupMember[]
  emptyHint?: string
}) {
  if (members.length === 0 && !emptyHint) return null
  return (
    <>
      <h2 className="groups-section-title">
        {title}
        {members.length > 0 ? ` (${members.length})` : ''}
      </h2>
      {members.length === 0 ? (
        <p className="groups-page__empty">{emptyHint}</p>
      ) : (
        <ul className="members-list">
          {members.map((m) => (
            <li key={m.user_id}>
              <div className="neo-surface member-row">
                <div>
                  <div className="member-row__name">{m.name}</div>
                  <div className="member-row__sub">
                    {positionLabel(m.position)}
                    {m.voted_at ? ` · ${formatEndsAt(m.voted_at)}` : ''}
                  </div>
                </div>
              </div>
            </li>
          ))}
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

  async function handleStopVote() {
    if (!token || adminBusy || !confirm('Закрыть голосование?')) return
    setAdminBusy(true)
    setError('')
    try {
      const res = await stopVote(token, gameId)
      setGame(res.game)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка')
    } finally {
      setAdminBusy(false)
    }
  }

  const myChoice = myVote?.choice
  const myStatus =
    user && lineup ? findMyLineupStatus(lineup, user.id) : null
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
        </header>
      )}

      {loading && <p className="groups-page__empty">Загрузка…</p>}
      {error && <p className="groups-page__error">{error}</p>}

      {!loading && myStatus && (
        <p
          className={`my-game-status neo-surface ${
            myStatus.startsWith('Вы в игре') || myStatus.startsWith('Вы в резерве')
              ? 'my-game-status--ok'
              : 'my-game-status--muted'
          }`}
        >
          {myStatus}
        </p>
      )}

      {!loading && game && !game.vote_open && !game.vote_active && (
        <p className="groups-page__empty">Голосование закрыто</p>
      )}

      {!loading && game?.vote_open && game.vote_labels.length > 0 && (
        <section className="vote-panel neo-surface">
          <h2 className="vote-panel__title">Ваш ответ</h2>
          <div className="vote-panel__buttons">
            {game.vote_labels.map((opt) => (
              <Button
                key={opt.choice}
                variant={myChoice === opt.choice ? 'accent' : 'default'}
                className="vote-panel__btn"
                disabled={voteBusy}
                onClick={() => handleVote(opt.choice)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          {myVote && (
            <p className="vote-panel__hint">Можно изменить ответ до конца голосования</p>
          )}
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
          {game.vote_active && (
            <Button onClick={handleStopVote} disabled={adminBusy}>
              Закрыть голосование
            </Button>
          )}
        </section>
      )}

      {!loading && lineup && (
        <>
          <LineupSection title="В игру · полевые" members={lineup.field_lineup} />
          <LineupSection
            title="Резерв · полевые"
            members={lineup.field_reserve}
            emptyHint="Резерв пуст"
          />
          <LineupSection title="Вратари" members={lineup.goalie_lineup} />
          <LineupSection
            title="Резерв · вратари"
            members={lineup.goalie_reserve}
            emptyHint=""
          />
          <LineupSection title="Не едут" members={lineup.field_declined} />
          <LineupSection title="Не едут · вратари" members={lineup.goalie_declined} />
          <LineupSection
            title="Ещё не ответили"
            members={[...lineup.field_pending, ...lineup.goalie_pending]}
          />
        </>
      )}
    </div>
  )
}
