import React, { useMemo, useState, useCallback } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Employee, OnCallAssignment, DutyType, OnCallArea } from '../../../types/models';
import { EmployeeTableRow } from './EmployeeTableRow';
import { EmployeeDutyDialog } from './EmployeeDutyDialog';
import { DemandRow } from './DemandRow';
import { formatDate, isWeekend } from '../../../utils/oncall/dateUtils';
import { WEEK_DAYS } from '../../../utils/oncall/constants';

interface EmployeeTableProps {
  employees: Employee[];
  dates: Date[];
  assignments: OnCallAssignment[];
  viewMode: 'month' | 'week';
  onCreateAssignment: (data: {
    employee_id: number;
    date: string;
    duty_type: DutyType;
    area?: OnCallArea;
  }) => Promise<void>;
  onUpdateAssignment: (data: {
    id: number;
    assignmentData: { employee_id: number };
  }) => Promise<void>;
  onDeleteAssignment: (id: number) => Promise<void>;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  dates,
  assignments,
  viewMode,
  onCreateAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState<'all' | 'pflege_n' | 'pflege_s' | 'arzt'>('all');

  // Filter employees based on filter selection
  const filteredEmployees = useMemo(() => {
    let base = employees;

    // Apply employee filter
    if (employeeFilter === 'pflege_n') {
      base = base.filter(
        (employee) =>
          (employee.function === 'Pflegekraft' || employee.function === 'PDL') &&
          employee.area?.includes('Nordkreis')
      );
    }

    if (employeeFilter === 'pflege_s') {
      base = base.filter(
        (employee) =>
          (employee.function === 'Pflegekraft' || employee.function === 'PDL') &&
          employee.area?.includes('Südkreis')
      );
    }

    if (employeeFilter === 'arzt') {
      base = base.filter(
        (employee) =>
          employee.function === 'Arzt' || employee.function === 'Honorararzt'
      );
    }

    return base;
  }, [employees, employeeFilter]);

  // Sort employees: first by function, then by area (Nord/Süd), then alphabetically
  const sortedEmployees = useMemo(() => {
    const functionPriority: Record<string, number> = {
      'Pflegekraft': 1,
      'PDL': 2,
      'Physiotherapie': 3,
      'Arzt': 4,
      'Honorararzt': 5,
    };

    return [...filteredEmployees].sort((a, b) => {
      // First sort by function priority
      const aPriority = functionPriority[a.function] || 999;
      const bPriority = functionPriority[b.function] || 999;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Then sort by area (Nordkreis first, then Südkreis)
      const getAreaOrder = (area?: string) => {
        if (!area) return 2;
        if (area.includes('Nordkreis')) return 0;
        if (area.includes('Südkreis')) return 1;
        return 2;
      };
      
      const areaOrderA = getAreaOrder(a.area);
      const areaOrderB = getAreaOrder(b.area);
      
      if (areaOrderA !== areaOrderB) {
        return areaOrderA - areaOrderB;
      }
      
      // Finally sort alphabetically by last name, then first name
      const aName = `${a.last_name} ${a.first_name}`.toLowerCase();
      const bName = `${b.last_name} ${b.first_name}`.toLowerCase();
      
      return aName.localeCompare(bName);
    });
  }, [filteredEmployees]);

  const handleCellClick = useCallback((employee: Employee, date: Date) => {
    setSelectedEmployee(employee);
    setSelectedDate(date);
    setDialogOpen(true);
  }, []);

