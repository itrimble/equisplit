# Authentication Troubleshooting Guide

## Common Issues and Solutions

### 1. OAuth Provider Configuration

#### Google OAuth Issues

**Error**: `invalid_client: The OAuth client was not found.`

**Solution**:
```bash
# Verify environment variables
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET

# Check Google Cloud Console:
# 1. Client ID matches exactly
# 2. Client secret is current
# 3. Redirect URIs are configured correctly
```

**Error**: `redirect_uri_mismatch`

**Solution**:
```bash
# Authorized redirect URIs must include:
http://localhost:3000/api/auth/callback/google  # Development
https://yourdomain.com/api/auth/callback/google # Production

# Check for:
# - Exact URL match (no trailing slashes)
# - Correct protocol (http vs https)
# - Port numbers in development
```

#### Apple OAuth Issues

**Error**: `invalid_client`

**Solution**:
```bash
# Verify Apple configuration:
# 1. Services ID is correct
# 2. Private key format is valid
# 3. Team ID and Key ID are set
# 4. Return URLs match exactly

# Private key format:
APPLE_SECRET="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----"
```

**Error**: `invalid_request: Invalid redirect_uri`

**Solution**:
```bash
# In Apple Developer Console:
# 1. Go to Services ID configuration
# 2. Configure Sign in with Apple
# 3. Add exact return URLs:
#    - http://localhost:3000/api/auth/callback/apple
#    - https://yourdomain.com/api/auth/callback/apple
```

#### Microsoft OAuth Issues

**Error**: `AADSTS50011: The reply URL specified in the request does not match`

**Solution**:
```bash
# In Azure Portal:
# 1. Go to App Registration > Authentication
# 2. Add redirect URIs:
#    - http://localhost:3000/api/auth/callback/microsoft-entra-id
#    - https://yourdomain.com/api/auth/callback/microsoft-entra-id
# 3. Enable ID tokens in Implicit grant section
```

### 2. Database Connection Issues

#### Prisma Connection Errors

**Error**: `Can't reach database server`

**Solution**:
```bash
# Check database connection
npx prisma db pull

# Verify environment variables
echo $DATABASE_URL

# Test connection
npm run db:studio
```

**Error**: `Table 'users' doesn't exist`

**Solution**:
```bash
# Run database migrations
npm run db:migrate

# Or reset and recreate
npm run db:reset
npm run db:migrate
```

#### NextAuth Database Adapter Issues

**Error**: `PrismaClientInitializationError`

**Solution**:
```typescript
// Verify Prisma client generation
npm run db:generate

// Check auth configuration
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"

// Ensure adapter is properly configured
adapter: PrismaAdapter(prisma)
```

### 3. Environment Variable Issues

#### Missing Environment Variables

**Error**: `NEXTAUTH_SECRET` missing

**Solution**:
```bash
# Generate secure secret
openssl rand -base64 32

# Add to .env.local
NEXTAUTH_SECRET="your-generated-secret-here"
```

**Error**: Provider credentials missing

**Solution**:
```bash
# Check all required variables are set
cat .env.local | grep -E "(GOOGLE_|APPLE_|MICROSOFT_|EMAIL_)"

# Ensure no trailing spaces or newlines
# Use quotes around values with special characters
```

#### Environment Variable Loading

**Error**: Environment variables not loading

**Solution**:
```typescript
// Check environment variable access
console.log("Environment check:", {
  nodeEnv: process.env.NODE_ENV,
  nextAuthSecret: !!process.env.NEXTAUTH_SECRET,
  nextAuthUrl: process.env.NEXTAUTH_URL,
  googleClientId: !!process.env.GOOGLE_CLIENT_ID,
})

// Restart development server after changes
npm run dev
```

### 4. Session and JWT Issues

#### Session Not Persisting

**Problem**: User gets signed out immediately

**Solution**:
```typescript
// Check JWT configuration in auth.ts
jwt: {
  maxAge: 15 * 60, // 15 minutes
},
session: {
  strategy: "jwt",
  maxAge: 15 * 60, // 15 minutes
}

// Verify NEXTAUTH_SECRET is consistent
// Clear browser cookies and try again
```

#### JWT Token Issues

**Error**: `JWTSessionError`

**Solution**:
```bash
# Regenerate NEXTAUTH_SECRET
openssl rand -base64 32

# Clear all sessions
# Delete cookies in browser
# Restart application
```

### 5. Middleware Protection Issues

#### Infinite Redirect Loop

**Problem**: Users get stuck in redirect loop

**Solution**:
```typescript
// Check middleware.ts for logic errors
export async function middleware(request: NextRequest) {
  const session = await auth()
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth")
  const isProtectedPage = ["/dashboard", "/calculator"].some(
    path => request.nextUrl.pathname.startsWith(path)
  )
  
  // Fix: Don't redirect authenticated users from auth pages to auth pages
  if (session && isAuthPage && request.nextUrl.pathname !== "/auth/signout") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  
  // Fix: Only redirect to signin, not other auth pages
  if (!session && isProtectedPage) {
    const signInUrl = new URL("/auth/signin", request.url)
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }
}
```

#### Protected Routes Not Working

**Problem**: Unauthenticated users can access protected pages

