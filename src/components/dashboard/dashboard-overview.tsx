import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CalculatorIcon, 
  DocumentTextIcon, 
  ClockIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

interface DashboardOverviewProps {
  userId: string;
}

// This would typically fetch real data from your database
async function getDashboardStats(userId: string) {
  // Mock data for now - replace with actual database queries
  return {
    totalCalculations: 12,
    completedCalculations: 8,
    documentsGenerated: 5,
    inProgressCalculations: 2,
    lastCalculationDate: new Date('2024-06-14'),
    totalEstimatedValue: 485750,
  };
}

export async function DashboardOverview({ userId }: DashboardOverviewProps) {
  const stats = await getDashboardStats(userId);

  const cards = [
    {
      title: 'Total Calculations',
      value: stats.totalCalculations,
      description: `${stats.completedCalculations} completed`,
      icon: CalculatorIcon,
      color: 'blue',
    },
    {
      title: 'Documents Generated',
      value: stats.documentsGenerated,
      description: 'MSA & Financial Affidavits',
      icon: DocumentTextIcon,
      color: 'green',
    },
    {
      title: 'In Progress',
      value: stats.inProgressCalculations,
      description: 'Calculations pending',
      icon: ClockIcon,
      color: 'yellow',
    },
    {
      title: 'Estimated Total Value',
      value: `$${stats.totalEstimatedValue.toLocaleString()}`,
      description: 'Combined property value',
      icon: CheckCircleIcon,
      color: 'purple',
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
            {card.title === 'Total Calculations' && stats.lastCalculationDate && (
              <Badge variant="outline" className="mt-2 text-xs">
                Last: {stats.lastCalculationDate.toLocaleDateString()}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}