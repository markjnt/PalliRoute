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
    
    // For weekend routes, always include Mitte + selected area
    if (selectedDay === 'saturday' || selectedDay === 'sunday') {
      const filteredRoutes = routes.filter(r => (r.area as string) === 'Mitte');
      
      if (currentArea === 'Nordkreis') {
        const nordRoutes = routes.filter(r => (r.area as string) === 'Nord');
        filteredRoutes.push(...nordRoutes);
      } else if (currentArea === 'Südkreis') {
        const südRoutes = routes.filter(r => (r.area as string) === 'Süd');
        filteredRoutes.push(...südRoutes);
      }
      
      return filteredRoutes;
    }
    
    // For weekday routes, filter by selected area only
    let targetArea = currentArea;
    if (currentArea === 'Nordkreis') {
      targetArea = 'Nord';
    } else if (currentArea === 'Südkreis') {
      targetArea = 'Süd';
    }
    
    return routes.filter(r => r.area === targetArea);
  }, [routes, isAllAreas, currentArea, selectedDay]);

  // Get weekend areas
  const getWeekendAreas = useCallback(() => {
    if (isAllAreas) {
      // Show all areas in order: Nord, Mitte, Süd
      return ['Nord', 'Mitte', 'Süd'];
    } else {
      // Always show Mitte + selected area in correct order
      if (currentArea === 'Nordkreis') {
        return ['Nord', 'Mitte'];
      } else if (currentArea === 'Südkreis') {
        return ['Mitte', 'Süd'];
      }
      return ['Mitte'];
    }
  }, [isAllAreas, currentArea]);

  // Get weekend routes grouped by area
  const getWeekendRoutesByArea = useCallback(() => {
    const areaMap = new Map<string, Route[]>();
    
    if (isAllAreas) {
      // Show all areas in order: Nord, Mitte, Süd
      const orderedAreas = ['Nord', 'Mitte', 'Süd'];
      orderedAreas.forEach(area => {
        const areaRoutes = routes.filter(r => (r.area as string) === area);
        areaMap.set(area, areaRoutes);
      });
    } else {
      // Always show Mitte + selected area in correct order
      if (currentArea === 'Nordkreis') {
        const nordRoutes = routes.filter(r => (r.area as string) === 'Nord');
        areaMap.set('Nord', nordRoutes);
        const mitteRoutes = routes.filter(r => (r.area as string) === 'Mitte');
        areaMap.set('Mitte', mitteRoutes);
      } else if (currentArea === 'Südkreis') {
        const mitteRoutes = routes.filter(r => (r.area as string) === 'Mitte');
        areaMap.set('Mitte', mitteRoutes);
        const südRoutes = routes.filter(r => (r.area as string) === 'Süd');
        areaMap.set('Süd', südRoutes);
      } else {
        const mitteRoutes = routes.filter(r => (r.area as string) === 'Mitte');
        areaMap.set('Mitte', mitteRoutes);
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
