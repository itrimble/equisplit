"use client"

import { useAuth } from "@/hooks/useAuth"
import { UserRole } from "@prisma/client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: UserRole
  requiresSubscription?: boolean
  fallback?: React.ReactNode
}

export function AuthGuard({
  children,
  requiredRole,
  requiresSubscription = false,
  fallback = <div>Loading...</div>,
}: AuthGuardProps) {
  const { isLoading, isAuthenticated, hasRole, hasActiveSubscription } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/signin")
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return <>{fallback}</>
  }

  if (!isAuthenticated) {
    return <>{fallback}</>
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  if (requiresSubscription && !hasActiveSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription Required</h1>
          <p className="text-gray-600 mb-4">
            This feature requires an active subscription.
          </p>
          <button
            onClick={() => router.push("/pricing")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            View Pricing
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}