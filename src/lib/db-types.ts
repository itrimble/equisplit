// Database type mappings for EquiSplit
// Maps TypeScript types to Prisma database types

import type { 
  User as PrismaUser,
  Asset as PrismaAsset,
  Debt as PrismaDebt,
  Calculation as PrismaCalculation,
  Document as PrismaDocument,
  AuditLog as PrismaAuditLog,
  USState,
  PropertyRegime,
  AssetType,
  DebtType,
  SubscriptionTier,
  AssetOwnership,
  CalculationStatus,
  DocumentType,
  DocumentStatus,
  AuditAction,
  ComplianceLevel
} from '@prisma/client'

// Re-export Prisma types for use throughout the application
export type {
  USState,
  PropertyRegime,
  AssetType,
  DebtType,
  SubscriptionTier,
  AssetOwnership,
  CalculationStatus,
  DocumentType,
  DocumentStatus,
  AuditAction,
  ComplianceLevel
}

// Enhanced types with relationships
export type UserWithRelations = PrismaUser & {
  calculations?: CalculationWithRelations[]
  assets?: AssetWithRelations[]
  debts?: DebtWithRelations[]
  documents?: DocumentWithRelations[]
}

export type CalculationWithRelations = PrismaCalculation & {
  user?: PrismaUser
  assets?: AssetWithRelations[]
  debts?: DebtWithRelations[]
  documents?: DocumentWithRelations[]
}

export type AssetWithRelations = PrismaAsset & {
  user?: PrismaUser
  calculation?: PrismaCalculation
}

export type DebtWithRelations = PrismaDebt & {
  user?: PrismaUser
  calculation?: PrismaCalculation
}

export type DocumentWithRelations = PrismaDocument & {
  user?: PrismaUser
  calculation?: PrismaCalculation
}

// Type conversion utilities
export function mapPrismaStateToAppState(prismaState: USState): import('../types').USState {
  return prismaState as import('../types').USState
}

export function mapAppStateToPrismaState(appState: import('../types').USState): USState {
  return appState as USState
}

export function mapPrismaAssetTypeToAppType(prismaType: AssetType): import('../types').AssetType {
  const mapping: Record<AssetType, import('../types').AssetType> = {
    'REAL_ESTATE': 'real_estate',
    'VEHICLE': 'vehicle',
    'BANK_ACCOUNT': 'bank_account',
    'INVESTMENT_ACCOUNT': 'investment_account',
    'RETIREMENT_ACCOUNT': 'retirement_account',
    'BUSINESS_INTEREST': 'business_interest',
    'PERSONAL_PROPERTY': 'personal_property',
    'CRYPTOCURRENCY': 'cryptocurrency',
    'INSURANCE': 'insurance',
    'OTHER': 'other'
  }
  return mapping[prismaType]
}

export function mapAppAssetTypeToPrismaType(appType: import('../types').AssetType): AssetType {
  const mapping: Record<import('../types').AssetType, AssetType> = {
    'real_estate': 'REAL_ESTATE',
    'vehicle': 'VEHICLE',
    'bank_account': 'BANK_ACCOUNT',
    'investment_account': 'INVESTMENT_ACCOUNT',
    'retirement_account': 'RETIREMENT_ACCOUNT',
    'business_interest': 'BUSINESS_INTEREST',
    'personal_property': 'PERSONAL_PROPERTY',
    'cryptocurrency': 'CRYPTOCURRENCY',
    'insurance': 'INSURANCE',
    'other': 'OTHER'
  }
  return mapping[appType]
}