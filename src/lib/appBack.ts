/** Куда ведёт кнопка «Назад» в шапке (по URL). */
export function resolveAppBack(pathname: string): { to: string } | null {
  if (pathname === '/home' || pathname === '/profile') {
    return null
  }

  const addPlayer = pathname.match(/^\/rosters\/(\d+)\/add-player\/?$/)
  if (addPlayer) {
    return { to: `/rosters/${addPlayer[1]}` }
  }

  if (/^\/rosters\/\d+\/?$/.test(pathname)) {
    return { to: '/home' }
  }

  if (/^\/groups\/\d+\/?$/.test(pathname)) {
    return { to: '/home' }
  }

  const profileRoster = pathname.match(/^\/profile\/rosters\/(\d+)\/?$/)
  if (profileRoster) {
    return { to: '/profile' }
  }

  if (pathname === '/admin/create-user') {
    return { to: '/home' }
  }

  return null
}
