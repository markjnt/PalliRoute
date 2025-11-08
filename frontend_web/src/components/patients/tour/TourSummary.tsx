import React, { useMemo } from 'react';
import { Box, Chip } from '@mui/material';
import {
  Home as HomeIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  AddCircle as AddCircleIcon
} from '@mui/icons-material';
import { Appointment, Patient } from '../../../types/models';

interface TourSummaryProps {
  sortedRoutePatients: Patient[]; // Only normal HB/NA patients (not tour_employee)
  normalTkPatients: Patient[]; // Only normal TK patients (not tour_employee)
  emptyTypePatients: Patient[];
  getPatientAppointments?: (patientId: number) => Appointment[];
}

const createAppointmentKey = (patientId: number | undefined, appointment: Appointment) => {
  if (appointment.id !== undefined) {
    return `id-${appointment.id}`;
  }
  const time = appointment.time || '';
  return `pid-${patientId || 'unknown'}-${appointment.weekday}-${appointment.visit_type}-${time}`;
};

export const TourSummary: React.FC<TourSummaryProps> = ({
  sortedRoutePatients,
  normalTkPatients,
  emptyTypePatients,
  getPatientAppointments
}) => {
  const { hbCount, naCount, tkCount, emptyCount } = useMemo(() => {
    let hb = 0;
    let na = 0;
    let tk = 0;
    let empty = 0;
    const seenAppointments = new Set<string>();

    const collectAppointments = (patients: Patient[]) => {
      patients.forEach((patient) => {
        const appointments =
          getPatientAppointments && patient.id
            ? getPatientAppointments(patient.id)
            : patient.appointments || [];

        appointments.forEach((appointment) => {
          const key = createAppointmentKey(patient.id, appointment);
          if (seenAppointments.has(key)) {
            return;
          }
          seenAppointments.add(key);

          switch (appointment.visit_type) {
            case 'HB':
              hb += 1;
              break;
            case 'NA':
              na += 1;
              break;
            case 'TK':
              tk += 1;
              break;
            default:
              empty += 1;
              break;
          }
        });
      });
    };

    collectAppointments(sortedRoutePatients);
    collectAppointments(normalTkPatients);
    collectAppointments(emptyTypePatients);

    return { hbCount: hb, naCount: na, tkCount: tk, emptyCount: empty };
  }, [sortedRoutePatients, normalTkPatients, emptyTypePatients, getPatientAppointments]);

  return (
    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
        {hbCount > 0 && (
          <Chip
            size="small"
            icon={<HomeIcon fontSize="small" />}
            label={hbCount}
            color="primary"
            variant="outlined"
          />
        )}
        {naCount > 0 && (
          <Chip
            size="small"
            icon={<AddCircleIcon fontSize="small" />}
            label={naCount}
            color="secondary"
            variant="outlined"
          />
        )}
        {tkCount > 0 && (
          <Chip
            size="small"
            icon={<PhoneIcon fontSize="small" />}
            label={tkCount}
            color="success"
            variant="outlined"
          />
        )}
        {emptyCount > 0 && (
          <Chip
            size="small"
            icon={<PersonIcon fontSize="small" />}
            label={emptyCount}
            color="default"
            variant="outlined"
          />
        )}
      </Box>
    </Box>
  );
};