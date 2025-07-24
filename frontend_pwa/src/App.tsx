import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import InstallPrompt from './components/install/InstallPrompt';
import MainLayout from './components/layout/MainLayout'

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
});

const App: React.FC = () => {
  const isInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DndProvider backend={HTML5Backend}>
        <Router>
          <Routes>
            <Route path="/install" element={<InstallPrompt />} />
            <Route path="/" element={isInstalled ? <MainLayout /> : <Navigate to="/install" />} />
          </Routes>
        </Router>
      </DndProvider>
    </ThemeProvider>
  );
};

export default App;
