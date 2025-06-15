import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProgressTracking } from '@/components/dashboard/progress-tracking';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock the progress data by overriding the mock data in the component
jest.mock('@/components/dashboard/progress-tracking', () => {
  const originalModule = jest.requireActual('@/components/dashboard/progress-tracking');
  return {
    ...originalModule,
    // We'll test both empty state and with data
  };
});

describe('ProgressTracking', () => {
  const mockUserId = 'user_123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders progress tracking header', () => {
    render(<ProgressTracking userId={mockUserId} />);

    expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
  });

  it('shows in-progress calculations', () => {
    render(<ProgressTracking userId={mockUserId} />);

    // Check for calculation titles
    expect(screen.getByText('Pennsylvania Property Division')).toBeInTheDocument();
    expect(screen.getByText('California Property Division')).toBeInTheDocument();
  });

  it('displays calculation type badges', () => {
    render(<ProgressTracking userId={mockUserId} />);

    expect(screen.getByText('EQUITABLE DISTRIBUTION')).toBeInTheDocument();
    expect(screen.getByText('COMMUNITY PROPERTY')).toBeInTheDocument();
  });

  it('shows progress percentages and step information', () => {
    render(<ProgressTracking userId={mockUserId} />);

    // Check for progress percentages
    expect(screen.getByText('65% complete')).toBeInTheDocument();
    expect(screen.getByText('25% complete')).toBeInTheDocument();

    // Check for step information
    expect(screen.getByText('Step 5 of 6')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
  });

  it('displays current step and next actions', () => {
    render(<ProgressTracking userId={mockUserId} />);

    expect(screen.getByText('Next: Complete property appraisal values')).toBeInTheDocument();
    expect(screen.getByText('Next: Enter spouse employment details')).toBeInTheDocument();
    
    expect(screen.getByText('Estimated time: 15 minutes')).toBeInTheDocument();
    expect(screen.getByText('Estimated time: 25 minutes')).toBeInTheDocument();
  });

  it('shows step progress with correct status indicators', () => {
    render(<ProgressTracking userId={mockUserId} />);

    // Check for completed steps (checkmark icons)
    const completedSteps = screen.getAllByText('Calculation Steps');
    expect(completedSteps).toHaveLength(2); // One for each calculation

    // Check for individual steps
    expect(screen.getAllByText('Basic Information')).toHaveLength(2);
    expect(screen.getAllByText('Asset Information')).toHaveLength(2);
    expect(screen.getAllByText('Debt Information')).toHaveLength(2);
  });

  it('highlights current step with badge', () => {
    render(<ProgressTracking userId={mockUserId} />);

    // Current steps should have badges
    expect(screen.getAllByText('Current')).toHaveLength(2);
  });

  it('renders action buttons', () => {
    render(<ProgressTracking userId={mockUserId} />);

    // Each calculation should have Continue, View Details, and Delete buttons
    expect(screen.getAllByText('Continue')).toHaveLength(4); // 2 in headers + 2 in actions
    expect(screen.getAllByText('View Details')).toHaveLength(2);
    expect(screen.getAllByText('Delete Draft')).toHaveLength(2);
  });

  it('displays calculation IDs', () => {
    render(<ProgressTracking userId={mockUserId} />);

    expect(screen.getByText('ID: calc_124')).toBeInTheDocument();
    expect(screen.getByText('ID: calc_126')).toBeInTheDocument();
  });

  it('shows last updated timestamps', () => {
    render(<ProgressTracking userId={mockUserId} />);

    // Should show last updated information
    expect(screen.getAllByText(/Last updated:/)).toHaveLength(2);
  });

  it('displays auto-save notice', () => {
    render(<ProgressTracking userId={mockUserId} />);

    expect(screen.getByText('💾 Your progress is automatically saved as you complete each step')).toBeInTheDocument();
  });

  it('renders progress bars', () => {
    const { container } = render(<ProgressTracking userId={mockUserId} />);

    // Check for progress bar elements
    const progressBars = container.querySelectorAll('[role="progressbar"]');
    expect(progressBars).toHaveLength(2);
  });

  it('shows correct step status styling', () => {
    const { container } = render(<ProgressTracking userId={mockUserId} />);

    // Check for step status indicators (completed, current, pending)
    const stepIndicators = container.querySelectorAll('.w-6.h-6.rounded-full');
    expect(stepIndicators.length).toBeGreaterThan(0);
  });

  it('has proper responsive layout classes', () => {
    const { container } = render(<ProgressTracking userId={mockUserId} />);

    // Check for responsive flex classes
    const flexElements = container.querySelectorAll('.flex');
    expect(flexElements.length).toBeGreaterThan(0);

    // Check for spacing classes
    const spaceElements = container.querySelectorAll('[class*="space-y"]');
    expect(spaceElements.length).toBeGreaterThan(0);
  });

  it('displays warning indicators for next actions', () => {
    const { container } = render(<ProgressTracking userId={mockUserId} />);

    // Check for warning icons in next action sections
    const warningIcons = container.querySelectorAll('.text-yellow-600');
    expect(warningIcons.length).toBeGreaterThan(0);
  });

  // Note: Testing the empty state would require mocking the data differently
  // In a real implementation, you'd want to test:
  // - Empty state when no calculations in progress
  // - Different step configurations for different calculation types
  // - Error states if calculations fail to load
});