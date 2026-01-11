/**
 * Advanced Performance Optimization Utilities
 * ==========================================
 * 
 * Additional utilities for fine-tuning Core Web Vitals
 * Can be integrated into components as needed
 */

/**
 * Request Idle Callback polyfill and usage
 * Defers non-critical work until browser is idle
 */
export function scheduleIdleWork(callback, timeout = 2000) {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, { timeout });
  }
  
  // Fallback to setTimeout for older browsers
  return setTimeout(callback, timeout);
}

/**
 * Cancel idle work
 */
export function cancelIdleWork(id) {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

/**
 * Debounce function to reduce event handler calls
 * Improves INP by reducing JavaScript execution time
 */
export function debounce(fn, delay = 300) {
  let timeoutId = null;
  let lastArgs = null;
  let lastThis = null;

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn.apply(lastThis, lastArgs);
      timeoutId = null;
    }, delay);
  }

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Throttle function to limit event handler frequency
 * More aggressive than debounce - useful for scroll/resize
 */
export function throttle(fn, interval = 300) {
  let lastTime = 0;
  let timeoutId = null;

  function throttled(...args) {
    const now = Date.now();
    const remaining = interval - (now - lastTime);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      fn(...args);
      lastTime = now;
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        fn(...args);
        lastTime = Date.now();
        timeoutId = null;
      }, remaining);
    }
  }

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttled;
}

/**
 * Track and warn about Long Tasks (>50ms)
 * Long tasks block the main thread and increase INP
 */
export function monitorLongTasks() {
  if (!('PerformanceObserver' in window)) return null;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          const message = `⚠️ Long Task: ${entry.name} (${entry.duration.toFixed(0)}ms)`;
          
          if (process.env.NODE_ENV === 'development') {
            console.warn(message);
          }
          
          // Send to analytics
          if (window.gtag) {
            window.gtag('event', 'long_task', {
              duration: entry.duration,
              name: entry.name,
            });
          }
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
    return observer;
  } catch (e) {
    console.warn('Long task monitoring not supported:', e);
    return null;
  }
}

/**
 * Break up work into smaller chunks to prevent blocking
 * Yields control back to browser between chunks
 */
export async function processInChunks(items, processor, chunkSize = 100) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    
    // Process chunk synchronously
    for (const item of chunk) {
      processor(item);
    }

    // Yield to browser to handle events, renders, etc.
    if (i + chunkSize < items.length) {
      await new Promise((resolve) => {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(resolve);
        } else {
          setTimeout(resolve, 0);
        }
      });
    }
  }
}

/**
 * Prefetch a resource to speed up future navigation
 */
export function prefetchResource(url, as = 'fetch') {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = as;
  link.href = url;
  link.importance = 'low'; // Prefetch with low priority
  document.head.appendChild(link);
}

/**
 * Preconnect to external origin for faster connections
 */
export function preconnectTo(origin) {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = origin;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

/**
 * DNS Prefetch for faster domain resolution
 */
export function dnsPrefetch(domain) {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = `//${domain}`;
  document.head.appendChild(link);
}

/**
 * Adaptive loading based on device capabilities and network
 */
export function getAdaptiveLoadingSettings() {
  const settings = {
    reduceData: false,
    reduce3D: false,
    reduceAnimations: false,
    slowNetwork: false,
    powerSaver: false,
  };

  // Check Save Data mode
  if ('connection' in navigator) {
    const connection = navigator.connection;
    
    if (connection.saveData) {
      settings.reduceData = true;
    }

    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      settings.slowNetwork = true;
      settings.reduceData = true;
    }

    if (connection.effectiveType === '3g') {
      settings.slowNetwork = true;
    }
  }

  // Check prefers-reduced-motion
  if (window.matchMedia) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      settings.reduceAnimations = true;
    }

    // Check low-power mode
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // Dark mode often correlates with power saver
      settings.powerSaver = true;
    }
  }

  return settings;
}

/**
 * Conditionally load animations based on preferences and network
 */
export function shouldEnableAnimations() {
  const settings = getAdaptiveLoadingSettings();
  
  return !(settings.reduceAnimations || settings.slowNetwork || settings.powerSaver);
}

