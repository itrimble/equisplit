'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardStats } from '@/hooks/use-dashboard-data';
import { 
  CalculatorIcon, 
  DocumentTextIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface DashboardOverviewProps {
  userId: string;
}

export function DashboardOverview({ userId }: DashboardOverviewProps) {
  const { stats, loading, error } = useDashboardStats();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">Failed to load dashboard statistics</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const cards = [
    {
      title: 'Total Calculations',
      value: stats.totalCalculations,
      description: `${stats.calculationsThisMonth} this month`,
      icon: CalculatorIcon,
      color: 'blue',
    },
    {
      title: 'Documents Generated',
      value: stats.totalDocuments,
      description: 'MSA & Financial Affidavits',
      icon: DocumentTextIcon,
      color: 'green',
    },
    {
      title: 'Total Assets',
      value: stats.totalAssets,
      description: 'Assets tracked',
      icon: CheckCircleIcon,
      color: 'purple',
    },
    {
      title: 'Total Debts',
      value: stats.totalDebts,
      description: 'Debts tracked',
      icon: ClockIcon,
      color: 'yellow',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {card.title}
            </CardTitle>
            <card.icon className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {card.value}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {card.description}
            </p>
            {card.title === 'Total Calculations' && stats.lastCalculation && (
              <Badge variant="outline" className="mt-2 text-xs">
                Last: {stats.lastCalculation.toLocaleDateString()}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}