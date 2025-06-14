# EquiSplit - Community Property Calculator

## 🏛️ Legal Technology Platform for Property Division

**EquiSplit** is a comprehensive web application that helps users understand community property division during divorce proceedings across all 50 US states. Built with React/Next.js 14, this platform provides accurate calculations, court-admissible document generation, and state-specific legal guidance while maintaining strict compliance with legal and financial regulations.

---

## 🔒 Compliance & Security Notice

**This application handles sensitive financial and legal data and is subject to:**
- **ABA Model Rule 1.1** (Technological Competence for Legal Software)
- **SOC 2 Type II** compliance requirements
- **PCI DSS Level 3** for payment processing
- **GDPR/CCPA** data protection regulations
- **State Bar Association** ethical guidelines for legal technology

**⚠️ Legal Disclaimer**: This software provides educational calculations only and does not constitute legal advice. Users must consult qualified legal professionals for specific legal guidance.

---

## 🏗️ Architecture Overview

### Technology Stack
- **Frontend**: Next.js 14.2+ with App Router and Server Components
- **Authentication**: NextAuth.js v5 (Apple, Google, Microsoft, Email + 2FA)
- **Payment**: Stripe Connect for subscription and one-time payments
- **Database**: PostgreSQL 15+ with field-level encryption and audit trails
- **File Processing**: PDF parsing, OCR, CSV import with validation
- **Infrastructure**: Vercel/AWS with SOC 2 compliant hosting
- **Monitoring**: Comprehensive logging and security monitoring

### Security Architecture
```
Client → TLS 1.3 → CDN → WAF → App Server → Encrypted DB
                     ↓
            Security Monitoring & Audit Logging
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18.17+ or 20.5+
- PostgreSQL 15+
- Stripe account (for payments)
- NextAuth.js OAuth provider credentials

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/equisplit.git
cd equisplit

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Initialize the database
npm run db:setup

# Run development server
npm run dev
```

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/equisplit"

# Authentication
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
APPLE_ID="your-apple-id"
APPLE_SECRET="your-apple-secret"

# Stripe
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Security
ENCRYPTION_KEY="your-32-character-encryption-key"
JWT_SECRET="your-jwt-secret"
```

---

## 📊 Features

### Core Functionality
- **Multi-State Support**: Handles both community property (9 states) and equitable distribution (41 states + DC)
- **Intelligent Calculator**: State-specific algorithms for accurate property division
- **Document Generation**: Court-admissible PDFs (Marital Settlement Agreements, Financial Affidavits)
- **Progress Tracking**: Multi-step questionnaire with save/resume functionality
- **File Upload**: PDF parsing, OCR, and CSV import for financial data

### User Experience
- **Progressive Disclosure**: Complex legal concepts broken into manageable steps
- **Real-time Validation**: Immediate feedback with human-readable error messages
- **Mobile-First Design**: Optimized for 44px touch targets and thumb zones
- **Accessibility**: WCAG 2.1 Level AA compliant with full keyboard navigation
- **Multi-language Support**: Plain language with Gunning Fog Index below 12

### Business Features
- **Freemium Model**: Basic calculations free, premium features via subscription
- **Professional Tiers**: Multi-client usage for legal professionals
- **White-label Licensing**: Custom branding for law firms
- **Q&A System**: Interactive legal guidance to keep users engaged

---

## 🏛️ Legal Compliance Framework

### State-Specific Implementation

#### Community Property States (9)
- Arizona, California, Idaho, Louisiana, Nevada, New Mexico, Texas, Washington, Wisconsin
- **Calculation**: Generally 50/50 division with state-specific variations
- **Special Handling**: Income from separate property, quasi-community property

#### Equitable Distribution States (41 + DC)
- **Factors Considered**: Marriage length, age, health, contributions, tax implications
- **Calculation Range**: 40/60 to 50/50 based on marriage duration and circumstances

### Document Standards

```typescript
interface CourtDocument {
  format: 'pdf' | 'docx';
  jurisdiction: USState;
  signatures: {
    required: boolean;
    type: 'wet' | 'electronic';
    notarization: boolean;
  };
  retention: {
    period: number; // years
    purpose: 'legal' | 'tax' | 'audit';
  };
}
```

### UPL (Unauthorized Practice of Law) Safeguards
- Clear disclaimers on every page
- Information vs. advice distinction
- User retains all decision-making authority
- No document interpretation or legal recommendations

---

## 🔐 Security Implementation

### Data Protection
```typescript
// Field-level encryption example
interface EncryptedField {
  value: string; // AES-256 encrypted
  iv: string;    // Initialization vector
  tag: string;   // Authentication tag
}

