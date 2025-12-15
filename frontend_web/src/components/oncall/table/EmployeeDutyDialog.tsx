import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { DutyType, OnCallArea, Employee, OnCallAssignment } from '../../../types/models';
import { WEEKDAY_DUTIES, WEEKEND_DUTIES } from '../../../utils/oncall/constants';
import { getDutyColor } from '../../../utils/oncall/colorUtils';
import { isWeekend } from '../../../utils/oncall/dateUtils';

interface EmployeeDutyDialogProps {
  open: boolean;
  employee: Employee | null;
  date: Date | null;
  assignments: OnCallAssignment[];
  onClose: () => void;
  onDutyToggle: (dutyType: DutyType, area?: OnCallArea) => void;
}

export const EmployeeDutyDialog: React.FC<EmployeeDutyDialogProps> = ({
  open,
  employee,
  date,
  assignments,
  onClose,
  onDutyToggle,
}) => {
  if (!employee || !date) return null;

  const isWeekendDay = isWeekend(date);
  const availableDuties = isWeekendDay ? WEEKEND_DUTIES : WEEKDAY_DUTIES;

  // Create a map of selected duties for quick lookup
  const selectedDutiesMap = useMemo(() => {
    const map = new Map<string, OnCallAssignment>();
    assignments.forEach((assignment) => {
      const key = `${assignment.duty_type}_${assignment.area || ''}`;
      map.set(key, assignment);
    });
    return map;
  }, [assignments]);

  const handleDutyToggle = (dutyType: DutyType, area?: OnCallArea) => {
    onDutyToggle(dutyType, area);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
          {employee.first_name} {employee.last_name}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          {date.toLocaleDateString('de-DE', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 2 }}>
          {availableDuties.map((duty) => {
            const key = `${duty.type}_${duty.area || ''}`;
            const assignment = selectedDutiesMap.get(key);
            const isSelected = !!assignment;
            // Use getDutyColor with isSelected to get lighter colors when not selected
            const dutyColor = getDutyColor(duty.type, duty.area, isSelected);
            const fullColor = getDutyColor(duty.type, duty.area, true);

            // Filter based on employee function
            const shouldShow =
              (duty.type.includes('doctors') &&
                (employee.function === 'Arzt' || employee.function === 'Honorararzt')) ||
              (!duty.type.includes('doctors') &&
                (employee.function === 'Pflegekraft' || employee.function === 'PDL'));

            if (!shouldShow) return null;

            return (
              <Box
                key={key}
                onClick={() => handleDutyToggle(duty.type, duty.area)}
                sx={{
                  cursor: 'pointer',
                  p: 2,
                  borderRadius: 2,
                  border: isSelected ? '2px solid' : '1px solid',
                  borderColor: isSelected ? fullColor : dutyColor,
                  backgroundColor: isSelected ? `${fullColor}20` : 'background.paper',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                    borderColor: fullColor,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isSelected && (
                    <CheckCircleIcon sx={{ color: fullColor, fontSize: 20 }} />
                  )}
                  <Chip
                    label={duty.shortLabel}
                    size="small"
                    sx={{
                      bgcolor: isSelected ? fullColor : dutyColor,
                      color: isSelected ? 'white' : 'text.primary',
                      border: isSelected ? 'none' : `1px solid ${dutyColor}`,
                      fontWeight: isSelected ? 600 : 500,
                    }}
                  />
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: isSelected ? 'text.primary' : 'text.secondary',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {isSelected ? 'Aktiv' : 'Nicht zugewiesen'}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 2,
            px: 2,
          }}
        >
          Schließen
        </Button>
      </DialogActions>
    </Dialog>
  );
};

