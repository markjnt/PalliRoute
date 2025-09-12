import React, { useEffect, useRef } from 'react';
import { RoutePathData } from '../../types/mapTypes';
import { getColorForTour } from '../../utils/colors';
import { useUserStore } from '../../stores/useUserStore';

interface RoutePolylinesProps {
  routes: RoutePathData[];
  map: google.maps.Map | null;
}

/**
 * Renders route polylines on the map
 * Main user route is always blue, additional routes get different colors
 */
export const RoutePolylines: React.FC<RoutePolylinesProps> = ({ routes, map }) => {
  const polylineRefs = useRef<{ [id: number]: google.maps.Polyline }>({});
  const previousDataRef = useRef<{ [id: number]: string }>({});
  const { selectedUserId } = useUserStore();

  useEffect(() => {
    if (!map || !window.google || !window.google.maps.geometry) return;

    // Display all routes passed from parent (already filtered)
    for (const { routeId, polyline, employeeId, color } of routes) {
      const isEmpty = polyline == null || polyline === '';
      const oldEncoded = previousDataRef.current[routeId] || '';

      // Entfernen, wenn leer
      if (isEmpty) {
        if (polylineRefs.current[routeId]) {
          polylineRefs.current[routeId].setMap(null);
          delete polylineRefs.current[routeId];
        }
        previousDataRef.current[routeId] = '';
        continue;
      }

      // Get color: main user route is always blue, additional routes get different colors
      let routeColor: string;
      if (employeeId === null) {
        // Weekend routes: color is already set in routePaths data
        routeColor = color;
      } else if (employeeId === selectedUserId) {
        routeColor = '#2196F3'; // Standard blue for main user route
      } else {
        routeColor = getColorForTour(employeeId); // Different color for additional routes
      }

      // Neu erstellen, wenn noch nicht existiert
      if (!polylineRefs.current[routeId]) {
        const path = window.google.maps.geometry.encoding.decodePath(polyline);
        const polylineObj = new window.google.maps.Polyline({
          path,
          map,
          strokeColor: routeColor,
          strokeOpacity: 1.0,
          strokeWeight: 5,
        });
        polylineRefs.current[routeId] = polylineObj;
        previousDataRef.current[routeId] = polyline;
        continue;
      }

      // Aktualisieren, wenn sich der Pfad geändert hat
      if (polyline !== oldEncoded) {
        const newPath = window.google.maps.geometry.encoding.decodePath(polyline);
        polylineRefs.current[routeId].setPath(newPath);
        previousDataRef.current[routeId] = polyline;
      }

      // Aktualisieren der Farbe (immer, da sich die Farbe auch bei gleichem Pfad ändern kann)
      polylineRefs.current[routeId].setOptions({ strokeColor: routeColor });
    }

    // Clean up: entferne Polylines, die nicht mehr in routes sind
    Object.keys(polylineRefs.current).forEach((idStr) => {
      const id = Number(idStr);
      if (!routes.some(r => r.routeId === id && r.polyline)) {
        polylineRefs.current[id].setMap(null);
        delete polylineRefs.current[id];
        delete previousDataRef.current[id];
      }
    });
  }, [routes, map, selectedUserId]);

  return null;
}; 