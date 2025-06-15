'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  PlusIcon, 
  DocumentArrowUpIcon, 
  DocumentDuplicateIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

export function QuickActions() {
  const actions = [
    {
      title: 'New Calculation',
      description: 'Start a new property division calculation',
      href: '/calculator',
      icon: PlusIcon,
      variant: 'default' as const,
    },
    {
      title: 'Upload Documents',
      description: 'Upload financial documents for analysis',
      href: '/dashboard/documents?action=upload',
      icon: DocumentArrowUpIcon,
      variant: 'outline' as const,
    },
    {
      title: 'Resume Calculation',
      description: 'Continue your last in-progress calculation',
      href: '/dashboard/calculations?status=in-progress',
      icon: ArrowPathIcon,
      variant: 'outline' as const,
    },
    {
      title: 'Generate Document',
      description: 'Create MSA or financial affidavit',
      href: '/dashboard/documents?action=generate',
      icon: DocumentDuplicateIcon,
      variant: 'outline' as const,
    },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Button
                variant={action.variant}
                className="w-full h-auto p-4 flex flex-col items-center justify-center space-y-2 text-center"
              >
                <action.icon className="h-6 w-6" />
                <div>
                  <div className="font-medium text-sm">
                    {action.title}
                  </div>
                  <div className="text-xs opacity-70">
                    {action.description}
                  </div>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}