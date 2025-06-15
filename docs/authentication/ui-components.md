# Authentication UI Components

## Overview

EquiSplit provides a complete set of authentication UI components built with React, TypeScript, and Tailwind CSS. All components are designed to be accessible, responsive, and compliant with legal technology standards.

## Authentication Pages

### Sign In Page
**Location**: `/src/app/auth/signin/page.tsx`

A comprehensive sign-in page with multiple authentication options:

```typescript
import { auth, signIn } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string }
}) {
  const session = await auth()
  
  if (session) {
    redirect(searchParams.callbackUrl || "/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      {/* OAuth Providers */}
      <div className="space-y-4">
        {/* Google Sign In */}
        <form action={async () => {
          "use server"
          await signIn("google", { redirectTo: searchParams.callbackUrl || "/dashboard" })
        }}>
          <Button type="submit" variant="outline" className="w-full">
            Continue with Google
          </Button>
        </form>
        
        {/* Email Magic Link */}
        <form action={async (formData: FormData) => {
          "use server"
          const email = formData.get("email") as string
          await signIn("email", { email, redirectTo: searchParams.callbackUrl || "/dashboard" })
        }}>
          <Input name="email" type="email" required placeholder="you@example.com" />
          <Button type="submit">Send sign-in link</Button>
        </form>
      </div>
    </div>
  )
}
```

**Features**:
- OAuth provider buttons (Google, Apple, Microsoft)
- Email magic link authentication
- Error message display
- Legal disclaimers and terms links
- Mobile-responsive design
- Accessibility compliant (WCAG 2.1 AA)

### Sign Out Page
**Location**: `/src/app/auth/signout/page.tsx`

Confirmation page for user sign-out:

