// Core Application Types for EquiSplit

export type USState = 
  | 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'FL' | 'GA'
  | 'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS' | 'KY' | 'LA' | 'ME' | 'MD'
  | 'MA' | 'MI' | 'MN' | 'MS' | 'MO' | 'MT' | 'NE' | 'NV' | 'NH' | 'NJ'
  | 'NM' | 'NY' | 'NC' | 'ND' | 'OH' | 'OK' | 'OR' | 'PA' | 'RI' | 'SC'
  | 'SD' | 'TN' | 'TX' | 'UT' | 'VT' | 'VA' | 'WA' | 'WV' | 'WI' | 'WY' | 'DC';

export type PropertyRegime = 'community' | 'equitable';

export type SubscriptionTier = 'free' | 'professional' | 'enterprise';

export type AssetType = 
  | 'real_estate'
  | 'vehicle'
  | 'bank_account'
  | 'investment_account'
  | 'retirement_account'
  | 'business_interest'
  | 'personal_property'
  | 'cryptocurrency'
  | 'insurance'
  | 'other';

export type DebtType =
  | 'mortgage'
  | 'vehicle_loan'
  | 'credit_card'
  | 'student_loan'
  | 'business_debt'
  | 'personal_loan'
  | 'other';

export interface User {
  id: string;
  email: string;
  name?: string;
  subscriptionTier: SubscriptionTier;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  userId: string;
  type: AssetType;
  description: string;
  currentValue: number;
  acquisitionDate?: Date;
  acquisitionValue?: number;
  isSeparateProperty: boolean;
  supportingDocuments: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Debt {
  id: string;
  userId: string;
  type: DebtType;
  description: string;
  currentBalance: number;
  originalAmount?: number;
  acquisitionDate?: Date;
  isSeparateProperty: boolean;
  supportingDocuments: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarriageInfo {
  marriageDate: Date;
  separationDate?: Date;
  jurisdiction: USState;
  propertyRegime: PropertyRegime;
  hasPrenup: boolean;
  specialCircumstances: string[];
}

export interface CalculationInput {
  jurisdiction: USState;
  propertyRegime: PropertyRegime;
  marriageInfo: MarriageInfo;
  assets: Asset[];
  debts: Debt[];
  specialFactors?: EquitableDistributionFactors;
}

export interface EquitableDistributionFactors {
  marriageDuration: number; // years
  ageSpouse1: number;
  ageSpouse2: number;
  healthSpouse1: 'excellent' | 'good' | 'fair' | 'poor';
  healthSpouse2: 'excellent' | 'good' | 'fair' | 'poor';
  incomeSpouse1: number;
  incomeSpouse2: number;
  earnCapacitySpouse1: number;
  earnCapacitySpouse2: number;
  contributionToMarriage: string;
  custodyArrangement?: 'sole_1' | 'sole_2' | 'joint' | 'none';
  domesticViolence: boolean;
  wastingOfAssets: boolean;
  taxConsequences: boolean;
}

export interface PropertyDivision {
  spouse1Assets: AssetDivision[];
  spouse2Assets: AssetDivision[];
  spouse1Debts: DebtDivision[];
  spouse2Debts: DebtDivision[];
  totalSpouse1Value: number;
  totalSpouse2Value: number;
  equalizationPayment?: number;
  paymentFrom?: 'spouse1' | 'spouse2';
}

export interface AssetDivision {
  assetId: string;
  description: string;
  totalValue: number;
  spouse1Share: number;
  spouse2Share: number;
  reasoning: string;
}

export interface DebtDivision {
  debtId: string;
  description: string;
  totalBalance: number;
  spouse1Responsibility: number;
  spouse2Responsibility: number;
  reasoning: string;
}

export interface CalculationResult {
  id: string;
  userId: string;
  input: CalculationInput;
  result: PropertyDivision;
  methodology: string;
  confidenceLevel: number;
  factors: string[];
  calculatedAt: Date;
  jurisdiction: USState;
  version: string; // Algorithm version for audit trail
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'msa' | 'financial_affidavit' | 'property_declaration';
  jurisdiction: USState;
  price: number;
  requiredFields: string[];
  previewUrl?: string;
}

export interface GeneratedDocument {
  id: string;
  userId: string;
  templateId: string;
  calculationId: string;
  content: Buffer | string;
  format: 'pdf' | 'docx';
  fileName: string;
  generatedAt: Date;
  expiresAt: Date;
  downloadCount: number;
  maxDownloads: number;
}

export interface AuditEntry {
  id: string;
  userId: string;
  sessionId?: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'calculate' | 'download';
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  complianceLevel: 'standard' | 'financial' | 'legal';
}

export interface QAQuestion {
  id: string;
  question: string;
  category: 'assets' | 'debts' | 'process' | 'legal' | 'documents';
  jurisdiction?: USState;
  answer: string;
  isExpertReviewed: boolean;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  updatedAt: Date;
}

// Form validation schemas
export interface PersonalInfoForm {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: Date;
  occupation?: string;
  spouseFirstName: string;
  spouseLastName: string;
  spouseEmail?: string;
  spousePhone?: string;
  spouseDateOfBirth: Date;
  spouseOccupation?: string;
  marriageDate: Date;
  separationDate?: Date;
  jurisdiction: USState;
  currentStatus: 'married' | 'separated' | 'filing' | 'divorced';
}

export interface StepFormData {
  step: number;
  isComplete: boolean;
  data: Record<string, any>;
  errors?: Record<string, string>;
  lastUpdated: Date;
}

export interface MultiStepFormState {
  currentStep: number;
  totalSteps: number;
  steps: StepFormData[];
  isValid: boolean;
  canProceed: boolean;
  lastSaved?: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Payment types
export interface Subscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  tier: SubscriptionTier;
  status: 'active' | 'inactive' | 'canceled' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  userId: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  description: string;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

// File upload types
export interface UploadedFile {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
  expiresAt?: Date;
  isProcessed: boolean;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  extractedData?: Record<string, any>;
}

// Legal compliance types
export interface ComplianceSettings {
  dataRetentionPeriod: number; // years
  auditLogRetention: number; // years
  encryptionRequired: boolean;
  mfaRequired: boolean;
  sessionTimeout: number; // minutes
  maxLoginAttempts: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
}

export interface LegalDisclaimer {
  id: string;
  version: string;
  content: string;
  jurisdiction?: USState;
  type: 'general' | 'calculation' | 'document' | 'privacy';
  isActive: boolean;
  effectiveDate: Date;
  createdAt: Date;
  updatedAt: Date;
}