import React, { useState } from 'react';
import {
    Box,
    IconButton,
    Menu,
    MenuItem,
    TextField,
    Typography,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Tooltip,
    Alert,
} from '@mui/material';
import { Warning } from '@mui/icons-material';

export type PlanningStatus = 'available' | 'vacation' | 'sick' | 'custom';

export interface PlanningData {
    status: PlanningStatus;
    customText?: string;
}

interface WeeklyPlanningCellProps {
    employeeId: number;
    weekday: string;
    allPlanningData?: any[]; // Alle Planning-Daten werden übergeben
    onStatusChange: (employeeId: number, weekday: string, data: PlanningData) => void;
    disabled?: boolean;
}

const statusOptions = [
    { value: 'available' as PlanningStatus, label: 'Verfügbar', color: '#4CAF50' },
    { value: 'sick' as PlanningStatus, label: 'Krank', color: '#F44336' },
    { value: 'vacation' as PlanningStatus, label: 'Urlaub', color: '#FF9800' },
    { value: 'custom' as PlanningStatus, label: 'Sonstiges', color: '#FFC107' },
];

export const WeeklyPlanningCell: React.FC<WeeklyPlanningCellProps> = ({
    employeeId,
    weekday,
    allPlanningData = [],
    onStatusChange,
    disabled = false,
}) => {
    // Map German weekday names to English database format
    const weekdayMapping: { [key: string]: string } = {
        'Montag': 'monday',
        'Dienstag': 'tuesday',
        'Mittwoch': 'wednesday',
        'Donnerstag': 'thursday',
        'Freitag': 'friday',
        'Samstag': 'saturday',
        'Sonntag': 'sunday'
    };
    
    const dbWeekday = weekdayMapping[weekday] || weekday.toLowerCase();
    
    // Filter data for this specific employee and weekday
    const relevantData = allPlanningData.find(
        (entry: any) => entry.employee_id === employeeId && entry.weekday === dbWeekday
    );
    
    // Always use backend data - no local state management
    const currentStatus: PlanningStatus = relevantData?.status || 'available';
    const currentCustomText: string = relevantData?.custom_text || '';
    const hasConflicts: boolean = relevantData?.has_conflicts || false;
    const appointmentsCount: number = relevantData?.appointments_count || 0;

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [customDialogOpen, setCustomDialogOpen] = useState(false);
    const [tempCustomText, setTempCustomText] = useState('');

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleStatusSelect = (status: PlanningStatus) => {
        if (status === 'custom') {
            setTempCustomText(currentCustomText);
            setCustomDialogOpen(true);
        } else {
            // Directly call backend update
            onStatusChange(employeeId, weekday, {
                status,
                customText: undefined
            });
        }
        handleMenuClose();
    };

    const handleCustomSubmit = () => {
        if (tempCustomText.trim()) {
            onStatusChange(employeeId, weekday, {
                status: 'custom',
                customText: tempCustomText.trim()
            });
        }
        setCustomDialogOpen(false);
    };

    const handleCustomCancel = () => {
        setCustomDialogOpen(false);
        setTempCustomText('');
    };

    // Get status display info
    const statusInfo = statusOptions.find(option => option.value === currentStatus) || statusOptions[0];

    const isWeekend = weekday === 'Samstag' || weekday === 'Sonntag';

    return (
        <>
            <Tooltip 
                title={hasConflicts ? `${appointmentsCount} Termin${appointmentsCount !== 1 ? 'e' : ''} vorhanden` : ''}
                arrow
                placement="top"
            >
                <Box 
                    sx={{ 
                        minHeight: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px dashed',
                        borderColor: hasConflicts ? 'error.main' : 'grey.300',
                        borderRadius: 1,
                        backgroundColor: isWeekend ? 'grey.100' : 'grey.50',
                        position: 'relative',
                        opacity: disabled ? 0.5 : 1,
                        '&:hover': disabled ? {} : {
                            backgroundColor: isWeekend ? 'grey.200' : 'primary.50',
                            borderColor: isWeekend ? 'grey.400' : 'primary.300',
                            cursor: 'pointer'
                        }
                    }}
                    onClick={disabled ? undefined : handleMenuOpen}
                >
                    {/* Conflict warning icon */}
                    {hasConflicts && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: -2,
                                right: -2,
                                zIndex: 1,
                            }}
                        >
                            <Warning 
                                sx={{ 
                                    color: 'error.main', 
                                    fontSize: 16,
                                    backgroundColor: 'white',
                                    borderRadius: '50%',
                                    padding: '2px'
                                }} 
                            />
                        </Box>
                    )}
                    
                    {currentStatus === 'available' ? (
                        <Typography variant="caption" color="text.secondary">
                            Verfügbar
                        </Typography>
                    ) : (
                        <Chip
                            label={currentStatus === 'custom' && currentCustomText ? currentCustomText : statusInfo.label}
                            size="small"
                            sx={{
                                backgroundColor: statusInfo.color,
                                color: 'white',
                                fontSize: '0.75rem',
                                height: 20,
                                maxWidth: '100%',
                                '& .MuiChip-label': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }
                            }}
                        />
                    )}
                </Box>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                {statusOptions.map((option) => (
                    <MenuItem
                        key={option.value}
                        onClick={() => handleStatusSelect(option.value)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <Box
                            sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: option.color,
                            }}
                        />
                        {option.label}
                    </MenuItem>
                ))}
            </Menu>

            <Dialog
                open={customDialogOpen}
                onClose={handleCustomCancel}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Sonstiges - Beschreibung eingeben</DialogTitle>
                <DialogContent>
                     <TextField
                         autoFocus
                         margin="dense"
                         label="Beschreibung"
                         placeholder="Geben Sie eine Beschreibung ein..."
                         fullWidth
                         multiline
                         rows={3}
                         value={tempCustomText}
                         onChange={(e) => setTempCustomText(e.target.value)}
                     />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCustomCancel}>
                        Abbrechen
                    </Button>
                     <Button 
                         onClick={handleCustomSubmit}
                         variant="contained"
                         disabled={!tempCustomText.trim()}
                     >
                        Speichern
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
