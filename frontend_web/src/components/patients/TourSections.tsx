import React from 'react';
import { List, ListItem, Typography, Paper, Box } from '@mui/material';
import { Home as HomeIcon, Phone as PhoneIcon, AddCircle as AddCircleIcon, Person as PersonIcon } from '@mui/icons-material';
import { Patient, Appointment, Weekday } from '../../types/models';
import { PatientCard } from './PatientCard';

interface TourSectionsProps {
    sortedRoutePatients: Patient[];
    tkPatients: Patient[];
    emptyTypePatients: Patient[];
    getPatientAppointments: (patientId: number) => Appointment[];
    selectedDay: Weekday;
    onMoveUp: (patientId: number) => void;
    onMoveDown: (patientId: number) => void;
}

const TourSections: React.FC<TourSectionsProps> = ({
    sortedRoutePatients,
    tkPatients,
    emptyTypePatients,
    getPatientAppointments,
    selectedDay,
    onMoveUp,
    onMoveDown
}) => {
    // Use the sorted route patients directly (they already include HB and NA in correct order)
    const allRoutePatients = sortedRoutePatients;
    
    return (
        <>
            {/* Home visits and new admissions (HB + NA) section */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'primary.main' }}>
                <HomeIcon color="primary" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                    Route ({allRoutePatients.length})
                </Typography>
            </Box>
            {allRoutePatients.length > 0 ? (
                <List dense disablePadding>
                    {allRoutePatients.map((patient, index) => {
                        const patientAppointments = getPatientAppointments(patient.id || 0);
                        const hasHB = patientAppointments.some(app => app.visit_type === 'HB');
                        const hasNA = patientAppointments.some(app => app.visit_type === 'NA');
                        const visitType = hasHB ? 'HB' : hasNA ? 'NA' : 'HB'; // Default to HB if somehow neither exists
                        
                        return (
                            <ListItem 
                                key={`route-${patient.id}`} 
                                disablePadding 
                                sx={{ mb: 1 }}
                            >
                                <PatientCard
                                    patient={patient}
                                    appointments={patientAppointments}
                                    visitType={visitType}
                                    index={index + 1}
                                    selectedDay={selectedDay}
                                    onMoveUp={onMoveUp}
                                    onMoveDown={onMoveDown}
                                    isFirst={index === 0}
                                    isLast={index === allRoutePatients.length - 1}
                                />
                            </ListItem>
                        );
                    })}
                </List>
            ) : (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                    Keine Route-Termine für diesen Tag geplant.
                </Typography>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                {/* Phone contacts (TK) section */}
                <Paper 
                    variant="outlined" 
                    sx={{ 
                        flex: {
                            xs: '1 1 100%',
                            sm: '1 1 47%'
                        },
                        minWidth: {
                            xs: '100%',
                            sm: '300px'
                        },
                        p: 2,
                        bgcolor: 'rgba(76, 175, 80, 0.04)'
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'success.main' }}>
                        <PhoneIcon color="success" />
                        <Typography variant="h6" sx={{ ml: 1 }}>
                            Telefonkontakte ({tkPatients.length})
                        </Typography>
                    </Box>
                    {tkPatients.length > 0 ? (
                        <List dense disablePadding>
                            {tkPatients.map((patient) => (
                                <ListItem 
                                    key={`tk-${patient.id}`} 
                                    disablePadding 
                                    sx={{ mb: 1 }}
                                >
                                    <PatientCard
                                        patient={patient}
                                        appointments={getPatientAppointments(patient.id || 0)}
                                        visitType="TK"
                                        compact
                                        selectedDay={selectedDay}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Keine Telefonkontakte für diesen Tag geplant.
                        </Typography>
                    )}
                </Paper>
            </Box>

            {/* Patients with empty visit type */}
            {emptyTypePatients.length > 0 && (
                <Box sx={{ mt: 2 }}>
                    <Paper 
                        variant="outlined" 
                        sx={{ 
                            p: 2,
                            bgcolor: 'rgba(158, 158, 158, 0.04)'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'text.secondary' }}>
                            <PersonIcon color="action" />
                            <Typography variant="h6" sx={{ ml: 1 }}>
                                Ohne Besuch ({emptyTypePatients.length})
                            </Typography>
                        </Box>
                        <List dense disablePadding>
                            {emptyTypePatients.map((patient) => (
                                <ListItem 
                                    key={`empty-${patient.id}`} 
                                    disablePadding 
                                    sx={{ width: '100%' }}
                                >
                                    <PatientCard
                                        patient={patient}
                                        appointments={getPatientAppointments(patient.id || 0)}
                                        visitType="none"
                                        compact
                                        selectedDay={selectedDay}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Box>
            )}
        </>
    );
};

export default TourSections; 