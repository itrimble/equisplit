# Authentication System Documentation

## Overview
EquiSplit uses NextAuth.js v5 for secure authentication with multiple OAuth providers, role-based access control, and comprehensive audit logging for legal compliance.

## Documentation Structure

- **[Setup Guide](./setup.md)** - Installation and configuration instructions
- **[Security Guide](./security.md)** - Security features and compliance requirements
- **[API Reference](./api-reference.md)** - Authentication API endpoints and usage
- **[UI Components](./ui-components.md)** - Authentication UI components and pages
- **[OAuth Providers](./oauth-providers.md)** - OAuth provider setup instructions
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

## Quick Links

- [Environment Variables](./setup.md#environment-variables)
- [Role-Based Access Control](./security.md#role-based-access-control)
- [Usage Examples](./api-reference.md#usage-examples)
- [OAuth Setup](./oauth-providers.md)

## Features

✅ **NextAuth.js v5** - Latest authentication framework  
✅ **Multiple OAuth Providers** - Google, Apple, Microsoft, Email  
✅ **Role-Based Access** - USER, PROFESSIONAL, ENTERPRISE, ADMIN  
✅ **Session Management** - 15-minute JWT sessions with refresh  
✅ **Security Middleware** - Route protection and security headers  
✅ **Audit Logging** - Compliance tracking for all auth events  
✅ **UI Components** - Complete authentication UI system  

## Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| NextAuth Config | ✅ Complete | `/src/lib/auth.ts` |
| API Routes | ✅ Complete | `/src/app/api/auth/[...nextauth]/route.ts` |
| Auth Pages | ✅ Complete | `/src/app/auth/` |
| UI Components | ✅ Complete | `/src/components/auth/` |
| Middleware | ✅ Complete | `/src/middleware.ts` |
| Database Schema | ✅ Complete | `/prisma/schema.prisma` |
| Documentation | ✅ Complete | `/docs/authentication/` |

*Last updated: December 15, 2024*