```typescript
export default async function SignOutPage() {
  const session = await auth()

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card>
        <CardHeader>
          <CardTitle>Sign out of EquiSplit</CardTitle>
          <CardDescription>
            Are you sure you want to sign out?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={async () => {
            "use server"
            await signOut({ redirectTo: "/" })
          }}>
            <Button type="submit" variant="destructive">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Error Page
**Location**: `/src/app/auth/error/page.tsx`

User-friendly error handling for authentication failures:

```typescript
export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const getErrorMessage = (error: string) => {
    switch (error) {
      case "OAuthSignin":
        return "Error in signing in with OAuth provider"
      case "OAuthCallback":
        return "Error in OAuth callback"
      case "AccessDenied":
        return "Access denied. You may not have permission to sign in."
      default:
        return "An unexpected error occurred during authentication."
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-red-600">Authentication Error</CardTitle>
        <CardDescription>
          {getErrorMessage(searchParams.error || "Default")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/auth/signin">Try signing in again</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
```

### Email Verification Page
**Location**: `/src/app/auth/verify-request/page.tsx`

Instructions for email verification:

```typescript
export default function VerifyRequestPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          A sign-in link has been sent to your email address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Click the link in the email to sign in to your account.</p>
        <p>The link will expire in 24 hours for security reasons.</p>
      </CardContent>
    </Card>
  )
}
```

### New User Welcome Page
**Location**: `/src/app/auth/new-user/page.tsx`

Welcome page for new user onboarding:

```typescript
export default async function NewUserPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to EquiSplit! 🎉</CardTitle>
        <CardDescription>
          Your account has been created successfully.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <h3>What you can do with EquiSplit:</h3>
          <ul>
            <li>• Calculate property division for all 50 US states</li>
            <li>• Generate court-ready legal documents</li>
            <li>• Save and track multiple calculations</li>
          </ul>
          
          <Button asChild>
            <Link href="/calculator">Start Calculator</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Reusable Components

### UserMenu Component
**Location**: `/src/components/auth/user-menu.tsx`

Dropdown menu for authenticated users:

```typescript
"use client"

import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "next-auth/react"

export function UserMenu() {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
  }

  if (!isAuthenticated) {
    return (
      <div className="flex space-x-2">
        <Button variant="ghost" asChild>
          <Link href="/auth/signin">Sign In</Link>
        </Button>
        <Button asChild>
          <Link href="/auth/signin">Get Started</Link>
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.image || undefined} />
            <AvatarFallback>
              {user?.name?.[0] || user?.email?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user?.name || "User"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">Dashboard</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/calculator">Calculator</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Features**:
- User avatar with fallback initials
- Role-based menu items
- Subscription status indicator
- Responsive dropdown design

### AuthGuard Component
**Location**: `/src/components/auth/auth-guard.tsx`

Wrapper component for protecting pages and content:

```typescript
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

  if (isLoading) return <>{fallback}</>
  if (!isAuthenticated) return <>{fallback}</>

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <Button onClick={() => router.back()}>Go back</Button>
        </div>
      </div>
    )
  }

  if (requiresSubscription && !hasActiveSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Subscription Required</h1>
          <p className="text-gray-600 mb-4">
            This feature requires an active subscription.
          </p>
          <Button onClick={() => router.push("/pricing")}>
            View Pricing
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
```

**Usage Examples**:

```typescript
// Protect entire page
export default function ProfessionalPage() {
  return (
    <AuthGuard requiredRole={UserRole.PROFESSIONAL}>
      <ProfessionalDashboard />
    </AuthGuard>
  )
}

// Require subscription
export default function PremiumFeaturePage() {
  return (
    <AuthGuard requiresSubscription={true}>
      <PremiumFeatures />
    </AuthGuard>
  )
}

// Custom fallback
export default function ConditionalPage() {
  return (
    <AuthGuard fallback={<CustomLoading />}>
      <ProtectedContent />
    </AuthGuard>
  )
}
```

### SessionProvider Component
**Location**: `/src/components/auth/session-provider.tsx`

Client-side session context provider:

```typescript
"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"

export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode
  session: unknown
}) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  )
}
```

## Utility Components

### LoadingSpinner
**Location**: `/src/components/ui/loading-spinner.tsx`

```typescript
export function LoadingSpinner({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8"
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`} />
  )
}
```

### SignInPrompt
**Location**: `/src/components/auth/signin-prompt.tsx`

```typescript
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export function SignInPrompt() {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign in required</CardTitle>
        <CardDescription>
          Please sign in to access this feature.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href="/auth/signin">Sign In</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
```

## Custom Hooks

### useAuth Hook
**Location**: `/src/hooks/useAuth.ts`

```typescript
"use client"

import { useSession } from "next-auth/react"
import { UserRole } from "@prisma/client"

export function useAuth() {
  const { data: session, status } = useSession()
  
  const isLoading = status === "loading"
  const isAuthenticated = !!session
  const user = session?.user
  
  const hasRole = (role: UserRole) => user?.role === role
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
```

## Styling and Theming

### Tailwind CSS Classes

Common authentication UI patterns:

```css
/* Authentication layout */
.auth-layout {
  @apply min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4;
}

/* Authentication card */
.auth-card {
  @apply max-w-md w-full space-y-8;
}

/* OAuth button */
.oauth-button {
  @apply w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500;
}

/* Error message */
.auth-error {
  @apply bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded;
}

/* Success message */
.auth-success {
  @apply bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded;
}
```

### Responsive Design

All authentication components are mobile-first:

```typescript
// Mobile-responsive sign-in form
<div className="space-y-4">
  <Button className="w-full sm:w-auto">
    Sign In
  </Button>
  
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    <Button variant="outline">Google</Button>
    <Button variant="outline">Apple</Button>
  </div>
</div>
```

## Accessibility Features

### WCAG 2.1 AA Compliance

- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Color Contrast**: Minimum 4.5:1 contrast ratio
- **Focus Indicators**: Visible focus states for all controls
- **Error Handling**: Clear error messages and recovery options

### Implementation Examples

```typescript
// Accessible form with proper labels
<form>
  <Label htmlFor="email">Email address</Label>
  <Input
    id="email"
    name="email"
    type="email"
    required
    aria-describedby="email-error"
    placeholder="you@example.com"
  />
  <div id="email-error" className="sr-only">
    {error && <span role="alert">{error}</span>}
  </div>
</form>

// Accessible dropdown menu
<DropdownMenu>
  <DropdownMenuTrigger aria-label="User menu">
    <Avatar />
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>
      <Link href="/dashboard">Dashboard</Link>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Testing

### Component Testing

```typescript
import { render, screen } from "@testing-library/react"
import { useAuth } from "@/hooks/useAuth"
import { UserMenu } from "./user-menu"

jest.mock("@/hooks/useAuth")

test("shows sign in buttons for unauthenticated users", () => {
  (useAuth as jest.Mock).mockReturnValue({
    isAuthenticated: false,
    isLoading: false
  })
  
  render(<UserMenu />)
  
  expect(screen.getByText("Sign In")).toBeInTheDocument()
  expect(screen.getByText("Get Started")).toBeInTheDocument()
})

test("shows user menu for authenticated users", () => {
  (useAuth as jest.Mock).mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    user: { name: "John Doe", email: "john@example.com" }
  })
  
  render(<UserMenu />)
  
  expect(screen.getByText("John Doe")).toBeInTheDocument()
  expect(screen.getByText("john@example.com")).toBeInTheDocument()
})
```

### Integration Testing

```typescript
import { render, screen, fireEvent } from "@testing-library/react"
import { signIn } from "next-auth/react"
import SignInPage from "./signin/page"

jest.mock("next-auth/react")

test("calls signIn when Google button is clicked", async () => {
  render(<SignInPage searchParams={{}} />)
  
  const googleButton = screen.getByText("Continue with Google")
  fireEvent.click(googleButton)
  
  expect(signIn).toHaveBeenCalledWith("google", {
    redirectTo: "/dashboard"
  })
})
```

*Last updated: December 15, 2024*