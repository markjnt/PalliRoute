import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Divider,
    FormControl,
    Select,
    MenuItem,
    SelectChangeEvent,
} from '@mui/material';
import {
    Today as TodayIcon,
} from '@mui/icons-material';

interface PatientSidebarProps {
    width?: number;
}

export const PatientSidebar: React.FC<PatientSidebarProps> = ({
    width = 400
}) => {
    const [selectedDay, setSelectedDay] = useState<string>('monday');

    const handleDayChange = (event: SelectChangeEvent) => {
        setSelectedDay(event.target.value as string);
    };

    const getWeekdayName = (day: string): string => {
        switch (day) {
            case 'monday': return 'Montag';
            case 'tuesday': return 'Dienstag';
            case 'wednesday': return 'Mittwoch';
            case 'thursday': return 'Donnerstag';
            case 'friday': return 'Freitag';
            default: return 'Unbekannt';
        }
    };

    return (
        <Box
            sx={{
                height: '100%',
                width: '100%',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 2,
                height: 64,
                borderBottom: 1,
                borderColor: 'divider'
            }}>
                <Typography variant="h6" component="h2" sx={{ pl: 5 }}>
                    Patientenverwaltung
                </Typography>
                <FormControl sx={{ width: 145, mr: 0.5 }}>
                    <Select
                        value={selectedDay}
                        onChange={handleDayChange}
                        size="small"
                        displayEmpty
                        renderValue={(value) => (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <TodayIcon fontSize="small" sx={{ fontSize: '0.9rem' }} />
                                <span>{getWeekdayName(value as string)}</span>
                            </Box>
                        )}
                    >
                        <MenuItem value="monday">Montag</MenuItem>
                        <MenuItem value="tuesday">Dienstag</MenuItem>
                        <MenuItem value="wednesday">Mittwoch</MenuItem>
                        <MenuItem value="thursday">Donnerstag</MenuItem>
                        <MenuItem value="friday">Freitag</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            <Box sx={{ p: 2 }}>
                <Button
                    variant="contained"
                    fullWidth
                >
                    Excel Import
                </Button>
            </Box>

            <Divider />

            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                {/* Patient list will be added here */}
            </Box>
        </Box>
    );
}; 