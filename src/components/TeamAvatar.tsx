import { useState } from 'react'
import { getKhlTeam, teamIconUrl, teamLegacyIconUrl } from '@/data/khlTeams'
import './TeamAvatar.css'

interface TeamAvatarProps {
  slug: string | null | undefined
  size?: number
  className?: string
  title?: string
}

type IconSource = 'primary' | 'legacy-png'

export function TeamAvatar({ slug, size = 44, className = '', title }: TeamAvatarProps) {
  const team = getKhlTeam(slug)
  const [iconSource, setIconSource] = useState<IconSource>('primary')
  const [imgFailed, setImgFailed] = useState(false)

  const style = { width: size, height: size }
  const label = title ?? team?.name

  if (!team) {
    return (
      <div
        className={`team-avatar team-avatar--empty ${className}`.trim()}
        style={style}
        title={label}
        aria-hidden={!label}
      >
        <span className="team-avatar__fallback">🏒</span>
      </div>
    )
  }

  const imgSrc =
    iconSource === 'primary' ? teamIconUrl(team.slug) : teamLegacyIconUrl(team.slug)

  return (
    <div
      className={`team-avatar ${className}`.trim()}
      style={style}
      title={label}
      aria-label={label}
    >
      {!imgFailed ? (
        <img
          className="team-avatar__img"
          src={imgSrc}
          alt=""
          onError={() => {
            if (iconSource === 'primary') {
              setIconSource('legacy-png')
              return
            }
            setImgFailed(true)
          }}
        />
      ) : (
        <span
          className="team-avatar__badge"
          style={{ background: team.color }}
          aria-hidden="true"
        >
          {team.abbr}
        </span>
      )}
    </div>
  )
}
