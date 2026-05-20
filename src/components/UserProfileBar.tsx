import { TeamAvatar } from '@/components/TeamAvatar'
import { useAuth } from '@/context/AuthContext'
import './UserProfileBar.css'

export function UserProfileBar() {
  const { user } = useAuth()

  if (!user) return null

  const nick = user.display_login ?? user.phone
  const isAdmin = user.role === 'admin'

  return (
    <div className="user-profile-bar">
      <TeamAvatar slug={user.favorite_team} size={44} />
      <div className="user-profile-bar__text">
        <span className="user-profile-bar__nick">{nick}</span>
        {isAdmin && <span className="user-profile-bar__role">админ</span>}
      </div>
    </div>
  )
}
