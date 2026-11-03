import React from 'react'
import { useAuthStore } from '../../stores/authStore'

interface UIGuardProps {
  children: React.ReactNode
  allowedRoles: string[]
}

export default function UIGuard({ children, allowedRoles }: UIGuardProps) {
  const { user } = useAuthStore()
  const userRoles = user?.roles?.map((r) => r.name) || []

  const hasAccess = allowedRoles.some((role) => userRoles.includes(role))

  return hasAccess ? <>{children}</> : null
}