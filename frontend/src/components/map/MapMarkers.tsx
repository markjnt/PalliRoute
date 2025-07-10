import React, { useMemo, useState } from 'react';
import { Marker } from '@react-google-maps/api';
import { MarkerData } from '../../types/mapTypes';
import { MarkerInfoWindow } from './MarkerInfoWindow';
import { Appointment, Employee, Patient } from '../../types/models';
import { createMarkerIcon, createMarkerLabel } from '../../utils/markerConfig';
import { useRouteVisibility } from '../../stores/useRouteVisibility';

interface MapMarkersProps {
  markers: MarkerData[];
  patients: Patient[];
  employees: Employee[];
  appointments: Appointment[];
  userArea?: string;
  routes: any[]; // Add this line
}

// Group markers by rounded lat/lng
function groupMarkersByLatLng(markers: MarkerData[]) {
  const map = new Map<string, MarkerData[]>();
  for (const marker of markers) {
    const lat = marker.position.lat();
    const lng = marker.position.lng();
    const key = `${lat.toFixed(5)}|${lng.toFixed(5)}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(marker);
  }
  return Array.from(map.values()); // Array of marker groups
}

// Offset marker positions in a circle if overlapping
function offsetLatLng(lat: number, lng: number, index: number, total: number) {
  if (total === 1) return { lat, lng };
  const offset = 0.0001;
  const angle = (2 * Math.PI / total) * index;
  return {
    lat: lat + Math.sin(angle) * offset,
    lng: lng + Math.cos(angle) * offset,
  };
}

export const MapMarkers: React.FC<MapMarkersProps> = ({
  markers,
  patients,
  employees,
  appointments,
  userArea,
  routes
}) => {
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const hiddenMarkers = useRouteVisibility(state => state.hiddenMarkers);

  // Gruppiere alle Marker (keine Filterung mehr)
  const markerGroups = useMemo(() => groupMarkersByLatLng(markers), [markers]);

  return (
    <>
      {markerGroups.map((group, groupIdx) =>
        group.map((marker, idx) => {
          // Marker ausblenden, wenn die zugehörige Route in hiddenMarkers ist
          if (marker.routeId && hiddenMarkers.has(marker.routeId)) {
            return null;
          }
          const origLat = marker.position.lat();
          const origLng = marker.position.lng();
          const { lat, lng } = offsetLatLng(origLat, origLng, idx, group.length);
          const displayPosition = new google.maps.LatLng(lat, lng);
          // Area-based styling
          let opacity = 1;
          let icon = createMarkerIcon(
            marker.type,
            marker.employeeType,
            marker.visitType,
            false
          );
          let label = marker.isInactive ? undefined : createMarkerLabel(marker.routePosition, marker.visitType, marker.label);
          if (marker.isInactive) {
            opacity = 0.6;
          } else if (
            marker.type === 'employee' &&
            userArea &&
            userArea !== 'Nord- und Südkreis' &&
            marker.employeeType &&
            employees.find(e => e.id === marker.employeeId)?.area !== userArea
          ) {
            opacity = 0.6;
          }
          return (
            <Marker
              key={`marker-${groupIdx}-${idx}`}
              position={displayPosition}
              icon={icon}
              label={label}
              onClick={() => setSelectedMarker({ ...marker, displayPosition })}
              opacity={opacity}
            />
          );
        })
      )}
      {selectedMarker && (
        <MarkerInfoWindow
          markerList={[selectedMarker]}
          position={selectedMarker.displayPosition || selectedMarker.position}
          onClose={() => setSelectedMarker(null)}
          patients={patients}
          employees={employees}
          appointments={appointments}
          userArea={userArea}
          routes={routes}
        />
      )}
    </>
  );
}; 