import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { initializePWA } from './lib/pwa.js';
import { env } from './lib/env.js';

// Initialize PWA features
if (env.isProd) {
  initializePWA().then(({ status }) => {
    console.log('[App] PWA initialized:', status);
  }).catch(error => {
    console.error('[App] PWA initialization failed:', error);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter 
      basename={env.baseUrl}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
