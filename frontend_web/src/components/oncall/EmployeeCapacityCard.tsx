import React, { ReactElement } from 'react';
import { Box, Typography, Chip, LinearProgress } from '@mui/material';
import {
  LocalHospital as DoctorIcon,
  Healing as NursingIcon,
  Weekend as AWIcon,
  WbSunny as DayIcon,
  Nightlight as NightIcon,
} from '@mui/icons-material';
import { Employee, EmployeeCapacity } from '../../types/models';
import { getCapacityColor } from '../../utils/oncall/colorUtils';
import { employeeTypeColors } from '../../utils/colors';

interface EmployeeCapacityCardProps {
  employee: Employee;
  capacity?: EmployeeCapacity;
}

export const EmployeeCapacityCard: React.FC<EmployeeCapacityCardProps> = ({ employee, capacity }) => {
  if (!capacity) {
    return null;
  }

  // Show capacities with limit > 0, or capacities with limit = 0 but assigned > 0 (employee is assigned)
  const capacities = Object.entries(capacity.capacities).filter(([_, cap]) => cap.limit > 0 || cap.assigned > 0);

  if (capacities.length === 0) {
    return null;
  }

  // Get function color and German name
  const getFunctionInfo = (functionName: string) => {
    const functionMap: Record<string, { name: string; color: string; icon: ReactElement }> = {
      'Arzt': {
        name: 'Arzt',
        color: employeeTypeColors['Arzt'] || employeeTypeColors['default'],
        icon: <DoctorIcon sx={{ fontSize: '0.9rem' }} />,
      },
      'Honorararzt': {
        name: 'Honorararzt',
        color: employeeTypeColors['Honorararzt'] || employeeTypeColors['default'],
        icon: <DoctorIcon sx={{ fontSize: '0.9rem' }} />,
      },
      'Pflegekraft': {
        name: 'Pflegekraft',
        color: employeeTypeColors['default'],
        icon: <NursingIcon sx={{ fontSize: '0.9rem' }} />,
      },
      'PDL': {
        name: 'PDL',
        color: employeeTypeColors['default'],
        icon: <NursingIcon sx={{ fontSize: '0.9rem' }} />,
      },
      'Physiotherapie': {
        name: 'Physiotherapie',
        color: employeeTypeColors['default'],
        icon: <NursingIcon sx={{ fontSize: '0.9rem' }} />,
      },
    };
    return functionMap[functionName] || {
      name: functionName,
      color: employeeTypeColors['default'],
      icon: <NursingIcon sx={{ fontSize: '0.9rem' }} />,
    };
  };

  const functionInfo = getFunctionInfo(employee.function);

  // Get icon for duty type
  const getDutyIcon = (key: string) => {
    if (key.includes('aw_nursing')) return <AWIcon sx={{ fontSize: '0.85rem' }} />;
    if (key.includes('doctors')) return <DoctorIcon sx={{ fontSize: '0.85rem' }} />;
    if (key.includes('weekend_day')) return <DayIcon sx={{ fontSize: '0.85rem' }} />;
    if (key.includes('weekend_night')) return <NightIcon sx={{ fontSize: '0.85rem' }} />;
    return <NursingIcon sx={{ fontSize: '0.85rem' }} />;
  };

  // Format duty name in German (without "Arzt" or "Pflege" as function is already visible)
  // Note: Keys no longer include area, as capacities are aggregated across all areas
  const formatDutyName = (key: string): string => {
    // Map specific duty types to German names
    const dutyNameMap: Record<string, string> = {
      'rb_nursing_weekday': 'RB Wochentag',
      'rb_doctors_weekday': 'RB Wochentag',
      'aw_nursing': 'AW',
      'rb_nursing_weekend_day': 'RB Wochenende Tag',
      'rb_nursing_weekend_night': 'RB Wochenende Nacht',
      'rb_doctors_weekend': 'RB Wochenende',
    };

    // Check for exact match first
    if (dutyNameMap[key]) {
      return dutyNameMap[key];
    }

    // Fallback: basic replacement without "Pflege" or "Ärzte"
    let name = key.replace(/_/g, ' ').replace('rb ', 'RB ').replace('aw ', 'AW ');
    name = name.replace('nursing weekday', 'Wochentag');
    name = name.replace('nursing weekend day', 'Wochenende Tag');
    name = name.replace('nursing weekend night', 'Wochenende Nacht');
    name = name.replace('doctors weekday', 'Wochentag');
    name = name.replace('doctors weekend', 'Wochenende');
    name = name.replace('nursing', '');
    name = name.replace('doctors', '');
    return name.trim();
  };

  return (
    <Box
      sx={{
        p: 2.5,
        mb: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 1,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            {employee.first_name} {employee.last_name}
          </Typography>
          {employee.area && (
            <Chip
              label={employee.area.includes('Nordkreis') ? 'N' : 'S'}
              size="small"
              sx={{
                bgcolor: employee.area.includes('Nordkreis') ? 'primary.main' : 'secondary.main',
                color: 'white',
                fontSize: '0.7rem',
                height: 20,
                fontWeight: 'bold',
                '& .MuiChip-label': {
                  px: 0.75,
                },
              }}
            />
          )}
        </Box>
        <Chip
          icon={functionInfo.icon}
          label={functionInfo.name}
          size="small"
          sx={{
            height: '24px',
            fontSize: '0.7rem',
            fontWeight: 500,
            backgroundColor: functionInfo.color,
            color: 'white',
            '& .MuiChip-icon': {
              color: 'white',
            },
          }}
        />
      </Box>

      {capacities.map(([key, cap]) => {
        // If limit is 0 but assigned > 0, show as 100% (over capacity)
        const percentage = cap.limit > 0 
          ? (cap.assigned / cap.limit) * 100 
          : cap.assigned > 0 
            ? 100 
            : 0;
        
        // Determine color based on remaining capacity:
        // - If assigned > limit (over capacity): error (red)
        // - If remaining = 0: warning (yellow/orange)
        // - If remaining > 0: success (green)
        const isOverCapacity = cap.assigned > cap.limit;
        const hasNoRemaining = cap.remaining === 0;
        const color = isOverCapacity 
          ? 'error' 
          : hasNoRemaining 
            ? 'warning' 
            : 'success';

        return (
          <Box key={key} sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  flex: 1,
                }}
              >
                {getDutyIcon(key)}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {formatDutyName(key)}
                </Typography>
              </Box>
              <Chip
                label={`${cap.assigned}/${cap.limit}`}
                color={color}
                size="small"
                sx={{
                  height: '20px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(percentage, 100)}
              color={color === 'error' ? 'error' : color === 'warning' ? 'warning' : 'success'}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                mt: 0.5,
                display: 'block',
                fontSize: '0.7rem',
                color: isOverCapacity 
                  ? 'error.main' 
                  : hasNoRemaining 
                    ? 'warning.main' 
                    : 'success.main',
                fontWeight: isOverCapacity || hasNoRemaining ? 600 : 400,
              }}
            >
              Verbleibend: {cap.remaining}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

