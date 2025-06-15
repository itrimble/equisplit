/**
 * Lazy-loaded components for better performance
 * Implements code splitting for non-critical dashboard components
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Loading skeleton components
const ChartSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-32" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-64 w-full" />
    </CardContent>
  </Card>
);

const TableSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-40" />
    </CardHeader>
    <CardContent className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </CardContent>
  </Card>
);

const FormSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
    </CardHeader>
    <CardContent className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-10 w-32" />
    </CardContent>
  </Card>
);

// Lazy-loaded components with loading states
export const LazyCalculatorForm = dynamic(
  () => import('@/components/calculator/calculator-form').then(mod => ({ default: mod.CalculatorForm })),
  {
    loading: () => <FormSkeleton />,
    ssr: false
  }
);

export const LazyDashboardCharts = dynamic(
  () => import('@/components/dashboard/dashboard-charts').then(mod => ({ default: mod.DashboardCharts })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

export const LazyCalculationHistory = dynamic(
  () => import('@/components/dashboard/calculation-history').then(mod => ({ default: mod.CalculationHistory })),
  {
    loading: () => <TableSkeleton />,
    ssr: false
  }
);

export const LazyRecentActivity = dynamic(
  () => import('@/components/dashboard/recent-activity').then(mod => ({ default: mod.RecentActivity })),
  {
    loading: () => <TableSkeleton />,
    ssr: false
  }
);

export const LazyFileUpload = dynamic(
  () => import('@/components/file-upload/file-upload').then(mod => ({ default: mod.FileUpload })),
  {
    loading: () => <FormSkeleton />,
    ssr: false
  }
);

export const LazyFileManager = dynamic(
  () => import('@/components/file-upload/file-manager').then(mod => ({ default: mod.FileManager })),
  {
    loading: () => <TableSkeleton />,
    ssr: false
  }
);

export const LazyPdfViewer = dynamic(
  () => import('@/components/pdf/pdf-viewer').then(mod => ({ default: mod.PdfViewer })),
  {
    loading: () => (
      <Card className="min-h-[400px]">
        <CardContent className="p-6">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    ),
    ssr: false
  }
);

// Chart components that are expensive to load
export const LazyAssetDistributionChart = dynamic(
  () => import('@/components/charts/asset-distribution-chart').then(mod => ({ default: mod.AssetDistributionChart })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

export const LazyTimelineChart = dynamic(
  () => import('@/components/charts/timeline-chart').then(mod => ({ default: mod.TimelineChart })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

// Payment components
export const LazyPaymentForm = dynamic(
  () => import('@/components/payments/payment-form').then(mod => ({ default: mod.PaymentForm })),
  {
    loading: () => <FormSkeleton />,
    ssr: false
  }
);

export const LazyBillingHistory = dynamic(
  () => import('@/components/payments/billing-history').then(mod => ({ default: mod.BillingHistory })),
  {
    loading: () => <TableSkeleton />,
    ssr: false
  }
);

// HOC for adding suspense boundaries
export function withSuspense<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function SuspenseWrapper(props: P) {
    return (
      <Suspense fallback={fallback || <Skeleton className="h-64 w-full" />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// Viewport-based lazy loading hook
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, options]);

  return isIntersecting;
}

// Component that only renders when in viewport
export function LazyRender({
  children,
  fallback = <Skeleton className="h-32 w-full" />,
  threshold = 0.1,
  rootMargin = '50px'
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useIntersectionObserver(ref, { threshold, rootMargin });
  const [hasBeenVisible, setHasBeenVisible] = React.useState(false);

  React.useEffect(() => {
    if (isInView && !hasBeenVisible) {
      setHasBeenVisible(true);
    }
  }, [isInView, hasBeenVisible]);

  return (
    <div ref={ref}>
      {hasBeenVisible ? children : fallback}
    </div>
  );
}

// Preload functions for critical paths
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be needed soon
  import('@/components/calculator/calculator-form');
  import('@/components/dashboard/dashboard-charts');
};

export const preloadCalculatorComponents = () => {
  import('@/components/calculator/calculator-form');
  import('@/components/calculator/asset-form');
  import('@/components/calculator/debt-form');
  import('@/components/calculator/personal-info-form');
};

export const preloadDashboardComponents = () => {
  import('@/components/dashboard/dashboard-charts');
  import('@/components/dashboard/calculation-history');
  import('@/components/dashboard/recent-activity');
  import('@/components/charts/asset-distribution-chart');
};