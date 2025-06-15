'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCalculations } from '@/hooks/use-dashboard-data';
import { 
  EyeIcon, 
  DocumentTextIcon, 
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface CalculationHistoryProps {
  userId: string;
}

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
  const { calculations, loading, error, deleteCalculation } = useCalculations(50); // Fetch more for filtering

  // Filter calculations based on search and filters
  const filteredCalculations = calculations.filter((calc) => {
    const matchesSearch = calc.jurisdiction.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         calc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (calc.title && calc.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || calc.status === statusFilter;
    // Note: We don't have calculationType in the current API response, so we'll remove this filter for now
    
    return matchesSearch && matchesStatus;
  });

  const handleDeleteCalculation = async (calculationId: string) => {
    if (confirm('Are you sure you want to delete this calculation? This action cannot be undone.')) {
      try {
        await deleteCalculation(calculationId);
      } catch (error) {
        alert('Failed to delete calculation. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, j) => (
                    <div key={j}>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Failed to load calculations
            </h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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

          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {filteredCalculations.length} of {calculations.length} calculations
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
                {searchTerm || statusFilter !== 'all'
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
                        {calculation.title || `${calculation.jurisdiction} Property Division`}
                      </h3>
                      {getStatusBadge(calculation.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Jurisdiction:</span>
                        <p className="font-medium">{calculation.jurisdiction}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Assets:</span>
                        <p className="font-medium">{calculation._count.assets} items</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Debts:</span>
                        <p className="font-medium">{calculation._count.debts} items</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Confidence:</span>
                        <p className="font-medium text-green-600">
                          {Math.round(calculation.confidenceLevel * 100)}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>ID: {calculation.id.slice(0, 8)}...</span>
                      <span>Created: {calculation.createdAt.toLocaleDateString()}</span>
                      {calculation.completedAt && (
                        <span>Completed: {calculation.completedAt.toLocaleDateString()}</span>
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
                    
                    {calculation.completedAt && (
                      <Link href={`/dashboard/documents?calc=${calculation.id}`}>
                        <Button variant="outline" size="sm">
                          <DocumentTextIcon className="h-4 w-4 mr-1" />
                          Documents
                        </Button>
                      </Link>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteCalculation(calculation.id)}
                    >
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