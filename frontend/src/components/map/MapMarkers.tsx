import React from 'react';
import { Marker, GroundOverlay } from '@react-google-maps/api';
import { MarkerGroup } from '../../types/mapTypes';
import { MarkerInfoWindow } from './MarkerInfoWindow';
import { Appointment, Employee, Patient } from '../../types/models';
import { createMarkerIcon, createMarkerLabel } from '../../utils/markerConfig';

interface MapMarkersProps {
  markerGroups: MarkerGroup[];
  activeGroup: string | null;
  selectedMarker: any | null;
  isGroupActive: (group: MarkerGroup) => boolean;
  handleMarkerClick: (marker: any, group: MarkerGroup) => void;
  handleExpandedMarkerClick: (marker: any, position: google.maps.LatLng) => void;
  handleInfoWindowClose: () => void;
  handleMapClick: () => void;
  patients: Patient[];
  employees: Employee[];
  appointments: Appointment[];
}

/**
 * Component to render all markers on the map
 */
export const MapMarkers: React.FC<MapMarkersProps> = ({
  markerGroups,
  activeGroup,
  selectedMarker,
  isGroupActive,
  handleMarkerClick,
  handleExpandedMarkerClick,
  handleInfoWindowClose,
  handleMapClick,
  patients,
  employees,
  appointments
}) => {
  return (
    <>
      {/* Render marker groups */}
      {markerGroups.map((group, groupIndex) => {
        const isActive = isGroupActive(group);
        
        return (
          <React.Fragment key={`group-${groupIndex}`}>
            {/* Render either a single marker or expanded group */}
            {group.count === 1 || !isActive ? (
              // For single markers or collapsed groups, show just one marker
              <Marker
                key={`group-marker-${groupIndex}`}
                position={group.position}
                title={group.count > 1 ? `${group.count} Marker an dieser Position` : group.markers[0].title}
                onClick={() => handleMarkerClick(group.markers[0], group)}
                label={createMarkerLabel(
                  group.count,
                  group.markers[0].visitType,
                  group.markers[0].label
                )}
                icon={createMarkerIcon(
                  group.markers[0].type,
                  group.markers[0].employeeType,
                  group.markers[0].visitType,
                  group.count > 1
                )}
              />
            ) : (
              // When group is active, expand markers in a circle
              group.markers.map((marker, idx) => {
                // Calculate position in a circle around the original point
                const angle = (2 * Math.PI * idx) / group.markers.length;
                const radius = 0.0001; // About 10 meters radius
                const lat = group.position.lat() + Math.cos(angle) * radius;
                const lng = group.position.lng() + Math.sin(angle) * radius;
                const expandedPosition = new google.maps.LatLng(lat, lng);
                
                return (
                  <Marker
                    key={`expanded-marker-${groupIndex}-${idx}`}
                    position={expandedPosition}
                    title={marker.title}
                    onClick={() => handleExpandedMarkerClick(marker, expandedPosition)}
                    label={createMarkerLabel(undefined, marker.visitType, marker.label)}
                    icon={createMarkerIcon(marker.type, marker.employeeType, marker.visitType)}
                  />
                );
              })
            )}
          </React.Fragment>
        );
      })}
      
      {/* Add a click handler on the map to collapse any expanded groups */}
      {activeGroup && (
        <GroundOverlay
          key="map-overlay"
          url="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          bounds={{
            north: 85,
            south: -85,
            east: 180,
            west: -180
          }}
          opacity={0.01}
          onClick={handleMapClick}
        />
      )}
      
      {/* InfoWindow for selected marker */}
      {selectedMarker && (
        <MarkerInfoWindow 
          marker={selectedMarker}
          onClose={handleInfoWindowClose}
          patients={patients}
          employees={employees}
          appointments={appointments}
        />
      )}
    </>
  );
}; 