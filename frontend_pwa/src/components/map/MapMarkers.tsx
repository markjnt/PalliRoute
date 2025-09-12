import React, { useMemo, useState } from 'react';
import { Marker } from '@react-google-maps/api';
import { Box } from '@mui/material';
import { MarkerData } from '../../types/mapTypes';
import { Appointment, Employee, Patient } from '../../types/models';
import { createMarkerIcon, createMarkerLabel } from '../../utils/markerConfig';
import { StopPopup } from './StopPopup';
import { useRouteCompletionStore } from '../../stores/useRouteCompletionStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { useAdditionalRoutesStore } from '../../stores/useAdditionalRoutesStore';
import { getColorForTour } from '../../utils/colors';
import { useUserStore } from '../../stores/useUserStore';

interface MapMarkersProps {
  markers: MarkerData[];
  patients: Patient[];
  employees: Employee[];
  appointments: Appointment[];
  routes: any[];
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
  routes
}) => {
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const { setCurrentWeekday } = useRouteCompletionStore();
  const { selectedWeekday } = useWeekdayStore();
  const { selectedEmployeeIds } = useAdditionalRoutesStore();
  const { selectedUserId, selectedWeekendArea } = useUserStore();

  // Gruppiere alle Marker
  const markerGroups = useMemo(() => groupMarkersByLatLng(markers), [markers]);

  // Find patient and appointment data for selected marker
  const selectedPatient = useMemo(() => {
    if (!selectedMarker || selectedMarker.type !== 'patient' || !selectedMarker.patientId) {
      return undefined;
    }
    return patients.find(p => p.id === selectedMarker.patientId);
  }, [selectedMarker, patients]);

  const selectedAppointment = useMemo(() => {
    if (!selectedMarker || selectedMarker.type !== 'patient' || !selectedMarker.appointmentId) {
      return undefined;
    }
    return appointments.find(a => a.id === selectedMarker.appointmentId);
  }, [selectedMarker, appointments]);

  // Check if marker belongs to additional route (not main user route)
  const isAdditionalRouteMarker = (marker: MarkerData): boolean => {
    if (marker.type === 'weekend_area') {
      // Weekend area start marker is never additional
      return false;
    }
    if (!marker.routeId) return false;
    const route = routes.find(r => r.id === marker.routeId);
    if (!route) return false;
    
    // For weekend routes (no employee_id), check if it's an additional area
    if (!route.employee_id) {
      return route.area !== selectedWeekendArea && selectedEmployeeIds.includes(route.area);
    }
    
    // For employee routes, check if it's an additional employee
    return route.employee_id !== selectedUserId && selectedEmployeeIds.includes(route.employee_id);
  };

  // Get route color for a marker
  const getMarkerRouteColor = (marker: MarkerData): string | null => {
    if (marker.type === 'weekend_area') {
      // Weekend area start marker uses orange color
      return '#ff9800';
    }
    
    if (!marker.routeId) return null;
    const route = routes.find(r => r.id === marker.routeId);
    if (!route) return null;
    
    // For weekend routes (no employee_id), use area-based colors
    if (!route.employee_id) {
      const getWeekendAreaColor = (area: string) => {
        switch (area) {
          case 'Nord': return '#1976d2'; // Blue
          case 'Mitte': return '#7b1fa2'; // Purple
          case 'Süd': return '#388e3c'; // Green
          default: return '#ff9800'; // Orange fallback
        }
      };
      
      // Main weekend route (selected area) is always blue
      if (route.area === selectedWeekendArea) {
        return '#2196F3';
      }
      
      // Additional weekend routes get their area color
      if (selectedEmployeeIds.includes(route.area)) {
        return getWeekendAreaColor(route.area);
      }
      
      return null;
    }
    
    // For employee routes
    // Main user route is always blue
    if (route.employee_id === selectedUserId) {
      return '#2196F3';
    }
    
    // Additional routes get their assigned color
    if (selectedEmployeeIds.includes(route.employee_id)) {
      return getColorForTour(route.employee_id);
    }
    
    return null;
  };

  // Handle marker click and set current weekday for completion tracking
  const handleMarkerClick = (marker: MarkerData, displayPosition: google.maps.LatLng) => {
    // Only set current weekday for main user route markers (not additional routes)
    if (marker.type === 'patient' && !isAdditionalRouteMarker(marker)) {
      setCurrentWeekday(selectedWeekday);
    }
    setSelectedMarker({ ...marker, displayPosition });
  };

  return (
    <>
      {markerGroups.map((group, groupIdx) =>
        group.map((marker, idx) => {
          const origLat = marker.position.lat();
          const origLng = marker.position.lng();
          const { lat, lng } = offsetLatLng(origLat, origLng, idx, group.length);
          const displayPosition = new google.maps.LatLng(lat, lng);
          
          // Check if this is an additional route marker
          const isAdditionalRoute = isAdditionalRouteMarker(marker);
          
          // Get route color for this marker
          const routeColor = getMarkerRouteColor(marker);
          
          // Area-based styling
          let opacity = 1;
          
          // For main user route: use standard colors (HB=blue, NA=red, etc.)
          // For additional routes: use route color
          let icon: google.maps.Symbol | undefined;
          if (isAdditionalRoute && routeColor) {
            // Additional route: use route color
            icon = createMarkerIcon(
              marker.type,
              marker.employeeType,
              marker.visitType,
              marker.isInactive || false,
              routeColor
            );
          } else {
            // Main route: use standard colors
            icon = createMarkerIcon(
              marker.type,
              marker.employeeType,
              marker.visitType,
              marker.isInactive || false
            );
          }
          
          let label = marker.isInactive ? undefined : createMarkerLabel(marker.routePosition, marker.visitType, marker.label);
          
          if (marker.isInactive) {
            opacity = 0.6;
          }
          
          return (
            <Marker
              key={`marker-${groupIdx}-${idx}`}
              position={displayPosition}
              icon={icon}
              label={label}
              onClick={() => handleMarkerClick(marker, displayPosition)}
              opacity={opacity}
            />
          );
        })
      )}

      {/* Stop Popup */}
      {selectedMarker && selectedMarker.type === 'patient' && selectedMarker.displayPosition && (
        <StopPopup
          marker={selectedMarker}
          patient={selectedPatient}
          appointment={selectedAppointment}
          onClose={() => setSelectedMarker(null)}
          isAdditionalRoute={isAdditionalRouteMarker(selectedMarker)}
          employee={(() => {
            if (!selectedMarker.routeId) return undefined;
            const route = routes.find(r => r.id === selectedMarker.routeId);
            if (!route) return undefined;
            return employees.find(e => e.id === route.employee_id);
          })()}
        />
      )}
    </>
  );
}; 