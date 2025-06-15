'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePerformanceMonitoring } from '@/lib/performance-monitor';

interface DashboardStats {
  totalCalculations: number;
  totalAssets: number;
  totalDebts: number;
  totalDocuments: number;
  calculationsThisMonth: number;
  lastCalculation: Date | null;
  memberSince: Date;
}

interface Calculation {
  id: string;
  title?: string;
  jurisdiction: string;
  status: string;
  confidenceLevel: number;
  createdAt: Date;
  completedAt: Date | null;
  _count: {
    assets: number;
    debts: number;
  };
}

interface RecentActivity {
  id: string;
  action: string;
  resourceType: string;
  timestamp: Date;
  details: any;
  severity: string;
}

// Cache for dashboard stats with 5 minute TTL
const statsCache = new Map<string, { data: DashboardStats; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { startTiming, endTiming } = usePerformanceMonitoring();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchStats = useCallback(async (forceRefresh = false) => {
    // Check cache first
    const cacheKey = 'dashboard-stats';
    const cached = statsCache.get(cacheKey);
    
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setStats(cached.data);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const timingId = startTiming('dashboard-stats-fetch');

      const response = await fetch('/api/user?action=statistics', {
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const formattedStats: DashboardStats = {
          ...data.statistics,
          memberSince: new Date(data.statistics.memberSince),
          lastCalculation: data.statistics.lastCalculation 
            ? new Date(data.statistics.lastCalculation) 
            : null,
        };

        setStats(formattedStats);
        
        // Cache the result
        statsCache.set(cacheKey, {
          data: formattedStats,
          timestamp: Date.now()
        });

        await endTiming(timingId, true);
      } else {
        throw new Error(data.error || 'Failed to fetch statistics');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }
      
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Dashboard stats error:', err);
      await endTiming(timingId!, false);
    } finally {
      setLoading(false);
    }
  }, [startTiming, endTiming]);

  useEffect(() => {
    fetchStats();

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchStats]);

  const memoizedReturn = useMemo(() => ({
    stats,
    loading,
    error,
    refetch: () => fetchStats(true)
  }), [stats, loading, error, fetchStats]);

  return memoizedReturn;
}

export function useCalculations(limit = 10, offset = 0) {
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchCalculations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/calculate?limit=${limit}&offset=${offset}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch calculations');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const formattedCalculations = data.calculations.map((calc: any) => ({
          ...calc,
          createdAt: new Date(calc.createdAt),
          completedAt: calc.completedAt ? new Date(calc.completedAt) : null,
        }));
        
        setCalculations(formattedCalculations);
        setTotal(data.total || formattedCalculations.length);
      } else {
        throw new Error(data.error || 'Failed to fetch calculations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Calculations fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalculations();
  }, [limit, offset]);

  const deleteCalculation = async (calculationId: string) => {
    try {
      const response = await fetch(`/api/calculate?id=${calculationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete calculation');
      }
      
      // Refresh the calculations list
      await fetchCalculations();
      
      return true;
    } catch (err) {
      console.error('Delete calculation error:', err);
      throw err;
    }
  };

  return { 
    calculations, 
    loading, 
    error, 
    total,
    refetch: fetchCalculations,
    deleteCalculation 
  };
}

export function useRecentActivity(limit = 10) {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivity() {
      try {
        setLoading(true);
        const response = await fetch(`/api/user?action=audit-logs&limit=${limit}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch recent activity');
        }
        
        const data = await response.json();
        
        if (data.success) {
          const formattedActivities = data.auditLogs.map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp),
          }));
          
          setActivities(formattedActivities);
        } else {
          throw new Error(data.error || 'Failed to fetch activity');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Recent activity error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, [limit]);

  return { activities, loading, error };
}

export function useUserProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const response = await fetch('/api/user?action=profile');
        
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setProfile({
            ...data.user,
            createdAt: new Date(data.user.createdAt),
            updatedAt: new Date(data.user.updatedAt),
          });
        } else {
          throw new Error(data.error || 'Failed to fetch profile');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('User profile error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const updateProfile = async (updates: any) => {
    try {
      const response = await fetch('/api/user?action=profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setProfile({
          ...data.user,
          createdAt: new Date(data.user.createdAt),
          updatedAt: new Date(data.user.updatedAt),
        });
        return true;
      } else {
        throw new Error(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Update profile error:', err);
      throw err;
    }
  };

  return { profile, loading, error, updateProfile };
}