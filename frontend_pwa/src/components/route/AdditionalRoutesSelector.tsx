import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useEmployees } from '../../services/queries/useEmployees';
import { useRoutes } from '../../services/queries/useRoutes';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { useUserStore } from '../../stores/useUserStore';
import { Employee } from '../../types/models';
import { getColorForTour } from '../../utils/colors';

interface AdditionalRoutesSelectorProps {
  selectedEmployeeIds: (number | string)[];
  onEmployeeToggle: (employeeId: number | string) => void;
  onSelectAll: (employeeIds: (number | string)[]) => void;
  onDeselectAll: () => void;
}

export const AdditionalRoutesSelector: React.FC<AdditionalRoutesSelectorProps> = ({
  selectedEmployeeIds,
  onEmployeeToggle,
  onSelectAll,
  onDeselectAll,
}) => {
  const { selectedWeekday } = useWeekdayStore();
  const { selectedUserId, selectedWeekendArea } = useUserStore();
  const { data: employees = [] } = useEmployees();
  const { data: routes = [] } = useRoutes({ weekday: selectedWeekday as any });

  // Get employees that have routes for the selected weekday, excluding the logged-in user
  const employeesWithRoutes = useMemo(() => {
    if (selectedWeekendArea) {
      // For weekend areas, show other weekend areas
      const weekendAreas = ['Nord', 'Mitte', 'Süd'];
      return weekendAreas
        .filter(area => area !== selectedWeekendArea)
        .map(area => ({
          id: area as any,
          first_name: `RB/AW ${area}`,
          last_name: 'Bereich',
          function: 'RB/AW Tour'
        }));
    } else {
      // For employees, show other employees with routes
      const filteredEmployees = employees.filter(emp => 
        emp.id !== selectedUserId && // Exclude logged-in user
        routes.some(route => route.employee_id === emp.id)
      );

      // Sort by employee function first, then alphabetically by first name, then last name
      const employeeFunctionOrder = {
        'Pflegekraft': 1,
        'PDL': 2,
        'Arzt': 3,
        'Honorararzt': 4
      };

      return filteredEmployees.sort((a, b) => {
        // First sort by employee function
        const functionA = employeeFunctionOrder[a.function as keyof typeof employeeFunctionOrder] || 999;
        const functionB = employeeFunctionOrder[b.function as keyof typeof employeeFunctionOrder] || 999;
        
        if (functionA !== functionB) {
          return functionA - functionB;
        }
        
        // Then sort alphabetically by first name
        const firstNameA = a.first_name.toLowerCase();
        const firstNameB = b.first_name.toLowerCase();
        
        if (firstNameA !== firstNameB) {
          return firstNameA.localeCompare(firstNameB);
        }
        
        // Finally sort by last name
        const lastNameA = a.last_name.toLowerCase();
        const lastNameB = b.last_name.toLowerCase();
        
        return lastNameA.localeCompare(lastNameB);
      });
    }
  }, [employees, routes, selectedUserId, selectedWeekendArea]);

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

  // Check if any employees are selected
  const anySelected = selectedEmployeeIds.length > 0;

  const handleToggleAll = () => {
    if (anySelected) {
      onDeselectAll();
    } else {
      const employeeIds = employeesWithRoutes.map(emp => emp.id!);
      onSelectAll(employeeIds);
    }
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            
            {/* Toggle All Button */}
            {employeesWithRoutes.length > 0 && (
              <Box
                onClick={handleToggleAll}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  bgcolor: 'rgba(0, 0, 0, 0.04)',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.08)',
                  },
                }}
              >
                {anySelected ? (
                  <CloseIcon sx={{ color: '#FF3B30', fontSize: 20 }} />
                ) : (
                  <AddIcon sx={{ color: '#007AFF', fontSize: 20 }} />
                )}
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {employeesWithRoutes.map((employee) => {
            const isSelected = selectedEmployeeIds.includes(employee.id as any);
            
            // Get color based on weekend area or employee
            const getWeekendAreaColor = (area: string) => {
              switch (area) {
                case 'Nord': return '#1976d2'; // Blue
                case 'Mitte': return '#7b1fa2'; // Purple
                case 'Süd': return '#388e3c'; // Green
                default: return '#ff9800'; // Orange fallback
              }
            };
            
            const routeColor = selectedWeekendArea 
              ? getWeekendAreaColor(employee.id as string)
              : getColorForTour(employee.id as any);
            
            const fullName = selectedWeekendArea 
              ? employee.first_name
              : `${employee.first_name} ${employee.last_name}`;
            
            return (
              <Chip
                key={employee.id}
                label={fullName}
                onClick={() => onEmployeeToggle(employee.id as any)}
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
