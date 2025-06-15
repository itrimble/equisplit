import { CalculationInputs, USState, Asset, Debt } from '@/types'
import { render } from '@testing-library/react'
import React from 'react'

/**
 * Test data factory functions for creating consistent test data
 */

export const createMockPersonalInfo = (overrides: Partial<CalculationInputs['personalInfo']> = {}) => ({
  spouse1Name: 'John Doe',
  spouse2Name: 'Jane Doe',
  marriageDate: '2015-01-01',
  separationDate: '2024-01-01',
  filingState: 'PA' as USState,
  hasChildren: false,
  ...overrides,
})

export const createMockAsset = (overrides: Partial<Asset> = {}): Asset => ({
  id: `asset-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Asset',
  value: 100000,
  type: 'investment',
  isMarital: true,
  ...overrides,
})

export const createMockDebt = (overrides: Partial<Debt> = {}): Debt => ({
  id: `debt-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Debt',
  amount: 50000,
  type: 'credit_card',
  isMarital: true,
  ...overrides,
})

export const createMockCalculationInputs = (overrides: Partial<CalculationInputs> = {}): CalculationInputs => ({
  personalInfo: createMockPersonalInfo(),
  assets: [],
  debts: [],
  realEstate: [],
  personalProperty: [],
  financialAccounts: [],
  specialCircumstances: {
    marriageDuration: 9,
    ageSpouse1: 40,
    ageSpouse2: 38,
    healthSpouse1: 'good',
    healthSpouse2: 'good',
    incomeSpouse1: 75000,
    incomeSpouse2: 65000,
    earnCapacitySpouse1: 75000,
    earnCapacitySpouse2: 65000,
    contributionToMarriage: 'Equal contributions',
    custodyArrangement: undefined,
    domesticViolence: false,
    wastingOfAssets: false,
    taxConsequences: false,
  },
  ...overrides,
})

/**
 * Mock API responses
 */
export const mockCalculationResponse = {
  success: true,
  result: {
    spouse1Share: 0.52,
    spouse2Share: 0.48,
    totalMaritalAssets: 600000,
    totalMaritalDebts: 200000,
    totalSeparateAssets: 50000,
    netMaritalEstate: 400000,
    confidenceLevel: 0.85,
    calculations: {
      equityFactor: 0.52,
      adjustments: [],
      stateRules: 'equitable_distribution',
    },
    breakdown: {
      assets: [
        { name: 'Family Home', value: 500000, spouse1: 260000, spouse2: 240000 },
        { name: 'Investment Account', value: 100000, spouse1: 52000, spouse2: 48000 },
      ],
      debts: [
        { name: 'Mortgage', amount: 200000, spouse1: 104000, spouse2: 96000 },
      ],
    },
  },
  calculationId: 'calc-123',
}

/**
 * Test utilities for localStorage
 */
export const mockLocalStorage = () => {
  const store: { [key: string]: string } = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    length: Object.keys(store).length,
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  }
}

/**
 * Test utilities for session storage
 */
export const mockSessionStorage = () => {
  const store: { [key: string]: string } = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    length: Object.keys(store).length,
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  }
}

/**
 * Mock next-auth session
 */
export const createMockSession = (overrides: any = {}) => ({
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    ...overrides.user,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
})

/**
 * Utility for waiting in tests
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Mock file for testing file uploads
 */
export const createMockFile = (name: string, content: string, type: string = 'text/plain') => {
  const file = new File([content], name, { type })
  return file
}

/**
 * Mock PDF file for testing PDF uploads
 */
export const createMockPDFFile = () => {
  const pdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Pages\n/Kids [2 0 R]\n/Count 1\n>>\nendobj\n2 0 obj\n<<\n/Type /Page\n/Parent 1 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \ntrailer\n<<\n/Size 3\n/Root 1 0 R\n>>\nstartxref\n141\n%%EOF'
  return new File([pdfContent], 'test-document.pdf', { type: 'application/pdf' })
}

/**
 * Mock CSV file for testing CSV imports
 */
export const createMockCSVFile = (data: string[][]) => {
  const csvContent = data.map(row => row.join(',')).join('\n')
  return new File([csvContent], 'test-data.csv', { type: 'text/csv' })
}

/**
 * Test validation helpers
 */
export const expectValidationError = (errors: any, field: string, message?: string) => {
  expect(errors[field]).toBeDefined()
  if (message) {
    expect(errors[field]).toContain(message)
  }
}

export const expectNoValidationError = (errors: any, field: string) => {
  expect(errors[field]).toBeUndefined()
}

/**
 * Mock crypto functions for testing
 */
export const mockCrypto = () => {
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: jest.fn(() => `mock-${Math.random().toString(36).substr(2, 9)}`),
      getRandomValues: jest.fn((arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256)
        }
        return arr
      }),
      subtle: {
        encrypt: jest.fn(),
        decrypt: jest.fn(),
        generateKey: jest.fn(),
        importKey: jest.fn(),
        exportKey: jest.fn(),
      },
    },
    configurable: true,
  })
}

/**
 * Mock window.matchMedia for responsive testing
 */
export const mockMatchMedia = (matches: boolean = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

/**
 * Custom render function for React Testing Library with providers
 */
export const renderWithProviders = (ui: React.ReactElement, options: any = {}) => {
  // This would include any providers your app needs (theme, auth, etc.)
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return children // Add your providers here when they exist
  }

  return render(ui, { wrapper: AllTheProviders, ...options })
}

/**
 * Mock API fetch responses
 */
export const mockFetch = (response: any, status: number = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      headers: new Headers(),
      redirected: false,
      statusText: status === 200 ? 'OK' : 'Error',
      type: 'basic',
      url: '',
      clone: jest.fn(),
      body: null,
      bodyUsed: false,
      arrayBuffer: jest.fn(),
      blob: jest.fn(),
      formData: jest.fn(),
    } as Response)
  ) as jest.Mock
}

/**
 * Cleanup function for tests
 */
export const cleanup = () => {
  jest.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
}

/**
 * Common test assertions
 */
export const commonAssertions = {
  expectToBeInDocument: (element: any) => expect(element).toBeInTheDocument(),
  expectToBeVisible: (element: any) => expect(element).toBeVisible(),
  expectToHaveValue: (element: any, value: string) => expect(element).toHaveValue(value),
  expectToHaveClass: (element: any, className: string) => expect(element).toHaveClass(className),
  expectToHaveAttribute: (element: any, attr: string, value?: string) => {
    if (value) {
      expect(element).toHaveAttribute(attr, value)
    } else {
      expect(element).toHaveAttribute(attr)
    }
  },
}

/**
 * Performance testing utilities
 */
export const measurePerformance = async (fn: () => Promise<void>, label: string) => {
  const start = performance.now()
  await fn()
  const end = performance.now()
  const duration = end - start
  console.log(`${label}: ${duration}ms`)
  return duration
}

/**
 * Memory usage testing
 */
export const measureMemoryUsage = () => {
  if ('memory' in performance) {
    return (performance as any).memory
  }
  return null
}