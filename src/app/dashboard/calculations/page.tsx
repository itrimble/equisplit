import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CalculationHistory } from '@/components/dashboard/calculation-history';

export default async function CalculationsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Calculation History
        </h1>
        <p className="text-gray-600 mt-1">
          View and manage your property division calculations
        </p>
      </div>

      <CalculationHistory userId={session.user.id} />
    </div>
  );
}