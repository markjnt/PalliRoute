import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Tooltip,
  Card,
  CardContent,
  Divider,
  Stack
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  WarningAmber as WarningIcon,
  Home as HomeIcon,
  Phone as PhoneIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { Appointment, Patient } from '../../../types/models';

type WeekendArea = 'Nord' | 'Mitte' | 'Süd';

interface UnassignedWeekendAppointment {
  appointment: Appointment;
  patient?: Patient;
}

interface UnassignedWeekendAppointmentsProps {
  appointments: UnassignedWeekendAppointment[];
  onAssignArea: (appointmentId: number, area: WeekendArea) => Promise<void>;
  isAssigning: boolean;
}

const areaButtons: WeekendArea[] = ['Nord', 'Mitte', 'Süd'];

const getAreaColor = (area: WeekendArea) => {
  switch (area) {
    case 'Nord':
      return '#1976d2';
    case 'Mitte':
      return '#7b1fa2';
    case 'Süd':
      return '#388e3c';
    default:
      return '#ff9800';
  }
};

const getVisitStyles = (visitType?: Appointment['visit_type']) => {
  switch (visitType) {
    case 'HB':
      return {
        background: 'rgba(25, 118, 210, 0.08)',
        border: alpha('#1976d2', 0.35),
        chipBg: '#1976d2'
      };
    case 'NA':
      return {
        background: 'rgba(244, 67, 54, 0.08)',
        border: alpha('#f44336', 0.35),
        chipBg: '#f44336'
      };
    case 'TK':
      return {
        background: 'rgba(76, 175, 80, 0.08)',
        border: alpha('#4caf50', 0.35),
        chipBg: '#4caf50'
      };
    default:
      return {
        background: alpha('#9e9e9e', 0.08),
        border: alpha('#9e9e9e', 0.35),
        chipBg: '#9e9e9e'
      };
  }
};

export const UnassignedWeekendAppointments: React.FC<UnassignedWeekendAppointmentsProps> = ({
  appointments,
  onAssignArea,
  isAssigning
}) => {
  if (appointments.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={2}
      sx={{
        mb: 3,
        p: 2,
        borderLeft: (theme) => `4px solid ${theme.palette.warning.main}`,
        backgroundColor: (theme) => `${theme.palette.warning.light}20`
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <WarningIcon color="warning" />
        <Typography variant="h6">Nicht zugewiesene Wochenendtermine</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {appointments.map(({ appointment, patient }) => {
          const displayName = patient
            ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
            : `Patient #${appointment.patient_id}`;

          const visitStyles = getVisitStyles(appointment.visit_type);

          return (
            <Card
              key={appointment.id}
              variant="outlined"
              sx={{
                backgroundColor: visitStyles.background,
                borderRadius: 2,
                borderColor: visitStyles.border,
                borderWidth: 1,
                boxShadow: 'none'
              }}
            >
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{ lineHeight: 1.2 }}
                      >
                        {displayName || 'Unbekannter Patient'}
                      </Typography>
                      <Chip
                        label={appointment.visit_type || 'Termin'}
                        size="small"
                        sx={{
                          bgcolor: visitStyles.chipBg,
                          color: '#fff',
                          fontWeight: 600
                        }}
                      />
                    </Box>
                  </Box>

                  {patient?.street && patient?.city && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HomeIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {patient.street}, {patient.zip_code} {patient.city}
                      </Typography>
                    </Box>
                  )}

                  {patient?.phone1 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhoneIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {patient.phone1}
                      </Typography>
                    </Box>
                  )}

                  {appointment.info && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InfoIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {appointment.info}
                      </Typography>
                    </Box>
                  )}

                  <Divider />

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary">
                        Bereich zuweisen:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {areaButtons.map((area) => (
                          <Tooltip key={area} title={`Zu ${area} verschieben`}>
                            <span>
                              <Chip
                                label={area}
                                onClick={() => onAssignArea(appointment.id!, area)}
                                disabled={isAssigning}
                                sx={{
                                  bgcolor: getAreaColor(area),
                                  color: '#fff',
                                  cursor: isAssigning ? 'not-allowed' : 'pointer',
                                  opacity: isAssigning ? 0.6 : 1,
                                  '&:hover': {
                                    opacity: isAssigning ? 0.6 : 0.85
                                  }
                                }}
                              />
                            </span>
                          </Tooltip>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Paper>
  );
};


