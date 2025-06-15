import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DocumentManager } from '@/components/dashboard/document-manager';

export default async function DocumentsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Document Management
        </h1>
        <p className="text-gray-600 mt-1">
          Manage uploaded files and generated legal documents
        </p>
      </div>

      <DocumentManager userId={session.user.id} />
    </div>
  );
}