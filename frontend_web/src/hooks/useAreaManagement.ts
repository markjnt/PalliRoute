import { useMemo, useCallback } from 'react';
import { Route, Weekday } from '../types/models';

interface UseAreaManagementProps {
  routes: Route[];
  appointments: any[];
  selectedDay: Weekday;
  currentArea?: string;
}

interface AreaManagementReturn {
  // Area filtering
  getFilteredRoutes: () => Route[];
  isAllAreas: boolean;
  
  // Weekend area management
  getWeekendAreas: () => string[];
  getWeekendRoutesByArea: () => Map<string, Route[]>;
  
  // Area utilities
  getAreaBackgroundColor: (area: string) => string;
  getAreaColor: (area: string) => string;
}

const weekendAreas = ['Nord', 'Mitte', 'Süd'] as const;
type WeekendArea = typeof weekendAreas[number];

export const useAreaManagement = ({
  routes,
  appointments,
  selectedDay,
  currentArea
}: UseAreaManagementProps): AreaManagementReturn => {
  
  // Check if all areas are selected
  const isAllAreas = useMemo(() => {
    return currentArea === 'Nord- und Südkreis';
  }, [currentArea]);

  // Filter routes by area
  const getFilteredRoutes = useCallback(() => {
    if (isAllAreas) {
      return routes;
    }
    return routes.filter(r => r.area === currentArea);
  }, [routes, isAllAreas, currentArea]);

  // Get weekend areas
  const getWeekendAreas = useCallback(() => {
    return [...weekendAreas];
  }, []);

  // Get weekend routes grouped by area
  const getWeekendRoutesByArea = useCallback(() => {
    const areaMap = new Map<string, Route[]>();
    
    // Always show Mitte (even if no routes exist)
    const mitteRoutes = routes.filter(r => (r.area as string) === 'Mitte');
    areaMap.set('Mitte', mitteRoutes);
    
    // Filter others based on currentArea
    if (isAllAreas) {
      // Show all areas
      weekendAreas.forEach(area => {
        if (area !== 'Mitte') {
          const areaRoutes = routes.filter(r => (r.area as string) === area);
          areaMap.set(area, areaRoutes);
        }
      });
    } else {
      // Show only selected area
      if (currentArea === 'Nordkreis') {
        const nordRoutes = routes.filter(r => (r.area as string) === 'Nord');
        areaMap.set('Nord', nordRoutes);
      } else if (currentArea === 'Südkreis') {
        const südRoutes = routes.filter(r => (r.area as string) === 'Süd');
        areaMap.set('Süd', südRoutes);
      }
    }
    
    return areaMap;
  }, [routes, isAllAreas, currentArea]);

  // Get background color for area
  const getAreaBackgroundColor = useCallback((area: string) => {
    switch (area) {
      case 'Nord': return 'rgba(25, 118, 210, 0.08)';
      case 'Mitte': return 'rgba(123, 31, 162, 0.08)';
      case 'Süd': return 'rgba(56, 142, 60, 0.08)';
      default: return 'rgba(255, 152, 0, 0.08)';
    }
  }, []);

  // Get color for area
  const getAreaColor = useCallback((area: string) => {
    switch (area) {
      case 'Nord': return '#1976d2';
      case 'Mitte': return '#7b1fa2';
      case 'Süd': return '#388e3c';
      default: return '#ff9800';
    }
  }, []);

  return {
    getFilteredRoutes,
    isAllAreas,
    getWeekendAreas,
    getWeekendRoutesByArea,
    getAreaBackgroundColor,
    getAreaColor
  };
};
