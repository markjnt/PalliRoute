import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
); 