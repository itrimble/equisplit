'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChartBarIcon, 
  TrendingUpIcon,
  MapIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

interface AnalyticsDashboardProps {
  userId: string;
}

// Mock data - replace with actual API calls
const calculationsByMonth = [
  { month: 'Jan', calculations: 2, completed: 2 },
  { month: 'Feb', calculations: 3, completed: 2 },
  { month: 'Mar', calculations: 1, completed: 1 },
  { month: 'Apr', calculations: 4, completed: 3 },
  { month: 'May', calculations: 2, completed: 2 },
  { month: 'Jun', calculations: 3, completed: 2 },
];

const calculationsByState = [
  { state: 'California', count: 4, type: 'Community Property' },
  { state: 'Pennsylvania', count: 3, type: 'Equitable Distribution' },
  { state: 'Texas', count: 2, type: 'Community Property' },
  { state: 'New York', count: 2, type: 'Equitable Distribution' },
  { state: 'Florida', count: 1, type: 'Equitable Distribution' },
];

const assetValueTrends = [
  { month: 'Jan', totalAssets: 320000, totalDebts: 45000 },
  { month: 'Feb', totalAssets: 365000, totalDebts: 52000 },
  { month: 'Mar', totalAssets: 295000, totalDebts: 38000 },
  { month: 'Apr', totalAssets: 425000, totalDebts: 68000 },
  { month: 'May', totalAssets: 485000, totalDebts: 125000 },
  { month: 'Jun', totalAssets: 375000, totalDebts: 85000 },
];

const confidenceLevels = [
  { range: '90-100%', count: 5, color: '#10B981' },
  { range: '80-89%', count: 4, color: '#3B82F6' },
  { range: '70-79%', count: 2, color: '#F59E0B' },
  { range: '60-69%', count: 1, color: '#EF4444' },
];

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

export function AnalyticsDashboard({ userId }: AnalyticsDashboardProps) {
  const totalCalculations = calculationsByMonth.reduce((sum, month) => sum + month.calculations, 0);
  const completedCalculations = calculationsByMonth.reduce((sum, month) => sum + month.completed, 0);
  const completionRate = totalCalculations > 0 ? (completedCalculations / totalCalculations) * 100 : 0;
  
  const avgAssetValue = assetValueTrends.reduce((sum, month) => sum + month.totalAssets, 0) / assetValueTrends.length;
  const avgDebtValue = assetValueTrends.reduce((sum, month) => sum + month.totalDebts, 0) / assetValueTrends.length;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Calculations
            </CardTitle>
            <ChartBarIcon className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalculations}</div>
            <p className="text-xs text-gray-500">
              {completedCalculations} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completion Rate
            </CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(0)}%</div>
            <p className="text-xs text-green-600">
              +5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg. Asset Value
            </CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${avgAssetValue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">
              Per calculation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              States Covered
            </CardTitle>
            <MapIcon className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculationsByState.length}
            </div>
            <p className="text-xs text-gray-500">
              Different jurisdictions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculations by Month */}
        <Card>
          <CardHeader>
            <CardTitle>Calculations Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={calculationsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="calculations" 
                  stackId="1"
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stackId="2"
                  stroke="#10B981" 
                  fill="#10B981" 
                  fillOpacity={0.8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Confidence Levels */}
        <Card>
          <CardHeader>
            <CardTitle>Confidence Level Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={confidenceLevels}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, count }) => `${range}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {confidenceLevels.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset vs Debt Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Asset vs Debt Values</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={assetValueTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                <Line 
                  type="monotone" 
                  dataKey="totalAssets" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  name="Total Assets"
                />
                <Line 
                  type="monotone" 
                  dataKey="totalDebts" 
                  stroke="#EF4444" 
                  strokeWidth={3}
                  name="Total Debts"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Calculations by State */}
        <Card>
          <CardHeader>
            <CardTitle>Calculations by State</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calculationsByState.map((state, index) => (
                <div key={state.state} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{state.state}</p>
                      <p className="text-sm text-gray-500">{state.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{state.count}</p>
                    <p className="text-sm text-gray-500">calculations</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">
                Most Active State
              </h4>
              <p className="text-sm text-blue-700">
                California leads with 4 calculations, all community property cases
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">
                High Confidence Rate
              </h4>
              <p className="text-sm text-green-700">
                75% of calculations achieve 80%+ confidence levels
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">
                Growing Complexity
              </h4>
              <p className="text-sm text-purple-700">
                Average asset values trending upward by 12% monthly
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}