**Solution**:
```typescript
// Verify middleware matcher configuration
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

// Check middleware is running
console.log("Middleware running for:", request.nextUrl.pathname)
```

### 6. Role-Based Access Issues

#### Role Not Updating

**Problem**: User role changes don't take effect

**Solution**:
```typescript
// Check JWT callback in auth.ts
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.role = user.role || UserRole.USER
    }
    return token
  },
  async session({ session, token }) {
    if (token) {
      session.user.role = token.role as UserRole
    }
    return session
  }
}

// Force user to sign out and back in after role change
```

#### AuthGuard Not Working

**Problem**: Role-based protection not enforcing

**Solution**:
```typescript
// Verify AuthGuard implementation
import { useAuth } from "@/hooks/useAuth"

export function AuthGuard({ requiredRole, children }) {
  const { hasRole } = useAuth()
  
  if (requiredRole && !hasRole(requiredRole)) {
    return <AccessDenied />
  }
  
  return <>{children}</>
}

// Check useAuth hook returns correct values
const { user, hasRole, isProfessional } = useAuth()
console.log("Auth state:", { user, hasRole, isProfessional })
```

### 7. Email Authentication Issues

#### Email Not Sending

**Problem**: Magic link emails not delivered

**Solution**:
```bash
# Test SMTP connection
telnet smtp.gmail.com 587

# Verify email configuration
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"  # Not your Gmail password!
EMAIL_FROM="noreply@yourdomain.com"
```

#### Email Verification Issues

**Problem**: Email verification not working

**Solution**:
```typescript
// Check email verification in auth callbacks
callbacks: {
  async signIn({ user, account }) {
    // For OAuth providers, auto-verify email
    if (account?.provider !== "email" && user.email && !user.emailVerified) {
      await prisma.user.update({
        where: { email: user.email },
        data: { emailVerified: new Date() },
      })
    }
    return true
  }
}
```

### 8. Development vs Production Issues

#### HTTPS Requirements

**Problem**: OAuth not working in production

**Solution**:
```bash
# Ensure HTTPS is configured
NEXTAUTH_URL="https://yourdomain.com"

# Update all OAuth provider redirect URIs to use HTTPS
# Verify SSL certificate is valid
```

#### CORS Issues

**Problem**: Cross-origin request errors

**Solution**:
```typescript
// Add CORS headers if needed
response.headers.set("Access-Control-Allow-Origin", "https://yourdomain.com")
response.headers.set("Access-Control-Allow-Credentials", "true")

// Check NextAuth.js CORS configuration
export const { handlers: { GET, POST } } = NextAuth({
  // ... config
})
```

## Debugging Tools

### Enable Debug Mode

```typescript
// In auth.ts
export const { auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV === "development",
  // ... rest of config
})
```

### Check Provider Configuration

```bash
# View available providers
curl http://localhost:3000/api/auth/providers | jq
```

### Session Debugging

```typescript
// Client-side session debugging
import { useSession } from "next-auth/react"

export function SessionDebug() {
  const { data: session, status } = useSession()
  
  return (
    <pre>
      Status: {status}
      Session: {JSON.stringify(session, null, 2)}
    </pre>
  )
}
```

### Server-side Session Debugging

```typescript
// In any server component or API route
import { auth } from "@/lib/auth"

export default async function DebugPage() {
  const session = await auth()
  
  return (
    <pre>
      Session: {JSON.stringify(session, null, 2)}
    </pre>
  )
}
```

## Health Check Endpoints

### Authentication Health Check

```typescript
// app/api/health/auth/route.ts
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    // Check if auth is working
    const session = await auth()
    
    return Response.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      session: !!session,
    })
  } catch (error) {
    return Response.json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
```

### Database Health Check

```typescript
// app/api/health/db/route.ts
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    await prisma.user.findFirst()
    
    return Response.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return Response.json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
```

## Performance Issues

### Slow Authentication

**Problem**: Sign-in takes too long

**Solution**:
```typescript
// Optimize database queries
// Add indexes to frequently queried fields
// Use connection pooling

// Check for N+1 queries in callbacks
callbacks: {
  async jwt({ token, user }) {
    // Avoid database queries here if possible
    if (user) {
      token.role = user.role
    }
    return token
  }
}
```

### Memory Issues

**Problem**: High memory usage

**Solution**:
```typescript
// Ensure Prisma client is singleton
// Don't create multiple Prisma instances
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

## Getting Help

### Log Analysis

1. **Check Server Logs**: Look for authentication errors in server output
2. **Browser Console**: Check for client-side JavaScript errors
3. **Network Tab**: Verify API requests are successful
4. **NextAuth Debug**: Enable debug mode for detailed logging

### Common Error Patterns

```bash
# OAuth configuration errors
grep -i "oauth" logs/application.log

# Database connection errors
grep -i "prisma\|database" logs/application.log

# Session errors
grep -i "session\|jwt" logs/application.log
```

### Support Resources

- [NextAuth.js Troubleshooting](https://next-auth.js.org/getting-started/rest-api)
- [Prisma Debugging](https://www.prisma.io/docs/support/help-articles/nextjs-prisma-client-dev-practices)
- [OAuth Provider Documentation](./oauth-providers.md)

*Last updated: December 15, 2024*