import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Only register the service worker for the real web deployment — inside
// the Capacitor native shell it has no benefit (assets are already
// bundled locally) and risks serving stale cached content after an update.
if(!Capacitor.isNativePlatform()){
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}
