import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress, Button } from '@mui/material';
import { Patient, Appointment, Employee, Weekday } from '../../types/models';
import { TourContainer } from './TourContainer';
import { Person as PersonIcon } from '@mui/icons-material';

interface ToursViewProps {
    employees: Employee[];
    patients: Patient[];
    appointments: Appointment[];
    selectedDay: Weekday;
    loading: boolean;
    error: string | null;
}

export const ToursView: React.FC<ToursViewProps> = ({
    employees,
    patients: initialPatients,
    appointments: initialAppointments,
    selectedDay,
    loading,
    error
}) => {
    // Create local state to manage patients and appointments, allowing updates via drag and drop
    const [patients, setPatients] = useState<Patient[]>(initialPatients);
    const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
    
    // Update local state when props change
    useEffect(() => {
        setPatients(initialPatients);
    }, [initialPatients]);
    
    useEffect(() => {
        setAppointments(initialAppointments);
    }, [initialAppointments]);
    
    // Get employees with tour numbers
    const employeesWithTours = [...employees]
        .filter(e => e.tour_number)
        .sort((a, b) => {
            if (!a.tour_number || !b.tour_number) return 0;
            return a.tour_number - b.tour_number;
        });
    
    // Get employees without tour numbers
    const employeesWithoutTours = employees.filter(e => !e.tour_number);
    
    // Handler for when a patient is moved to a different tour
    const handlePatientMoved = (movedPatient: Patient, newTourNumber: number) => {
        // Update the patient in our local state
        setPatients(prevPatients => 
            prevPatients.map(patient => 
                patient.id === movedPatient.id 
                    ? { ...patient, tour: newTourNumber } 
                    : patient
            )
        );
        
        // Get the employee of the target tour
        const targetEmployee = employees.find(e => e.tour_number === newTourNumber);
        if (!targetEmployee || !targetEmployee.id) return;
        
        // Update any appointments for the patient for the selected day
        const patientAppointments = appointments.filter(
            a => a.patient_id === movedPatient.id
        );
        
        if (patientAppointments.length > 0) {
            // Update appointments in our local state
            setAppointments(prevAppointments => 
                prevAppointments.map(appt => 
                    appt.patient_id === movedPatient.id
                        ? { ...appt, employee_id: targetEmployee.id }
                        : appt
                )
            );
        }
    };
    
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }
    
    if (error) {
        return (
            <Alert severity="error" sx={{ my: 2 }}>
                {error}
            </Alert>
        );
    }
    
    if (patients.length === 0) {
        return (
            <Alert severity="info" sx={{ my: 2 }}>
                Keine Patienten gefunden. Importieren Sie Patienten über den Excel Import.
            </Alert>
        );
    }
    
    return (
        <Box>
            {/* Display tour containers for employees with tour numbers */}
            {employeesWithTours.length > 0 ? (
                <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 3,
                    '& > *': { 
                        flexGrow: 1,
                        flexShrink: 1,
                        // Verbesserte Responsivität mit angepassten Größen
                        flexBasis: {
                            xs: '100%',              // Volle Breite auf kleinen Geräten
                            sm: 'calc(100% - 16px)', // Eine pro Zeile auf kleinen Bildschirmen
                            md: '47%',               // ~2 pro Zeile auf mittleren Bildschirmen mit etwas Abstand
                            lg: '31%',               // ~3 pro Zeile auf großen Bildschirmen mit Abstand
                            xl: '23%'                // ~4 pro Zeile auf sehr großen Bildschirmen mit Abstand
                        },
                        minWidth: {
                            xs: '280px',
                            sm: '320px',
                            md: '340px'
                        },
                        maxWidth: {
                            xs: '100%',
                            sm: '100%',
                            md: '100%',
                            lg: '900px'
                        }
                    }
                }}>
                    {employeesWithTours.map(employee => (
                        <TourContainer
                            key={employee.id}
                            employee={employee}
                            patients={patients}
                            appointments={appointments}
                            selectedDay={selectedDay}
                            onPatientMoved={handlePatientMoved}
                        />
                    ))}
                </Box>
            ) : (
                <Alert severity="info" sx={{ my: 2 }}>
                    Keine Touren gefunden. Bitte weisen Sie den Mitarbeitern Tournummern zu.
                </Alert>
            )}
            
            {/* Display employees without tour numbers */}
            {employeesWithoutTours.length > 0 && (
                <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon />
                        Mitarbeiter ohne Tour-Zuweisung
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {employeesWithoutTours.map(employee => (
                            <Button
                                key={employee.id}
                                variant="outlined"
                                size="small"
                                startIcon={<PersonIcon />}
                                sx={{ mr: 1, mb: 1 }}
                            >
                                {employee.first_name} {employee.last_name}
                            </Button>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    );
}; 