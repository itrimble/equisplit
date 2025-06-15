import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BillingManager } from '@/components/dashboard/billing-manager';

export default async function BillingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Billing & Subscription
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your subscription and billing information
        </p>
      </div>

      <BillingManager userId={session.user.id} />
    </div>
  );
}