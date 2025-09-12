import React from 'react';
import { Box, Typography } from '@mui/material';
import { MarkerData } from '../../../types/mapTypes';
import { Appointment, Patient, Route } from '../../../types/models';
import { getColorForVisitType } from '../../../utils/mapUtils';
import { TourInfoBox } from './TourInfoBox';

interface WeekendPatientInfoContentProps {
  marker: MarkerData;
  patients: Patient[];
  appointments: Appointment[];
  routes: Route[];
}

/**
 * Component for displaying weekend patient information in marker info windows
 */
export const WeekendPatientInfoContent: React.FC<WeekendPatientInfoContentProps> = ({ 
  marker, 
  patients, 
  appointments, 
  routes 
}) => {
  const patient = patients.find(p => p.id === marker.patientId);
  if (!patient) return null;

  const appointment = appointments.find(a => a.id === marker.appointmentId);
  const route = routes.find(r => r.id === marker.routeId);
  
  const getAreaColor = (area?: string) => {
    switch (area) {
      case 'Nord': return '#1976d2';
      case 'Mitte': return '#7b1fa2';
      case 'Süd': return '#388e3c';
      default: return '#ff9800';
    }
  };

  const area = marker.area || '';
  const tourColor = getAreaColor(area);
  
  // Weekend utilization calculation (75% = 315 minutes target)
  let utilization: number | undefined = undefined;
  let durationMinutes: number | undefined = undefined;
  let targetMinutes: number | undefined = undefined;
  if (route && route.total_duration) {
    targetMinutes = 315; // 75% of 420 minutes
    durationMinutes = route.total_duration;
    utilization = targetMinutes > 0 ? (durationMinutes / targetMinutes) * 100 : undefined;
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
      
      {/* Address */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          {patient.street}<br/>
          {patient.zip_code} {patient.city}
        </Typography>
      </Box>
      
      {/* Weekend TourInfoBox */}
      {route && (
        <TourInfoBox
          employeeName=""
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
