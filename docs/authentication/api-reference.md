# Authentication API Reference

## Core Authentication Functions

### Server-Side Authentication

#### `auth()`
Get the current session on the server side.

```typescript
import { auth } from "@/lib/auth"

export default async function ServerPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/auth/signin")
  }
  
  return <ProtectedContent user={session.user} />
}
```

#### `signIn()`
Initiate sign-in flow with various providers.

```typescript
import { signIn } from "@/lib/auth"

// OAuth provider sign-in
await signIn("google", { redirectTo: "/dashboard" })
await signIn("apple", { redirectTo: "/dashboard" })
await signIn("microsoft-entra-id", { redirectTo: "/dashboard" })

// Email sign-in
await signIn("email", { 
  email: "user@example.com",
  redirectTo: "/dashboard" 
})
```

#### `signOut()`
Sign out the current user.

```typescript
import { signOut } from "@/lib/auth"

await signOut({ redirectTo: "/" })
```

### Client-Side Hooks

#### `useAuth()`
Custom hook for client-side authentication state.

```typescript
import { useAuth } from "@/hooks/useAuth"

export function UserProfile() {
  const { 
    user, 
    isAuthenticated, 
    isLoading,
    hasRole,
    isProfessional,
    isEnterprise,
    isAdmin,
    hasActiveSubscription
  } = useAuth()
  
  if (isLoading) return <LoadingSpinner />
  if (!isAuthenticated) return <SignInPrompt />
  
  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      {isProfessional && <ProfessionalFeatures />}
      {hasActiveSubscription && <PremiumContent />}
    </div>
  )
}
```

#### `useSession()` (NextAuth)
Native NextAuth hook for session management.

```typescript
import { useSession } from "next-auth/react"

export function SessionInfo() {
  const { data: session, status } = useSession()
  
  if (status === "loading") return <p>Loading...</p>
  if (status === "unauthenticated") return <p>Not signed in</p>
  
  return <p>Signed in as {session?.user?.email}</p>
}
```

## API Endpoints

### Authentication Endpoints

All authentication endpoints are handled by NextAuth.js:

```
GET  /api/auth/providers      # Available providers
GET  /api/auth/session        # Current session
POST /api/auth/signin         # Sign in
POST /api/auth/signout        # Sign out
GET  /api/auth/callback/:id   # OAuth callbacks
```

### Session Data Structure

```typescript
interface Session {
  user: {
    id: string
    email: string
    name?: string
    image?: string
    role: UserRole
    subscriptionStatus: string
    emailVerified: Date
  }
  expires: string
}
```

### User Roles

```typescript
enum UserRole {
  USER = "USER"
  PROFESSIONAL = "PROFESSIONAL"  
  ENTERPRISE = "ENTERPRISE"
  ADMIN = "ADMIN"
}
```

## Authentication Components

### AuthGuard
Protect pages and components with role-based access control.

```typescript
import { AuthGuard } from "@/components/auth/auth-guard"
import { UserRole } from "@prisma/client"

// Protect entire page
export default function ProtectedPage() {
  return (
    <AuthGuard requiredRole={UserRole.PROFESSIONAL}>
      <ProfessionalContent />
    </AuthGuard>
  )
}

// Require active subscription
export default function PremiumPage() {
  return (
    <AuthGuard requiresSubscription={true}>
      <PremiumContent />
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

### UserMenu
User authentication menu with avatar and dropdown.

```typescript
import { UserMenu } from "@/components/auth/user-menu"

export function Header() {
  return (
    <header>
      <nav>
        <UserMenu />
      </nav>
    </header>
  )
}
```

### SessionProvider
Wrap your app to provide session context.

```typescript
import { SessionProvider } from "@/components/auth/session-provider"

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  return (
    <html>
      <body>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

## Usage Examples

### Protecting API Routes

```typescript
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }
  
  // Check role
  if (session.user.role !== "PROFESSIONAL") {
    return new Response("Forbidden", { status: 403 })
  }
  
  return Response.json({ data: "Protected data" })
}
```

### Conditional Rendering

```typescript
import { useAuth } from "@/hooks/useAuth"

export function ConditionalFeatures() {
  const { isAuthenticated, isProfessional, hasActiveSubscription } = useAuth()
  
  return (
    <div>
      {isAuthenticated ? (
        <div>
          <UserDashboard />
          {isProfessional && <ProfessionalFeatures />}
          {hasActiveSubscription && <PremiumFeatures />}
        </div>
      ) : (
        <SignInPrompt />
      )}
    </div>
  )
}
```

### Form Actions with Authentication

```typescript
import { auth, signIn } from "@/lib/auth"

export default function SignInForm() {
  return (
    <form
      action={async (formData: FormData) => {
        "use server"
        const email = formData.get("email") as string
        await signIn("email", { 
          email,
          redirectTo: "/dashboard" 
        })
      }}
    >
      <input name="email" type="email" required />
      <button type="submit">Sign In</button>
    </form>
  )
}
```

### Middleware Route Protection

```typescript
// middleware.ts
import { auth } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const session = await auth()
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth")
  const isProtectedPage = request.nextUrl.pathname.startsWith("/dashboard")
  
  // Redirect unauthenticated users
  if (!session && isProtectedPage) {
    const signInUrl = new URL("/auth/signin", request.url)
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }
  
  // Redirect authenticated users away from auth pages
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
}
```

## Error Handling

### Authentication Errors

```typescript
// Handle sign-in errors
try {
  await signIn("google")
} catch (error) {
  if (error.type === "OAuthSignin") {
    // Handle OAuth configuration error
  } else if (error.type === "OAuthCallback") {
    // Handle OAuth callback error
  }
}
```

### Session Validation

```typescript
import { auth } from "@/lib/auth"

export async function validateSession() {
  try {
    const session = await auth()
    return session
  } catch (error) {
    console.error("Session validation failed:", error)
    return null
  }
}
```

## TypeScript Types

### Session Type Extensions

```typescript
// types/next-auth.d.ts
import { UserRole } from "@prisma/client"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
      subscriptionStatus: string
      emailVerified: Date
    } & DefaultSession["user"]
  }

  interface User {
    role: UserRole
    subscriptionStatus: string
    emailVerified: Date
  }
}
```

### Custom Hook Types

```typescript
interface UseAuthReturn {
  session: Session | null
  user: User | undefined
  isLoading: boolean
  isAuthenticated: boolean
  hasRole: (role: UserRole) => boolean
  isAdmin: boolean
  isProfessional: boolean
  isEnterprise: boolean
  hasActiveSubscription: boolean
  status: "loading" | "authenticated" | "unauthenticated"
}
```

## Testing

### Mock Authentication

```typescript
// __mocks__/auth.ts
export const mockAuth = jest.fn()
export const mockSignIn = jest.fn()
export const mockSignOut = jest.fn()

// Test setup
import { mockAuth } from "@/__mocks__/auth"

beforeEach(() => {
  mockAuth.mockResolvedValue({
    user: {
      id: "test-user",
      email: "test@example.com",
      role: "USER"
    }
  })
})
```

### Testing Protected Components

```typescript
import { render, screen } from "@testing-library/react"
import { useAuth } from "@/hooks/useAuth"
import ProtectedComponent from "./ProtectedComponent"

jest.mock("@/hooks/useAuth")

test("renders content for authenticated user", () => {
  (useAuth as jest.Mock).mockReturnValue({
    isAuthenticated: true,
    user: { name: "Test User" }
  })
  
  render(<ProtectedComponent />)
  expect(screen.getByText("Welcome, Test User")).toBeInTheDocument()
})
```

*Last updated: December 15, 2024*