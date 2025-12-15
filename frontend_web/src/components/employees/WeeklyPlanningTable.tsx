import React, { useState } from 'react';
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
import { useEmployeePlanning } from '../../services/queries/useEmployeePlanning';
import { usePlanningWeekStore } from '../../stores/usePlanningWeekStore';
import { useAreaStore } from '../../stores/useAreaStore';

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
    const [employeeFilter, setEmployeeFilter] = useState<'all' | 'pflege_n' | 'pflege_s' | 'arzt'>('all');
    // React Query hooks - planning week is automatically read from store
    const { data: planningEntries = [], isLoading } = useEmployeePlanning();
    const { selectedPlanningWeek } = usePlanningWeekStore();
    const { currentArea } = useAreaStore();
    
    // Check if planning week is selected
    const isPlanningWeekSelected = selectedPlanningWeek !== null;

    const filteredEmployees = React.useMemo(() => {
        let base = employees;

        // Erst nach Gebiet filtern (Nord/Süd)
        if (currentArea && currentArea !== 'Nord- und Südkreis' && currentArea !== 'Gesamt') {
            base = base.filter((employee) => {
                if (!employee.area) return false;

                if (currentArea === 'Nordkreis') {
                    return employee.area.includes('Nordkreis');
                }

                if (currentArea === 'Südkreis') {
                    return employee.area.includes('Südkreis');
                }

                return true;
            });
        }

        // Dann Mitarbeiter-Filter anwenden
        if (employeeFilter === 'pflege_n') {
            return base.filter(
                (employee) =>
                    (employee.function === 'Pflegekraft' || employee.function === 'PDL') &&
                    employee.area?.includes('Nordkreis')
            );
        }

        if (employeeFilter === 'pflege_s') {
            return base.filter(
                (employee) =>
                    (employee.function === 'Pflegekraft' || employee.function === 'PDL') &&
                    employee.area?.includes('Südkreis')
            );
        }

        if (employeeFilter === 'arzt') {
            return base.filter(
                (employee) =>
                    employee.function === 'Arzt' || employee.function === 'Honorararzt'
            );
        }

        return base;
    }, [employees, currentArea, employeeFilter]);

    // Sort employees: first by function, then by area (Nord/Süd), then alphabetically
    const sortedEmployees = React.useMemo(() => {
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


    // Get all planning entries as memoized array (to avoid recalculation in every cell)
    const allPlanningData = React.useMemo((): any[] => {
        if (Array.isArray(planningEntries)) {
            return planningEntries;
        } else if (planningEntries && Array.isArray((planningEntries as any).data)) {
            return (planningEntries as any).data;
        } else if (planningEntries && (planningEntries as any).data) {
            return [(planningEntries as any).data];
        }
        return [];
    }, [planningEntries]);

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
                                    top: 0,
                                    left: 0, 
                                    zIndex: 3,
                                    backgroundColor: 'background.paper',
                                    borderRight: 1,
                                    borderColor: 'divider'
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight="bold">
                                    Mitarbeiter
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                                    <Chip
                                        label="Alle"
                                        size="small"
                                        clickable
                                        color={employeeFilter === 'all' ? 'primary' : 'default'}
                                        variant={employeeFilter === 'all' ? 'filled' : 'outlined'}
                                        onClick={() => setEmployeeFilter('all')}
                                    />
                                    <Chip
                                        label="Pflege N"
                                        size="small"
                                        clickable
                                        color={employeeFilter === 'pflege_n' ? 'primary' : 'default'}
                                        variant={employeeFilter === 'pflege_n' ? 'filled' : 'outlined'}
                                        onClick={() => setEmployeeFilter('pflege_n')}
                                    />
                                    <Chip
                                        label="Pflege S"
                                        size="small"
                                        clickable
                                        color={employeeFilter === 'pflege_s' ? 'primary' : 'default'}
                                        variant={employeeFilter === 'pflege_s' ? 'filled' : 'outlined'}
                                        onClick={() => setEmployeeFilter('pflege_s')}
                                    />
                                    <Chip
                                        label="Arzt"
                                        size="small"
                                        clickable
                                        color={employeeFilter === 'arzt' ? 'primary' : 'default'}
                                        variant={employeeFilter === 'arzt' ? 'filled' : 'outlined'}
                                        onClick={() => setEmployeeFilter('arzt')}
                                    />
                                </Box>
                            </TableCell>
                            {weekdays.map((day) => (
                                <TableCell 
                                    key={day}
                                    align="center"
                                    sx={{ 
                                        minWidth: 120,
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 2,
                                        backgroundColor: 'background.paper',
                                        borderBottom: 1,
                                        borderColor: 'divider'
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
                                sx={{ '&:last-child td, &:last-child th': { borderBottom: 0 } }}
                            >
                                {/* Mitarbeiter Spalte - Sticky */}
                                <TableCell 
                                    component="th" 
                                    scope="row"
                                    sx={{ 
                                        position: 'sticky', 
                                        left: 0, 
                                        zIndex: 2,
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
                                                {employee.area && (
                                                    <Chip
                                                        label={employee.area.includes('Nordkreis') ? 'N' : 'S'}
                                                        size="small"
                                                        sx={{
                                                            backgroundColor: employee.area.includes('Nordkreis') ? 'primary.main' : 'secondary.main',
                                                            color: 'white',
                                                            fontWeight: 'bold'
                                                        }}
                                                    />
                                                )}
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
                                        minWidth: 100,
                                        borderLeft: 1,
                                        borderColor: 'divider'
                                    }}
                                >
                                        <WeeklyPlanningCell
                                            employeeId={employee.id || 0}
                                            weekday={day}
                                            allPlanningData={allPlanningData}
                                            availableEmployees={employees}
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
