import React, { useEffect, useRef } from 'react';
import { RoutePathData } from '../../types/mapTypes';

interface RoutePolylinesProps {
  routes: RoutePathData[];
  map: google.maps.Map | null;
}

/**
 * Renders route polylines on the map
 * Each route is rendered as a polyline with its specific color
 */
export const RoutePolylines: React.FC<RoutePolylinesProps> = ({ routes, map }) => {
  const polylineRefs = useRef<{ [id: number]: google.maps.Polyline }>({});
  const previousDataRef = useRef<{ [id: number]: string }>({});

  useEffect(() => {
    if (!map || !window.google || !window.google.maps.geometry) return;

    for (const { routeId, polyline, color } of routes) {
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

      // Neu erstellen, wenn noch nicht existiert
      if (!polylineRefs.current[routeId]) {
        const path = window.google.maps.geometry.encoding.decodePath(polyline);
        const polylineObj = new window.google.maps.Polyline({
          path,
          map,
          strokeColor: color,
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
  }, [routes, map]);

  return null;
}; 