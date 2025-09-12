import React from 'react';
import { InfoWindow } from '@react-google-maps/api';
import { Box } from '@mui/material';
import { MarkerData } from '../../types/mapTypes';
import { Appointment, Employee, Patient, Route } from '../../types/models';
import { 
  PatientInfoContent, 
  EmployeeInfoContent, 
  WeekendPatientInfoContent, 
  WeekendAreaInfoContent 
} from './infoWindows';

interface MarkerInfoWindowProps {
  markerList: MarkerData[];
  position: google.maps.LatLng;
  onClose: () => void;
  patients: Patient[];
  employees: Employee[];
  appointments: Appointment[];
  userArea?: string;
  routes: Route[];
}

/**
 * Component for displaying info windows for multiple markers at a position
 */
export const MarkerInfoWindow: React.FC<MarkerInfoWindowProps> = ({
  markerList,
  position,
  onClose,
  patients,
  employees,
  appointments,
  userArea,
  routes
}) => {
  return (
    <InfoWindow
      position={position}
      onCloseClick={onClose}
      options={{
        pixelOffset: new google.maps.Size(0, -10)
      }}
    >
      <Box sx={{ padding: 1.5, maxWidth: 320, borderRadius: 1, bgcolor: 'background.paper', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        {markerList.map((marker, idx) => (
          <Box key={idx} sx={{ mb: idx < markerList.length - 1 ? 2 : 0, pb: 1, borderBottom: idx < markerList.length - 1 ? 1 : 0, borderColor: 'divider' }}>
            {marker.type === 'patient' ? (
              <PatientInfoContent 
                marker={marker} 
                patients={patients} 
                appointments={appointments} 
                routes={routes} 
                employees={employees} 
              />
            ) : marker.type === 'weekend_patient' ? (
              <WeekendPatientInfoContent 
                marker={marker} 
                patients={patients} 
                appointments={appointments} 
                routes={routes} 
              />
            ) : marker.type === 'weekend_area' ? (
              <WeekendAreaInfoContent marker={marker} />
            ) : (
              <EmployeeInfoContent 
                marker={marker} 
                employees={employees} 
                routes={routes} 
              />
            )}
          </Box>
        ))}
      </Box>
    </InfoWindow>
  );
};