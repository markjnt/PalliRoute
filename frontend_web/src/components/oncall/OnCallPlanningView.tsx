import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Grid,
  Chip,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Card,
  CardContent,
  Badge,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useOnCallPlanningStore } from '../../stores/useOnCallPlanningStore';
import { useOnCallAssignments, useCreateOnCallAssignment, useUpdateOnCallAssignment, useDeleteOnCallAssignment } from '../../services/queries/useOnCallAssignments';
import { useEmployees } from '../../services/queries/useEmployees';
import { useEmployeeCapacity } from '../../services/queries/useOnCallAssignments';
import { OnCallAssignment, DutyType, OnCallArea, Employee } from '../../types/models';
import { OnCallAssignmentsQueryParams } from '../../services/api/oncallAssignments';

// Duty type definitions
const WEEKDAY_DUTIES: Array<{ type: DutyType; label: string; area: OnCallArea; shortLabel: string }> = [
  { type: 'rb_nursing_weekday', label: 'RB Nord Pflege', area: 'Nord', shortLabel: 'RB N Pflege' },
  { type: 'rb_nursing_weekday', label: 'RB Süd Pflege', area: 'Süd', shortLabel: 'RB S Pflege' },
  { type: 'rb_doctors_weekday', label: 'RB Nord Ärzte', area: 'Nord', shortLabel: 'RB N Ärzte' },
  { type: 'rb_doctors_weekday', label: 'RB Süd Ärzte', area: 'Süd', shortLabel: 'RB S Ärzte' },
];

const WEEKEND_DUTIES: Array<{ type: DutyType; label: string; area?: OnCallArea; shortLabel: string }> = [
  { type: 'aw_nursing', label: 'AW Nord', area: 'Nord', shortLabel: 'AW N' },
  { type: 'aw_nursing', label: 'AW Mitte', area: 'Mitte', shortLabel: 'AW M' },
  { type: 'aw_nursing', label: 'AW Süd', area: 'Süd', shortLabel: 'AW S' },
  { type: 'rb_nursing_weekend_day', label: 'RB Nord Tag Pflege', area: 'Nord', shortLabel: 'RB N Tag' },
  { type: 'rb_nursing_weekend_night', label: 'RB Nord Nacht Pflege', area: 'Nord', shortLabel: 'RB N Nacht' },
  { type: 'rb_nursing_weekend_day', label: 'RB Süd Tag Pflege', area: 'Süd', shortLabel: 'RB S Tag' },
  { type: 'rb_nursing_weekend_night', label: 'RB Süd Nacht Pflege', area: 'Süd', shortLabel: 'RB S Nacht' },
  { type: 'rb_doctors_weekend', label: 'RB Nord Ärzte', area: 'Nord', shortLabel: 'RB N Ärzte' },
  { type: 'rb_doctors_weekend', label: 'RB Süd Ärzte', area: 'Süd', shortLabel: 'RB S Ärzte' },
];

// Helper functions
const getCalendarDays = (date: Date): Array<Date | null> => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
  
  const days: Array<Date | null> = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }
  
  return days;
};

const getWeekDays = (date: Date): Date[] => {
  const days: Date[] = [];
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  startOfWeek.setDate(diff);
  
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(startOfWeek);
    currentDay.setDate(startOfWeek.getDate() + i);
    days.push(currentDay);
  }
  
  return days;
};

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatMonthYear = (date: Date): string => {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
};

