import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import NavigationIcon from '@mui/icons-material/Navigation';
import { MarkerData } from '../../../types/mapTypes';
import { Employee, Route } from '../../../types/models';
import { getColorForEmployeeType } from '../../../utils/mapUtils';
import { getColorForTour } from '../../../utils/colors';
import { TourInfoBox } from './TourInfoBox';

interface EmployeeInfoContentProps {
  marker: MarkerData;
  employees: Employee[];
  routes: Route[];
}

/**
 * Component for displaying employee information in marker info windows
 */
export const EmployeeInfoContent: React.FC<EmployeeInfoContentProps> = ({ 
  marker, 
  employees, 
  routes 
}) => {
  const employee = employees.find(e => e.id === marker.employeeId);
  if (!employee) return null;
  
  const route = routes.find(r => r.employee_id === employee.id);
  const routeDuration = route?.total_duration ?? 0; // in Minuten
  const workHours = employee.work_hours || 0;
  const targetMinutes = Math.round(420 * (workHours / 100));
  const utilization = targetMinutes > 0 ? (routeDuration / targetMinutes) * 100 : undefined;
  const tourColor = employee.id ? getColorForTour(employee.id) : '#888';
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
        bgcolor: 'rgba(52, 52, 52, 0.1)',
        borderRadius: 1
      }}>
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
      
      {/* TourInfoBox für alle Mitarbeiter */}
      {employee.id && (
        <TourInfoBox
          employeeName=""
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
