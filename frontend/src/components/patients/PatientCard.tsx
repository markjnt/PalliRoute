import React, { useRef, useState, useEffect } from 'react';
import { 
    Card, 
    CardContent, 
    Typography, 
    Box, 
    Chip,
    Badge,
    Grid,
    Tooltip
} from '@mui/material';
import { 
    Phone as PhoneIcon,
    Home as HomeIcon
} from '@mui/icons-material';
import { useDrag } from 'react-dnd';
import { Patient, Appointment, Weekday } from '../../types/models';
import { DragItemTypes, PatientDragItem } from '../../types/dragTypes';
import { appointmentsApi } from '../../services/api/appointments';

interface PatientCardProps {
    patient: Patient;
    appointments: Appointment[];
    visitType: 'HB' | 'NA' | 'TK' | 'none';
    index?: number;  // For numbered list of HB visits
    compact?: boolean; // For more compact display in TK, NA, and no-appointment sections
    selectedDay: Weekday; // Der ausgewählte Wochentag
}

export const PatientCard: React.FC<PatientCardProps> = ({ 
    patient, 
    appointments,
    visitType,
    index,
    compact = false,
    selectedDay
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
    
    // Lade alle Termine des Patienten
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                if (patient.id) {
                    const allAppointments = await appointmentsApi.getByPatientId(patient.id);
                    setPatientAppointments(allAppointments);
                }
            } catch (error) {
                console.error('Fehler beim Laden der Termine:', error);
            }
        };
        
        fetchAppointments();
    }, [patient.id]);
    
    // Configure drag and drop
    const [{ isDragging }, drag] = useDrag<PatientDragItem, unknown, { isDragging: boolean }>({
        type: DragItemTypes.PATIENT,
        item: {
            type: DragItemTypes.PATIENT,
            patientId: patient.id || 0,
            appointmentIds: appointments.map(a => a.id || 0).filter(id => id !== 0),
            sourceTourNumber: patient.tour
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging()
        }),
        canDrag: () => !!patient.id // Only allow dragging if patient has an ID
    });
    
    // Connect the drag ref to our cardRef
    drag(cardRef);

    const getBgColor = () => {
        switch (visitType) {
            case 'HB': return 'rgba(25, 118, 210, 0.08)'; // Light blue
            case 'NA': return 'rgba(156, 39, 176, 0.08)'; // Light purple
            case 'TK': return 'rgba(76, 175, 80, 0.08)';  // Light green
            default: return 'rgba(158, 158, 158, 0.08)';  // Light gray with same opacity as others
        }
    };

    // Erstelle ein Mapping für alle Termine des Patienten nach Wochentag
    const allWeekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const weekdayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
    
    // Funktion zum Abrufen des Besuchstyps für einen bestimmten Wochentag
    const getVisitTypeForWeekday = (weekday: Weekday): string | null => {
        const appt = patientAppointments.find(a => a.weekday === weekday);
        return appt?.visit_type || null;
    };
    
    // Funktion zum Übersetzen des englischen Wochentags in Deutsch
    const getGermanWeekday = (weekday: Weekday): string => {
        switch (weekday) {
            case 'monday': return 'Montag';
            case 'tuesday': return 'Dienstag';
            case 'wednesday': return 'Mittwoch';
            case 'thursday': return 'Donnerstag';
            case 'friday': return 'Freitag';
            default: return weekday; // Fallback
        }
    };
    
    // Funktion zum Erzeugen einer Stilfarbe basierend auf dem Besuchstyp
    const getVisitTypeColor = (visitType: string | null): string => {
        switch (visitType) {
            case 'HB': return 'primary.main';  // Blau
            case 'TK': return 'success.main';  // Grün
            case 'NA': return 'secondary.main'; // Lila
            default: return 'text.disabled';    // Grau für leere Felder
        }
    };
    
    // Funktion zum Erzeugen einer Stilfarbe für den Hintergrund basierend auf dem Besuchstyp
    const getVisitTypeBgColor = (visitType: string | null): string => {
        switch (visitType) {
            case 'HB': return 'rgba(25, 118, 210, 0.1)';  // Helles Blau
            case 'TK': return 'rgba(76, 175, 80, 0.1)';   // Helles Grün
            case 'NA': return 'rgba(156, 39, 176, 0.1)';  // Helles Lila
            default: return 'transparent';                // Transparent für leere Felder
        }
    };
    
    // Komponente für die Wochentagsübersicht
    const WeekdayOverview = () => (
        <Box sx={{ mt: 1, mb: 1 }}>
            <Grid container spacing={0.5} sx={{ width: '100%' }}>
                {allWeekdays.map((weekday, idx) => {
                    const visit = getVisitTypeForWeekday(weekday);
                    const isSelectedDay = weekday === selectedDay;
                    return (
                        <Grid item key={weekday} sx={{ width: 'calc(100% / 7)' }}>
                            <Tooltip title={`${getGermanWeekday(weekday)}: ${visit || 'Kein Besuch'}`}>
                                <Box 
                                    sx={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center',
                                        p: 0.5,
                                        borderRadius: 1,
                                        bgcolor: isSelectedDay 
                                            ? visit ? getVisitTypeBgColor(visit) : 'rgba(0, 0, 0, 0.04)'
                                            : 'transparent',
                                        border: '1px solid',
                                        borderColor: visit ? getVisitTypeColor(visit) : 'divider',
                                    }}
                                >
                                    <Typography 
                                        variant="caption" 
                                        fontWeight="bold" 
                                        color="text.secondary"
                                    >
                                        {weekdayLabels[idx]}
                                    </Typography>
                                    <Typography 
                                        variant="caption" 
                                        fontWeight={visit ? 'bold' : 'normal'}
                                        color={getVisitTypeColor(visit)}
                                    >
                                        {visit || '–'}
                                    </Typography>
                                </Box>
                            </Tooltip>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );

    return (
        <Card 
            ref={cardRef}
            variant="outlined" 
            sx={{ 
                mb: 2,
                backgroundColor: getBgColor(),
                position: 'relative',
                width: '100%',
                opacity: isDragging ? 0.5 : 1,
                cursor: 'grab',
                transition: 'all 0.2s ease',
                '&:hover': {
                    boxShadow: 2,
                    transform: 'translateY(-2px)'
                }
            }}
        >
            {/* Nummer in der linken oberen Ecke */}
            {index !== undefined && (
                <Box sx={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '25px', 
                    zIndex: 1 
                }}>
                    <Badge
                        badgeContent={index}
                        color="primary"
                        sx={{ 
                            '& .MuiBadge-badge': {
                                fontSize: '0.9rem',
                                height: '30px',
                                minWidth: '30px',
                                borderRadius: '50%'
                            }
                        }}
                    />
                </Box>
            )}
            
            <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start'
                }}>
                    <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <Typography 
                                variant="h6" 
                                component="div" 
                                fontWeight="bold"
                                gutterBottom
                            >
                                {patient.last_name}, {patient.first_name}
                            </Typography>
                            
                            {patient.area && (
                                <Chip 
                                    label={patient.area} 
                                    size="small" 
                                    sx={{ ml: 1 }}
                                />
                            )}
                        </Box>
                        
                        {/* Adresse immer mit Haussymbol anzeigen */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <HomeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                                {patient.street}, {patient.zip_code} {patient.city}
                            </Typography>
                        </Box>
                        
                        {patient.phone1 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    {patient.phone1}
                                </Typography>
                            </Box>
                        )}
                        
                        {/* Wochentagsübersicht */}
                        <WeekdayOverview />
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}; 