"use client"

import { useSession } from "next-auth/react"
import { UserRole } from "@prisma/client"

export function useAuth() {
  const { data: session, status } = useSession()
  
  const isLoading = status === "loading"
  const isAuthenticated = !!session
  const user = session?.user
  
  const hasRole = (role: UserRole) => {
    return user?.role === role
  }
  
  const isAdmin = hasRole(UserRole.ADMIN)
  const isProfessional = hasRole(UserRole.PROFESSIONAL) || isAdmin
  const isEnterprise = hasRole(UserRole.ENTERPRISE) || isAdmin
  
  const hasActiveSubscription = user?.subscriptionStatus === "active"
  
  return {
    session,
    user,
    isLoading,
    isAuthenticated,
    hasRole,
    isAdmin,
    isProfessional,
    isEnterprise,
    hasActiveSubscription,
    status,
  }
}