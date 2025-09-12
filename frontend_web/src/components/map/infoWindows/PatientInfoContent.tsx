import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import NavigationIcon from '@mui/icons-material/Navigation';
import { MarkerData } from '../../../types/mapTypes';
import { Appointment, Employee, Patient, Route } from '../../../types/models';
import { getColorForVisitType } from '../../../utils/mapUtils';
import { getColorForTour } from '../../../utils/colors';
import { TourInfoBox } from './TourInfoBox';

interface PatientInfoContentProps {
  marker: MarkerData;
  patients: Patient[];
  appointments: Appointment[];
  routes: Route[];
  employees: Employee[];
}

/**
 * Component for displaying patient information in marker info windows
 */
export const PatientInfoContent: React.FC<PatientInfoContentProps> = ({ 
  marker, 
  patients, 
  appointments, 
  routes, 
  employees 
}) => {
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
  
  // Get tour color from patient's appointments
  const patientAppointment = patientAppointments[0]; // Verwende den ersten Termin
  let tourColor = '#888';
  if (patientAppointment && patientAppointment.employee_id) {
    const employee = employees.find(e => e.id === patientAppointment.employee_id);
    if (employee && employee.id) {
      tourColor = getColorForTour(employee.id);
    }
  }
  
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
      
      {/* TourInfoBox für Patienten */}
      {patientAppointment && patientAppointment.employee_id && (
        (() => {
          const employee = employees.find(e => e.id === patientAppointment.employee_id);
          if (employee) {
            return (
              <TourInfoBox
                employeeName={`${employee.first_name.charAt(0)}. ${employee.last_name}`}
                area={area}
                utilization={utilization}
                tourColor={tourColor}
                durationMinutes={durationMinutes}
                targetMinutes={targetMinutes}
              />
            );
          }
          return null;
        })()
      )}
    </>
  );
};