/**
 * Check if images should be loaded at full quality
 */
export function shouldLoadFullQualityImages() {
  const settings = getAdaptiveLoadingSettings();
  
  return !(settings.reduceData || settings.slowNetwork);
}

/**
 * Measure and optimize rendering performance
 */
export function measureRenderPerformance(componentName) {
  const startTime = performance.now();
  let renderTime = 0;
  let paintTime = 0;

  return {
    markStart: () => {
      performance.mark(`${componentName}-start`);
    },
    
    markEnd: () => {
      performance.mark(`${componentName}-end`);
      performance.measure(
        `${componentName}`,
        `${componentName}-start`,
        `${componentName}-end`
      );
      
      const measure = performance.getEntriesByName(`${componentName}`)[0];
      renderTime = measure.duration;

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Render] ${componentName}: ${renderTime.toFixed(2)}ms`);
      }

      return renderTime;
    },

    getRenderTime: () => renderTime,
  };
}

/**
 * Memory usage monitoring (Chrome only)
 */
export function monitorMemory() {
  if (!('memory' in performance)) {
    console.warn('Memory monitoring not available in this browser');
    return null;
  }

  const memory = performance.memory;
  const usedMemory = memory.usedJSHeapSize / 1048576; // Convert to MB
  const totalMemory = memory.totalJSHeapSize / 1048576;
  const limit = memory.jsHeapSizeLimit / 1048576;

  const usage = {
    usedMB: usedMemory.toFixed(2),
    totalMB: totalMemory.toFixed(2),
    limitMB: limit.toFixed(2),
    percentUsed: ((usedMemory / limit) * 100).toFixed(1),
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('[Memory]', usage);
  }

  return usage;
}

/**
 * Create performance marks for custom operations
 */
export function createPerformanceMark(label, data = {}) {
  try {
    performance.mark(label);
    
    if (Object.keys(data).length > 0) {
      // Add custom data to the mark (Chrome 77+)
      if ('detail' in performance) {
        performance.mark(label, { detail: data });
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Mark] ${label}`, data);
    }
  } catch (e) {
    console.warn('Performance mark not available:', e);
  }
}

/**
 * Measure time between two marks
 */
export function measureBetweenMarks(startLabel, endLabel, resultLabel) {
  try {
    performance.mark(endLabel);
    performance.measure(resultLabel, startLabel, endLabel);
    
    const measure = performance.getEntriesByName(resultLabel)[0];
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Measure] ${resultLabel}: ${measure.duration.toFixed(2)}ms`);
    }

    return measure.duration;
  } catch (e) {
    console.warn('Performance measurement failed:', e);
    return null;
  }
}

/**
 * Log performance summary
 */
export function logPerformanceSummary() {
  if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return;

  const perfData = window.performance;
  if (!perfData.timing) return;

  const timing = perfData.timing;
  const navigation = perfData.navigation;

  console.group('[Performance Summary]');
  console.log('Navigation Type:', navigation.type);
  console.log('DNS Lookup:', (timing.domainLookupEnd - timing.domainLookupStart) + 'ms');
  console.log('TCP Connection:', (timing.connectEnd - timing.connectStart) + 'ms');
  console.log('Server Response:', (timing.responseEnd - timing.requestStart) + 'ms');
  console.log('DOM Processing:', (timing.domComplete - timing.domLoading) + 'ms');
  console.log('DOM Interaction:', (timing.domInteractive - timing.navigationStart) + 'ms');
  console.log('Page Load:', (timing.loadEventEnd - timing.navigationStart) + 'ms');
  console.groupEnd();
}

export default {
  scheduleIdleWork,
  cancelIdleWork,
  debounce,
  throttle,
  monitorLongTasks,
  processInChunks,
  prefetchResource,
  preconnectTo,
  dnsPrefetch,
  getAdaptiveLoadingSettings,
  shouldEnableAnimations,
  shouldLoadFullQualityImages,
  measureRenderPerformance,
  monitorMemory,
  createPerformanceMark,
  measureBetweenMarks,
  logPerformanceSummary,
};
