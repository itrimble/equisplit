import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CalculatorIcon, 
  DocumentTextIcon, 
  CreditCardIcon,
  UserCircleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';

interface RecentActivityProps {
  userId: string;
}

// This would typically fetch real activity data from audit logs
async function getRecentActivity(userId: string) {
  // Mock data - replace with actual database queries
  return [
    {
      id: '1',
      type: 'calculation',
      title: 'Started California community property calculation',
      description: 'Property division for divorce proceedings',
      timestamp: new Date('2024-06-14T10:30:00'),
      status: 'in-progress',
    },
    {
      id: '2',
      type: 'document',
      title: 'Generated Marital Settlement Agreement',
      description: 'MSA for Texas calculation #123',
      timestamp: new Date('2024-06-13T15:45:00'),
      status: 'completed',
    },
    {
      id: '3',
      type: 'calculation',
      title: 'Completed Pennsylvania equitable distribution',
      description: 'Final property division results',
      timestamp: new Date('2024-06-12T09:15:00'),
      status: 'completed',
    },
    {
      id: '4',
      type: 'payment',
      title: 'Professional subscription renewed',
      description: 'Monthly billing cycle',
      timestamp: new Date('2024-06-10T12:00:00'),
      status: 'completed',
    },
    {
      id: '5',
      type: 'profile',
      title: 'Updated profile information',
      description: 'Changed contact email address',
      timestamp: new Date('2024-06-08T14:20:00'),
      status: 'completed',
    },
  ];
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'calculation':
      return CalculatorIcon;
    case 'document':
      return DocumentTextIcon;
    case 'payment':
      return CreditCardIcon;
    case 'profile':
      return UserCircleIcon;
    default:
      return ClockIcon;
  }
}

function getActivityBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">Completed</Badge>;
    case 'in-progress':
      return <Badge variant="outline" className="text-yellow-700 bg-yellow-50 border-yellow-200">In Progress</Badge>;
    case 'failed':
      return <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200">Failed</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
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

export async function RecentActivity({ userId }: RecentActivityProps) {
  const activities = await getRecentActivity(userId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No recent activity</p>
              <p className="text-sm text-gray-400 mt-1">
                Start a calculation to see your activity here
              </p>
            </div>
          ) : (
            activities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              
              return (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      {getActivityBadge(activity.status)}
                    </div>
                    
                    <p className="text-sm text-gray-500 mt-1">
                      {activity.description}
                    </p>
                    
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {activities.length > 0 && (
          <div className="mt-6 text-center">
            <a
              href="/dashboard/activity"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all activity →
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}