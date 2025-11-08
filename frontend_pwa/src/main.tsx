import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Daten nie als stale betrachten
      refetchOnWindowFocus: false, // Nicht beim Fenster-Fokus refetchen
      refetchOnReconnect: false, // Nicht bei Netzwerk-Wiederherstellung refetchen
      refetchOnMount: false, // Nicht beim Mount refetchen
      retry: 1,
    },
  },
});

if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    onNeedRefresh() {
      const container = document.createElement('div');
      container.textContent = 'Neue Version verfügbar. Aktualisierung läuft …';
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #1f2937;
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 9999px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        z-index: 9999;
      `;
      document.body.appendChild(container);
      setTimeout(() => {
        container.style.transition = 'opacity 200ms ease';
        container.style.opacity = '0';
        setTimeout(() => {
          if (container.parentElement) {
            container.parentElement.removeChild(container);
          }
        }, 200);
      }, 3000);
      updateSW(true);
    },
    onOfflineReady() {
      console.log('App ist jetzt offlinefähig!');
    },
  });
}

ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
); 