import React, { useState, useMemo } from 'react';
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
  CircularProgress,
  Chip,
} from '@mui/material';
import { PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { ShiftInstance, Employee, ShiftDefinition, EmployeeCapacity, DutyType, OnCallArea } from '../../../types/models';
import { WEEKDAY_DUTIES, WEEKEND_DUTIES } from '../../../utils/oncall/constants';
import { shiftDefinitionToDutyType } from '../../../utils/oncall/shiftMapping';
import { getDutyColor } from '../../../utils/oncall/colorUtils';
import { AssignmentDialog } from './AssignmentDialog';

function getShiftLabel(shiftDef: ShiftDefinition): string {
  const mapping = shiftDefinitionToDutyType(shiftDef);
  if (!mapping) return `${shiftDef.category} ${shiftDef.role} ${shiftDef.area}`;
  const label =
    WEEKDAY_DUTIES.find((d) => d.type === mapping.dutyType && d.area === mapping.area)?.label ??
    WEEKEND_DUTIES.find((d) => d.type === mapping.dutyType && d.area === mapping.area)?.label;
  return label ?? `${shiftDef.category} ${shiftDef.role} ${shiftDef.area}`;
}

interface UnplannedShiftsDialogProps {
  open: boolean;
  onClose: () => void;
  unplannedShifts: ShiftInstance[];
  isLoadingUnplanned: boolean;
  employees: Employee[];
  employeeCapacities?: EmployeeCapacity[];
  shiftDefinitions: ShiftDefinition[];
  onAssign: (shiftInstanceId: number, employeeId: number) => Promise<void>;
  monthLabel: string;
}

export const UnplannedShiftsDialog: React.FC<UnplannedShiftsDialogProps> = ({
  open,
  onClose,
  unplannedShifts,
  isLoadingUnplanned,
  employees,
  employeeCapacities = [],
  shiftDefinitions,
  onAssign,
  monthLabel,
}) => {
  const [selectedShift, setSelectedShift] = useState<ShiftInstance | null>(null);

  const handleEmployeeChange = (employeeId: number | '') => {
    if (selectedShift && typeof employeeId === 'number') {
      onAssign(selectedShift.id, employeeId);
    }
    setSelectedShift(null);
  };

  const dutyMapping = selectedShift?.shift_definition
    ? shiftDefinitionToDutyType(selectedShift.shift_definition)
    : null;
  
  const selectedDuty = dutyMapping
    ? { type: dutyMapping.dutyType, area: dutyMapping.area }
    : null;

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, ShiftInstance[]>();
    unplannedShifts.forEach((shift) => {
      const dateKey = shift.date; // ISO date string YYYY-MM-DD
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(shift);
    });
    // Sort dates chronologically
    const sortedDates = Array.from(map.keys()).sort();
    return { map, sortedDates };
  }, [unplannedShifts]);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
      >
        <DialogTitle
          component="div"
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            py: 2.5,
            px: 3,
          }}
        >
          <Box component="h2" sx={{ fontSize: '1.25rem', fontWeight: 600, m: 0, mb: 0.5 }}>
            Noch nicht verplante Schichten
          </Box>
          <Typography variant="body2" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
            {monthLabel} · {unplannedShifts.length} Schicht{unplannedShifts.length !== 1 ? 'en' : ''} ohne Zuweisung
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2 }}>
          {isLoadingUnplanned ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : unplannedShifts.length === 0 ? (
            <Box
              sx={{
                py: 6,
                px: 2,
                textAlign: 'center',
                backgroundColor: 'action.hover',
                borderRadius: 2,
              }}
            >
              <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                Alle Schichten dieses Monats sind verplant.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
              {shiftsByDate.sortedDates.map((dateKey) => {
                const shifts = shiftsByDate.map.get(dateKey);
                if (!shifts?.length) return null;
                const date = new Date(dateKey);
                const dateLabel = date.toLocaleDateString('de-DE', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                });

                return (
                  <Box key={dateKey}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        mb: 1,
                        px: 0.5,
                      }}
                    >
                      {dateLabel}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {shifts.map((shift) => {
                        const shiftDef = shift.shift_definition;
                        if (!shiftDef) return null;
                        const label = getShiftLabel(shiftDef);

                        const dutyMapping = shiftDefinitionToDutyType(shiftDef);
                        const dutyColor = dutyMapping
                          ? getDutyColor(dutyMapping.dutyType as DutyType, dutyMapping.area as OnCallArea, false)
                          : '#9e9e9e';

                        return (
                          <Card
                            key={shift.id}
                            onClick={() => setSelectedShift(shift)}
                            sx={{
                              cursor: 'pointer',
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: 'divider',
                              backgroundColor: 'background.paper',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: 2,
                              },
                            }}
                          >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                                  <Chip
                                    label={label}
                                    size="small"
                                    sx={{
                                      bgcolor: dutyColor,
                                      color: 'text.primary',
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      height: 24,
                                    }}
                                  />
                                </Box>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    color: 'primary.main',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  <PersonAddIcon sx={{ fontSize: 20 }} />
                                  Zuweisen
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
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

      {selectedShift && selectedDuty && selectedDuty.type && (
        <AssignmentDialog
          open={true}
          selectedDate={new Date(selectedShift.date)}
          selectedDuty={selectedDuty}
          assignment={undefined}
          availableEmployees={employees}
          employeeCapacities={employeeCapacities}
          shiftDefinitions={shiftDefinitions}
          onClose={() => setSelectedShift(null)}
          onEmployeeChange={handleEmployeeChange}
        />
      )}
    </>
  );
};
