import React from 'react';
import { Polyline } from '@react-google-maps/api';
import { RoutePathData } from '../../types/mapTypes';

interface RoutePolylinesProps {
  routes: RoutePathData[];
}

/**
 * Renders route polylines on the map
 * Each route is rendered as a polyline with its specific color
 */
export const RoutePolylines: React.FC<RoutePolylinesProps> = ({ routes }) => {
  // Filter out routes without polylines
  const validRoutes = routes.filter(route => route.polyline);

  return (
    <>
      {validRoutes.map(route => (
        <Polyline
          key={`route-${route.routeId}`}
          path={google.maps.geometry.encoding.decodePath(route.polyline)}
          options={{
            strokeColor: route.color,
            strokeOpacity: 1.0,
            strokeWeight: 5
          }}
        />
      ))}
    </>
  );
}; 