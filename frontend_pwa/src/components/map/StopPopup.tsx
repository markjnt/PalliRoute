import React from 'react';
import { InfoWindow } from '@react-google-maps/api';
import { MarkerData } from '../../types/mapTypes';
import { Patient, Appointment, Employee } from '../../types/models';
import { useRouteCompletionStore } from '../../stores/useRouteCompletionStore';
import { getColorForVisitType } from '../../utils/mapUtils';
import { getColorForTour } from '../../utils/colors';
import {
  Box,
  Card,
  Typography,
  IconButton,
  Checkbox,
  FormControlLabel,
  Divider,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  LocationOn as LocationIcon,
  Schedule as TimeIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';

interface StopPopupProps {
  marker: MarkerData;
  patient: Patient | undefined;
  appointment: Appointment | undefined;
  onClose: () => void;
  isAdditionalRoute?: boolean;
  employee?: Employee;
}

export const StopPopup: React.FC<StopPopupProps> = ({
  marker,
  patient,
  appointment,
  onClose,
  isAdditionalRoute = false,
  employee
}) => {
  const { isStopCompleted, toggleStop } = useRouteCompletionStore();
  
  if (!patient || !appointment) {
    return null;
  }

  const isCompleted = isStopCompleted(appointment.id!);
  const visitTypeLabels = {
    'HB': 'Hausbesuch',
    'TK': 'Telefonkontakt',
    'NA': 'Neuaufnahme'
  };

  const handleCheckboxChange = () => {
    if (appointment.id) {
      toggleStop(appointment.id);
    }
  };

  return (
    <InfoWindow
      position={marker.position}
      onCloseClick={onClose}
      options={{
        pixelOffset: new google.maps.Size(0, -10),
        maxWidth: 300,
        minWidth: 300,
        headerDisabled: true,
        disableAutoPan: false,
      }}
    >
      <Box sx={{ padding: 1.5, maxWidth: 320 }}>
        {/* Header with patient info */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* Route Position Number */}
              {marker.routePosition && (
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: isCompleted ? '#34C759' : '#007AFF',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {marker.routePosition}
                </Box>
              )}
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1d1d1f' }}>
                {patient.first_name} {patient.last_name}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                color: '#8E8E93',
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={visitTypeLabels[appointment.visit_type]}
              size="small"
              sx={{
                bgcolor: `${getColorForVisitType(appointment.visit_type)}20`,
                color: getColorForVisitType(appointment.visit_type),
                fontSize: '0.75rem',
                height: 20,
                fontWeight: 500,
              }}
            />
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ p: 2 }}>
          {/* Address - Clickable */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <LocationIcon sx={{ fontSize: 18, color: '#8E8E93', mr: 1.5, mt: 0.25 }} />
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#1d1d1f', 
                  fontWeight: 500, 
                  mb: 0.25
                }}
                onClick={() => {
                  const encodedAddress = encodeURIComponent(`${patient.street}, ${patient.zip_code} ${patient.city}`);
                  window.location.href = `https://maps.google.com/?q=${encodedAddress}`;
                }}
              >
                {patient.street}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#8E8E93',
                }}
                onClick={() => {
                  const encodedAddress = encodeURIComponent(`${patient.street}, ${patient.zip_code} ${patient.city}`);
                  window.location.href = `https://maps.google.com/?q=${encodedAddress}`;
                }}
              >
                {patient.zip_code} {patient.city}
              </Typography>
            </Box>
          </Box>

          {/* Time */}
          {appointment.time && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TimeIcon sx={{ fontSize: 18, color: '#8E8E93', mr: 1.5 }} />
              <Box>
                <Typography variant="body2" sx={{ color: '#1d1d1f', fontWeight: 500 }}>
                  {appointment.time} Uhr
                </Typography>
              </Box>
            </Box>
          )}

          {/* Phone Numbers - Clickable */}
          {(patient.phone1 || patient.phone2) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
              {patient.phone1 && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PhoneIcon sx={{ fontSize: 18, color: '#8E8E93', mr: 1.5 }} />
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#1d1d1f',
                    }}
                    onClick={() => {
                      const cleanPhone = patient.phone1!.replace(/\s+/g, '');
                      window.location.href = `tel:${cleanPhone}`;
                    }}
                  >
                    {patient.phone1}
                  </Typography>
                </Box>
              )}
              {patient.phone2 && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PhoneIcon sx={{ fontSize: 18, color: '#8E8E93', mr: 1.5 }} />
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#1d1d1f'
                    }}
                    onClick={() => {
                      const cleanPhone = patient.phone2!.replace(/\s+/g, '');
                      window.location.href = `tel:${cleanPhone}`;
                    }}
                  >
                    {patient.phone2}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Additional Info */}
          {appointment.info && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <InfoIcon sx={{ fontSize: 18, color: '#007AFF', mr: 1.5 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ 
                  color: '#007AFF',
                  bgcolor: 'rgba(0, 122, 255, 0.1)',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  display: 'block',
                }}>
                  {appointment.info}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Completion Checkbox - Only show for main user route */}
          {!isAdditionalRoute && (
            <>
              <Divider sx={{ my: 2 }} />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isCompleted}
                    onChange={handleCheckboxChange}
                    icon={<UncheckedIcon sx={{ color: '#C7C7CC' }} />}
                    checkedIcon={<CheckCircleIcon sx={{ color: '#34C759' }} />}
                    sx={{
                      '&:hover': { bgcolor: 'transparent' },
                    }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#1d1d1f' }}>
                    {isCompleted ? 'Abgeschlossen' : 'Als abgeschlossen markieren'}
                  </Typography>
                }
              />
            </>
          )}
          
          {/* Employee name chip for additional routes - shown at the bottom */}
          {isAdditionalRoute && (
            <Box sx={{ mt: 2 }}>
              <Chip
                label={employee ? `${employee.first_name} ${employee.last_name}` : `AW ${marker.area || 'Bereich'}`}
                size="small"
                sx={{
                  bgcolor: employee ? getColorForTour(employee.id) : (marker.area ? 
                    (marker.area === 'Nord' ? '#1976d2' : 
                     marker.area === 'Mitte' ? '#7b1fa2' : 
                     marker.area === 'Süd' ? '#388e3c' : '#ff9800') : '#ff9800'),
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  height: 28,
                  width: '100%',
                  justifyContent: 'flex-start',
                  '& .MuiChip-label': {
                    px: 1.5,
                    py: 0.5,
                    textAlign: 'left',
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </Box>
    </InfoWindow>
  );
};