// Audit trail structure
interface AuditEntry {
  id: UUID;
  userId: UUID;
  action: 'create' | 'read' | 'update' | 'delete';
  resource: string;
  timestamp: DateTime;
  ipAddress: string;
  userAgent: string;
  complianceLevel: 'standard' | 'financial' | 'legal';
}
```

### Authentication & Authorization
- **Multi-Factor Authentication**: TOTP with recovery codes
- **Session Management**: JWT with 15-minute expiry, secure refresh tokens
- **Role-Based Access**: Consumer, Professional, Enterprise tiers
- **API Security**: Rate limiting (10 requests/minute standard, 3/minute for calculations)

### Infrastructure Security
- **Network**: VPC with private subnets, WAF protection
- **Storage**: Encrypted at rest (AES-256), encrypted in transit (TLS 1.3)
- **Monitoring**: Real-time security alerts, comprehensive audit logging
- **Backup**: Automated daily backups with 7-year retention for financial data

---

## 📄 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

### Commercial Licensing
Commercial licenses are available for organizations requiring:
- Proprietary modifications
- White-label deployments
- Custom compliance requirements
- Dedicated support

Contact: licensing@equisplit.com

---

**Built with ❤️ and ⚖️ for the legal technology community**

*Last updated: May 24, 2025*

## Memories
- never overwrite CLAUDE.md , append it
- update memory after every taskmaster implementation task
- if I say anything with next task, I am referring to taskmaster
- Authentication system fully implemented with NextAuth.js v5 (December 15, 2024)
- Security & Compliance Implementation completed (December 15, 2024)
- API Routes Implementation completed with comprehensive endpoints (December 15, 2024)
- Task 10: Security & Compliance Implementation completed with comprehensive security framework (December 15, 2024)
- Task 20: Testing Suite & Quality Assurance completed with comprehensive test coverage (June 15, 2025)
  - Jest + React Testing Library for unit/integration tests
  - Playwright for E2E testing with cross-browser support
  - Axe-core for accessibility testing (WCAG 2.1 AA compliance)
  - Performance testing with benchmarks and memory leak detection
  - GitHub Actions CI/CD pipeline with quality gates
  - 80% code coverage requirement with detailed reporting
  - Security testing integration with npm audit
  - Comprehensive test documentation in docs/testing/
- Successfully merged jules.google branch enhancements (June 15, 2025)
  - Enhanced Authentication: Added credentials provider, user registration, password hashing
  - DOCX Generation: Implemented MSA template generation with comprehensive formatting
  - Updated Prisma schema: Comprehensive auth models with audit trails
  - Resolved all merge conflicts while preserving testing suite
  - Integrated Pennsylvania-specific equitable distribution factors
- make sure documentation is created in the @docs/ folder
- when you update CLAUDE.md, do NOT append the docs to the CLAUDE.md , they should be in the @docs/ folder
- Task 7: Stripe Payment Integration completed with comprehensive billing system (June 15, 2025)
  - Complete Stripe API integration with subscription and one-time payments
  - Webhook handling for real-time payment processing and status updates
  - Multi-tier pricing system (Free, Professional, Enterprise) with usage limits
  - Professional subscription management UI with billing history
  - Secure payment processing with PCI DSS compliance via Stripe
  - Comprehensive test coverage for payment flows and webhook processing
  - Full documentation in docs/stripe-integration.md
  - Production-ready payment system with proper error handling and security
  - Files: API routes, webhook handlers, UI components, tests, documentation
- Task 8: File Upload & Processing System completed with comprehensive functionality (June 15, 2025)
  - Secure file upload API with advanced security scanning and threat detection
  - PDF parsing with intelligent financial data extraction using pdf-parse
  - OCR capabilities for scanned documents using Tesseract.js
  - CSV/Excel import with automatic column mapping and data validation
  - React components: drag-drop FileUpload and FileManager dashboard
  - Advanced security: magic byte analysis, malicious pattern detection, file structure validation
  - Comprehensive test coverage for API, security scanner, and UI components
  - Complete documentation in docs/file-upload-system.md
  - Production-ready with audit logging, encryption, and compliance features
  - Files: Upload API, security scanner, UI components, tests, documentation
- Critical Calculation Bugs Fixed (June 15, 2025)
  - Fixed missing STATE_INFO import causing runtime crashes in community property calculations
  - Corrected Pennsylvania-specific factor detection to include all spouse fields
  - Resolved floating-point precision issues in equity factor score clamping
  - All 40 calculateEquityFactor tests now pass (previously 8 failing)
  - Community property calculations no longer crash during quasi-community property processing
  - Equitable distribution calculations properly apply state-specific Pennsylvania factors
  - Production-ready calculation engine with comprehensive test coverage
  - Files: src/utils/calculations.ts - critical fixes for legal compliance
  - Ready for next taskmaster implementation task
- Task 22 Phase 1: Legal Compliance Audit Critical Items completed (June 15, 2025)
  - Created missing MSA template file at /public/templates/msa_template.docx with proper DOCX structure
  - Implemented comprehensive template file validation and error handling system
  - Created /legal/* page routes with full privacy policy and terms of service
  - Comprehensive privacy policy covering GDPR/CCPA compliance, data protection, and security
  - GDPR/CCPA compliant cookie consent banner with granular preference controls
  - Cookie management utilities for secure, compliant cookie handling
  - Legal page infrastructure ready for production launch
  - Files: MSA template, legal pages, cookie consent system, template validator
  - Critical Phase 1 legal compliance requirements fulfilled

---

[rest of the file remains the same]