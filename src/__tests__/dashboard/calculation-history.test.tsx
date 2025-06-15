import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalculationHistory } from '@/components/dashboard/calculation-history';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('CalculationHistory', () => {
  const mockUserId = 'user_123';
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders calculation history with mock data', () => {
    render(<CalculationHistory userId={mockUserId} />);

    // Check for main elements
    expect(screen.getByText('Showing 3 of 3 calculations')).toBeInTheDocument();
    expect(screen.getByText('New Calculation')).toBeInTheDocument();
    
    // Check for calculation cards
    expect(screen.getByText('California Property Division')).toBeInTheDocument();
    expect(screen.getByText('Pennsylvania Property Division')).toBeInTheDocument();
    expect(screen.getByText('Texas Property Division')).toBeInTheDocument();
  });

  it('displays calculation status badges correctly', () => {
    render(<CalculationHistory userId={mockUserId} />);

    // Check for status badges
    expect(screen.getAllByText('Completed')).toHaveLength(2);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('shows calculation type badges', () => {
    render(<CalculationHistory userId={mockUserId} />);

    expect(screen.getAllByText('Community Property')).toHaveLength(2);
    expect(screen.getByText('Equitable Distribution')).toBeInTheDocument();
  });

  it('displays financial information correctly', () => {
    render(<CalculationHistory userId={mockUserId} />);

    // Check for formatted currency values
    expect(screen.getByText('$485,750')).toBeInTheDocument();
    expect(screen.getByText('$320,000')).toBeInTheDocument();
    expect(screen.getByText('$275,000')).toBeInTheDocument();
    
    // Check for debt values
    expect(screen.getByText('$125,000')).toBeInTheDocument();
    expect(screen.getByText('$45,000')).toBeInTheDocument();
    expect(screen.getByText('$35,000')).toBeInTheDocument();
  });

  it('shows division percentages', () => {
    render(<CalculationHistory userId={mockUserId} />);

    // Community property should show 50%/50%
    expect(screen.getAllByText('50% / 50%')).toHaveLength(2);
    
    // Equitable distribution should show 60%/40%
    expect(screen.getByText('60% / 40%')).toBeInTheDocument();
  });

  it('displays confidence levels', () => {
    render(<CalculationHistory userId={mockUserId} />);

    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('filters calculations by search term', async () => {
    render(<CalculationHistory userId={mockUserId} />);

    const searchInput = screen.getByPlaceholderText('Search by state or calculation ID...');
    
    // Search for California
    await user.type(searchInput, 'California');

    await waitFor(() => {
      expect(screen.getByText('California Property Division')).toBeInTheDocument();
      expect(screen.queryByText('Pennsylvania Property Division')).not.toBeInTheDocument();
      expect(screen.queryByText('Texas Property Division')).not.toBeInTheDocument();
    });
  });

  it('filters calculations by status', async () => {
    render(<CalculationHistory userId={mockUserId} />);

    const statusFilter = screen.getByDisplayValue('All Statuses');
    
    // Filter by completed status
    await user.selectOptions(statusFilter, 'completed');

    await waitFor(() => {
      expect(screen.getAllByText('Completed')).toHaveLength(2);
      expect(screen.queryByText('In Progress')).not.toBeInTheDocument();
    });
  });

  it('filters calculations by type', async () => {
    render(<CalculationHistory userId={mockUserId} />);

    const typeFilter = screen.getByDisplayValue('All Types');
    
    // Filter by community property
    await user.selectOptions(typeFilter, 'COMMUNITY_PROPERTY');

    await waitFor(() => {
      expect(screen.getAllByText('Community Property')).toHaveLength(2);
      expect(screen.queryByText('Equitable Distribution')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no calculations match filters', async () => {
    render(<CalculationHistory userId={mockUserId} />);

    const searchInput = screen.getByPlaceholderText('Search by state or calculation ID...');
    
    // Search for non-existent state
    await user.type(searchInput, 'NonExistentState');

    await waitFor(() => {
      expect(screen.getByText('No calculations found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters or search terms.')).toBeInTheDocument();
    });
  });

  it('renders action buttons for each calculation', () => {
    render(<CalculationHistory userId={mockUserId} />);

    // Each calculation should have a View button
    expect(screen.getAllByText('View')).toHaveLength(3);
    
    // Completed calculations should have Documents button
    expect(screen.getAllByText('Documents')).toHaveLength(2);
    
    // All calculations should have delete button (trash icon)
    const deleteButtons = screen.getAllByRole('button');
    const trashButtons = deleteButtons.filter(button => 
      button.querySelector('svg') && button.className.includes('text-red-600')
    );
    expect(trashButtons).toHaveLength(3);
  });

  it('displays calculation IDs and dates', () => {
    render(<CalculationHistory userId={mockUserId} />);

    expect(screen.getByText('ID: calc_123')).toBeInTheDocument();
    expect(screen.getByText('ID: calc_124')).toBeInTheDocument();
    expect(screen.getByText('ID: calc_125')).toBeInTheDocument();
    
    // Check for dates (format may vary based on locale)
    expect(screen.getByText(/Created:/)).toBeInTheDocument();
    expect(screen.getByText(/Updated:/)).toBeInTheDocument();
  });

  it('shows document generation indicator', () => {
    render(<CalculationHistory userId={mockUserId} />);

    expect(screen.getByText('2 document(s) generated')).toBeInTheDocument();
    expect(screen.getByText('1 document(s) generated')).toBeInTheDocument();
  });

  it('has proper responsive layout classes', () => {
    const { container } = render(<CalculationHistory userId={mockUserId} />);

    // Check for responsive grid classes in financial info section
    const gridElements = container.querySelectorAll('.grid');
    expect(gridElements.length).toBeGreaterThan(0);
    
    // Check for responsive flex layout in action sections
    const flexElements = container.querySelectorAll('.flex');
    expect(flexElements.length).toBeGreaterThan(0);
  });
});