'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  EyeIcon, 
  DocumentTextIcon, 
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';

interface CalculationHistoryProps {
  userId: string;
}

// Mock data - replace with actual API call
const mockCalculations = [
  {
    id: 'calc_123',
    state: 'California',
    calculationType: 'COMMUNITY_PROPERTY',
    status: 'completed',
    createdAt: new Date('2024-06-14'),
    updatedAt: new Date('2024-06-14'),
    totalAssets: 485750,
    totalDebts: 125000,
    spouse1Share: 0.5,
    spouse2Share: 0.5,
    confidenceLevel: 0.95,
    documentsGenerated: 2,
  },
  {
    id: 'calc_124',
    state: 'Pennsylvania',
    calculationType: 'EQUITABLE_DISTRIBUTION',
    status: 'in_progress',
    createdAt: new Date('2024-06-13'),
    updatedAt: new Date('2024-06-14'),
    totalAssets: 320000,
    totalDebts: 45000,
    spouse1Share: 0.6,
    spouse2Share: 0.4,
    confidenceLevel: 0.87,
    documentsGenerated: 0,
  },
  {
    id: 'calc_125',
    state: 'Texas',
    calculationType: 'COMMUNITY_PROPERTY',
    status: 'completed',
    createdAt: new Date('2024-06-12'),
    updatedAt: new Date('2024-06-12'),
    totalAssets: 275000,
    totalDebts: 35000,
    spouse1Share: 0.5,
    spouse2Share: 0.5,
    confidenceLevel: 0.92,
    documentsGenerated: 1,
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">Completed</Badge>;
    case 'in_progress':
      return <Badge variant="outline" className="text-yellow-700 bg-yellow-50 border-yellow-200">In Progress</Badge>;
    case 'draft':
      return <Badge variant="outline" className="text-gray-700 bg-gray-50 border-gray-200">Draft</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function getCalculationTypeBadge(type: string) {
  switch (type) {
    case 'COMMUNITY_PROPERTY':
      return <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">Community Property</Badge>;
    case 'EQUITABLE_DISTRIBUTION':
      return <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200">Equitable Distribution</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

export function CalculationHistory({ userId }: CalculationHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Filter calculations based on search and filters
  const filteredCalculations = mockCalculations.filter((calc) => {
    const matchesSearch = calc.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         calc.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || calc.status === statusFilter;
    const matchesType = typeFilter === 'all' || calc.calculationType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by state or calculation ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="draft">Draft</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="COMMUNITY_PROPERTY">Community Property</option>
              <option value="EQUITABLE_DISTRIBUTION">Equitable Distribution</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {filteredCalculations.length} of {mockCalculations.length} calculations
        </p>
        <Link href="/calculator">
          <Button>
            New Calculation
          </Button>
        </Link>
      </div>

      {/* Calculations List */}
      <div className="space-y-4">
        {filteredCalculations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FunnelIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No calculations found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters or search terms.'
                  : 'Start your first property division calculation.'}
              </p>
              <Link href="/calculator">
                <Button>
                  New Calculation
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          filteredCalculations.map((calculation) => (
            <Card key={calculation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Main Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {calculation.state} Property Division
                      </h3>
                      {getStatusBadge(calculation.status)}
                      {getCalculationTypeBadge(calculation.calculationType)}
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Total Assets:</span>
                        <p className="font-medium">${calculation.totalAssets.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Debts:</span>
                        <p className="font-medium">${calculation.totalDebts.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Division:</span>
                        <p className="font-medium">
                          {Math.round(calculation.spouse1Share * 100)}% / {Math.round(calculation.spouse2Share * 100)}%
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Confidence:</span>
                        <p className="font-medium text-green-600">
                          {Math.round(calculation.confidenceLevel * 100)}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>ID: {calculation.id}</span>
                      <span>Created: {calculation.createdAt.toLocaleDateString()}</span>
                      <span>Updated: {calculation.updatedAt.toLocaleDateString()}</span>
                      {calculation.documentsGenerated > 0 && (
                        <span className="text-blue-600">
                          {calculation.documentsGenerated} document(s) generated
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/calculator/results?id=${calculation.id}`}>
                      <Button variant="outline" size="sm">
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    
                    {calculation.status === 'completed' && (
                      <Link href={`/dashboard/documents?calc=${calculation.id}`}>
                        <Button variant="outline" size="sm">
                          <DocumentTextIcon className="h-4 w-4 mr-1" />
                          Documents
                        </Button>
                      </Link>
                    )}
                    
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}