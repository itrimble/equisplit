import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve({
    user: {
      id: 'user_123',
      name: 'Test User',
      email: 'test@example.com',
    }
  })),
}));

// Mock components to avoid complex rendering issues
jest.mock('@/components/dashboard/dashboard-overview', () => {
  return function MockDashboardOverview() {
    return <div data-testid="dashboard-overview">Dashboard Overview</div>;
  };
});

jest.mock('@/components/dashboard/quick-actions', () => {
  return function MockQuickActions() {
    return <div data-testid="quick-actions">Quick Actions</div>;
  };
});

jest.mock('@/components/dashboard/progress-tracking', () => {
  return function MockProgressTracking() {
    return <div data-testid="progress-tracking">Progress Tracking</div>;
  };
});

jest.mock('@/components/dashboard/usage-overview', () => {
  return function MockUsageOverview() {
    return <div data-testid="usage-overview">Usage Overview</div>;
  };
});

jest.mock('@/components/dashboard/recent-activity', () => {
  return function MockRecentActivity() {
    return <div data-testid="recent-activity">Recent Activity</div>;
  };
});

jest.mock('@/components/dashboard/dashboard-nav', () => {
  return function MockDashboardNav() {
    return (
      <nav data-testid="dashboard-nav">
        <div>EquiSplit</div>
        <a href="/dashboard">Overview</a>
        <a href="/dashboard/calculations">Calculations</a>
        <a href="/dashboard/documents">Documents</a>
        <a href="/dashboard/analytics">Analytics</a>
        <a href="/dashboard/billing">Billing</a>
        <a href="/dashboard/profile">Profile</a>
      </nav>
    );
  };
});

describe('Dashboard Integration', () => {
  it('renders dashboard layout with all components', async () => {
    // Import the actual dashboard page component
    const DashboardPage = (await import('@/app/dashboard/page')).default;
    
    render(await DashboardPage());

    // Check for main dashboard elements
    expect(screen.getByText('Welcome back, Test')).toBeInTheDocument();
    expect(screen.getByText('Manage your property division calculations and documents')).toBeInTheDocument();
    
    // Check for component presence
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-overview')).toBeInTheDocument();
    expect(screen.getByTestId('progress-tracking')).toBeInTheDocument();
    expect(screen.getByTestId('usage-overview')).toBeInTheDocument();
    expect(screen.getByTestId('recent-activity')).toBeInTheDocument();
  });

  it('renders dashboard navigation', async () => {
    const DashboardLayout = (await import('@/app/dashboard/layout')).default;
    
    const mockChildren = <div>Dashboard Content</div>;
    
    render(await DashboardLayout({ children: mockChildren }));

    expect(screen.getByTestId('dashboard-nav')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('has proper page structure and layout', async () => {
    const DashboardPage = (await import('@/app/dashboard/page')).default;
    const { container } = render(await DashboardPage());

    // Check for proper layout structure
    expect(container.querySelector('.space-y-8')).toBeInTheDocument();
  });
});