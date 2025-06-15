import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AnalyticsDashboard } from '@/components/dashboard/analytics-dashboard';

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Analytics & Insights
        </h1>
        <p className="text-gray-600 mt-1">
          View detailed analytics and usage patterns for your calculations
        </p>
      </div>

      <AnalyticsDashboard userId={session.user.id} />
    </div>
  );
}