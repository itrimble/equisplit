import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface UsageOverviewProps {
  userId: string;
}

// This would typically fetch real subscription and usage data
async function getUsageStats(userId: string) {
  // Mock data - replace with actual database queries
  return {
    subscriptionTier: 'FREE', // FREE, PROFESSIONAL, ENTERPRISE
    calculationsUsed: 2,
    calculationsLimit: 3,
    documentsUsed: 1,
    documentsLimit: 1,
    storageUsed: 25, // MB
    storageLimit: 100, // MB
    billingPeriodEnd: new Date('2024-07-15'),
  };
}

function getTierInfo(tier: string) {
  switch (tier) {
    case 'PROFESSIONAL':
      return {
        name: 'Professional',
        color: 'bg-blue-600',
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50',
      };
    case 'ENTERPRISE':
      return {
        name: 'Enterprise',
        color: 'bg-purple-600',
        textColor: 'text-purple-700',
        bgColor: 'bg-purple-50',
      };
    default:
      return {
        name: 'Free',
        color: 'bg-gray-600',
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-50',
      };
  }
}

export async function UsageOverview({ userId }: UsageOverviewProps) {
  const usage = await getUsageStats(userId);
  const tierInfo = getTierInfo(usage.subscriptionTier);

  const usageItems = [
    {
      label: 'Calculations',
      used: usage.calculationsUsed,
      limit: usage.calculationsLimit,
      unit: '',
      isUnlimited: usage.subscriptionTier !== 'FREE',
    },
    {
      label: 'Documents',
      used: usage.documentsUsed,
      limit: usage.documentsLimit,
      unit: '',
      isUnlimited: usage.subscriptionTier === 'ENTERPRISE',
    },
    {
      label: 'Storage',
      used: usage.storageUsed,
      limit: usage.storageLimit,
      unit: 'MB',
      isUnlimited: false,
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">
          Plan Usage
        </CardTitle>
        <Badge 
          variant="outline" 
          className={`${tierInfo.textColor} ${tierInfo.bgColor} border-current`}
        >
          {tierInfo.name} Plan
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        {usageItems.map((item) => {
          const percentage = item.isUnlimited ? 0 : (item.used / item.limit) * 100;
          const isNearLimit = percentage >= 80 && !item.isUnlimited;
          
          return (
            <div key={item.label} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  {item.label}
                </span>
                <span className="text-sm text-gray-500">
                  {item.isUnlimited ? (
                    <>
                      {item.used} {item.unit} 
                      <span className="text-green-600 ml-1">• Unlimited</span>
                    </>
                  ) : (
                    `${item.used} / ${item.limit} ${item.unit}`
                  )}
                </span>
              </div>
              
              {!item.isUnlimited && (
                <div className="space-y-1">
                  <Progress 
                    value={percentage} 
                    className={`h-2 ${isNearLimit ? 'bg-red-100' : 'bg-gray-100'}`}
                  />
                  {isNearLimit && (
                    <p className="text-xs text-red-600">
                      ⚠️ Approaching limit
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {usage.subscriptionTier === 'FREE' && (
          <div className="pt-4 border-t">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Upgrade for unlimited calculations
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Get unlimited calculations, advanced features, and priority support.</p>
                  </div>
                  <div className="mt-3">
                    <a
                      href="/dashboard/billing"
                      className="text-sm font-medium text-blue-800 hover:text-blue-600"
                    >
                      View plans →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {usage.billingPeriodEnd && usage.subscriptionTier !== 'FREE' && (
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500">
              Billing period ends: {usage.billingPeriodEnd.toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}