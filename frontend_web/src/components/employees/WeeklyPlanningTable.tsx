import React from 'react';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Typography,
    Avatar,
} from '@mui/material';
import { Employee } from '../../types/models';
import { getColorForTour } from '../../utils/colors';
import { getColorForEmployeeType } from '../../utils/mapUtils';
import { WeeklyPlanningCell } from './WeeklyPlanningCell';
import type { PlanningData } from './WeeklyPlanningCell';
import { useEmployeePlanning, useUpdateEmployeePlanning } from '../../services/queries/useEmployeePlanning';
import { usePlanningWeekStore } from '../../stores/usePlanningWeekStore';

interface WeeklyPlanningTableProps {
    employees: Employee[];
}

// Function to create avatar props using tour colors
const createTourAvatar = (employee: Employee) => {
    const tourColor = getColorForTour(employee.id);
    return {
        sx: {
            bgcolor: tourColor,
            width: 32,
            height: 32,
            fontSize: '0.875rem',
            color: 'white',
            fontWeight: 'bold',
        },
        children: `${employee.first_name[0]}${employee.last_name[0]}`.toUpperCase(),
    };
};

// Function to get function color based on employee type
const getFunctionColor = (functionName: string): string => {
    return getColorForEmployeeType(functionName);
};

const weekdays = [
    'Montag',
    'Dienstag', 
    'Mittwoch',
    'Donnerstag',
    'Freitag',
    'Samstag',
    'Sonntag'
];

export const WeeklyPlanningTable: React.FC<WeeklyPlanningTableProps> = ({
    employees,
}) => {
    // React Query hooks - planning week is automatically read from store
    const { data: planningEntries = [], isLoading } = useEmployeePlanning();
    const updatePlanningMutation = useUpdateEmployeePlanning();
    const { selectedPlanningWeek } = usePlanningWeekStore();
    
    // Check if planning week is selected
    const isPlanningWeekSelected = selectedPlanningWeek !== null;

    // Sort employees by function priority and then by name
    const sortedEmployees = React.useMemo(() => {
        const functionPriority: Record<string, number> = {
            'Pflegekraft': 1,
            'PDL': 2,
            'Physiotherapie': 3,
            'Arzt': 4,
            'Honorararzt': 5,
        };

        return [...employees].sort((a, b) => {
            // First sort by function priority
            const aPriority = functionPriority[a.function] || 999;
            const bPriority = functionPriority[b.function] || 999;
            
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            
            // Then sort by last name, then first name
            const aName = `${a.last_name} ${a.first_name}`.toLowerCase();
            const bName = `${b.last_name} ${b.first_name}`.toLowerCase();
            
            return aName.localeCompare(bName);
        });
    }, [employees]);

    const handleStatusChange = async (employeeId: number, weekday: string, data: PlanningData) => {
        try {
            await updatePlanningMutation.mutateAsync({
                employeeId,
                weekday,
                data: {
                    status: data.status,
                    custom_text: data.customText,
                }
            });
        } catch (error) {
            console.error('Error updating planning status:', error);
            // TODO: Show error notification to user
        }
    };

    // Get all planning entries as array
    const getAllPlanningData = (): any[] => {
        if (Array.isArray(planningEntries)) {
            return planningEntries;
        } else if (planningEntries && Array.isArray(planningEntries.data)) {
            return planningEntries.data;
        } else if (planningEntries && planningEntries.data) {
            return [planningEntries.data];
        }
        return [];
    };

    return (
        <Box sx={{ width: '100%', height: '100%', overflow: 'auto' }}>
            <TableContainer component={Paper} sx={{ height: '100%', maxHeight: 'none' }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell 
                                sx={{ 
                                    minWidth: 200, 
                                    position: 'sticky', 
                                    left: 0, 
                                    zIndex: 1,
                                    backgroundColor: 'background.paper',
                                    borderRight: 1,
                                    borderColor: 'divider'
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight="bold">
                                    Mitarbeiter
                                </Typography>
                            </TableCell>
                            {weekdays.map((day) => (
                                <TableCell 
                                    key={day}
                                    align="center"
                                    sx={{ 
                                        minWidth: 120,
                                        backgroundColor: 'background.paper'
                                    }}
                                >
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        {day}
                                    </Typography>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedEmployees.map((employee) => (
                            <TableRow 
                                key={employee.id} 
                                hover
                            >
                                {/* Mitarbeiter Spalte - Sticky */}
                                <TableCell 
                                    component="th" 
                                    scope="row"
                                    sx={{ 
                                        position: 'sticky', 
                                        left: 0, 
                                        zIndex: 1,
                                        backgroundColor: 'background.paper',
                                        borderRight: 1,
                                        borderColor: 'divider'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar {...createTourAvatar(employee)} />
                                        <Box>
                                            <Typography variant="body2" fontWeight="medium">
                                                {employee.first_name} {employee.last_name}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                                {employee.function && (
                                                    <Chip
                                                        label={employee.function}
                                                        size="small"
                                                        sx={{
                                                            backgroundColor: getFunctionColor(employee.function),
                                                            color: 'white',
                                                            fontWeight: 'medium'
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>
                                </TableCell>
                                
                                {/* Wochentage Spalten */}
                                {weekdays.map((day) => (
                                    <TableCell 
                                        key={day}
                                        align="center"
                                        sx={{ 
                                            minWidth: 120,
                                            borderLeft: 1,
                                            borderColor: 'divider'
                                        }}
                                    >
                                        <WeeklyPlanningCell
                                            employeeId={employee.id || 0}
                                            weekday={day}
                                            allPlanningData={getAllPlanningData()}
                                            onStatusChange={handleStatusChange}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};
