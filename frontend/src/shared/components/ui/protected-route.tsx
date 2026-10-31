import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import {
  getAccessToken,
  getCurrentUser,
  getDashboardPathForRole,
  restoreAuthSession,
  type AuthUser,
  type UserRole,
} from '@shared/api'

interface ProtectedRouteProps {
  readonly allowedRoles?: readonly UserRole[]
}

/**
 * Layout route wrapper that restricts child routes to authenticated users
 * and optionally enforces role-based access control.
 */
export function ProtectedRoute({
  allowedRoles,
}: Readonly<ProtectedRouteProps>) {
  const location = useLocation()
  const activeUser = getAccessToken() ? getCurrentUser() : null

  const [checkedPathname, setCheckedPathname] = useState<string | null>(null)
  const [restoredUser, setRestoredUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    if (activeUser) {
      return
    }

    let active = true
    void restoreAuthSession().then((user) => {
      if (active) {
        setRestoredUser(user)
        setCheckedPathname(location.pathname)
      }
    })

    return () => {
      active = false
    }
  }, [activeUser, location.pathname])

  const user =
    activeUser ?? (checkedPathname === location.pathname ? restoredUser : null)

  if (!user && checkedPathname !== location.pathname) {
    return (
      <div
        id="protected-route-loading"
        aria-busy="true"
        className="min-h-screen bg-background"
      />
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />
  }

  return <Outlet />
}
