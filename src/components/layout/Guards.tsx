/* ==========================================================================
   MANILI — ЗАЩИТА МАРШРУТОВ (ТЗ §25)

   ВАЖНО: это только UX-слой. Он прячет интерфейс от посторонних, но не
   является защитой данных. Реальные права проверяет сервер при каждом
   запросе — клиентское состояние подделывается тривиально.
   ========================================================================== */

import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Spinner } from '@/components/ui'
import { useAuth } from '@/store/auth'

export function AuthGuard({ children }: { children: ReactNode }) {
  const user = useAuth((state) => state.user)
  const initializing = useAuth((state) => state.initializing)
  const location = useLocation()

  if (initializing) return <Spinner center />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

export function AdminGuard({ children }: { children: ReactNode }) {
  const user = useAuth((state) => state.user)
  const initializing = useAuth((state) => state.initializing)
  const location = useLocation()

  if (initializing) return <Spinner center />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
