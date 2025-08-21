import React from 'react';
import { Box, Grid, Tooltip, Typography } from '@mui/material';
import { Weekday, Appointment, Employee } from '../../types/models';

interface WeekdayOverviewProps {
    appointments: Appointment[];
    selectedDay: Weekday;
    allWeekdays?: Weekday[];
    weekdayLabels?: string[];
    employees?: Employee[];
}

const defaultAllWeekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const defaultWeekdayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

const WeekdayOverview: React.FC<WeekdayOverviewProps> = ({
    appointments,
    selectedDay,
    allWeekdays = defaultAllWeekdays,
    weekdayLabels = defaultWeekdayLabels,
    employees = []
}) => {
    // Funktion zum Abrufen des Besuchstyps für einen bestimmten Wochentag
    const getVisitTypeForWeekday = (weekday: Weekday): string | null => {
        const appt = appointments.find(a => a.weekday === weekday);
        return appt?.visit_type || null;
    };

    // Funktion zum Abrufen der Info für einen bestimmten Wochentag
    const getInfoForWeekday = (weekday: Weekday): string | null => {
        const appt = appointments.find(a => a.weekday === weekday);
        return appt?.info || null;
    };

    // Funktion zum Abrufen des Mitarbeiters für einen bestimmten Wochentag
    const getEmployeeForWeekday = (weekday: Weekday): Employee | null => {
        const appt = appointments.find(a => a.weekday === weekday);
        if (!appt?.employee_id) return null;
        return employees.find(emp => emp.id === appt.employee_id) || null;
    };

    // Funktion zum Abrufen des Mitarbeiters für den ausgewählten Tag
    const getSelectedDayEmployee = (): Employee | null => {
        const appt = appointments.find(a => a.weekday === selectedDay);
        if (!appt?.employee_id) return null;
        return employees.find(emp => emp.id === appt.employee_id) || null;
    };

    // Funktion zum Übersetzen des englischen Wochentags in Deutsch
    const getGermanWeekday = (weekday: Weekday): string => {
        switch (weekday) {
            case 'monday': return 'Montag';
            case 'tuesday': return 'Dienstag';
            case 'wednesday': return 'Mittwoch';
            case 'thursday': return 'Donnerstag';
            case 'friday': return 'Freitag';
            default: return weekday;
        }
    };

    // Funktion zum Erzeugen einer Stilfarbe basierend auf dem Besuchstyp
    const getVisitTypeColor = (visitType: string | null): string => {
        switch (visitType) {
            case 'HB': return 'primary.main';
            case 'TK': return 'success.main';
            case 'NA': return 'secondary.main';
            default: return 'text.disabled';
        }
    };

    // Funktion zum Erzeugen einer Stilfarbe für den Hintergrund basierend auf dem Besuchstyp
    const getVisitTypeBgColor = (visitType: string | null): string => {
        switch (visitType) {
            case 'HB': return 'rgba(25, 118, 210, 0.1)';
            case 'TK': return 'rgba(76, 175, 80, 0.1)';
            case 'NA': return 'rgba(156, 39, 176, 0.1)';
            default: return 'transparent';
        }
    };

    return (
        <Box sx={{ mt: 1, mb: 1 }}>
            <Grid container spacing={0.5} sx={{ width: '100%' }}>
                {allWeekdays.map((weekday, idx) => {
                    const visit = getVisitTypeForWeekday(weekday);
                    const info = getInfoForWeekday(weekday);
                    const employee = getEmployeeForWeekday(weekday);
                    const selectedDayEmployee = getSelectedDayEmployee();
                    const isSelectedDay = weekday === selectedDay;
                    return (
                        <Grid size="grow" key={weekday} sx={{ width: 'calc(100% / 7)' }}>
                            <Tooltip 
                                title={
                                    <Box sx={{ p: 1, maxWidth: 300 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                            {getGermanWeekday(weekday)}: {visit || 'Kein Besuch'}
                                        </Typography>
                                        {/* Mitarbeitername entfernt */}
                                        {info && (
                                            <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                                                {info}
                                            </Typography>
                                        )}
                                    </Box>
                                }
                                arrow
                                placement="top"
                            >
                                <Box 
                                    sx={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center',
                                        p: 0.5,
                                        borderRadius: 1,
                                        minHeight: '80px', // Feste Mindesthöhe
                                        height: '80px', // Feste Höhe für alle Boxen
                                        justifyContent: 'space-between', // Gleichmäßige Verteilung
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
                                    {employee && (visit === 'NA' || employee.id !== selectedDayEmployee?.id) ? (
                                        <Typography 
                                            variant="caption" 
                                            color="text.secondary"
                                            sx={{ 
                                                fontSize: '0.65rem',
                                                textAlign: 'center',
                                                lineHeight: 1.2,
                                                wordBreak: 'break-word',
                                                overflow: 'hidden',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical'
                                            }}
                                        >
                                            {employee.first_name.charAt(0)}. {employee.last_name}
                                        </Typography>
                                    ) : (
                                        <Box sx={{ height: '16px' }} /> // Platzhalter für leere Boxen
                                    )}
                                </Box>
                            </Tooltip>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
};

export default WeekdayOverview; 