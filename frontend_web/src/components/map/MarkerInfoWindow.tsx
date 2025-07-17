import React from 'react';
import { InfoWindow } from '@react-google-maps/api';
import { Box, Typography, Chip, Divider, LinearProgress } from '@mui/material';
import { CheckCircle as ActiveIcon, Cancel as InactiveIcon } from '@mui/icons-material';
import { MarkerData } from '../../types/mapTypes';
import { Appointment, Employee, Patient, Route } from '../../types/models';
import { getColorForVisitType, getColorForEmployeeType } from '../../utils/mapUtils';
import { getColorForTour } from '../../utils/colors';
import NavigationIcon from '@mui/icons-material/Navigation';

interface MarkerInfoWindowProps {
  markerList: MarkerData[];
  position: google.maps.LatLng;
  onClose: () => void;
  patients: Patient[];
  employees: Employee[];
  appointments: Appointment[];
  userArea?: string;
  routes: Route[]; // Add this line
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
              <PatientInfoContent marker={marker} patients={patients} appointments={appointments} routes={routes} employees={employees} />
            ) : (
              <EmployeeInfoContent marker={marker} employees={employees} routes={routes} />
            )}
          </Box>
        ))}
      </Box>
    </InfoWindow>
  );
};

// Hilfsfunktion für Auslastungsfarbe
const getUtilizationColor = (utilization: number) => {
  if (utilization > 100) return 'error.main';
  if (utilization > 90) return 'warning.main';
  if (utilization > 70) return 'success.light';
  return 'success.main';
};

// Neue Komponente für Tour-Info-Box
const TourInfoBox: React.FC<{
  tourNumber: number;
  area: string;
  utilization?: number; // Prozent, optional
  tourColor: string;
  durationMinutes?: number;
  targetMinutes?: number;
}> = ({ tourNumber, area, utilization, tourColor, durationMinutes, targetMinutes }) => {
  const isNord = area?.includes('Nordkreis');
  const areaLabel = isNord ? 'N' : 'S';
  const barColor = utilization !== undefined && utilization > 100 ? 'error.main' : 'success.main';
  // Zeitformatierung
  const formatTime = (min?: number) => {
    if (typeof min !== 'number' || isNaN(min)) return '-';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };
  return (
    <Box sx={{
      bgcolor: tourColor,
      borderRadius: 2,
      p: 1.2,
      mb: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`Tour ${tourNumber}`}
            size="small"
            sx={{
              bgcolor: 'rgba(255,255,255,0.18)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1rem',
              letterSpacing: 0.5
            }}
          />
          <Chip
            label={areaLabel}
            size="small"
            sx={{
              bgcolor: isNord ? 'primary.main' : 'secondary.main',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1rem',
              letterSpacing: 0.5
            }}
          />
        </Box>
        {/* Zeit-Box ganz rechts, falls Platz */}
        {durationMinutes !== undefined && targetMinutes !== undefined && (
          <Box sx={{
            bgcolor: 'white',
            borderRadius: 2,
            px: 1.2,
            py: 0.5,
            minWidth: 80,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            ml: 'auto'
          }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: barColor, fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(durationMinutes)} / {formatTime(targetMinutes)}
            </Typography>
          </Box>
        )}
      </Box>
      {utilization !== undefined && (
        <Box sx={{ width: '100%', mt: 1 }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'white',
            borderRadius: 2,
            px: 1.2,
            py: 0.5,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            width: '100%',
            gap: 1,
          }}>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(utilization, 100)}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#eee',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: barColor,
                  },
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ minWidth: 36, textAlign: 'right', fontWeight: 'bold', color: barColor, ml: 1 }}>
              {utilization !== undefined ? `${Math.round(utilization)}%` : '-'}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

