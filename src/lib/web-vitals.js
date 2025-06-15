/**
 * Web Vitals Tracking for EquiSplit
 * Client-side performance monitoring for Core Web Vitals
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Track and send Web Vitals to analytics
export function trackWebVitals() {
  try {
    getCLS(sendToAnalytics);
    getFID(sendToAnalytics);
    getFCP(sendToAnalytics);
    getLCP(sendToAnalytics);
    getTTFB(sendToAnalytics);
  } catch (error) {
    console.warn('Web Vitals tracking failed:', error);
  }
}

function sendToAnalytics(metric) {
  // Send to Google Analytics if available
  if (typeof gtag !== 'undefined') {
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Send to our own analytics endpoint
  if (navigator.sendBeacon) {
    const body = JSON.stringify({
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    });

    navigator.sendBeacon('/api/analytics/web-vitals', body);
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vital:', metric);
  }
}