import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { UsageOverview } from '@/components/dashboard/usage-overview';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ProgressTracking } from '@/components/dashboard/progress-tracking';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {session.user.name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your property division calculations and documents
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Overview Cards */}
      <DashboardOverview userId={session.user.id} />

      {/* Progress Tracking */}
      <ProgressTracking userId={session.user.id} />

      {/* Usage Overview */}
      <UsageOverview userId={session.user.id} />

      {/* Recent Activity */}
      <RecentActivity userId={session.user.id} />
    </div>
  );
}