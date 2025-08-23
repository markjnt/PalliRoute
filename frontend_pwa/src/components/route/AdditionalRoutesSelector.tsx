import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import { useEmployees } from '../../services/queries/useEmployees';
import { useRoutes } from '../../services/queries/useRoutes';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { useUserStore } from '../../stores/useUserStore';
import { Employee } from '../../types/models';
import { getColorForTour } from '../../utils/colors';

interface AdditionalRoutesSelectorProps {
  selectedEmployeeIds: number[];
  onEmployeeToggle: (employeeId: number) => void;
}

export const AdditionalRoutesSelector: React.FC<AdditionalRoutesSelectorProps> = ({
  selectedEmployeeIds,
  onEmployeeToggle,
}) => {
  const { selectedWeekday } = useWeekdayStore();
  const { selectedUserId } = useUserStore();
  const { data: employees = [] } = useEmployees();
  const { data: routes = [] } = useRoutes({ weekday: selectedWeekday });

  // Get employees that have routes for the selected weekday, excluding the logged-in user
  const employeesWithRoutes = useMemo(() => {
    return employees.filter(emp => 
      emp.id !== selectedUserId && // Exclude logged-in user
      routes.some(route => route.employee_id === emp.id)
    );
  }, [employees, routes, selectedUserId]);

  // Get German weekday name
  const getGermanWeekday = (weekday: string): string => {
    const weekdayMap: Record<string, string> = {
      'monday': 'Montag',
      'tuesday': 'Dienstag',
      'wednesday': 'Mittwoch',
      'thursday': 'Donnerstag',
      'friday': 'Freitag'
    };
    return weekdayMap[weekday] || weekday;
  };

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Box
        sx={{
          p: 2,
          bgcolor: 'rgba(0, 0, 0, 0.02)',
          borderRadius: 2,
          border: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Anzahl der ausgewählten Routen */}
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: '#007AFF',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {selectedEmployeeIds.length}
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1d1d1f' }}>
              Weitere Routen anzeigen
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {employeesWithRoutes.map((employee) => {
            const isSelected = selectedEmployeeIds.includes(employee.id!);
            const routeColor = getColorForTour(employee.id);
            const fullName = `${employee.first_name} ${employee.last_name}`;
            
            return (
              <Chip
                key={employee.id}
                label={fullName}
                onClick={() => onEmployeeToggle(employee.id!)}
                variant={isSelected ? "filled" : "outlined"}
                sx={{
                  bgcolor: isSelected ? routeColor : 'transparent',
                  color: isSelected ? 'white' : 'inherit',
                  borderColor: routeColor,
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  boxSizing: 'border-box',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  height: '28px',
                  width: 'fit-content',
                  minWidth: 'fit-content',
                  maxWidth: 'fit-content',
                  '&:hover': {
                    bgcolor: isSelected ? routeColor : 'rgba(0, 0, 0, 0.04)',
                  },
                  '& .MuiChip-label': {
                    px: 1,
                    py: 0.25,
                    whiteSpace: 'nowrap',
                  },
                }}
              />
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};