  const handleDutyToggle = useCallback(
    async (dutyType: DutyType, area?: OnCallArea) => {
      if (!selectedEmployee || !selectedDate) return;

      const dateStr = formatDate(selectedDate);
      
      // Find existing assignment for this employee, date, and duty
      const existing = assignments.find(
        (a) =>
          a.employee_id === selectedEmployee.id &&
          a.date === dateStr &&
          a.duty_type === dutyType &&
          a.area === area
      );

      if (existing?.id) {
        // Delete assignment
        await onDeleteAssignment(existing.id);
      } else {
        // Create new assignment
        await onCreateAssignment({
          employee_id: selectedEmployee.id as number,
          date: dateStr,
          duty_type: dutyType,
          area,
        });
      }
    },
    [selectedEmployee, selectedDate, assignments, onCreateAssignment, onDeleteAssignment]
  );

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedEmployee(null);
    setSelectedDate(null);
  }, []);

  // Get assignments for selected employee and date
  const selectedAssignments = useMemo(() => {
    if (!selectedEmployee || !selectedDate) return [];
    const dateStr = formatDate(selectedDate);
    return assignments.filter(
      (a) => a.employee_id === selectedEmployee.id && a.date === dateStr
    );
  }, [selectedEmployee, selectedDate, assignments]);

  // Calculate grid columns based on number of dates
  // Use 1fr for all columns to distribute space evenly, with fixed employee column
  const employeeColumnWidth = viewMode === 'month' ? 180 : 250;
  const gridTemplateColumns = `${employeeColumnWidth}px repeat(${dates.length}, 1fr)`;
  
  // Calculate sticky top position for demand row (below header)
  // Same spacing for both views
  const demandRowStickyTop = 60;

  return (
    <Box 
      sx={{ 
        width: '100%',
        maxWidth: '100%',
        overflowX: 'auto',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns,
          position: 'sticky',
          top: 0,
          backgroundColor: 'background.paper',
          zIndex: 2,
          minWidth: 'fit-content',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Employee column header */}
        <Box
          sx={{
            px: viewMode === 'month' ? 1 : 1.5,
            py: 1,
            position: 'sticky',
            left: 0,
            backgroundColor: 'background.paper',
            zIndex: 3,
            borderRight: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
              textTransform: 'uppercase',
              fontSize: viewMode === 'month' ? '0.7rem' : '0.75rem',
              letterSpacing: '0.05em',
              mb: 1,
            }}
          >
            Mitarbeiter
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label="Alle"
              size="small"
              clickable
              color={employeeFilter === 'all' ? 'primary' : 'default'}
              variant={employeeFilter === 'all' ? 'filled' : 'outlined'}
              onClick={() => setEmployeeFilter('all')}
              sx={{
                fontSize: viewMode === 'month' ? '0.65rem' : '0.7rem',
                height: viewMode === 'month' ? 22 : 24,
              }}
            />
            <Chip
              label="Pflege N"
              size="small"
              clickable
              color={employeeFilter === 'pflege_n' ? 'primary' : 'default'}
              variant={employeeFilter === 'pflege_n' ? 'filled' : 'outlined'}
              onClick={() => setEmployeeFilter('pflege_n')}
              sx={{
                fontSize: viewMode === 'month' ? '0.65rem' : '0.7rem',
                height: viewMode === 'month' ? 22 : 24,
              }}
            />
            <Chip
              label="Pflege S"
              size="small"
              clickable
              color={employeeFilter === 'pflege_s' ? 'primary' : 'default'}
              variant={employeeFilter === 'pflege_s' ? 'filled' : 'outlined'}
              onClick={() => setEmployeeFilter('pflege_s')}
              sx={{
                fontSize: viewMode === 'month' ? '0.65rem' : '0.7rem',
                height: viewMode === 'month' ? 22 : 24,
              }}
            />
            <Chip
              label="Arzt"
              size="small"
              clickable
              color={employeeFilter === 'arzt' ? 'primary' : 'default'}
              variant={employeeFilter === 'arzt' ? 'filled' : 'outlined'}
              onClick={() => setEmployeeFilter('arzt')}
              sx={{
                fontSize: viewMode === 'month' ? '0.65rem' : '0.7rem',
                height: viewMode === 'month' ? 22 : 24,
              }}
            />
          </Box>
        </Box>

        {/* Date headers */}
        {dates.map((date, idx) => {
          // Convert JS Date.getDay() (0=Sunday, 1=Monday, ...) to WEEK_DAYS index (0=Monday, ...)
          const jsDay = date.getDay();
          const weekDayIndex = jsDay === 0 ? 6 : jsDay - 1;
          const dayOfWeek = WEEK_DAYS[weekDayIndex];
          const isWeekendDay = isWeekend(date);
          return (
            <Box
              key={date.toISOString()}
              sx={{
                textAlign: 'center',
                py: viewMode === 'month' ? 0.5 : 0.75,
                px: viewMode === 'month' ? 0.25 : 0.5,
                backgroundColor: isWeekendDay ? 'rgba(255, 152, 0, 0.08)' : 'transparent',
                borderRight: idx < dates.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontWeight: 600,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  fontSize: viewMode === 'month' ? '0.6rem' : '0.65rem',
                  letterSpacing: '0.05em',
                }}
              >
                {dayOfWeek}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  fontSize: viewMode === 'month' ? '0.75rem' : '0.8rem',
                  mt: 0.25,
                }}
              >
                {date.getDate()}.{date.getMonth() + 1}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Bedarfszeile */}
      <DemandRow
        dates={dates}
        assignments={assignments}
        viewMode={viewMode}
        gridTemplateColumns={gridTemplateColumns}
        employeeColumnWidth={employeeColumnWidth}
        stickyTop={demandRowStickyTop}
      />

      {/* Table rows */}
      <Box>
        {sortedEmployees.map((employee) => (
          <EmployeeTableRow
            key={employee.id}
            employee={employee}
            dates={dates}
            assignments={assignments}
            onCellClick={(date) => handleCellClick(employee, date)}
          />
        ))}
      </Box>

      {/* Dialog */}
      <EmployeeDutyDialog
        open={dialogOpen}
        employee={selectedEmployee}
        date={selectedDate}
        assignments={selectedAssignments}
        onClose={handleDialogClose}
        onDutyToggle={handleDutyToggle}
      />
    </Box>
  );
};

