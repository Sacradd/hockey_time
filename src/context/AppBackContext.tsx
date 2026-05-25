import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AppBackOverride = {
  onBack: () => void
  disabled?: boolean
}

type AppBackContextValue = {
  override: AppBackOverride | null
  setOverride: (value: AppBackOverride | null) => void
}

const AppBackContext = createContext<AppBackContextValue | null>(null)

export function AppBackProvider({ children }: { children: ReactNode }) {
  const [override, setOverrideState] = useState<AppBackOverride | null>(null)
  const setOverride = useCallback((value: AppBackOverride | null) => {
    setOverrideState(value)
  }, [])

  const value = useMemo(
    () => ({ override, setOverride }),
    [override, setOverride]
  )

  return (
    <AppBackContext.Provider value={value}>{children}</AppBackContext.Provider>
  )
}

export function useAppBackOverride() {
  const ctx = useContext(AppBackContext)
  if (!ctx) {
    throw new Error('useAppBackOverride must be used within AppBackProvider')
  }
  return ctx
}

/** Регистрация своего «Назад» (например, сохранение перед уходом). */
export function useRegisterAppBack(override: AppBackOverride | null) {
  const { setOverride } = useAppBackOverride()
  const onBack = override?.onBack
  const disabled = override?.disabled

  useEffect(() => {
    if (!onBack) {
      setOverride(null)
      return
    }
    setOverride({ onBack, disabled })
    return () => setOverride(null)
  }, [onBack, disabled, setOverride])
}
