import React, { useMemo } from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { Employee, Assignment, EmployeeCapacity } from '../../../types/models';
import { EmployeeTableCell } from './EmployeeTableCell';
import { employeeTypeColors } from '../../../utils/colors';
import { isWeekend } from '../../../utils/oncall/dateUtils';

interface EmployeeTableRowProps {
  employee: Employee;
  dates: Date[];
  assignments: Assignment[];
  employeeCapacities?: EmployeeCapacity[];
  onCellClick: (date: Date) => void;
}

// Kurzbezeichnungen für Kapazitätstypen in der Tabelle (Wochentag nur RB, Ärzte ohne Umlaut)
const CAPACITY_TYPE_ABBR: Record<string, string> = {
  'RB_NURSING_WEEKDAY': 'RB',
  'RB_NURSING_WEEKEND': 'RB-WE',
  'RB_DOCTORS_WEEKDAY': 'RB-A',
  'RB_DOCTORS_WEEKEND': 'RB-A WE',
  'AW_NURSING': 'AW',
};

export const EmployeeTableRow: React.FC<EmployeeTableRowProps> = ({
  employee,
  dates,
  assignments,
  employeeCapacities,
  onCellClick,
}) => {
  const getFunctionInfo = (functionName: string) => {
    const functionMap: Record<string, { name: string; color: string }> = {
      'Arzt': {
        name: 'Arzt',
        color: employeeTypeColors['Arzt'] || employeeTypeColors['default'],
      },
      'Honorararzt': {
        name: 'Honorararzt',
        color: employeeTypeColors['Honorararzt'] || employeeTypeColors['default'],
      },
      'Pflegekraft': {
        name: 'Pflegekraft',
        color: employeeTypeColors['default'],
      },
      'PDL': {
        name: 'PDL',
        color: employeeTypeColors['default'],
      },
    };
    return functionMap[functionName] || {
      name: functionName,
      color: employeeTypeColors['default'],
    };
  };

  const functionInfo = getFunctionInfo(employee.function);

  // Kapazitäten dieses Mitarbeiters (wie in EmployeeCapacityCard: nur anzeigen wenn max_count > 0 oder assigned > 0)
  const activeCapacities = useMemo(() => {
    if (!employeeCapacities?.length || !employee.id) return [];
    return employeeCapacities.filter(
      (cap) => cap.employee_id === employee.id && (cap.max_count > 0 || (cap.assigned ?? 0) > 0)
    );
  }, [employeeCapacities, employee.id]);

  // Farbe für Kapazitäts-Chip wie in EmployeeCapacityCard: primary / success / error
  const getCapacityColor = (cap: EmployeeCapacity): 'primary' | 'success' | 'error' => {
    const assigned = cap.assigned ?? 0;
    const isOverCapacity = assigned > cap.max_count || (cap.max_count === 0 && assigned > 0);
    const isAtLimit = !isOverCapacity && cap.max_count > 0 && assigned === cap.max_count;
    return isOverCapacity ? 'error' : isAtLimit ? 'success' : 'primary';
  };

  // Calculate grid columns based on number of dates to match header
  // Use 1fr for all columns to distribute space evenly, matching the header
  const isMonthView = dates.length > 15;
  const employeeColumnWidth = isMonthView ? 180 : 250;
  const gridTemplateColumns = `${employeeColumnWidth}px repeat(${dates.length}, 1fr)`;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns,
        minWidth: 'fit-content',
        borderBottom: '1px solid',
        borderColor: 'divider',
        alignItems: 'stretch',
        backgroundColor: 'background.paper',
        '&:hover': {
          backgroundColor: 'action.hover',
          '& > div:first-of-type': {
            backgroundColor: 'rgb(245, 245, 245)',
          },
        },
        '&:last-of-type': {
          borderBottom: 'none',
        },
      }}
    >
      {/* Employee info column – sticky links, fester Hintergrund damit kein weißer Streifen neben Demand Row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: isMonthView ? 1 : 1.5,
          px: isMonthView ? 1 : 1.5,
          py: isMonthView ? 0.5 : 1,
          position: 'sticky',
          left: 0,
          backgroundColor: 'background.paper',
          zIndex: 1,
          borderRight: '1px solid',
          borderColor: 'divider',
          boxShadow: '2px 0 4px rgba(0,0,0,0.06)',
          minWidth: employeeColumnWidth,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Tooltip
            title={`${employee.first_name ?? ''} ${employee.last_name}`.trim()}
            placement="top"
            enterDelay={300}
            arrow
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: isMonthView ? '0.8rem' : '0.875rem',
                cursor: 'default',
              }}
            >
              {employee.first_name ? `${employee.first_name.charAt(0)}.` : ''} {employee.last_name}
            </Typography>
          </Tooltip>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
            {employee.area && (
              <Chip
                label={employee.area.includes('Nordkreis') ? 'N' : 'S'}
                size="small"
                sx={{
                  bgcolor: employee.area.includes('Nordkreis') ? 'primary.main' : 'secondary.main',
                  color: 'white',
                  fontSize: isMonthView ? '0.6rem' : '0.65rem',
                  height: isMonthView ? 16 : 18,
                  fontWeight: 600,
                  '& .MuiChip-label': {
                    px: 0.5,
                  },
                }}
              />
            )}
            <Chip
              label={functionInfo.name}
              size="small"
              sx={{
                bgcolor: functionInfo.color,
                color: 'white',
                fontSize: isMonthView ? '0.6rem' : '0.65rem',
                height: isMonthView ? 16 : 18,
                fontWeight: 500,
                '& .MuiChip-label': {
                  px: 0.5,
                },
              }}
            />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, flexShrink: 0 }}>
          {activeCapacities.slice(0, 3).map((cap) => {
            const assigned = cap.assigned ?? 0;
            const label = `${CAPACITY_TYPE_ABBR[cap.capacity_type] ?? cap.capacity_type} ${assigned}/${cap.max_count}`;
            return (
              <Chip
                key={cap.id}
                label={label}
                size="small"
                color={getCapacityColor(cap)}
                sx={{
                  width: 72,
                  minWidth: 72,
                  fontSize: isMonthView ? '0.55rem' : '0.6rem',
                  height: isMonthView ? 16 : 18,
                  fontWeight: 600,
                  '& .MuiChip-label': {
                  px: 0.5,
                  justifyContent: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
                }}
              />
            );
          })}
        </Box>
      </Box>

      {/* Date cells */}
      {dates.map((date, idx) => {
        const isWeekendDay = isWeekend(date);
        return (
          <Box
            key={date.toISOString()}
            sx={{
              borderRight: idx < dates.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'stretch',
              px: isMonthView ? 0.25 : 0.5,
              py: isMonthView ? 0.5 : 1,
              position: 'relative',
              backgroundColor: isWeekendDay ? 'rgba(255, 152, 0, 0.08)' : 'transparent',
              minWidth: 0,
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <EmployeeTableCell
              date={date}
              employeeId={employee.id as number}
              assignments={assignments}
              onClick={() => onCellClick(date)}
            />
          </Box>
        );
      })}
    </Box>
  );
};

