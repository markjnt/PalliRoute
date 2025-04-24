import { useState, useEffect } from 'react';
import { MarkerData, MarkerGroup } from '../types/mapTypes';
import { groupMarkersByPosition } from '../utils/mapUtils';

/**
 * Custom hook to manage marker groups and selection
 */
export const useMarkerGroups = (markers: MarkerData[]) => {
  const [markerGroups, setMarkerGroups] = useState<MarkerGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);

  // Update marker groups when markers change
  useEffect(() => {
    if (markers.length > 0) {
      setMarkerGroups(groupMarkersByPosition(markers));
    } else {
      setMarkerGroups([]);
    }
  }, [markers]);

  // Get position key for a marker group
  const getGroupKey = (group: MarkerGroup): string => {
    return `${group.position.lat()},${group.position.lng()}`;
  };

  // Check if a group is active
  const isGroupActive = (group: MarkerGroup): boolean => {
    return activeGroup === getGroupKey(group);
  };

  // Handle marker click
  const handleMarkerClick = (marker: MarkerData, group: MarkerGroup) => {
    const groupKey = getGroupKey(group);
    
    // If multiple markers at this position, expand the group
    if (group.count > 1 && !isGroupActive(group)) {
      setActiveGroup(groupKey);
      setSelectedMarker(null);
    } else {
      // If only one marker or group is already active, select it directly
      setSelectedMarker(marker);
    }
  };

  // Handle expanded marker click
  const handleExpandedMarkerClick = (marker: MarkerData, expandedPosition: google.maps.LatLng) => {
    // Create a copy of the marker with the display position set
    const markerWithDisplayPosition = {
      ...marker,
      displayPosition: expandedPosition
    };
    
    setSelectedMarker(markerWithDisplayPosition);
  };

  // Handle info window close
  const handleInfoWindowClose = () => {
    setSelectedMarker(null);
    setActiveGroup(null);
  };

  // Handle map click (to collapse expanded groups)
  const handleMapClick = () => {
    if (activeGroup) {
      setActiveGroup(null);
    }
  };

  return {
    markerGroups,
    activeGroup,
    selectedMarker,
    getGroupKey,
    isGroupActive,
    handleMarkerClick,
    handleExpandedMarkerClick,
    handleInfoWindowClose,
    handleMapClick
  };
}; 