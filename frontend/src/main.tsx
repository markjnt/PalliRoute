import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';

// Configure axios defaults
// Use hostname from current domain with the backend port
// This works for both localhost and any server where the app is deployed
const apiBaseURL = `${window.location.protocol}//${window.location.hostname}:9000/api`;
axios.defaults.baseURL = apiBaseURL;

ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 