const formatWeekRange = (dates: Date[]): string => {
  if (dates.length === 0) return '';
  const start = dates[0];
  const end = dates[dates.length - 1];
  return `${start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
};

const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

const getCapacityColor = (remaining: number, limit: number): 'success' | 'warning' | 'error' => {
  if (limit === 0) return 'success';
  const percentage = (remaining / limit) * 100;
  if (percentage >= 50) return 'success';
  if (percentage >= 25) return 'warning';
  return 'error';
};

const getDutyColor = (dutyType: DutyType): string => {
  if (dutyType.includes('aw_nursing')) return '#4caf50';
  if (dutyType.includes('nursing')) return '#2196f3';
  if (dutyType.includes('doctors')) return '#ff9800';
  return '#9e9e9e';
};

export const OnCallPlanningView: React.FC = () => {
  const { viewMode, currentDate, setViewMode, goToPrevious, goToNext, goToToday } = useOnCallPlanningStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDuty, setSelectedDuty] = useState<{ type: DutyType; area?: OnCallArea } | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  
  // Get dates to display
  const displayDates = useMemo(() => {
    if (viewMode === 'month') {
      return getCalendarDays(currentDate);
    } else {
      return getWeekDays(currentDate);
    }
  }, [viewMode, currentDate]);
  
  // Get actual dates (filter out nulls)
  const actualDates = useMemo(() => {
    const dates = displayDates.filter((d): d is Date => d !== null);
    if (dates.length === 0) return { dates: [], startDate: '', endDate: '' };
    const startDate = formatDate(dates[0]);
    const endDate = formatDate(dates[dates.length - 1]);
    return { dates, startDate, endDate };
  }, [displayDates]);
  
  // Build query params
  const queryParams: OnCallAssignmentsQueryParams = useMemo(() => {
    if (!actualDates.startDate || !actualDates.endDate) return {};
    return { start_date: actualDates.startDate, end_date: actualDates.endDate };
  }, [actualDates]);
  
  // Fetch data
  const { data: assignments = [], isLoading: assignmentsLoading } = useOnCallAssignments(queryParams);
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  const createAssignment = useCreateOnCallAssignment();
  const updateAssignment = useUpdateOnCallAssignment();
  const deleteAssignment = useDeleteOnCallAssignment();
  
  // Create a map of assignments by date and duty
  const assignmentsMap = useMemo(() => {
    const map = new Map<string, OnCallAssignment>();
    assignments.forEach(assignment => {
      const key = `${assignment.date}_${assignment.duty_type}_${assignment.area || ''}`;
      map.set(key, assignment);
    });
    return map;
  }, [assignments]);
  
  // Get assignments for a specific date
  const getDateAssignments = useCallback((date: Date) => {
    const dateStr = formatDate(date);
    const isWeekendDay = isWeekend(date);
    const duties = isWeekendDay ? WEEKEND_DUTIES : WEEKDAY_DUTIES;
    
    return duties.map(duty => {
      const key = `${dateStr}_${duty.type}_${duty.area || ''}`;
      const assignment = assignmentsMap.get(key);
      return { duty, assignment };
    });
  }, [assignmentsMap]);
  
  // Get assignment for a specific date, duty type, and area
  const getAssignment = useCallback((date: Date, dutyType: DutyType, area?: OnCallArea): OnCallAssignment | undefined => {
    const key = `${formatDate(date)}_${dutyType}_${area || ''}`;
    return assignmentsMap.get(key);
  }, [assignmentsMap]);
  
  // Filter employees by function and area
  const getAvailableEmployees = useCallback((dutyType: DutyType, area?: OnCallArea): Employee[] => {
    return employees.filter(emp => {
      // Check function
      if (dutyType.includes('doctors')) {
        if (emp.function !== 'Arzt' && emp.function !== 'Honorararzt') return false;
      } else {
        if (emp.function === 'Arzt' || emp.function === 'Honorararzt') return false;
      }
      
      // Check area
      if (area) {
        if (emp.area === 'Nord- und Südkreis') return true;
        if (area === 'Nord' && emp.area?.includes('Nord')) return true;
        if (area === 'Süd' && emp.area?.includes('Süd')) return true;
        if (area === 'Mitte' && emp.area?.includes('Mitte')) return true;
        return false;
      }
      
      return true;
    });
  }, [employees]);
  
  // Handle day click
  const handleDayClick = useCallback((date: Date, duty: { type: DutyType; area?: OnCallArea }) => {
    setSelectedDate(date);
    setSelectedDuty(duty);
    setAssignmentDialogOpen(true);
  }, []);
  
  // Handle employee selection
  const handleEmployeeChange = useCallback(async (employeeId: number | '') => {
    if (!selectedDate || !selectedDuty) return;
    
    const dateStr = formatDate(selectedDate);
    const existing = getAssignment(selectedDate, selectedDuty.type, selectedDuty.area);
    
    if (employeeId === '') {
      // Delete assignment
      if (existing?.id) {
        await deleteAssignment.mutateAsync(existing.id);
      }
    } else {
      if (existing?.id) {
        // Update existing
        await updateAssignment.mutateAsync({
          id: existing.id,
          assignmentData: { employee_id: employeeId as number }
        });
      } else {
        // Create new
        await createAssignment.mutateAsync({
          employee_id: employeeId as number,
          date: dateStr,
          duty_type: selectedDuty.type,
          area: selectedDuty.area
        });
      }
    }
    
    setAssignmentDialogOpen(false);
    setSelectedDate(null);
    setSelectedDuty(null);
  }, [selectedDate, selectedDuty, getAssignment, createAssignment, updateAssignment, deleteAssignment]);
  
  if (assignmentsLoading || employeesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  
  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Main Calendar View */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {/* Header */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h4" component="h1">
              Rufbereitschaft & Wochenenddienste Planen
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, newMode) => newMode && setViewMode(newMode)}
                size="small"
              >
                <ToggleButton value="month">Monat</ToggleButton>
                <ToggleButton value="week">Woche</ToggleButton>
              </ToggleButtonGroup>
              
              <IconButton onClick={goToPrevious} size="small">
                <ChevronLeftIcon />
              </IconButton>
              
              <IconButton onClick={goToToday} size="small">
                <TodayIcon />
              </IconButton>
              
              <IconButton onClick={goToNext} size="small">
                <ChevronRightIcon />
              </IconButton>
              
              <Typography variant="body1" sx={{ minWidth: '200px', textAlign: 'center' }}>
                {viewMode === 'month' 
                  ? formatMonthYear(currentDate)
                  : formatWeekRange(actualDates.dates)}
              </Typography>
            </Box>
          </Box>
        </Paper>
        
        {/* Calendar Grid */}
        <Paper sx={{ p: 2 }}>
          {viewMode === 'month' ? (
            <Box>
              {/* Weekday headers */}
              <Box sx={{ display: 'flex', mb: 1 }}>
                {weekDays.map((day) => (
                  <Box key={day} sx={{ flex: 1, textAlign: 'center', fontWeight: 'bold', py: 1 }}>
                    {day}
                  </Box>
                ))}
              </Box>
              
              {/* Calendar days */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {displayDates.map((date, idx) => {
                  if (date === null) {
                    return <Box key={`empty-${idx}`} sx={{ flex: '0 0 calc(14.28% - 8px)' }} />;
                  }
                  
                  const dateAssignments = getDateAssignments(date);
                  const isWeekendDay = isWeekend(date);
                  const duties = isWeekendDay ? WEEKEND_DUTIES : WEEKDAY_DUTIES;
                  const filledCount = dateAssignments.filter(a => a.assignment).length;
                  const totalCount = duties.length;
                  
                  return (
                    <Box key={formatDate(date)} sx={{ flex: '0 0 calc(14.28% - 8px)' }}>
                      <Card
                      sx={{
                        width: '100%',
                        minHeight: '120px',
                        border: isToday(date) ? 2 : 1,
                        borderColor: isToday(date) ? 'primary.main' : 'divider',
                        backgroundColor: isWeekendDay ? 'action.hover' : 'background.paper',
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: 3,
                        },
                      }}
                      onClick={() => {
                        // Show dialog to select duty
                        setSelectedDate(date);
                        setAssignmentDialogOpen(true);
                      }}
                    >
                      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: isToday(date) ? 'bold' : 'normal',
                              color: isToday(date) ? 'primary.main' : 'text.primary',
                            }}
                          >
                            {date.getDate()}
                          </Typography>
                          <Badge badgeContent={filledCount} color="primary" max={totalCount}>
                            <AssignmentIcon fontSize="small" />
                          </Badge>
                        </Box>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {dateAssignments.slice(0, 3).map(({ duty, assignment }, dutyIdx) => (
                            <Chip
                              key={dutyIdx}
                              label={assignment?.employee ? 
                                `${duty.shortLabel}: ${assignment.employee.first_name} ${assignment.employee.last_name}` :
                                duty.shortLabel}
                              size="small"
                              sx={{
                                height: '20px',
                                fontSize: '0.65rem',
                                backgroundColor: assignment ? getDutyColor(duty.type) : 'grey.300',
                                color: assignment ? 'white' : 'text.secondary',
                                '&:hover': {
                                  opacity: 0.8,
                                },
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDayClick(date, duty);
                              }}
                            />
                          ))}
                          {dateAssignments.length > 3 && (
                            <Typography variant="caption" color="text.secondary">
                              +{dateAssignments.length - 3} weitere
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ) : (
            // Week view
            <Box>
              {actualDates.dates.map((date: Date) => {
                const dateAssignments = getDateAssignments(date);
                const isWeekendDay = isWeekend(date);
                const duties = isWeekendDay ? WEEKEND_DUTIES : WEEKDAY_DUTIES;
                
                return (
                  <Card key={formatDate(date)} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                          {date.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
                        </Typography>
                        <Chip
                          label={isWeekendDay ? 'Wochenende' : 'Wochentag'}
                          color={isWeekendDay ? 'secondary' : 'primary'}
                          size="small"
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {dateAssignments.map(({ duty, assignment }, idx) => (
                          <Box key={idx} sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '200px' }}>
                            <Paper
                              sx={{
                                width: '100%',
                                p: 2,
                                border: 1,
                                borderColor: assignment ? getDutyColor(duty.type) : 'divider',
                                backgroundColor: assignment ? `${getDutyColor(duty.type)}20` : 'background.paper',
                                cursor: 'pointer',
                                '&:hover': {
                                  boxShadow: 2,
                                },
                              }}
                              onClick={() => handleDayClick(date, duty)}
                            >
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                {duty.label}
                              </Typography>
                              {assignment?.employee ? (
                                <Typography variant="body2">
                                  {assignment.employee.first_name} {assignment.employee.last_name}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  Nicht zugewiesen
                                </Typography>
                              )}
                            </Paper>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </Paper>
      </Box>
      
      {/* Capacity Sidebar */}
      <Drawer
        variant="persistent"
        anchor="right"
        open={true}
        sx={{
          width: 400,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 400,
            boxSizing: 'border-box',
            position: 'relative',
          },
        }}
      >
        <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Kapazitätsübersicht
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Monat: {formatMonthYear(currentDate)}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {employees.map((employee) => (
            <EmployeeCapacityCard
              key={employee.id}
              employee={employee}
              month={currentDate.getMonth() + 1}
              year={currentDate.getFullYear()}
            />
          ))}
        </Box>
      </Drawer>
      
      {/* Assignment Dialog */}
      <Dialog
        open={assignmentDialogOpen}
        onClose={() => {
          setAssignmentDialogOpen(false);
          setSelectedDate(null);
          setSelectedDuty(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedDate && selectedDuty && (
            <>
              {selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              <br />
              <Typography variant="subtitle1" color="text.secondary">
                {WEEKDAY_DUTIES.find(d => d.type === selectedDuty.type && d.area === selectedDuty.area)?.label ||
                 WEEKEND_DUTIES.find(d => d.type === selectedDuty.type && d.area === selectedDuty.area)?.label}
              </Typography>
            </>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedDate && selectedDuty && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <Select
                value={getAssignment(selectedDate, selectedDuty.type, selectedDuty.area)?.employee_id || ''}
                onChange={(e) => handleEmployeeChange(e.target.value as number | '')}
                displayEmpty
              >
                <MenuItem value="">
                  <em>Keine Zuweisung</em>
                </MenuItem>
                {getAvailableEmployees(selectedDuty.type, selectedDuty.area).map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAssignmentDialogOpen(false);
            setSelectedDate(null);
            setSelectedDuty(null);
          }}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Component for displaying employee capacity
const EmployeeCapacityCard: React.FC<{ employee: Employee; month: number; year: number }> = ({ employee, month, year }) => {
  const { data: capacity } = useEmployeeCapacity(employee.id || 0, month, year);
  
  if (!capacity) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2">
          {employee.first_name} {employee.last_name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Lade Kapazität...
        </Typography>
      </Paper>
    );
  }
  
  const capacities = Object.entries(capacity.capacities).filter(([_, cap]) => cap.limit > 0);
  
  if (capacities.length === 0) {
    return null;
  }
  
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
        {employee.first_name} {employee.last_name}
      </Typography>
      
      {capacities.map(([key, cap]) => {
        const percentage = cap.limit > 0 ? (cap.assigned / cap.limit) * 100 : 0;
        const color = getCapacityColor(cap.remaining, cap.limit);
        
        return (
          <Box key={key} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {key.replace(/_/g, ' ').replace('rb ', 'RB ').replace('aw ', 'AW ')}
              </Typography>
              <Chip
                label={`${cap.assigned}/${cap.limit}`}
                color={color}
                size="small"
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(percentage, 100)}
              color={color === 'error' ? 'error' : color === 'warning' ? 'warning' : 'success'}
              sx={{ height: 8, borderRadius: 1 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Verbleibend: {cap.remaining}
            </Typography>
          </Box>
        );
      })}
    </Paper>
  );
};
