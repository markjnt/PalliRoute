import React, { useState, useMemo } from 'react';
import { Box, TextField, InputAdornment, Paper, IconButton, Typography } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { Patient, Appointment, Employee, Weekday } from '../../types/models';
import { useEmployees } from '../../services/queries/useEmployees';
import { usePatients } from '../../services/queries/usePatients';
import { useAppointmentsByWeekday } from '../../services/queries/useAppointments';
import { useAreaStore } from '../../stores/useAreaStore';

interface SearchFieldProps {
    selectedDay: Weekday;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onClearSearch: () => void;
    onFilteredResultsChange: (results: {
        filteredActiveOtherEmployeesWithPatients: Employee[];
        filteredActiveOtherEmployeesWithoutPatients: Employee[];
        filteredInactiveEmployees: Employee[];
        filteredDoctors: Employee[];
    }) => void;
}

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

    // Area filtering logic
    const isAllAreas = currentArea === 'Nord- und Südkreis';
    const filteredEmployees = isAllAreas ? employees : employees.filter(e => e.area === currentArea);

    // Get all employees
    const allEmployees = [...filteredEmployees]
        .sort((a, b) => {
            // First sort by area (Nordkreis first, then Südkreis)
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
            
            // Then sort alphabetically by last name
            return a.last_name.localeCompare(b.last_name);
        });
    
    // Separate employees with patients from those without
    const hasPatientInEmployee = (employeeId: number) => {
        return appointments.some(app => {
            if (app.weekday === selectedDay && app.employee_id) {
                return app.employee_id === employeeId;
            }
            return false;
        });
    };
    
    // Separate doctors from other employees
    const doctors = allEmployees.filter(e => e.function === 'Arzt' || e.function === 'Honorararzt');
    const otherEmployees = allEmployees.filter(e => e.function !== 'Arzt' && e.function !== 'Honorararzt');
    
    // Other employees with patients (active only)
    const activeOtherEmployeesWithPatients = otherEmployees.filter(e => 
        e.is_active && hasPatientInEmployee(e.id || 0)
    );
    
    // Other employees without patients (active only)
    const activeOtherEmployeesWithoutPatients = otherEmployees.filter(e => 
        e.is_active && !hasPatientInEmployee(e.id || 0)
    );
    
    // Inactive employees (excluding doctors)
    const inactiveEmployees = allEmployees.filter(e => !e.is_active && e.function !== 'Arzt' && e.function !== 'Honorararzt');

    // Search functionality
    const filteredActiveOtherEmployeesWithPatients = useMemo(() => {
        if (!searchTerm.trim()) return activeOtherEmployeesWithPatients;
        
        const searchLower = searchTerm.toLowerCase();
        
        return activeOtherEmployeesWithPatients.filter(employee => {
            // Search in employee name
            const employeeName = `${employee.first_name} ${employee.last_name}`.toLowerCase();
            if (employeeName.includes(searchLower)) return true;
            
            // Search in employee function
            if (employee.function.toLowerCase().includes(searchLower)) return true;
            
            // Search in patients assigned to this employee
            const employeePatientIds = new Set<number>();
            appointments.forEach(app => {
                if (app.employee_id === employee.id && app.weekday === selectedDay) {
                    employeePatientIds.add(app.patient_id);
                }
            });
            
            const employeePatients = patients.filter(p => employeePatientIds.has(p.id || 0));
            
            return employeePatients.some(patient => {
                const patientName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
                const patientAddress = `${patient.street} ${patient.city}`.toLowerCase();
                return patientName.includes(searchLower) || patientAddress.includes(searchLower);
            });
        });
    }, [activeOtherEmployeesWithPatients, searchTerm, appointments, patients, selectedDay]);

    const filteredActiveOtherEmployeesWithoutPatients = useMemo(() => {
        if (!searchTerm.trim()) return activeOtherEmployeesWithoutPatients;
        
        const searchLower = searchTerm.toLowerCase();
        
        return activeOtherEmployeesWithoutPatients.filter(employee => {
            const employeeName = `${employee.first_name} ${employee.last_name}`.toLowerCase();
            return employeeName.includes(searchLower) || employee.function.toLowerCase().includes(searchLower);
        });
    }, [activeOtherEmployeesWithoutPatients, searchTerm]);

    const filteredInactiveEmployees = useMemo(() => {
        if (!searchTerm.trim()) return inactiveEmployees;
        
        const searchLower = searchTerm.toLowerCase();
        
        return inactiveEmployees.filter(employee => {
            const employeeName = `${employee.first_name} ${employee.last_name}`.toLowerCase();
            return employeeName.includes(searchLower) || employee.function.toLowerCase().includes(searchLower);
        });
    }, [inactiveEmployees, searchTerm]);

    const filteredDoctors = useMemo(() => {
        if (!searchTerm.trim()) return doctors;
        
        const searchLower = searchTerm.toLowerCase();
        
        return doctors.filter(employee => {
            // Search in employee name
            const employeeName = `${employee.first_name} ${employee.last_name}`.toLowerCase();
            if (employeeName.includes(searchLower)) return true;
            
            // Search in employee function
            if (employee.function.toLowerCase().includes(searchLower)) return true;
            
            // Search in patients assigned to this doctor
            const doctorPatientIds = new Set<number>();
            appointments.forEach(app => {
                if (app.employee_id === employee.id && app.weekday === selectedDay) {
                    doctorPatientIds.add(app.patient_id);
                }
            });
            
            const doctorPatients = patients.filter(p => doctorPatientIds.has(p.id || 0));
            
            return doctorPatients.some(patient => {
                const patientName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
                const patientAddress = `${patient.street} ${patient.city}`.toLowerCase();
                return patientName.includes(searchLower) || patientAddress.includes(searchLower);
            });
        });
    }, [doctors, searchTerm, appointments, patients, selectedDay]);

    const totalResults = filteredActiveOtherEmployeesWithPatients.length + 
                        filteredActiveOtherEmployeesWithoutPatients.length + 
                        filteredInactiveEmployees.length + 
                        filteredDoctors.length;

    // Pass filtered results to parent component
    React.useEffect(() => {
        onFilteredResultsChange({
            filteredActiveOtherEmployeesWithPatients,
            filteredActiveOtherEmployeesWithoutPatients,
            filteredInactiveEmployees,
            filteredDoctors
        });
    }, [
        filteredActiveOtherEmployeesWithPatients,
        filteredActiveOtherEmployeesWithoutPatients,
        filteredInactiveEmployees,
        filteredDoctors,
        onFilteredResultsChange
    ]);

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
                    onChange={(e) => onSearchChange(e.target.value)}
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
                                    onClick={onClearSearch}
                                    edge="end"
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
