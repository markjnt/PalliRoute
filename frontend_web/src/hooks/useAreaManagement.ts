import { useMemo, useCallback } from 'react';
import { Route, Weekday } from '../types/models';

interface UseAreaManagementProps {
  routes: Route[];
  appointments: any[];
  selectedDay: Weekday;
  currentArea?: string;
  /** Sa/So oder Feiertags-Mo–Fr: Filter wie AW-Flächen (Nord/Mitte/Süd). */
  useTourAreaLayout?: boolean;
}

interface AreaManagementReturn {
  getFilteredRoutes: () => Route[];
  isAllAreas: boolean;
  getTourAreas: () => string[];
  getTourRoutesByArea: () => Map<string, Route[]>;
  getAreaBackgroundColor: (area: string) => string;
  getAreaColor: (area: string) => string;
}

export const useAreaManagement = ({
  routes,
  appointments,
  selectedDay,
  currentArea,
  useTourAreaLayout = false,
}: UseAreaManagementProps): AreaManagementReturn => {
  const isAllAreas = currentArea === 'Nord- und Südkreis' || !currentArea;

  const isTourAreaMode =
    useTourAreaLayout ||
    selectedDay === 'saturday' ||
    selectedDay === 'sunday';

  const getFilteredRoutes = useCallback(() => {
    if (isAllAreas) {
      return routes;
    }

    if (isTourAreaMode) {
      const filteredRoutes = routes.filter(r => (r.area as string) === 'Mitte');

      if (currentArea === 'Nordkreis' || currentArea === 'Nord') {
        const nordRoutes = routes.filter(r => (r.area as string) === 'Nord');
        filteredRoutes.push(...nordRoutes);
      } else if (currentArea === 'Südkreis' || currentArea === 'Süd') {
        const südRoutes = routes.filter(r => (r.area as string) === 'Süd');
        filteredRoutes.push(...südRoutes);
      }

      return filteredRoutes;
    }

    let targetArea = currentArea;
    if (currentArea === 'Nord') {
      targetArea = 'Nordkreis';
    } else if (currentArea === 'Süd') {
      targetArea = 'Südkreis';
    }

    return routes.filter(r => r.area === targetArea);
  }, [routes, isAllAreas, currentArea, selectedDay, isTourAreaMode]);

  const getTourAreas = useCallback(() => {
    if (isAllAreas) {
      return ['Nord', 'Mitte', 'Süd'];
    }
    if (currentArea === 'Nordkreis' || currentArea === 'Nord') {
      return ['Nord', 'Mitte'];
    }
    if (currentArea === 'Südkreis' || currentArea === 'Süd') {
      return ['Mitte', 'Süd'];
    }
    return ['Mitte'];
  }, [isAllAreas, currentArea]);

  const getTourRoutesByArea = useCallback(() => {
    const areaMap = new Map<string, Route[]>();

    if (isAllAreas) {
      const orderedAreas = ['Nord', 'Mitte', 'Süd'];
      orderedAreas.forEach(area => {
        const areaRoutes = routes.filter(r => (r.area as string) === area);
        areaMap.set(area, areaRoutes);
      });
    } else {
      if (currentArea === 'Nordkreis' || currentArea === 'Nord') {
        areaMap.set('Nord', routes.filter(r => (r.area as string) === 'Nord'));
        areaMap.set('Mitte', routes.filter(r => (r.area as string) === 'Mitte'));
      } else if (currentArea === 'Südkreis' || currentArea === 'Süd') {
        areaMap.set('Mitte', routes.filter(r => (r.area as string) === 'Mitte'));
        areaMap.set('Süd', routes.filter(r => (r.area as string) === 'Süd'));
      } else {
        areaMap.set('Mitte', routes.filter(r => (r.area as string) === 'Mitte'));
      }
    }

    return areaMap;
  }, [routes, isAllAreas, currentArea]);

  const getAreaBackgroundColor = (area: string) => {
    switch (area) {
      case 'Nord': return 'rgba(25, 118, 210, 0.08)';
      case 'Mitte': return 'rgba(123, 31, 162, 0.08)';
      case 'Süd': return 'rgba(56, 142, 60, 0.08)';
      default: return 'rgba(255, 152, 0, 0.08)';
    }
  };

  const getAreaColor = (area: string) => {
    switch (area) {
      case 'Nord': return '#1976d2';
      case 'Mitte': return '#7b1fa2';
      case 'Süd': return '#388e3c';
      default: return '#ff9800';
    }
  };

  return {
    getFilteredRoutes,
    isAllAreas,
    getTourAreas,
    getTourRoutesByArea,
    getAreaBackgroundColor,
    getAreaColor
  };
};
