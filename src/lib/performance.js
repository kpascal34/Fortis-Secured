/**
 * Performance monitoring utilities for Core Web Vitals
 * Tracks LCP, INP, CLS, and provides actionable metrics
 */

/**
 * Initialize Web Vitals monitoring
 * Sends metrics to analytics/console in development
 */
export function initializeWebVitalsMonitoring() {
  if (typeof window === 'undefined') return;

  // Track Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        if (lastEntry.renderTime || lastEntry.loadTime) {
          const lcpTime = lastEntry.renderTime || lastEntry.loadTime;
          reportMetric('LCP', lcpTime, lcpTime < 2500 ? 'good' : lcpTime < 4000 ? 'needs-improvement' : 'poor');
          
          // Log to console in development
          if (process.env.NODE_ENV === 'development') {
            console.log(`[LCP] ${lcpTime.toFixed(0)}ms - ${lastEntry.element?.tagName || 'unknown'}`);
          }
        }
      });
      
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP monitoring not supported:', e);
    }

    // Track Interaction to Next Paint (INP)
    try {
      const inpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const longestEntry = entries.reduce((prev, current) =>
          current.duration > prev.duration ? current : prev
        );
        
        if (longestEntry.duration) {
          reportMetric(
            'INP',
            longestEntry.duration,
            longestEntry.duration < 200 ? 'good' : longestEntry.duration < 500 ? 'needs-improvement' : 'poor'
          );
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`[INP] ${longestEntry.duration.toFixed(0)}ms`);
          }
        }
      });
      
      inpObserver.observe({ entryTypes: ['interaction'] });
    } catch (e) {
      console.warn('INP monitoring not supported:', e);
    }

    // Track Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            reportMetric('CLS', clsValue, clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor');
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`[CLS] ${clsValue.toFixed(3)}`);
            }
          }
        }
      });
      
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.warn('CLS monitoring not supported:', e);
    }

    // Track First Input Delay (FID) - deprecated but useful for older browsers
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          reportMetric('FID', entry.processingDuration, entry.processingDuration < 100 ? 'good' : 'poor');
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`[FID] ${entry.processingDuration.toFixed(0)}ms`);
          }
        });
      });
      
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID monitoring not supported:', e);
    }
  }

  // Track page visibility and navigation timing
  trackNavigationTiming();
}

/**
 * Report a performance metric
 */
function reportMetric(metricName, value, status = 'unknown') {
  // Send to analytics service (Google Analytics, Segment, etc.)
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      metric_name: metricName,
      metric_value: value,
      metric_status: status,
    });
  }

  // Log to custom analytics endpoint if available
  if (process.env.VITE_ANALYTICS_ENDPOINT) {
    fetch(process.env.VITE_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric: metricName,
        value,
        status,
        timestamp: new Date().toISOString(),
        url: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => null); // Silently fail
  }
}

/**
 * Track navigation and page load timing
 */
export function trackNavigationTiming() {
  if (typeof window === 'undefined' || !window.performance) return;

  window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const connectTime = perfData.responseEnd - perfData.requestStart;
    const renderTime = perfData.domComplete - perfData.domLoading;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Navigation Timing]', {
        'Page Load (ms)': pageLoadTime,
        'Server Response (ms)': connectTime,
        'DOM Render (ms)': renderTime,
        'Time to Interactive': perfData.domInteractive - perfData.navigationStart,
      });
    }

    reportMetric('PAGE_LOAD_TIME', pageLoadTime);
  });
}

/**
 * Measure performance of a specific operation
 */
export function measurePerformance(label, fn) {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
  }

  reportMetric(`OPERATION_${label}`, duration);
  return result;
}

/**
 * Get Resource Timing Summary
 * Useful for identifying slow-loading resources
 */
export function getResourceTimingSummary() {
  if (typeof window === 'undefined' || !window.performance.getEntriesByType) return null;

  const resources = window.performance.getEntriesByType('resource');
  const summary = {
    total: resources.length,
    totalDuration: 0,
    byType: {},
    slowest: [],
  };

  resources.forEach((resource) => {
    const type = resource.initiatorType || 'other';
    summary.totalDuration += resource.duration;

    if (!summary.byType[type]) {
      summary.byType[type] = { count: 0, duration: 0, avg: 0 };
    }

    summary.byType[type].count += 1;
    summary.byType[type].duration += resource.duration;
    summary.byType[type].avg = summary.byType[type].duration / summary.byType[type].count;

    summary.slowest.push({
      name: resource.name,
      type,
      duration: resource.duration,
    });
  });

  // Sort slowest resources
  summary.slowest.sort((a, b) => b.duration - a.duration);
  summary.slowest = summary.slowest.slice(0, 10);

  return summary;
}

/**
 * Detect performance issues and log recommendations
 */
export function detectPerformanceIssues() {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return;

  const summary = getResourceTimingSummary();
  if (!summary) return;

  console.group('[Performance Recommendations]');

  // Check for large resources
  summary.slowest.forEach((resource) => {
    if (resource.duration > 1000) {
      console.warn(`⚠️ Slow resource: ${resource.name} (${resource.duration.toFixed(0)}ms)`);
    }
  });

  // Check if too many resources
  if (summary.total > 100) {
    console.warn(`⚠️ High resource count: ${summary.total} resources (consider code splitting)`);
  }

  // Check CSS duration
  if (summary.byType.link?.duration > 500) {
    console.warn(`⚠️ CSS loading: ${summary.byType.link.duration.toFixed(0)}ms (consider critical CSS inlining)`);
  }

  // Check image count
  if ((summary.byType.img?.count || 0) > 20) {
    console.warn(`⚠️ High image count: ${summary.byType.img.count} images (consider lazy loading)`);
  }

  console.groupEnd();
}

/**
 * Export metrics for analysis
 */
export function exportPerformanceMetrics() {
  if (typeof window === 'undefined') return null;

  return {
    url: window.location.href,
    timestamp: new Date().toISOString(),
    resourceTiming: getResourceTimingSummary(),
    userAgent: window.navigator.userAgent,
    connection: {
      effectiveType: window.navigator.connection?.effectiveType,
      saveData: window.navigator.connection?.saveData,
      downlink: window.navigator.connection?.downlink,
    },
  };
}
