import { renderHook, act } from '@testing-library/react'
import { useMultiStepForm } from '@/hooks/useMultiStepForm'
import { CalculationInputs } from '@/types'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

describe('useMultiStepForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('should initialize with default form data', () => {
    const { result } = renderHook(() => useMultiStepForm())
    
    expect(result.current.formData).toBeDefined()
    expect(result.current.formData.personalInfo).toBeDefined()
    expect(result.current.formData.assets).toEqual([])
    expect(result.current.formData.debts).toEqual([])
    expect(result.current.currentStep).toBe('personal')
    expect(result.current.errors).toEqual({})
  })

  it('should load saved data from localStorage', () => {
    const savedData: Partial<CalculationInputs> = {
      personalInfo: {
        spouse1Name: 'John',
        spouse2Name: 'Jane',
        marriageDate: '2020-01-01',
        separationDate: '2024-01-01',
        filingState: 'PA',
        hasChildren: false,
      },
      assets: [
        { id: '1', name: 'House', value: 400000, type: 'real_estate', isMarital: true }
      ]
    }
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData))
    
    const { result } = renderHook(() => useMultiStepForm())
    
    expect(result.current.formData.personalInfo.spouse1Name).toBe('John')
    expect(result.current.formData.personalInfo.spouse2Name).toBe('Jane')
    expect(result.current.formData.assets).toHaveLength(1)
    expect(result.current.formData.assets[0].name).toBe('House')
  })

  it('should update form data and save to localStorage', () => {
    const { result } = renderHook(() => useMultiStepForm())
    
    act(() => {
      result.current.updateFormData('personalInfo', {
        spouse1Name: 'John Updated',
        spouse2Name: 'Jane Updated'
      })
    })
    
    expect(result.current.formData.personalInfo.spouse1Name).toBe('John Updated')
    expect(result.current.formData.personalInfo.spouse2Name).toBe('Jane Updated')
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'equisplit-calculator-v1',
      expect.stringContaining('John Updated')
    )
  })

  it('should navigate between steps', () => {
    const { result } = renderHook(() => useMultiStepForm())
    
    expect(result.current.currentStep).toBe('personal')
    
    act(() => {
      result.current.nextStep()
    })
    
    expect(result.current.currentStep).toBe('assets')
    
    act(() => {
      result.current.previousStep()
    })
    
    expect(result.current.currentStep).toBe('personal')
  })

  it('should not go beyond last step', () => {
    const { result } = renderHook(() => useMultiStepForm())
    
    // Navigate to last step
    act(() => {
      result.current.goToStep('circumstances')
    })
    
    expect(result.current.currentStep).toBe('circumstances')
    
    // Try to go beyond
    act(() => {
      result.current.nextStep()
    })
    
    expect(result.current.currentStep).toBe('circumstances')
  })

  it('should not go before first step', () => {
    const { result } = renderHook(() => useMultiStepForm())
    
    expect(result.current.currentStep).toBe('personal')
    
    act(() => {
      result.current.previousStep()
    })
    
    expect(result.current.currentStep).toBe('personal')
  })

  it('should validate form data for current step', () => {
    const { result } = renderHook(() => useMultiStepForm())
    
    act(() => {
      const isValid = result.current.validateCurrentStep()
      expect(isValid).toBe(false)
    })
    
    expect(result.current.errors).toBeDefined()
    expect(Object.keys(result.current.errors)).toHaveLength(greaterThan(0))
  })

  it('should clear errors when updating valid data', () => {
    const { result } = renderHook(() => useMultiStepForm())
    
    // Set errors first
    act(() => {
      result.current.setErrors({ spouse1Name: 'Required field' })
    })
    
    expect(result.current.errors.spouse1Name).toBe('Required field')
    
    // Update with valid data
    act(() => {
      result.current.updateFormData('personalInfo', {
        spouse1Name: 'John'
      })
    })
    
    expect(result.current.errors.spouse1Name).toBeUndefined()
  })

  it('should track completion status for each step', () => {
    const { result } = renderHook(() => useMultiStepForm())
    
    // Initially no steps are complete
    expect(result.current.isStepComplete('personal')).toBe(false)
    expect(result.current.isStepComplete('assets')).toBe(false)
    
    // Fill personal info
    act(() => {
      result.current.updateFormData('personalInfo', {
        spouse1Name: 'John',
        spouse2Name: 'Jane',
        marriageDate: '2020-01-01',
        separationDate: '2024-01-01',
        filingState: 'PA',
        hasChildren: false,
      })
    })
    
    expect(result.current.isStepComplete('personal')).toBe(true)
  })

  it('should add and remove assets', () => {
    const { result } = renderHook(() => useMultiStepForm())
    
    expect(result.current.formData.assets).toHaveLength(0)
    
    act(() => {
      result.current.addAsset()
    })
    
    expect(result.current.formData.assets).toHaveLength(1)
    expect(result.current.formData.assets[0].id).toBeDefined()
    
    const assetId = result.current.formData.assets[0].id
    
    act(() => {
      result.current.removeAsset(assetId)
    })
    
    expect(result.current.formData.assets).toHaveLength(0)
  })

  it('should add and remove debts', () => {
    const { result } = renderHook(() => useMultiStepForm())
    
    expect(result.current.formData.debts).toHaveLength(0)
    
    act(() => {
      result.current.addDebt()
    })
    
    expect(result.current.formData.debts).toHaveLength(1)
    expect(result.current.formData.debts[0].id).toBeDefined()
    
    const debtId = result.current.formData.debts[0].id
    
    act(() => {
      result.current.removeDebt(debtId)
    })
    
    expect(result.current.formData.debts).toHaveLength(0)
  })

  it('should update specific asset', () => {
    const { result } = renderHook(() => useMultiStepForm())
    
    act(() => {
      result.current.addAsset()
    })
    
    const assetId = result.current.formData.assets[0].id
    
    act(() => {
      result.current.updateAsset(assetId, {
        name: 'Updated Asset',
        value: 500000,
        type: 'real_estate',
        isMarital: true
      })
    })
    
    expect(result.current.formData.assets[0].name).toBe('Updated Asset')
    expect(result.current.formData.assets[0].value).toBe(500000)
  })

  it('should calculate progress percentage', () => {
    const { result } = renderHook(() => useMultiStepForm())
    
    // Initially 0% complete
    expect(result.current.getProgressPercentage()).toBe(0)
    
    // Fill personal info (25% complete)
    act(() => {
      result.current.updateFormData('personalInfo', {
        spouse1Name: 'John',
        spouse2Name: 'Jane',
        marriageDate: '2020-01-01',
        separationDate: '2024-01-01',
        filingState: 'PA',
        hasChildren: false,
      })
    })
    
    expect(result.current.getProgressPercentage()).toBe(25)
  })

  it('should reset form data', () => {
    const { result } = renderHook(() => useMultiStepForm())
    
    // Add some data
    act(() => {
      result.current.updateFormData('personalInfo', {
        spouse1Name: 'John',
      })
      result.current.addAsset()
    })
    
    expect(result.current.formData.personalInfo.spouse1Name).toBe('John')
    expect(result.current.formData.assets).toHaveLength(1)
    
    // Reset
    act(() => {
      result.current.resetForm()
    })
    
    expect(result.current.formData.personalInfo.spouse1Name).toBe('')
    expect(result.current.formData.assets).toHaveLength(0)
    expect(result.current.currentStep).toBe('personal')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('equisplit-calculator-v1')
  })

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded')
    })
    
    const { result } = renderHook(() => useMultiStepForm())
    
    // Should not crash when localStorage fails
    act(() => {
      result.current.updateFormData('personalInfo', {
        spouse1Name: 'John',
      })
    })
    
    expect(result.current.formData.personalInfo.spouse1Name).toBe('John')
  })

  it('should handle malformed localStorage data', () => {
    localStorageMock.getItem.mockReturnValue('invalid json')
    
    const { result } = renderHook(() => useMultiStepForm())
    
    // Should fall back to default data
    expect(result.current.formData.personalInfo.spouse1Name).toBe('')
    expect(result.current.formData.assets).toEqual([])
  })

  it('should validate step transitions', () => {
    const { result } = renderHook(() => useMultiStepForm())
    
    // Try to go to next step without valid data
    act(() => {
      const canProceed = result.current.canProceedToStep('assets')
      expect(canProceed).toBe(false)
    })
    
    // Fill required data
    act(() => {
      result.current.updateFormData('personalInfo', {
        spouse1Name: 'John',
        spouse2Name: 'Jane',
        marriageDate: '2020-01-01',
        separationDate: '2024-01-01',
        filingState: 'PA',
        hasChildren: false,
      })
    })
    
    act(() => {
      const canProceed = result.current.canProceedToStep('assets')
      expect(canProceed).toBe(true)
    })
  })

  it('should provide step metadata', () => {
    const { result } = renderHook(() => useMultiStepForm())
    
    const steps = result.current.getSteps()
    
    expect(steps).toHaveLength(4)
    expect(steps[0].id).toBe('personal')
    expect(steps[0].title).toBe('Personal Information')
    expect(steps[1].id).toBe('assets')
    expect(steps[1].title).toBe('Assets')
    expect(steps[2].id).toBe('debts')
    expect(steps[2].title).toBe('Debts')
    expect(steps[3].id).toBe('circumstances')
    expect(steps[3].title).toBe('Special Circumstances')
  })
})