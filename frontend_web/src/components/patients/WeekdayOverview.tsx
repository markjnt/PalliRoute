import React from 'react';
import { Box, Grid, Tooltip, Typography } from '@mui/material';
import { Weekday, Appointment, Employee } from '../../types/models';

interface WeekdayOverviewProps {
    appointments: Appointment[];
    selectedDay: Weekday;
    allWeekdays?: Weekday[];
    weekdayLabels?: string[];
    employees?: Employee[];
    currentEmployeeId?: number;  // ID of the employee currently viewing this card
}

const defaultAllWeekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const defaultWeekdayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

const WeekdayOverview: React.FC<WeekdayOverviewProps> = ({
    appointments,
    selectedDay,
    allWeekdays = defaultAllWeekdays,
    weekdayLabels = defaultWeekdayLabels,
    employees = [],
    currentEmployeeId
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

    // Funktion zum Abrufen aller Mitarbeiter für einen bestimmten Wochentag
    // Immer die employee_id verwenden (nicht tour_employee_id)
    // Gibt alle Mitarbeiter zurück, die für diesen Wochentag zuständig sind (inklusive currentEmployeeId)
    const getEmployeesForWeekday = (weekday: Weekday): Employee[] => {
        const weekdayAppts = appointments.filter(a => a.weekday === weekday && a.employee_id);
        const employeeIds = Array.from(new Set(weekdayAppts.map(a => a.employee_id).filter((id): id is number => id !== null && id !== undefined)));
        return employeeIds
            .map(id => employees.find(emp => emp.id === id))
            .filter((emp): emp is Employee => emp !== undefined);
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

    // Berechne die maximale Anzahl der Mitarbeiter über alle Wochentage
    const maxEmployeesCount = React.useMemo(() => {
        return Math.max(...allWeekdays.map(weekday => getEmployeesForWeekday(weekday).length));
    }, [allWeekdays, appointments, employees]);

    // Berechne die einheitliche Höhe für alle Boxen (basierend auf dem Maximum)
    // Kompakter: 10px pro Mitarbeiter
    const uniformHeight = React.useMemo(() => {
        return Math.max(70, 70 + (maxEmployeesCount * 10));
    }, [maxEmployeesCount]);

    return (
        <Box sx={{ mt: 1, mb: 1 }}>
            <Grid container spacing={0.5} sx={{ width: '100%' }}>
                {allWeekdays.map((weekday, idx) => {
                    const visit = getVisitTypeForWeekday(weekday);
                    const info = getInfoForWeekday(weekday);
                    const weekdayEmployees = getEmployeesForWeekday(weekday);
                    const isSelectedDay = weekday === selectedDay;
                    const hasEmployees = weekdayEmployees.length > 0;
                    
                    return (
                        <Grid size="grow" key={weekday} sx={{ width: 'calc(100% / 7)' }}>
                            <Tooltip 
                                title={
                                    <Box sx={{ p: 1, maxWidth: 300 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                            {getGermanWeekday(weekday)}: {visit || 'Kein Besuch'}
                                        </Typography>
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
                                        height: `${uniformHeight}px`, // Einheitliche Höhe für alle Boxen
                                        justifyContent: 'flex-start', // Starte oben
                                        gap: 0.3, // Kompakter Abstand zwischen Elementen
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
                                    {hasEmployees ? (
                                        <Box sx={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center',
                                            gap: 0.1, // Kompakter: reduzierter gap
                                            width: '100%'
                                        }}>
                                            {weekdayEmployees.map((employee, empIdx) => (
                                                <Typography 
                                                    key={empIdx}
                                                    variant="caption" 
                                                    color="text.secondary"
                                                    sx={{ 
                                                        fontSize: '0.65rem',
                                                        textAlign: 'center',
                                                        lineHeight: 1.1, // Kompakter: reduzierte line-height
                                                        wordBreak: 'break-word',
                                                        overflow: 'hidden',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 1,
                                                        WebkitBoxOrient: 'vertical'
                                                    }}
                                                >
                                                    {employee.first_name.charAt(0)}. {employee.last_name}
                                                </Typography>
                                            ))}
                                        </Box>
                                    ) : null}
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