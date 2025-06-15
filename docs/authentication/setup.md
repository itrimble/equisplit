# Authentication Setup Guide

## Prerequisites

- Node.js 18.17+ or 20.5+
- PostgreSQL 15+
- OAuth provider credentials (Google, Apple, Microsoft)
- SMTP server for email authentication (optional)

## Installation

The authentication system is already installed with the project dependencies:

```bash
npm install @auth/prisma-adapter
npm install @radix-ui/react-avatar @radix-ui/react-dropdown-menu
```

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/equisplit"

# Authentication
NEXTAUTH_SECRET="your-nextauth-secret-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Security
ENCRYPTION_KEY="your-32-character-encryption-key"
JWT_SECRET="your-jwt-secret-min-32-chars"
```

### OAuth Providers

```bash
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Apple OAuth
APPLE_ID="your-apple-id"
APPLE_SECRET="your-apple-secret"

# Microsoft OAuth
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
MICROSOFT_TENANT_ID="your-microsoft-tenant-id" # Optional
```

### Email Provider (Optional)

```bash
# SMTP Configuration
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="noreply@equisplit.com"
EMAIL_SERVER_PASSWORD="your-email-password"
EMAIL_FROM="noreply@equisplit.com"
```

## Database Setup

### 1. Generate Prisma Client

```bash
npm run db:generate
```

### 2. Run Database Migrations

```bash
# Development
npm run db:migrate

# Production
npm run db:migrate:deploy
```

### 3. Verify Database Schema

The authentication system requires these tables:
- `users` - User accounts with roles and subscription status
- `accounts` - OAuth provider account data
- `sessions` - User session management
- `verification_tokens` - Email verification tokens
- `audit_logs` - Authentication event logging

## Configuration Files

### NextAuth.js Configuration

**Location**: `/src/lib/auth.ts`

Key configuration elements:
- PrismaAdapter for database integration
- OAuth provider configurations
- JWT session strategy with 15-minute expiry
- Role-based authorization callbacks
- Audit logging for compliance

### Middleware Configuration

**Location**: `/src/middleware.ts`

Protected routes:
- `/dashboard` - User dashboard
- `/calculator` - Property calculator
- `/api/calculate` - Calculation endpoints
- `/api/documents` - Document generation
- `/api/payments` - Payment processing

### Database Schema

**Location**: `/prisma/schema.prisma`

Key models:
- `User` with `UserRole` enum (USER, PROFESSIONAL, ENTERPRISE, ADMIN)
- NextAuth.js compatible `Account`, `Session`, `VerificationToken` models
- `AuditLog` for compliance tracking

## Development Setup

### 1. Start Development Server

```bash
npm run dev
```

### 2. Test Authentication Flow

1. Navigate to `http://localhost:3000/auth/signin`
2. Test OAuth providers (requires provider setup)
3. Test email authentication (requires SMTP setup)
4. Verify user roles and permissions

### 3. Debug Mode

Enable NextAuth debug logging:

```bash
NODE_ENV=development
```

Debug output will appear in the terminal and browser console.

## Production Deployment

### Security Requirements

1. **HTTPS Only** - All authentication must use HTTPS
2. **Secure Secrets** - Use cryptographically secure random strings
3. **Environment Variables** - Never commit secrets to version control
4. **CORS Configuration** - Properly configure allowed origins
5. **Rate Limiting** - Enable on authentication endpoints

### Environment Variables for Production

```bash
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="secure-32-character-minimum-secret"
```

### Database Considerations

- Use connection pooling for production databases
- Enable SSL/TLS for database connections
- Set up automated backups with encryption
- Monitor database performance and audit logs

## Health Checks

### Authentication System Health

```bash
# Check if auth API is responding
curl http://localhost:3000/api/auth/providers

# Verify database connectivity
npm run db:studio
```

### Verify Configuration

```typescript
// Test auth configuration
import { auth } from "@/lib/auth"

const session = await auth()
console.log("Auth configured:", !!session)
```

## Next Steps

1. [Set up OAuth providers](./oauth-providers.md)
2. [Configure security settings](./security.md)
3. [Implement authentication in your app](./api-reference.md)
4. [Customize UI components](./ui-components.md)

*Last updated: December 15, 2024*