// Patient info window content
const PatientInfoContent: React.FC<{
  marker: MarkerData;
  patients: Patient[];
  appointments: Appointment[];
  routes: Route[];
  employees: Employee[];
}> = ({ marker, patients, appointments, routes, employees }) => {
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

  // Route für diesen Patienten finden (über marker.routeId)
  let route: Route | undefined = undefined;
  if (marker.routeId) {
    route = routes.find(r => r.id === marker.routeId);
  }
  const tourColor = patient.tour !== undefined && patient.tour !== null ? getColorForTour(patient.tour) : '#888';
  const area = marker.routeArea || patient.area || '';
  // Auslastung berechnen, falls Route und Mitarbeiter vorhanden
  let utilization: number | undefined = undefined;
  let durationMinutes: number | undefined = undefined;
  let targetMinutes: number | undefined = undefined;
  if (route && route.total_duration && route.employee_id) {
    const employee = employees.find(e => e.id === route!.employee_id);
    if (employee) {
      const workHours = employee.work_hours || 0;
      targetMinutes = Math.round(420 * (workHours / 100));
      durationMinutes = route.total_duration;
      utilization = targetMinutes > 0 ? (durationMinutes / targetMinutes) * 100 : undefined;
    }
  }

  return (
    <>
      <Typography variant="subtitle1" component="div" sx={{ 
        fontWeight: 'bold',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 0.5,
        mb: 1
      }}>
        {marker.title.split(' - ')[0]}
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
      
      {/* Address with area display and vertical divider */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        {patient.area && (
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
            <NavigationIcon 
              fontSize="small" 
              sx={{ 
                mr: 0.5, 
                color: 'text.secondary',
                transform: patient.area.includes('Nordkreis') ? 'rotate(0deg)' : 'rotate(180deg)'
              }} 
            />
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              {patient.area.includes('Nordkreis') ? 'N' : 'S'}
            </Typography>
            <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24 }} />
          </Box>
        )}
        <Typography variant="body2" color="text.secondary">
          {patient.street}<br/>
          {patient.zip_code} {patient.city}
        </Typography>
      </Box>
      {/* TourInfoBox für Patienten jetzt mit Auslastung und Zeit */}
      {patient.tour !== undefined && patient.tour !== null && (
        <TourInfoBox
          tourNumber={patient.tour}
          area={area}
          utilization={utilization}
          tourColor={tourColor}
          durationMinutes={durationMinutes}
          targetMinutes={targetMinutes}
        />
      )}
    </>
  );
};

// Employee info window content
const EmployeeInfoContent: React.FC<{
  marker: MarkerData;
  employees: Employee[];
  routes: Route[];
}> = ({ marker, employees, routes }) => {
  const employee = employees.find(e => e.id === marker.employeeId);
  if (!employee) return null;
  const route = routes.find(r => r.employee_id === employee.id);
  const routeDuration = route?.total_duration ?? 0; // in Minuten
  const workHours = employee.work_hours || 0;
  const targetMinutes = Math.round(420 * (workHours / 100));
  const utilization = targetMinutes > 0 ? (routeDuration / targetMinutes) * 100 : undefined;
  const tourColor = employee.tour_number ? getColorForTour(employee.tour_number) : '#888';
  const area = route?.area || employee.area || '';

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
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          {marker.title.split(' - ')[0]}
          <span style={{ fontWeight: 500, color: '#888', marginLeft: 8 }}>{workHours}%</span>
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
      {/* Address with area display and vertical divider */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        {employee.area && (
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
            <NavigationIcon 
              fontSize="small" 
              sx={{ 
                mr: 0.5, 
                color: 'text.secondary',
                transform: employee.area.includes('Nordkreis') ? 'rotate(0deg)' : 'rotate(180deg)'
              }} 
            />
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              {employee.area.includes('Nordkreis') ? 'N' : 'S'}
            </Typography>
            <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24 }} />
          </Box>
        )}
        <Typography variant="body2" color="text.secondary">
          {employee.street}<br/>
          {employee.zip_code} {employee.city}
        </Typography>
      </Box>
      {/* Nur noch die neue TourInfoBox für Mitarbeiter */}
      {employee.tour_number && (
        <TourInfoBox
          tourNumber={employee.tour_number}
          area={area}
          utilization={utilization}
          tourColor={tourColor}
          durationMinutes={routeDuration}
          targetMinutes={targetMinutes}
        />
      )}
    </>
  );
}; 