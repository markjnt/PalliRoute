import { useCallback } from 'react';
import { useRouteVisibility as useRouteVisibilityStore } from '../stores/useRouteVisibilityStore';

interface UseRouteVisibilityProps {
  routeId?: number;
}

interface UseRouteVisibilityReturn {
  // Visibility state
  isVisible: boolean;
  
  // Visibility actions
  toggleVisibility: () => void;
  showRoute: () => void;
  hideRoute: () => void;
  
  // Global visibility state
  hiddenPolylines: Set<number>;
  hiddenMarkers: Set<number>;
}

export const useRouteVisibility = ({ routeId }: UseRouteVisibilityProps): UseRouteVisibilityReturn => {
  const {
    hiddenPolylines,
    hiddenMarkers,
    togglePolyline,
    toggleMarker,
    hidePolyline,
    showPolyline,
    hideMarker,
    showMarker
  } = useRouteVisibilityStore();

  // Check if current route is visible
  const isVisible = routeId !== undefined ? !hiddenPolylines.has(routeId) : false;

  // Toggle visibility for current route
  const toggleVisibility = useCallback(() => {
    if (routeId !== undefined) {
      if (isVisible) {
        hidePolyline(routeId);
        hideMarker(routeId);
      } else {
        showPolyline(routeId);
        showMarker(routeId);
      }
    }
  }, [routeId, isVisible, hidePolyline, hideMarker, showPolyline, showMarker]);

  // Show current route
  const showRoute = useCallback(() => {
    if (routeId !== undefined) {
      showPolyline(routeId);
      showMarker(routeId);
    }
  }, [routeId, showPolyline, showMarker]);

  // Hide current route
  const hideRoute = useCallback(() => {
    if (routeId !== undefined) {
      hidePolyline(routeId);
      hideMarker(routeId);
    }
  }, [routeId, hidePolyline, hideMarker]);

  return {
    isVisible,
    toggleVisibility,
    showRoute,
    hideRoute,
    hiddenPolylines,
    hiddenMarkers
  };
};
