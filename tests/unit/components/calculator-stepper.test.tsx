import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CalculatorStepper } from '@/components/calculator/calculator-stepper'

const mockSteps = [
  { id: 'personal', title: 'Personal Information', isComplete: true },
  { id: 'assets', title: 'Assets', isComplete: false },
  { id: 'debts', title: 'Debts', isComplete: false },
  { id: 'circumstances', title: 'Special Circumstances', isComplete: false },
]

describe('CalculatorStepper', () => {
  const defaultProps = {
    steps: mockSteps,
    currentStep: 'assets',
    onStepClick: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all steps', () => {
    render(<CalculatorStepper {...defaultProps} />)
    
    mockSteps.forEach(step => {
      expect(screen.getByText(step.title)).toBeInTheDocument()
    })
  })

  it('highlights the current step', () => {
    render(<CalculatorStepper {...defaultProps} />)
    
    const currentStepElement = screen.getByText('Assets').closest('button')
    expect(currentStepElement).toHaveClass('bg-blue-600') // Assuming this is the active class
  })

  it('shows completed steps with checkmark', () => {
    render(<CalculatorStepper {...defaultProps} />)
    
    const completedStep = screen.getByText('Personal Information').closest('button')
    expect(completedStep).toHaveAttribute('data-completed', 'true')
  })

  it('calls onStepClick when a step is clicked', () => {
    render(<CalculatorStepper {...defaultProps} />)
    
    const stepButton = screen.getByText('Personal Information')
    fireEvent.click(stepButton)
    
    expect(defaultProps.onStepClick).toHaveBeenCalledWith('personal')
  })

  it('disables future steps when not completed', () => {
    render(<CalculatorStepper {...defaultProps} />)
    
    const futureStep = screen.getByText('Debts').closest('button')
    expect(futureStep).toHaveAttribute('disabled')
  })

  it('enables completed and current steps', () => {
    render(<CalculatorStepper {...defaultProps} />)
    
    const completedStep = screen.getByText('Personal Information').closest('button')
    const currentStep = screen.getByText('Assets').closest('button')
    
    expect(completedStep).not.toHaveAttribute('disabled')
    expect(currentStep).not.toHaveAttribute('disabled')
  })

  it('shows progress indicator', () => {
    render(<CalculatorStepper {...defaultProps} />)
    
    // Assuming progress is shown as "Step 2 of 4" or similar
    const progressText = screen.getByText(/step/i)
    expect(progressText).toBeInTheDocument()
  })

  it('handles empty steps array gracefully', () => {
    render(<CalculatorStepper {...defaultProps} steps={[]} />)
    
    // Should not crash and might show empty state
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('handles missing currentStep gracefully', () => {
    render(<CalculatorStepper {...defaultProps} currentStep="nonexistent" />)
    
    // Should not crash and render all steps
    mockSteps.forEach(step => {
      expect(screen.getByText(step.title)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<CalculatorStepper {...defaultProps} />)
      
      const stepper = screen.getByRole('navigation')
      expect(stepper).toHaveAttribute('aria-label', 'Progress')
    })

    it('marks current step with aria-current', () => {
      render(<CalculatorStepper {...defaultProps} />)
      
      const currentStep = screen.getByText('Assets').closest('button')
      expect(currentStep).toHaveAttribute('aria-current', 'step')
    })

    it('has proper button roles and labels', () => {
      render(<CalculatorStepper {...defaultProps} />)
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label')
      })
    })
  })

  describe('Responsive Behavior', () => {
    it('collapses step titles on small screens', () => {
      // Mock window.matchMedia for mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('max-width: 768px'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      render(<CalculatorStepper {...defaultProps} />)
      
      // On mobile, might show only step numbers or icons
      const stepNumbers = screen.getAllByText(/^\d+$/)
      expect(stepNumbers.length).toBeGreaterThan(0)
    })
  })
})