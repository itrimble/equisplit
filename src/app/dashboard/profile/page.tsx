import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UserProfileManager } from '@/components/dashboard/user-profile-manager';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Profile Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your account information and preferences
        </p>
      </div>

      <UserProfileManager user={session.user} />
    </div>
  );
}