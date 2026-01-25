import React from 'react';
import { Chip, Box } from '@mui/material';
import {
  LocalHospital as DoctorIcon,
  Healing as NursingIcon,
  Weekend as AWIcon,
  WbSunny as DayIcon,
  Nightlight as NightIcon,
} from '@mui/icons-material';
import { Assignment, DutyType } from '../../../types/models';
import { getDutyColor } from '../../../utils/oncall/colorUtils';

interface DutyChipProps {
  duty: { type: DutyType; label: string; area?: string; shortLabel: string };
  assignment?: Assignment;
  onClick: () => void;
}

export const DutyChip: React.FC<DutyChipProps> = ({ duty, assignment, onClick }) => {
  const hasAssignment = !!assignment?.employee;
  const dutyColor = getDutyColor(duty.type, duty.area as any, hasAssignment);

  // Determine icon based on duty type
  const getIcon = () => {
    if (duty.type.includes('aw_nursing')) {
      return <AWIcon sx={{ fontSize: '0.9rem' }} />;
    }
    if (duty.type.includes('doctors')) {
      return <DoctorIcon sx={{ fontSize: '0.9rem' }} />;
    }
    if (duty.type.includes('weekend_day')) {
      return <DayIcon sx={{ fontSize: '0.9rem' }} />;
    }
    if (duty.type.includes('weekend_night')) {
      return <NightIcon sx={{ fontSize: '0.9rem' }} />;
    }
    // Default nursing icon
    return <NursingIcon sx={{ fontSize: '0.9rem' }} />;
  };

  return (
    <Chip
      icon={getIcon()}
      label={
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%',
            gap: 0.25,
          }}
        >
          <Box
            component="span"
            sx={{
              fontWeight: hasAssignment ? 600 : 400,
              fontSize: '0.7rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
            }}
          >
            {duty.shortLabel}
          </Box>
          {hasAssignment && (
            <Box
              component="span"
              sx={{
                fontWeight: 500,
                fontSize: '0.65rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
                opacity: 0.9,
              }}
            >
              {assignment.employee?.first_name} {assignment.employee?.last_name}
            </Box>
          )}
        </Box>
      }
      size="small"
      onClick={onClick}
      sx={{
        height: hasAssignment ? 'auto' : '22px',
        minHeight: '22px',
        maxWidth: '100%',
        fontSize: '0.7rem',
        backgroundColor: dutyColor,
        color: 'text.primary',
        border: hasAssignment ? 'none' : '1px solid',
        borderColor: hasAssignment ? 'transparent' : dutyColor,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          opacity: hasAssignment ? 0.85 : 0.8,
          transform: 'translateY(-1px)',
        },
        '& .MuiChip-label': {
          px: 1,
          py: hasAssignment ? 0.5 : 0,
          overflow: 'visible',
          maxWidth: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
        },
        '& .MuiChip-icon': {
          color: 'text.primary',
          opacity: hasAssignment ? 1 : 0.7,
          alignSelf: hasAssignment ? 'flex-start' : 'center',
          mt: hasAssignment ? 0.5 : 0,
        },
      }}
    />
  );
};

