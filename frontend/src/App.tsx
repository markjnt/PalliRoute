import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { UserProvider } from './contexts/UserContext';
import UserSelection from './components/users/UserSelection';
import { MainLayout } from './components/layout/MainLayout';
import { MapView } from './components/map/MapView';

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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <UserProvider>
        <Router>
          <Routes>
            <Route path="/select-user" element={<UserSelection />} />
            <Route path="/" element={<MainLayout />}>
              <Route index element={<MapView />} />
              {/* Additional routes will be nested here */}
            </Route>
          </Routes>
        </Router>
      </UserProvider>
    </ThemeProvider>
  );
};

export default App;
