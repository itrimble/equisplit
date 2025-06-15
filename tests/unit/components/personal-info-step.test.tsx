import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PersonalInfoStep } from '@/components/forms/personal-info-step'

// Mock the useMultiStepForm hook
jest.mock('@/hooks/useMultiStepForm', () => ({
  useMultiStepForm: () => ({
    formData: {
      personalInfo: {
        spouse1Name: '',
        spouse2Name: '',
        marriageDate: '',
        separationDate: '',
        filingState: '',
        hasChildren: false,
      }
    },
    updateFormData: jest.fn(),
    errors: {},
    setErrors: jest.fn(),
  })
}))

describe('PersonalInfoStep', () => {
  const defaultProps = {
    onNext: jest.fn(),
    onPrevious: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<PersonalInfoStep {...defaultProps} />)
    
    expect(screen.getByLabelText(/spouse 1 name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/spouse 2 name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/marriage date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/separation date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/filing state/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/children/i)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoStep {...defaultProps} />)
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)
    
    await waitFor(() => {
      expect(screen.getByText(/spouse 1 name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/spouse 2 name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/marriage date is required/i)).toBeInTheDocument()
      expect(screen.getByText(/filing state is required/i)).toBeInTheDocument()
    })
    
    expect(defaultProps.onNext).not.toHaveBeenCalled()
  })

  it('validates date fields correctly', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoStep {...defaultProps} />)
    
    const marriageDate = screen.getByLabelText(/marriage date/i)
    const separationDate = screen.getByLabelText(/separation date/i)
    
    // Enter separation date before marriage date
    await user.type(marriageDate, '2020-01-01')
    await user.type(separationDate, '2019-01-01')
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)
    
    await waitFor(() => {
      expect(screen.getByText(/separation date cannot be before marriage date/i)).toBeInTheDocument()
    })
  })

  it('validates future dates', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoStep {...defaultProps} />)
    
    const marriageDate = screen.getByLabelText(/marriage date/i)
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    
    await user.type(marriageDate, futureDate.toISOString().split('T')[0])
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)
    
    await waitFor(() => {
      expect(screen.getByText(/marriage date cannot be in the future/i)).toBeInTheDocument()
    })
  })

  it('shows all US states in dropdown', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoStep {...defaultProps} />)
    
    const stateSelect = screen.getByLabelText(/filing state/i)
    await user.click(stateSelect)
    
    // Check for some common states
    expect(screen.getByText('California')).toBeInTheDocument()
    expect(screen.getByText('Texas')).toBeInTheDocument()
    expect(screen.getByText('New York')).toBeInTheDocument()
    expect(screen.getByText('Pennsylvania')).toBeInTheDocument()
  })

  it('handles children checkbox correctly', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoStep {...defaultProps} />)
    
    const childrenCheckbox = screen.getByLabelText(/children/i)
    expect(childrenCheckbox).not.toBeChecked()
    
    await user.click(childrenCheckbox)
    expect(childrenCheckbox).toBeChecked()
  })

  it('calls onNext with valid data', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoStep {...defaultProps} />)
    
    // Fill in all required fields
    await user.type(screen.getByLabelText(/spouse 1 name/i), 'John Doe')
    await user.type(screen.getByLabelText(/spouse 2 name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/marriage date/i), '2020-01-01')
    await user.type(screen.getByLabelText(/separation date/i), '2024-01-01')
    
    const stateSelect = screen.getByLabelText(/filing state/i)
    await user.click(stateSelect)
    await user.click(screen.getByText('California'))
    
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)
    
    await waitFor(() => {
      expect(defaultProps.onNext).toHaveBeenCalled()
    })
  })

  it('calls onPrevious when back button is clicked', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoStep {...defaultProps} />)
    
    const backButton = screen.getByRole('button', { name: /back/i })
    await user.click(backButton)
    
    expect(defaultProps.onPrevious).toHaveBeenCalled()
  })

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      render(<PersonalInfoStep {...defaultProps} />)
      
      const form = screen.getByRole('form')
      expect(form).toHaveAttribute('aria-labelledby')
      
      const inputs = screen.getAllByRole('textbox')
      inputs.forEach(input => {
        expect(input).toHaveAttribute('aria-describedby')
      })
    })

    it('announces validation errors to screen readers', async () => {
      const user = userEvent.setup()
      render(<PersonalInfoStep {...defaultProps} />)
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      
      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert')
        expect(errorMessages.length).toBeGreaterThan(0)
      })
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<PersonalInfoStep {...defaultProps} />)
      
      const firstInput = screen.getByLabelText(/spouse 1 name/i)
      firstInput.focus()
      
      // Tab through all focusable elements
      await user.tab()
      expect(screen.getByLabelText(/spouse 2 name/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText(/marriage date/i)).toHaveFocus()
    })
  })

  describe('State-specific features', () => {
    it('shows community property states information', async () => {
      const user = userEvent.setup()
      render(<PersonalInfoStep {...defaultProps} />)
      
      const stateSelect = screen.getByLabelText(/filing state/i)
      await user.click(stateSelect)
      await user.click(screen.getByText('California'))
      
      await waitFor(() => {
        expect(screen.getByText(/community property state/i)).toBeInTheDocument()
      })
    })

    it('shows equitable distribution states information', async () => {
      const user = userEvent.setup()
      render(<PersonalInfoStep {...defaultProps} />)
      
      const stateSelect = screen.getByLabelText(/filing state/i)
      await user.click(stateSelect)
      await user.click(screen.getByText('Pennsylvania'))
      
      await waitFor(() => {
        expect(screen.getByText(/equitable distribution state/i)).toBeInTheDocument()
      })
    })
  })

  describe('Data persistence', () => {
    it('loads saved data from localStorage', () => {
      const savedData = {
        personalInfo: {
          spouse1Name: 'John',
          spouse2Name: 'Jane',
          marriageDate: '2020-01-01',
          separationDate: '2024-01-01',
          filingState: 'CA',
          hasChildren: true,
        }
      }
      
      localStorage.setItem('equisplit-calculator-v1', JSON.stringify(savedData))
      
      render(<PersonalInfoStep {...defaultProps} />)
      
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Jane')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2020-01-01')).toBeInTheDocument()
    })

    it('saves data to localStorage on input change', async () => {
      const user = userEvent.setup()
      render(<PersonalInfoStep {...defaultProps} />)
      
      const nameInput = screen.getByLabelText(/spouse 1 name/i)
      await user.type(nameInput, 'John')
      
      await waitFor(() => {
        const savedData = JSON.parse(localStorage.getItem('equisplit-calculator-v1') || '{}')
        expect(savedData.personalInfo?.spouse1Name).toBe('John')
      })
    })
  })
})