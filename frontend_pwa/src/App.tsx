import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import UserSelection from './components/area_select/AreaSelection';
import { MainLayout } from './components/layout/MainLayout';
import { MapView } from './components/map/MainViewMap';
import AreaSelection from './components/area_select/AreaSelection';

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
      <DndProvider backend={HTML5Backend}>
        <Router>
          <Routes>
            <Route path="/select-area" element={<AreaSelection />} />
            <Route path="/" element={<MainLayout />}>
              <Route index element={<MapView />} />
              {/* Additional routes will be nested here */}
            </Route>
          </Routes>
        </Router>
      </DndProvider>
    </ThemeProvider>
  );
};

export default App;
