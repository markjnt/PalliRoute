import React, { ReactElement } from 'react';
import { Box, Typography, Chip, LinearProgress } from '@mui/material';
import {
  LocalHospital as DoctorIcon,
  Healing as NursingIcon,
  Weekend as AWIcon,
  WbSunny as DayIcon,
  Nightlight as NightIcon,
} from '@mui/icons-material';
import { Employee, EmployeeCapacity } from '../../../types/models';
import { getCapacityColor } from '../../../utils/oncall/colorUtils';
import { employeeTypeColors } from '../../../utils/colors';

interface EmployeeCapacityCardProps {
  employee: Employee;
  capacities: EmployeeCapacity[];
}

export const EmployeeCapacityCard: React.FC<EmployeeCapacityCardProps> = ({ employee, capacities }) => {
  if (!capacities || capacities.length === 0) {
    return null;
  }

  // Map capacity_type to display format
  const formatCapacityType = (capacityType: string): string => {
    const typeMap: Record<string, string> = {
      'RB_NURSING_WEEKDAY': 'RB_NURSING_WEEKDAY',
      'RB_NURSING_WEEKEND': 'RB_NURSING_WEEKEND',
      'RB_DOCTORS_WEEKDAY': 'RB_DOCTORS_WEEKDAY',
      'RB_DOCTORS_WEEKEND': 'RB_DOCTORS_WEEKEND',
      'AW_NURSING': 'AW_NURSING',
    };
    return typeMap[capacityType] || capacityType;
  };

  // Filter capacities with max_count > 0
  const activeCapacities = capacities.filter(cap => cap.max_count > 0);

  if (activeCapacities.length === 0) {
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

  // Get icon for capacity type
  const getDutyIcon = (capacityType: string) => {
    if (capacityType.includes('AW')) return <AWIcon sx={{ fontSize: '0.85rem' }} />;
    if (capacityType.includes('DOCTORS')) return <DoctorIcon sx={{ fontSize: '0.85rem' }} />;
    if (capacityType.includes('WEEKEND')) return <NursingIcon sx={{ fontSize: '0.85rem' }} />;
    return <NursingIcon sx={{ fontSize: '0.85rem' }} />;
  };

  // Format capacity type name in German
  const formatDutyName = (capacityType: string): string => {
    const dutyNameMap: Record<string, string> = {
      'RB_NURSING_WEEKDAY': 'RB Pflege Wochentag',
      'RB_NURSING_WEEKEND': 'RB Pflege Wochenende',
      'RB_DOCTORS_WEEKDAY': 'RB Ärzte Wochentag',
      'RB_DOCTORS_WEEKEND': 'RB Ärzte Wochenende',
      'AW_NURSING': 'AW Pflege',
    };
    return dutyNameMap[capacityType] || capacityType;
  };

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'rgba(0, 0, 0, 0.06)',
        backgroundColor: 'white',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          transform: 'translateY(-2px)',
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
                height: 22,
                fontWeight: 600,
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
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
            height: 26,
            fontSize: '0.7rem',
            fontWeight: 500,
            backgroundColor: functionInfo.color,
            color: 'white',
            borderRadius: 2,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
            '& .MuiChip-icon': {
              color: 'white',
              fontSize: '0.85rem',
            },
          }}
        />
      </Box>

      {activeCapacities.map((capacity) => {
        // Use assigned and remaining from backend
        const assigned = capacity.assigned ?? 0;
        const remaining = capacity.remaining ?? (capacity.max_count - assigned);
        const percentage = capacity.max_count > 0 
          ? (assigned / capacity.max_count) * 100 
          : 0;
        
        const isOverCapacity = assigned > capacity.max_count;
        const hasNoRemaining = remaining === 0;
        const color = isOverCapacity 
          ? 'error' 
          : hasNoRemaining 
            ? 'warning' 
            : 'success';

        return (
          <Box key={capacity.id} sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
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
                {getDutyIcon(capacity.capacity_type)}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {formatDutyName(capacity.capacity_type)}
                </Typography>
              </Box>
              <Chip
                label={`${assigned}/${capacity.max_count}`}
                color={color}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  border: 'none',
                }}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(percentage, 100)}
              color={color === 'error' ? 'error' : color === 'warning' ? 'warning' : 'success'}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(0, 0, 0, 0.06)',
                overflow: 'hidden',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  transition: 'transform 0.3s ease',
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                mt: 0.75,
                display: 'block',
                fontSize: '0.7rem',
                color: isOverCapacity 
                  ? 'error.main' 
                  : hasNoRemaining 
                    ? 'warning.main' 
                    : 'success.main',
                fontWeight: isOverCapacity || hasNoRemaining ? 600 : 500,
              }}
            >
              Verbleibend: {remaining}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

