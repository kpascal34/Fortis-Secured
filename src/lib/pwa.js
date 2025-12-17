/**
 * PWA Registration and Management
 * 
 * Handles service worker registration, updates, and PWA installation
 */

/**
 * Register service worker
 */
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    console.log('[PWA] Service worker registered:', registration.scope);

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Check every hour

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available
          console.log('[PWA] New version available');
          showUpdateNotification();
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    return null;
  }
};

/**
 * Unregister service worker
 */
export const unregisterServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log('[PWA] Service worker unregistered');
      return success;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Failed to unregister service worker:', error);
    return false;
  }
};

/**
 * Show update notification to user
 */
const showUpdateNotification = () => {
  // Create custom notification UI
  const notification = document.createElement('div');
  notification.id = 'sw-update-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #0BD3D3;
      color: #0B1220;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    ">
      <div style="font-weight: 600; margin-bottom: 0.5rem;">
        New Version Available
      </div>
      <div style="font-size: 0.875rem; margin-bottom: 1rem; opacity: 0.9;">
        A new version of Fortis Secured is available. Reload to update.
      </div>
      <div style="display: flex; gap: 0.75rem;">
        <button id="sw-reload-btn" style="
          background: #0B1220;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.875rem;
        ">
          Reload Now
        </button>
        <button id="sw-dismiss-btn" style="
          background: transparent;
          color: #0B1220;
          border: 1px solid #0B1220;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.875rem;
        ">
          Later
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // Add event listeners
  document.getElementById('sw-reload-btn').addEventListener('click', () => {
    window.location.reload();
  });

  document.getElementById('sw-dismiss-btn').addEventListener('click', () => {
    notification.remove();
  });

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (document.getElementById('sw-update-notification')) {
      notification.remove();
    }
  }, 10000);
};

/**
 * Check if app is running as PWA
 */
export const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true ||
         document.referrer.includes('android-app://');
};

/**
 * Check if PWA installation is available
 */
export const canInstallPWA = () => {
  return 'beforeinstallprompt' in window;
};

/**
 * PWA Install Prompt Handler
 */
let deferredPrompt = null;

export const setupInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default install prompt
    e.preventDefault();
    
    // Store for later use
    deferredPrompt = e;
    
    console.log('[PWA] Install prompt available');
    
    // Show custom install UI
    showInstallButton();
  });

  // Track installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed');
    deferredPrompt = null;
    hideInstallButton();
    
    // Track analytics
    if (typeof trackEvent === 'function') {
      trackEvent('pwa', 'app_installed', {});
    }
  });
};

/**
 * Trigger PWA installation
 */
export const installPWA = async () => {
  if (!deferredPrompt) {
    console.warn('[PWA] Install prompt not available');
    return false;
  }

  try {
    // Show install prompt
    deferredPrompt.prompt();
    
    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('[PWA] Install outcome:', outcome);
    
    // Clear the prompt
    deferredPrompt = null;
    
    return outcome === 'accepted';
  } catch (error) {
    console.error('[PWA] Install failed:', error);
    return false;
  }
};

/**
 * Show install button
 */
const showInstallButton = () => {
  // Check if button already exists
  if (document.getElementById('pwa-install-btn')) {
    return;
  }

  const installBtn = document.createElement('button');
  installBtn.id = 'pwa-install-btn';
  installBtn.innerHTML = `
    <span style="display: flex; align-items: center; gap: 0.5rem;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      Install App
    </span>
  `;
  
  installBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: #0BD3D3;
    color: #0B1220;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    transition: transform 0.2s, box-shadow 0.2s;
  `;

  installBtn.addEventListener('mouseenter', () => {
    installBtn.style.transform = 'translateY(-2px)';
    installBtn.style.boxShadow = '0 15px 30px rgba(0,0,0,0.4)';
  });

  installBtn.addEventListener('mouseleave', () => {
    installBtn.style.transform = 'translateY(0)';
    installBtn.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
  });

  installBtn.addEventListener('click', async () => {
    const success = await installPWA();
    if (success) {
      hideInstallButton();
    }
  });

  document.body.appendChild(installBtn);

  // Auto-hide after 20 seconds
  setTimeout(() => {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) {
      btn.style.opacity = '0';
      btn.style.transition = 'opacity 0.5s';
      setTimeout(() => btn.remove(), 500);
    }
  }, 20000);
};

/**
 * Hide install button
 */
const hideInstallButton = () => {
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.remove();
  }
};

/**
 * Request push notification permission
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('[PWA] Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('[PWA] Failed to request notification permission:', error);
    return false;
  }
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPushNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[PWA] Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.warn('[PWA] Notification permission denied');
      return null;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        // Replace with your VAPID public key
        process.env.VITE_VAPID_PUBLIC_KEY || ''
      ),
    });

    console.log('[PWA] Push subscription:', subscription);
    
    // Send subscription to backend
    await sendSubscriptionToBackend(subscription);
    
    return subscription;
  } catch (error) {
    console.error('[PWA] Push subscription failed:', error);
    return null;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[PWA] Push unsubscribed');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[PWA] Push unsubscribe failed:', error);
    return false;
  }
};

/**
 * Send push subscription to backend
 */
const sendSubscriptionToBackend = async (subscription) => {
  try {
    // TODO: Replace with your backend endpoint
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send subscription to backend');
    }
    
    console.log('[PWA] Subscription sent to backend');
  } catch (error) {
    console.error('[PWA] Failed to send subscription:', error);
  }
};

/**
 * Convert VAPID key to Uint8Array
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

/**
 * Get PWA installation status
 */
export const getPWAStatus = () => {
  return {
    isInstalled: isPWA(),
    canInstall: canInstallPWA() && deferredPrompt !== null,
    hasServiceWorker: 'serviceWorker' in navigator,
    hasNotifications: 'Notification' in window,
    notificationPermission: 'Notification' in window ? Notification.permission : 'unsupported',
  };
};

/**
 * Clear all PWA caches
 */
export const clearPWACaches = async () => {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Send message to service worker
    registration.active.postMessage({
      type: 'CLEAR_CACHE',
    });
    
    console.log('[PWA] Cache clear requested');
    return true;
  } catch (error) {
    console.error('[PWA] Failed to clear caches:', error);
    return false;
  }
};

/**
 * Initialize PWA features
 */
export const initializePWA = async () => {
  console.log('[PWA] Initializing...');
  
  // Register service worker
  const registration = await registerServiceWorker();
  
  // Setup install prompt
  setupInstallPrompt();
  
  // Log PWA status
  const status = getPWAStatus();
  console.log('[PWA] Status:', status);
  
  return { registration, status };
};
