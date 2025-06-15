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

## 📈 API Documentation

### Core Endpoints

#### POST /api/calculate
Calculate property division based on state and input parameters.

```typescript
interface CalculationRequest {
  jurisdiction: USState;
  propertyRegime: 'community' | 'equitable';
  assets: Asset[];
  debts: Debt[];
  marriageDate: string;
  separationDate: string;
  specialCircumstances?: string[];
}

interface CalculationResponse {
  spouse1Share: number;
  spouse2Share: number;
  methodology: string;
  factors: Factor[];
  confidence: number;
  auditId: string;
}
```

#### POST /api/documents/generate
Generate court-admissible documents.

```typescript
interface DocumentRequest {
  type: 'msa' | 'financial_affidavit' | 'property_declaration';
  jurisdiction: USState;
  data: CalculationResult;
  customizations?: DocumentCustomization;
}
```

### Rate Limiting
```
Standard: 10 requests/minute per IP
Calculations: 3 requests/minute per IP
Documents: 5 requests/hour per user
Premium: 100 requests/minute per user
```

---

## 🗄️ Database Schema

### Core Tables

```sql
-- Users with enhanced security
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- For email auth
    subscription_tier VARCHAR(50) DEFAULT 'free',
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255), -- Encrypted TOTP secret
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_login TIMESTAMP WITH TIME ZONE,
    compliance_acknowledged BOOLEAN DEFAULT false
);

-- Financial data with encryption
CREATE TABLE financial_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    asset_type VARCHAR(50) NOT NULL,
    description TEXT,
    current_value DECIMAL(15,2) NOT NULL, -- Encrypted
    acquisition_date DATE,
    acquisition_value DECIMAL(15,2), -- Encrypted
    is_separate_property BOOLEAN DEFAULT false,
    supporting_documents JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Comprehensive audit trail
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    compliance_level VARCHAR(50) DEFAULT 'standard'
);
```

### Data Retention Policies
- **User Data**: 7 years after account deletion (financial regulations)
- **Calculation Results**: Permanent (for audit purposes)
- **Payment Data**: PCI DSS compliant retention (max 3 years)
- **Audit Logs**: Permanent (legal requirements)

---

## 💳 Payment Integration

### Subscription Tiers

```typescript
interface SubscriptionTier {
  name: 'free' | 'professional' | 'enterprise';
  monthlyPrice: number;
  features: {
    calculations: number | 'unlimited';
    documents: number | 'unlimited';
    clients: number | 'unlimited';
    support: 'community' | 'email' | 'priority';
    whiteLabel: boolean;
    apiAccess: boolean;
  };
}

const tiers: SubscriptionTier[] = [
  {
    name: 'free',
    monthlyPrice: 0,
    features: {
      calculations: 3,
      documents: 0,
      clients: 1,
      support: 'community',
      whiteLabel: false,
      apiAccess: false
    }
  },
  {
    name: 'professional',
    monthlyPrice: 49,
    features: {
      calculations: 'unlimited',
      documents: 10,
      clients: 25,
      support: 'email',
      whiteLabel: false,
      apiAccess: true
    }
  },
  {
    name: 'enterprise',
    monthlyPrice: 299,
    features: {
      calculations: 'unlimited',
      documents: 'unlimited',
      clients: 'unlimited',
      support: 'priority',
      whiteLabel: true,
      apiAccess: true
    }
  }
];
```

### Payment Processing
- **Provider**: Stripe Connect for marketplace functionality
- **Security**: PCI DSS Level 3 compliance
- **Features**: Subscription management, usage-based billing, invoicing
- **International**: 135+ currencies, local payment methods

---

## 🧪 Testing Strategy

### Test Coverage Requirements
- **Unit Tests**: 90% coverage minimum
- **Integration Tests**: All API endpoints
- **Security Tests**: Automated SAST/DAST scanning
- **Compliance Tests**: Legal calculation accuracy validation
- **Performance Tests**: Load testing for 1000+ concurrent users

### Testing Commands
```bash
# Run all tests
npm test

# Coverage report
npm run test:coverage

# Security scanning
npm run security:scan

# Compliance validation
npm run compliance:check

# Performance testing
npm run test:performance
```

### Test Data Management
- **Synthetic Data**: No real PII in development/testing
- **Data Masking**: Production data anonymization for testing
- **Test Isolation**: Each test gets fresh database state

---

## 🚀 Deployment

### Production Environment
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    image: equisplit:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    ports:
      - "3000:3000"
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=equisplit
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Security Scan
        run: |
          npm audit
          npm run security:scan
          npm run compliance:check

  deploy:
    needs: security-scan
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        run: |
          docker build -t equisplit:latest .
          docker push $REGISTRY/equisplit:latest
          kubectl apply -f k8s/
```

### Monitoring & Observability
- **APM**: New Relic or DataDog for application performance
- **Logs**: Structured logging with correlation IDs
- **Metrics**: Custom business metrics for legal compliance
- **Alerts**: Security incidents, compliance violations, performance degradation

---

## 🤝 Contributing

### Security-First Development
All contributions must:
- Pass automated security scans (SAST, dependency analysis)
- Follow secure coding practices (OWASP guidelines)
- Maintain audit trail integrity
- Comply with data protection requirements

### Code Review Process
1. **Automated Checks**: Linting, testing, security scanning
2. **Peer Review**: Functionality and basic security review
3. **Security Review**: For sensitive code paths (authentication, payments, calculations)
4. **Compliance Review**: For changes affecting legal calculations or document generation

### Pull Request Template
```markdown
## Description
Brief description of changes

## Compliance Impact
- [ ] No regulatory impact
- [ ] Legal calculation changes (requires legal review)
- [ ] Security changes (requires security review)
- [ ] Payment processing changes (requires PCI review)

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Security scan clean
- [ ] Manual testing completed

## Documentation
- [ ] API docs updated
- [ ] User documentation updated
- [ ] Compliance docs updated
```

---

## 📚 Resources

### Legal Technology References
- [ABA Model Rule 1.1 - Technological Competence](https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_1_1_competence/)
- [ILTA Legal Technology Guidelines](https://www.iltanet.org/)
- [CLOC Legal Operations Community](https://cloc.org/)

### Technical Documentation
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [NextAuth.js v5 Guide](https://authjs.dev/)
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [PostgreSQL Encryption](https://www.postgresql.org/docs/current/encryption-options.html)

### Compliance Resources
- [SOC 2 Compliance Guide](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report.html)
- [PCI DSS Requirements](https://www.pcisecuritystandards.org/)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)

---

## 📧 Support & Contact

### Technical Support
- **Email**: tech-support@equisplit.com
- **Documentation**: [docs.equisplit.com](https://docs.equisplit.com)
- **Status Page**: [status.equisplit.com](https://status.equisplit.com)

### Security Issues
- **Security Email**: security@equisplit.com
- **GPG Key**: Available at [equisplit.com/security.asc](https://equisplit.com/security.asc)
- **Bug Bounty**: Available for verified security researchers

### Legal & Compliance
- **Compliance Officer**: compliance@equisplit.com
- **Legal Counsel**: legal@equisplit.com
- **Privacy Officer**: privacy@equisplit.com

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

*Last updated: May 23, 2025*