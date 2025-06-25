import React from 'react';
import { List, ListItem, Typography, Paper, Box } from '@mui/material';
import { Home as HomeIcon, Phone as PhoneIcon, AddCircle as AddCircleIcon, Person as PersonIcon } from '@mui/icons-material';
import { Patient, Appointment, Weekday } from '../../types/models';
import { PatientCard } from './PatientCard';

interface TourSectionsProps {
    sortedHbPatients: Patient[];
    tkPatients: Patient[];
    naPatients: Patient[];
    emptyTypePatients: Patient[];
    getPatientAppointments: (patientId: number) => Appointment[];
    selectedDay: Weekday;
    onMoveUp: (patientId: number) => void;
    onMoveDown: (patientId: number) => void;
}

const TourSections: React.FC<TourSectionsProps> = ({
    sortedHbPatients,
    tkPatients,
    naPatients,
    emptyTypePatients,
    getPatientAppointments,
    selectedDay,
    onMoveUp,
    onMoveDown
}) => (
    <>
        {/* Home visits (HB) section */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'primary.main' }}>
            <HomeIcon color="primary" />
            <Typography variant="h6" sx={{ ml: 1 }}>
                Hausbesuche ({sortedHbPatients.length})
            </Typography>
        </Box>
        {sortedHbPatients.length > 0 ? (
            <List dense disablePadding>
                {sortedHbPatients.map((patient, index) => (
                    <ListItem 
                        key={`hb-${patient.id}`} 
                        disablePadding 
                        sx={{ mb: 1 }}
                    >
                        <PatientCard
                            patient={patient}
                            appointments={getPatientAppointments(patient.id || 0)}
                            visitType="HB"
                            index={index + 1}
                            selectedDay={selectedDay}
                            onMoveUp={onMoveUp}
                            onMoveDown={onMoveDown}
                            isFirst={index === 0}
                            isLast={index === sortedHbPatients.length - 1}
                        />
                    </ListItem>
                ))}
            </List>
        ) : (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                Keine Hausbesuche für diesen Tag geplant.
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

            {/* New admissions (NA) section */}
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
                    bgcolor: 'rgba(156, 39, 176, 0.04)'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'secondary.main' }}>
                    <AddCircleIcon color="secondary" />
                    <Typography variant="h6" sx={{ ml: 1 }}>
                        Neuaufnahmen ({naPatients.length})
                    </Typography>
                </Box>
                {naPatients.length > 0 ? (
                    <List dense disablePadding>
                        {naPatients.map((patient) => (
                            <ListItem 
                                key={`na-${patient.id}`} 
                                disablePadding 
                                sx={{ mb: 1 }}
                            >
                                <PatientCard
                                    patient={patient}
                                    appointments={getPatientAppointments(patient.id || 0)}
                                    visitType="NA"
                                    compact
                                    selectedDay={selectedDay}
                                />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        Keine Neuaufnahmen für diesen Tag geplant.
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

export default TourSections; 