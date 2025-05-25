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