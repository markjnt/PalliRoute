import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import InstallPrompt from './components/install/InstallPrompt';
import MainLayout from './components/layout/MainLayout';

// Create a theme instance with Apple-inspired design
const theme = createTheme({
  palette: {
    primary: {
      main: '#007AFF',
    },
    secondary: {
      main: '#FF3B30',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#1d1d1f',
      secondary: '#86868b',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        },
      },
    },
  },
});

const App: React.FC = () => {
  const isInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  // Choose backend based on device capabilities
  const isTouchDevice = 'ontouchstart' in window;
  const backend = isTouchDevice ? TouchBackend : HTML5Backend;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DndProvider backend={backend}>
        <Router>
          <Routes>
            <Route path="/install" element={<InstallPrompt />} />
            <Route 
              path="/" 
              element={
                isInstalled ? <MainLayout /> : <Navigate to="/install" />
              } 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </DndProvider>
    </ThemeProvider>
  );
};

export default App;
