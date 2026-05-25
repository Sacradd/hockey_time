import { useLocation } from 'react-router-dom'
import { BackButton } from '@/components/BackButton'
import { PowerOffButton } from '@/components/PowerOffButton'
import { useAppBackOverride } from '@/context/AppBackContext'
import { resolveAppBack } from '@/lib/appBack'
import './AppTopActions.css'

export function AppTopActions() {
  const { pathname } = useLocation()
  const { override } = useAppBackOverride()
  const routeBack = resolveAppBack(pathname)

  return (
    <div className="app-top-actions">
      {override?.onBack ? (
        <BackButton
          onClick={override.onBack}
          disabled={override.disabled}
        />
      ) : routeBack ? (
        <BackButton to={routeBack.to} />
      ) : null}
      <PowerOffButton />
    </div>
  )
}
