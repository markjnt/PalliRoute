import React from 'react';
import { Box, Typography, Chip, Avatar } from '@mui/material';
import { Employee, Assignment } from '../../../types/models';
import { EmployeeTableCell } from './EmployeeTableCell';
import { employeeTypeColors } from '../../../utils/colors';
import { isWeekend } from '../../../utils/oncall/dateUtils';

interface EmployeeTableRowProps {
  employee: Employee;
  dates: Date[];
  assignments: Assignment[];
  onCellClick: (date: Date) => void;
}

export const EmployeeTableRow: React.FC<EmployeeTableRowProps> = ({
  employee,
  dates,
  assignments,
  onCellClick,
}) => {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

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
      {/* Employee info column */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: isMonthView ? 1 : 1.5,
          px: isMonthView ? 1 : 1.5,
          py: isMonthView ? 0.5 : 1,
          position: 'sticky',
          left: 0,
          backgroundColor: 'background.paper',
          zIndex: 1,
          borderRight: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Avatar
          sx={{
            width: isMonthView ? 32 : 36,
            height: isMonthView ? 32 : 36,
            bgcolor: functionInfo.color,
            color: 'white',
            fontSize: isMonthView ? '0.75rem' : '0.875rem',
            fontWeight: 600,
          }}
        >
          {getInitials(employee.first_name, employee.last_name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: isMonthView ? '0.8rem' : '0.875rem',
            }}
          >
            {employee.first_name} {employee.last_name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
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

