import React, { useMemo, useState } from 'react';
import { Box, Typography, CircularProgress, Chip } from '@mui/material';
import { Employee } from '../../types/models';
import { formatMonthYear } from '../../utils/oncall/dateUtils';
import { EmployeeCapacityCard } from './EmployeeCapacityCard';
import { useAllEmployeesCapacity } from '../../services/queries/useOnCallAssignments';
import { employeeTypeColors } from '../../utils/colors';

interface CapacityOverviewProps {
  employees: Employee[];
  currentDate: Date;
}

type FilterType = 'all' | 'pflege' | 'arzt';

export const CapacityOverview: React.FC<CapacityOverviewProps> = ({ employees, currentDate }) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  
  const { data: allCapacities, isLoading } = useAllEmployeesCapacity(month, year);
  
  // Create a map of capacities by employee ID
  const capacitiesMap = useMemo(() => {
    if (!allCapacities?.capacities) return new Map();
    return new Map(Object.entries(allCapacities.capacities).map(([id, capacity]) => [Number(id), capacity]));
  }, [allCapacities]);

  // Check if employee has exceeded capacity
  const hasExceededCapacity = (employee: Employee): boolean => {
    const capacity = capacitiesMap.get(employee.id || 0);
    if (!capacity?.capacities) return false;
    
    // Check if any capacity has assigned > limit
    // This includes cases where limit = 0 and assigned > 0 (e.g., "1 von 0 vergeben")
    const capacityValues = Object.values(capacity.capacities) as Array<{ limit: number; assigned: number; remaining: number }>;
    return capacityValues.some(
      (cap) => cap.assigned > cap.limit
    );
  };

  // Filter and sort employees
  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = employees;

    // Apply filter
    if (activeFilter !== 'all') {
      switch (activeFilter) {
        case 'pflege':
          filtered = filtered.filter((emp: Employee) => 
            emp.function === 'Pflegekraft' || emp.function === 'PDL'
          );
          break;
        case 'arzt':
          filtered = filtered.filter((emp: Employee) => 
            emp.function === 'Arzt' || emp.function === 'Honorararzt'
          );
          break;
      }
    }

    // Sort employees like in UserSelectSheet.tsx
    const getGroupOrder = (employee: Employee) => {
      const area = employee.area?.toLowerCase() || '';
      if (employee.function === 'Pflegekraft') {
        if (area.includes('nord')) return 1; // Pflege Nord
        if (area.includes('süd')) return 2; // Pflege Süd
        return 3; // Other Pflegekräfte without area
      }
      if (employee.function === 'PDL') return 4;
      if (employee.function === 'Arzt') return 5;
      if (employee.function === 'Honorararzt') return 6;
      return 999;
    };

    return [...filtered].sort((a, b) => {
      // First: Sort by exceeded capacity (exceeded first)
      const aExceeded = hasExceededCapacity(a);
      const bExceeded = hasExceededCapacity(b);
      if (aExceeded !== bExceeded) {
        return aExceeded ? -1 : 1; // Exceeded comes first
      }

      // Then: Sort by group order
      const orderDiff = getGroupOrder(a) - getGroupOrder(b);
      if (orderDiff !== 0) {
        return orderDiff;
      }

      // Finally: Sort alphabetically
      const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
      const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [employees, activeFilter, capacitiesMap]);

  return (
    <Box
      sx={{
        mt: 4,
        pt: 4,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            fontSize: '1.125rem',
          }}
        >
          Kapazitätsübersicht
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: '0.875rem',
          }}
        >
          {formatMonthYear(currentDate)}
        </Typography>
      </Box>

      {/* Filter Chips */}
      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Chip
          label="Alle"
          onClick={() => setActiveFilter('all')}
          color={activeFilter === 'all' ? 'primary' : 'default'}
          variant={activeFilter === 'all' ? 'filled' : 'outlined'}
          sx={{
            fontWeight: activeFilter === 'all' ? 600 : 400,
          }}
        />
        <Chip
          label="Pflege"
          onClick={() => setActiveFilter('pflege')}
          color={activeFilter === 'pflege' ? 'primary' : 'default'}
          variant={activeFilter === 'pflege' ? 'filled' : 'outlined'}
          sx={{
            fontWeight: activeFilter === 'pflege' ? 600 : 400,
            bgcolor: activeFilter === 'pflege' ? employeeTypeColors.default : undefined,
            color: activeFilter === 'pflege' ? 'white' : undefined,
            '&:hover': {
              bgcolor: activeFilter === 'pflege' ? employeeTypeColors.default : undefined,
            },
          }}
        />
        <Chip
          label="Ärzte"
          onClick={() => setActiveFilter('arzt')}
          color={activeFilter === 'arzt' ? 'primary' : 'default'}
          variant={activeFilter === 'arzt' ? 'filled' : 'outlined'}
          sx={{
            fontWeight: activeFilter === 'arzt' ? 600 : 400,
            bgcolor: activeFilter === 'arzt' ? employeeTypeColors.Arzt : undefined,
            color: activeFilter === 'arzt' ? 'white' : undefined,
            '&:hover': {
              bgcolor: activeFilter === 'arzt' ? employeeTypeColors.Arzt : undefined,
            },
          }}
        />
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 2,
          }}
        >
          {filteredAndSortedEmployees.map((employee) => (
            <EmployeeCapacityCard
              key={employee.id}
              employee={employee}
              capacity={capacitiesMap.get(employee.id || 0)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

