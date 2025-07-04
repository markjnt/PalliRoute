import React from 'react';
import { InfoWindow } from '@react-google-maps/api';
import { Box, Typography, Chip } from '@mui/material';
import { CheckCircle as ActiveIcon, Cancel as InactiveIcon } from '@mui/icons-material';
import { MarkerData } from '../../types/mapTypes';
import { Appointment, Employee, Patient } from '../../types/models';
import { getColorForVisitType, getColorForEmployeeType } from '../../utils/mapUtils';
import { getColorForTour } from '../../utils/colors';

interface MarkerInfoWindowProps {
  markerList: MarkerData[];
  position: google.maps.LatLng;
  onClose: () => void;
  patients: Patient[];
  employees: Employee[];
  appointments: Appointment[];
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
  appointments
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
              <PatientInfoContent marker={marker} patients={patients} appointments={appointments} />
            ) : (
              <EmployeeInfoContent marker={marker} employees={employees} />
            )}
          </Box>
        ))}
      </Box>
    </InfoWindow>
  );
};

// Patient info window content
const PatientInfoContent: React.FC<{
  marker: MarkerData;
  patients: Patient[];
  appointments: Appointment[];
}> = ({ marker, patients, appointments }) => {
  const patient = patients.find(p => p.id === marker.patientId);
  if (!patient) return null;

  // Get all appointments for this patient
  const patientAppointments = appointments.filter(a => a.patient_id === patient.id);
  
  // Group appointments by weekday
  const appointmentsByDay: Record<string, Appointment[]> = {};
  patientAppointments.forEach(app => {
    if (!appointmentsByDay[app.weekday]) {
      appointmentsByDay[app.weekday] = [];
    }
    appointmentsByDay[app.weekday].push(app);
  });

  return (
    <>
      <Typography variant="subtitle1" component="div" sx={{ 
        fontWeight: 'bold',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 0.5,
        mb: 1
      }}>
        {marker.title.split(' - ')[0]} {/* Just the name without visit type */}
      </Typography>
      
      {marker.visitType && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 1,
          p: 0.5,
          bgcolor: `${getColorForVisitType(marker.visitType)}20`,
          borderRadius: 1
        }}>
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%',
              bgcolor: getColorForVisitType(marker.visitType),
              mr: 1
            }} 
          />
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {marker.visitType === 'HB' ? 'Hausbesuch' : 
             marker.visitType === 'TK' ? 'Telefonkontakt' :
             marker.visitType === 'NA' ? 'Neuaufnahme' : marker.visitType}
          </Typography>
        </Box>
      )}
      
      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 'medium' }}>
        Adresse:
      </Typography>
      <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
        {patient.street}<br/>
        {patient.zip_code} {patient.city}
      </Typography>
      
      {patient.tour !== undefined && patient.tour !== null && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 1
        }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium', mr: 1 }}>
          </Typography>
          <Chip 
            label={`Tour ${patient.tour}`} 
            size="small"
            sx={{ 
              height: 24,
              bgcolor: getColorForTour(patient.tour),
              color: 'white'
            }}
          />
        </Box>
      )}
    </>
  );
};

// Employee info window content
const EmployeeInfoContent: React.FC<{
  marker: MarkerData;
  employees: Employee[];
}> = ({ marker, employees }) => {
  const employee = employees.find(e => e.id === marker.employeeId);
  if (!employee) return null;

  return (
    <>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        fontWeight: 'bold',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 0.5,
        mb: 1,
        p: 0.5,
        bgcolor: employee.is_active ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
        borderRadius: 1
      }}>
        {employee.is_active ? (
          <ActiveIcon sx={{ color: 'success.main', mr: 1 }} />
        ) : (
          <InactiveIcon sx={{ color: 'error.main', mr: 1 }} />
        )}
        <Typography variant="subtitle1" component="div" sx={{ 
          fontWeight: 'bold',
          flexGrow: 1
        }}>
          {marker.title.split(' - ')[0]} {/* Just the name without function */}
        </Typography>
      </Box>
      
      {/* Employee function/role */}
      {marker.employeeType && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 1.5,
          p: 0.5,
          bgcolor: `${getColorForEmployeeType(marker.employeeType)}20`,
          borderRadius: 1
        }}>
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%',
              bgcolor: getColorForEmployeeType(marker.employeeType),
              mr: 1
            }} 
          />
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {marker.employeeType}
          </Typography>
        </Box>
      )}
      
      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 'medium' }}>
        Adresse:
      </Typography>
      <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
        {employee.street}<br/>
        {employee.zip_code} {employee.city}
      </Typography>
      
      {employee.tour_number && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 1
        }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium', mr: 1 }}>
          </Typography>
          <Chip 
            label={`Tour ${employee.tour_number}`} 
            size="small"
            sx={{ 
              height: 24,
              bgcolor: getColorForTour(employee.tour_number),
              color: 'white'
            }}
          />
        </Box>
      )}
      
      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 'medium' }}>
        Stellenumfang: {employee.work_hours}%
      </Typography>
    </>
  );
}; 