import { Link } from 'react-router-dom'
import { TeamAvatar } from '@/components/TeamAvatar'
import { useAuth } from '@/context/AuthContext'
import './UserProfileBar.css'

export function UserProfileBar() {
  const { user } = useAuth()

  if (!user) return null

  const nick = user.display_login ?? user.phone

  return (
    <Link to="/profile" className="user-profile-bar" aria-label="Личный кабинет">
      <TeamAvatar slug={user.favorite_team} size={44} />
      <div className="user-profile-bar__text">
        <span className="user-profile-bar__nick">{nick}</span>
        {user.role === 'super' && (
          <span className="user-profile-bar__role">супер</span>
        )}
      </div>
    </Link>
  )
}
