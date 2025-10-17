import React, { useMemo, useEffect } from 'react';
import { Box, TextField, InputAdornment, Paper, IconButton, Typography } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { Patient, Appointment, Employee, Weekday } from '../../types/models';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useAreaStore } from '../../stores/useAreaStore';

interface FilteredResults {
    filteredActiveOtherEmployeesWithPatients: Employee[];
    filteredActiveOtherEmployeesWithoutPatients: Employee[];
    filteredDoctors: Employee[];
}

interface SearchFieldProps {
    selectedDay: Weekday;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onClearSearch: () => void;
    onFilteredResultsChange: (results: FilteredResults) => void;
}

// Constants
const DOCTOR_FUNCTIONS = ['Arzt', 'Honorararzt'] as const;
const AREA_ORDER = {
    'Nordkreis': 0,
    'Südkreis': 1,
    'default': 2
} as const;

export const SearchField: React.FC<SearchFieldProps> = ({ 
    selectedDay, 
    searchTerm, 
    onSearchChange, 
    onClearSearch,
    onFilteredResultsChange
}) => {
    // React Query Hooks
    const { data: employees = [] } = useEmployees();
    const { data: patients = [] } = usePatients();
    const { data: appointments = [] } = useAppointmentsByWeekday(selectedDay);
    const { currentArea } = useAreaStore();

    // Utility functions
    const getAreaOrder = (area?: string): number => {
        if (!area) return AREA_ORDER.default;
        if (area.includes('Nordkreis')) return AREA_ORDER.Nordkreis;
        if (area.includes('Südkreis')) return AREA_ORDER.Südkreis;
        return AREA_ORDER.default;
    };

    const isDoctor = (employee: Employee): boolean => {
        return DOCTOR_FUNCTIONS.includes(employee.function as any);
    };

    const hasPatientInEmployee = (employeeId: number): boolean => {
        return appointments.some(app => 
            app.weekday === selectedDay && 
            app.employee_id === employeeId
        );
    };

    const matchesSearchTerm = (text: string): boolean => {
        if (!searchTerm.trim()) return true;
        return text.toLowerCase().includes(searchTerm.toLowerCase());
    };

    const searchInEmployee = (employee: Employee): boolean => {
        const employeeName = `${employee.first_name} ${employee.last_name}`;
        const functionName = employee.function;
        
        // Check employee name and function
        if (matchesSearchTerm(employeeName) || matchesSearchTerm(functionName)) {
            return true;
        }
        
        // Check patients assigned to this employee
        const employeePatientIds = new Set<number>();
        appointments.forEach(app => {
            if (app.employee_id === employee.id && app.weekday === selectedDay) {
                employeePatientIds.add(app.patient_id);
            }
        });
        
        const employeePatients = patients.filter(p => employeePatientIds.has(p.id || 0));
        
        return employeePatients.some(patient => {
            const patientName = `${patient.first_name} ${patient.last_name}`;
            const patientAddress = `${patient.street} ${patient.city}`;
            return matchesSearchTerm(patientName) || matchesSearchTerm(patientAddress);
        });
    };

    // Memoized data processing
    const filteredEmployees = useMemo(() => {
        const isAllAreas = currentArea === 'Nord- und Südkreis';
        return isAllAreas ? employees : employees.filter(e => e.area === currentArea);
    }, [employees, currentArea]);

    const sortedEmployees = useMemo(() => 
        [...filteredEmployees].sort((a, b) => {
            const areaOrderA = getAreaOrder(a.area);
            const areaOrderB = getAreaOrder(b.area);
            
            if (areaOrderA !== areaOrderB) {
                return areaOrderA - areaOrderB;
            }
            
            return a.last_name.localeCompare(b.last_name);
        }),
        [filteredEmployees, getAreaOrder]
    );

    const { doctors, otherEmployees } = useMemo(() => {
        const doctors = sortedEmployees.filter(isDoctor);
        const otherEmployees = sortedEmployees.filter(e => !isDoctor(e));
        return { doctors, otherEmployees };
    }, [sortedEmployees, isDoctor]);

    const { activeOtherEmployeesWithPatients, activeOtherEmployeesWithoutPatients } = useMemo(() => {
        const withPatients = otherEmployees.filter(e => hasPatientInEmployee(e.id || 0));
        const withoutPatients = otherEmployees.filter(e => !hasPatientInEmployee(e.id || 0));
        return { activeOtherEmployeesWithPatients: withPatients, activeOtherEmployeesWithoutPatients: withoutPatients };
    }, [otherEmployees, hasPatientInEmployee]);

    // Memoized filtered results
    const filteredResults = useMemo((): FilteredResults => {
        if (!searchTerm.trim()) {
            return {
                filteredActiveOtherEmployeesWithPatients: activeOtherEmployeesWithPatients,
                filteredActiveOtherEmployeesWithoutPatients: activeOtherEmployeesWithoutPatients,
                filteredDoctors: doctors
            };
        }

        return {
            filteredActiveOtherEmployeesWithPatients: activeOtherEmployeesWithPatients.filter(searchInEmployee),
            filteredActiveOtherEmployeesWithoutPatients: activeOtherEmployeesWithoutPatients.filter(searchInEmployee),
            filteredDoctors: doctors.filter(searchInEmployee)
        };
    }, [
        searchTerm,
        activeOtherEmployeesWithPatients,
        activeOtherEmployeesWithoutPatients,
        doctors,
        searchInEmployee
    ]);

    // Memoized total results count
    const totalResults = useMemo(() => 
        filteredResults.filteredActiveOtherEmployeesWithPatients.length + 
        filteredResults.filteredActiveOtherEmployeesWithoutPatients.length + 
        filteredResults.filteredDoctors.length,
        [filteredResults]
    );

    // Notify parent component of filtered results changes
    useEffect(() => {
        onFilteredResultsChange(filteredResults);
    }, [filteredResults, onFilteredResultsChange]);

    // Event handlers
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSearchChange(e.target.value);
    };

    const handleClearClick = () => {
        onClearSearch();
    };

    return (
        <Box sx={{ px: 2, py: 2 }}>
            <Paper 
                elevation={1} 
                sx={{ 
                    p: 2,
                    backgroundColor: 'background.default'
                }}
            >
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Mitarbeiter oder Patienten suchen..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" />
                            </InputAdornment>
                        ),
                        endAdornment: searchTerm && (
                            <InputAdornment position="end">
                                <IconButton
                                    size="small"
                                    onClick={handleClearClick}
                                    edge="end"
                                    aria-label="Suche löschen"
                                >
                                    <ClearIcon />
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: 'background.paper',
                            '&:hover': {
                                backgroundColor: 'background.paper'
                            }
                        }
                    }}
                />
                {searchTerm && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        "{searchTerm}" - {totalResults} Ergebnisse
                    </Typography>
                )}
            </Paper>
        </Box>
    );
};
