import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configure axios defaults
// Use hostname from current domain with the backend port
// This works for both localhost and any server where the app is deployed
const apiBaseURL = `${window.location.protocol}//${window.location.hostname}:9000/api`;
axios.defaults.baseURL = apiBaseURL;

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
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