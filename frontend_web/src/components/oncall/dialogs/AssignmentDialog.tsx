import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
} from '@mui/icons-material';
import { DutyType, OnCallArea, Employee, OnCallAssignment, EmployeeCapacity } from '../../../types/models';
import { WEEKDAY_DUTIES, WEEKEND_DUTIES } from '../../../utils/oncall/constants';
import { getDutyColor } from '../../../utils/oncall/colorUtils';
import { employeeTypeColors } from '../../../utils/colors';

interface AssignmentDialogProps {
  open: boolean;
  selectedDate: Date | null;
  selectedDuty: { type: DutyType; area?: OnCallArea } | null;
  assignment: OnCallAssignment | undefined;
  availableEmployees: Employee[];
  allEmployeesCapacity?: { month: number; year: number; capacities: Record<number, EmployeeCapacity> };
  onClose: () => void;
  onEmployeeChange: (employeeId: number | '') => void;
}

export const AssignmentDialog: React.FC<AssignmentDialogProps> = ({
  open,
  selectedDate,
  selectedDuty,
  assignment,
  availableEmployees,
  allEmployeesCapacity,
  onClose,
  onEmployeeChange,
}) => {
  if (!selectedDate || !selectedDuty) return null;

  const dutyLabel =
    WEEKDAY_DUTIES.find((d) => d.type === selectedDuty.type && d.area === selectedDuty.area)?.label ||
    WEEKEND_DUTIES.find((d) => d.type === selectedDuty.type && d.area === selectedDuty.area)?.label ||
    '';

  // Get duty color for dialog styling
  const dutyColor = getDutyColor(selectedDuty.type, selectedDuty.area, !!assignment);

  // Filter and sort employees based on duty type
  const filteredEmployees = useMemo(() => {
    let filtered: Employee[] = [];
    
    if (selectedDuty.type.includes('doctors')) {
      // For doctor duties: only show doctors
      filtered = availableEmployees.filter(
        (emp) => emp.function === 'Arzt' || emp.function === 'Honorararzt'
      );
    } else {
      // For AW and nursing duties: only show Pflege and PDL
      filtered = availableEmployees.filter(
        (emp) => emp.function === 'Pflegekraft' || emp.function === 'PDL'
      );
    }

    // Sort employees: first by area (matching tour area first), then by function
    const targetArea = selectedDuty.area;
    
    return [...filtered].sort((a, b) => {
      // First: Sort by area (matching tour area first)
      const getAreaOrder = (area?: string) => {
        if (!area) return 3;
        // If tour is Mitte, prioritize Nord first
        if (targetArea === 'Mitte') {
          if (area.includes('Nordkreis')) return 0;
          if (area.includes('Südkreis')) return 1;
        } else {
          // For Nord/Süd tours, matching area first
          if (targetArea === 'Nord' && area.includes('Nordkreis')) return 0;
          if (targetArea === 'Süd' && area.includes('Südkreis')) return 0;
          if (targetArea === 'Nord' && area.includes('Südkreis')) return 1;
          if (targetArea === 'Süd' && area.includes('Nordkreis')) return 1;
        }
        return 2;
      };

      const areaOrderA = getAreaOrder(a.area);
      const areaOrderB = getAreaOrder(b.area);
      
      if (areaOrderA !== areaOrderB) {
        return areaOrderA - areaOrderB;
      }

      // Then: Sort by function (Pflege before PDL, Arzt before Honorararzt)
      const getFunctionOrder = (functionName: string) => {
        if (functionName === 'Pflegekraft') return 0;
        if (functionName === 'PDL') return 1;
        if (functionName === 'Arzt') return 0;
        if (functionName === 'Honorararzt') return 1;
        return 2;
      };

      const functionOrderA = getFunctionOrder(a.function);
      const functionOrderB = getFunctionOrder(b.function);
      
      if (functionOrderA !== functionOrderB) {
        return functionOrderA - functionOrderB;
      }

      // Finally: Sort alphabetically by last name, then first name
      const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
      const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [availableEmployees, selectedDuty.type, selectedDuty.area]);

  // Get remaining capacity for an employee for this duty type
  const getRemainingCapacity = (employeeId: number): number => {
    if (!allEmployeesCapacity || !allEmployeesCapacity.capacities) return -1;
    const capacity = allEmployeesCapacity.capacities[employeeId];
    if (!capacity?.capacities) return -1;
    
    // Für RB Pflege Wochenende Tag/Nacht wird eine gemeinsame Kapazität verwendet.
    let capacityKey: DutyType | 'rb_nursing_weekend' = selectedDuty.type;
    if (selectedDuty.type === 'rb_nursing_weekend_day' || selectedDuty.type === 'rb_nursing_weekend_night') {
      capacityKey = 'rb_nursing_weekend';
    }

    const dutyCapacity = capacity.capacities[capacityKey];
    return dutyCapacity?.remaining ?? -1;
  };

  // Get function info for chip
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleEmployeeSelect = (employeeId: number | '') => {
    onEmployeeChange(employeeId);
    onClose();
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
          border: `2px solid ${dutyColor}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 1,
          backgroundColor: dutyColor,
          color: 'text.primary',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
          {selectedDate.toLocaleDateString('de-DE', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 500, opacity: 0.9 }}>
          {dutyLabel}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 3 }}>
          {/* Option to remove assignment */}
          <Card
            onClick={() => handleEmployeeSelect('')}
            sx={{
              cursor: 'pointer',
              borderRadius: 2,
              border: assignment?.employee_id ? '1px solid' : '2px solid',
              borderColor: assignment?.employee_id ? 'divider' : 'text.disabled',
              backgroundColor: assignment?.employee_id ? 'background.paper' : 'action.hover',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 2,
              },
            }}
          >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                  Keine Zuweisung
                </Typography>
                {!assignment?.employee_id && (
                  <CheckCircleIcon sx={{ color: 'text.disabled' }} />
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Employee options */}
          {filteredEmployees.map((employee) => {
            const isSelected = assignment?.employee_id === employee.id;
            const remaining = getRemainingCapacity(employee.id || 0);
            // Show red if remaining is 0 or if no data available (remaining === -1)
            const hasNoCapacity = remaining === 0 || remaining === -1;
            const functionInfo = getFunctionInfo(employee.function);

            return (
              <Card
                key={employee.id}
                onClick={() => handleEmployeeSelect(employee.id as number)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 2,
                  border: isSelected ? '2px solid' : '1px solid',
                  borderColor: isSelected ? dutyColor : 'divider',
                  backgroundColor: isSelected
                    ? `${dutyColor}20`
                    : 'background.paper',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                    borderColor: isSelected ? dutyColor : dutyColor,
                  },
                }}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: isSelected ? dutyColor : '#f0f0f0',
                        color: isSelected ? 'text.primary' : '#666',
                        fontSize: '1rem',
                        fontWeight: 600,
                      }}
                    >
                      {getInitials(employee.first_name, employee.last_name)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 600,
                          mb: 0.5,
                        }}
                      >
                        {employee.first_name} {employee.last_name}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        {employee.area && (
                          <Chip
                            label={employee.area.includes('Nordkreis') ? 'N' : 'S'}
                            size="small"
                            sx={{
                              bgcolor: employee.area.includes('Nordkreis') ? 'primary.main' : 'secondary.main',
                              color: 'white',
                              fontSize: '0.7rem',
                              height: 20,
                              fontWeight: 'bold',
                              '& .MuiChip-label': {
                                px: 0.75,
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
                            fontSize: '0.7rem',
                            height: 20,
                            '& .MuiChip-label': {
                              px: 0.75,
                            },
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            color: hasNoCapacity ? 'error.main' : 'text.secondary',
                            fontWeight: hasNoCapacity ? 600 : 400,
                          }}
                        >
                          Verbleibend: {remaining >= 0 ? remaining : 0}
                        </Typography>
                      </Box>
                    </Box>
                    {isSelected ? (
                      <CheckCircleIcon sx={{ color: dutyColor }} />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ color: 'text.disabled' }} />
                    )}
                  </Box>
                </CardContent>
              </Card>
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
          Abbrechen
        </Button>
      </DialogActions>
    </Dialog>
  );
};
