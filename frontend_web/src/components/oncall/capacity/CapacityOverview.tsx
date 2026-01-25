import React, { useMemo } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Employee, EmployeeCapacity } from '../../../types/models';
import { EmployeeCapacityCard } from './EmployeeCapacityCard';

type FilterType = 'all' | 'pflege' | 'arzt';

interface CapacityOverviewProps {
  employees: Employee[];
  employeeCapacities: EmployeeCapacity[];
  currentDate: Date;
  activeFilter?: FilterType;
}

export const CapacityOverview: React.FC<CapacityOverviewProps> = ({ 
  employees, 
  employeeCapacities, 
  currentDate, 
  activeFilter = 'all' 
}) => {
  // Create a map of capacities by employee ID
  const capacitiesMap = useMemo(() => {
    const map = new Map<number, EmployeeCapacity[]>();
    employeeCapacities.forEach((capacity) => {
      const existing = map.get(capacity.employee_id) || [];
      map.set(capacity.employee_id, [...existing, capacity]);
    });
    return map;
  }, [employeeCapacities]);

  // Check if employee has exceeded capacity
  const hasExceededCapacity = (employee: Employee): boolean => {
    const capacities = capacitiesMap.get(employee.id || 0);
    if (!capacities || capacities.length === 0) return false;
    
    // Check if any capacity has assigned > max_count
    return capacities.some(cap => (cap.assigned ?? 0) > cap.max_count);
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
    <Box sx={{ pt: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2.5,
        }}
      >
        {filteredAndSortedEmployees.map((employee) => (
          <EmployeeCapacityCard
            key={employee.id}
            employee={employee}
            capacities={capacitiesMap.get(employee.id || 0) || []}
          />
        ))}
      </Box>
    </Box>
  );
};

