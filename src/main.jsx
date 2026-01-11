import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { initializePWA } from './lib/pwa.js';

// Initialize PWA features
if (process.env.NODE_ENV === 'production') {
  initializePWA().then(({ status }) => {
    console.log('[App] PWA initialized:', status);
  }).catch(error => {
    console.error('[App] PWA initialization failed:', error);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter 
      basename={import.meta.env.BASE_URL}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
