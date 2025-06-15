'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentActivity } from '@/hooks/use-dashboard-data';
import { 
  CalculatorIcon, 
  DocumentTextIcon, 
  CreditCardIcon,
  UserCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  LockClosedIcon,
  TrashIcon,
  ArrowPathIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

interface RecentActivityProps {
  userId: string;
}

function getActivityIcon(action: string) {
  switch (action) {
    case 'CALCULATE':
      return CalculatorIcon;
    case 'GENERATE_DOCUMENT':
      return DocumentTextIcon;
    case 'LOGIN':
    case 'LOGOUT':
      return LockClosedIcon;
    case 'UPDATE':
      return ArrowPathIcon;
    case 'CREATE':
      return CalculatorIcon;
    case 'READ':
      return EyeIcon;
    case 'DELETE':
      return TrashIcon;
    case 'CHANGE_PASSWORD':
    case 'ENABLE_MFA':
    case 'DISABLE_MFA':
      return KeyIcon;
    default:
      return ClockIcon;
  }
}

function getActivityBadge(severity: string) {
  switch (severity) {
    case 'INFO':
      return <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">Info</Badge>;
    case 'WARNING':
      return <Badge variant="outline" className="text-yellow-700 bg-yellow-50 border-yellow-200">Warning</Badge>;
    case 'ERROR':
    case 'CRITICAL':
      return <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200">Error</Badge>;
    default:
      return <Badge variant="outline" className="text-gray-700 bg-gray-50 border-gray-200">Debug</Badge>;
  }
}

function formatTimestamp(date: Date) {
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInHours < 48) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString();
  }
}

function getActivityTitle(action: string, resourceType: string, details: any) {
  switch (action) {
    case 'CALCULATE':
      return 'Started property division calculation';
    case 'GENERATE_DOCUMENT':
      return `Generated ${resourceType === 'document' ? 'legal document' : 'document'}`;
    case 'LOGIN':
      return 'Signed in to account';
    case 'LOGOUT':
      return 'Signed out of account';
    case 'CREATE':
      if (resourceType === 'calculation') return 'Created new calculation';
      if (resourceType === 'asset') return 'Added new asset';
      if (resourceType === 'debt') return 'Added new debt';
      return `Created ${resourceType}`;
    case 'UPDATE':
      if (resourceType === 'user') return 'Updated profile information';
      return `Updated ${resourceType}`;
    case 'READ':
      if (resourceType === 'calculation') return 'Viewed calculation results';
      return `Accessed ${resourceType}`;
    case 'DELETE':
      if (resourceType === 'calculation') return 'Deleted calculation';
      return `Removed ${resourceType}`;
    case 'CHANGE_PASSWORD':
      return 'Changed account password';
    case 'ENABLE_MFA':
      return 'Enabled two-factor authentication';
    case 'DISABLE_MFA':
      return 'Disabled two-factor authentication';
    default:
      return `${action.toLowerCase()} ${resourceType}`;
  }
}

function getActivityDescription(action: string, resourceType: string, details: any) {
  if (details?.jurisdiction) {
    return `${details.jurisdiction} property division`;
  }
  if (details?.calculationId) {
    return `Calculation ID: ${details.calculationId.slice(0, 8)}...`;
  }
  if (details?.error) {
    return `Error: ${details.error}`;
  }
  return `${resourceType} activity`;
}

export function RecentActivity({ userId }: RecentActivityProps) {
  const { activities, loading, error } = useRecentActivity(10);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">Failed to load recent activity</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No recent activity
            </h3>
            <p className="text-gray-500">
              Your account activity will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.action);
              
              return (
                <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getActivityTitle(activity.action, activity.resourceType, activity.details)}
                      </p>
                      {getActivityBadge(activity.severity)}
                    </div>
                    
                    <p className="text-xs text-gray-500 truncate">
                      {getActivityDescription(activity.action, activity.resourceType, activity.details)}
                    </p>
                    
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}