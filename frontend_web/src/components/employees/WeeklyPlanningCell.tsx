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
    Avatar,
} from '@mui/material';
import { Warning, PersonAdd } from '@mui/icons-material';
import { ReplacementMenu } from './ReplacementMenu';
import { ReplacementConfirmationDialog } from './ReplacementConfirmationDialog';
import { useUpdateReplacement } from '../../services/queries/useEmployeePlanning';
import { getColorForTour } from '../../utils/colors';

export type PlanningStatus = 'available' | 'vacation' | 'sick' | 'custom';

export interface PlanningData {
    status: PlanningStatus;
    customText?: string;
}

interface WeeklyPlanningCellProps {
    employeeId: number;
    weekday: string;
    allPlanningData?: any[]; // Alle Planning-Daten werden übergeben
    availableEmployees?: any[]; // Available employees for replacement
    onStatusChange: (employeeId: number, weekday: string, data: PlanningData) => void;
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
    availableEmployees = [],
    onStatusChange,
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
    const replacementEmployee = relevantData?.replacement_employee;

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [customDialogOpen, setCustomDialogOpen] = useState(false);
    const [tempCustomText, setTempCustomText] = useState('');
    const [replacementMenuAnchor, setReplacementMenuAnchor] = useState<null | HTMLElement>(null);
    const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
    const [pendingReplacement, setPendingReplacement] = useState<{
        targetEmployee: any;
        isRemoving: boolean;
        replacementId: number | null;
    } | null>(null);
    
    const updateReplacementMutation = useUpdateReplacement();

    // Function to get patient counts for all employees from planning data
    const getPatientCountsForAllEmployees = () => {
        const counts = new Map<number, number>();
        
        // Get all unique employee IDs from available employees
        availableEmployees.forEach(emp => {
            const employeeId = emp.id || 0;
            
            // Find planning data for this employee and current weekday
            const planningEntry = allPlanningData.find(
                (entry: any) => entry.employee_id === employeeId && entry.weekday === dbWeekday
            );
            
            // Use patient_count from planning data, or 0 if not found
            const patientCount = planningEntry?.patient_count || 0;
            counts.set(employeeId, patientCount);
        });
        
        return counts;
    };

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

    const handleReplacementMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation(); // Prevent status menu from opening
        setReplacementMenuAnchor(event.currentTarget);
    };

    const handleReplacementMenuClose = () => {
        setReplacementMenuAnchor(null);
    };

    const handleSelectReplacement = async (replacementId: number | null) => {
        // Determine source and target employees based on current state
        let sourceEmployee: any;
        let targetEmployee: any = null;
        let isRemoving = false;

        if (replacementId === null) {
            // Removing replacement - source is current replacement, target is original employee
            if (replacementEmployee) {
                sourceEmployee = replacementEmployee;
                targetEmployee = availableEmployees.find(emp => emp.id === employeeId);
                isRemoving = true;
            } else {
                // No replacement to remove, just set to null
                try {
                    await updateReplacementMutation.mutateAsync({
                        employeeId,
                        weekday,
                        replacementId: undefined
                    });
                } catch (error) {
                    console.error('Error updating replacement:', error);
                }
                return;
            }
        } else {
            // Setting replacement - source is original employee, target is new replacement
            sourceEmployee = availableEmployees.find(emp => emp.id === employeeId);
            targetEmployee = availableEmployees.find(emp => emp.id === replacementId);
        }

        // Check if there are patients to move
        const sourcePatientCount = getPatientCountsForAllEmployees().get(sourceEmployee?.id) || 0;
        
        if (sourcePatientCount > 0) {
            // Show confirmation dialog
            setPendingReplacement({
                targetEmployee,
                isRemoving,
                replacementId
            });
            setConfirmationDialogOpen(true);
        } else {
            // No patients to move, just update replacement
            try {
                await updateReplacementMutation.mutateAsync({
                    employeeId,
                    weekday,
                    replacementId: replacementId || undefined
                });
            } catch (error) {
                console.error('Error updating replacement:', error);
            }
        }
    };

    const handleConfirmReplacement = async () => {
        if (!pendingReplacement) return;

        try {
            // Update replacement after successful patient move
            await updateReplacementMutation.mutateAsync({
                employeeId,
                weekday,
                replacementId: pendingReplacement.replacementId || undefined
            });
        } catch (error) {
            console.error('Error updating replacement:', error);
        } finally {
            setConfirmationDialogOpen(false);
            setPendingReplacement(null);
        }
    };

    const handleCancelReplacement = () => {
        setConfirmationDialogOpen(false);
        setPendingReplacement(null);
    };

    // Get status display info
    const statusInfo = statusOptions.find(option => option.value === currentStatus) || statusOptions[0];

    const isWeekend = weekday === 'Samstag' || weekday === 'Sonntag';

    return (
        <>
            <Box 
                sx={{ 
                    minHeight: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px dashed',
                    borderColor: hasConflicts ? 'error.main' : 'grey.300',
                    borderRadius: 1,
                    backgroundColor: isWeekend ? 'grey.100' : 'grey.50',
                    position: 'relative',
                    px: 1,
                    '&:hover': {
                        backgroundColor: 'grey.200',
                        borderColor: 'grey.400',
                        cursor: 'pointer'
                    }
                }}
                onClick={handleMenuOpen}
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
                    
                    {/* Status display */}
                    <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        {hasConflicts ? (
                            <Tooltip 
                                title={`${appointmentsCount} Termin${appointmentsCount !== 1 ? 'e' : ''} vorhanden`}
                                arrow
                                placement="top"
                            >
                                <Box>
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
                        ) : (
                            <>
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
                            </>
                        )}
                    </Box>

                {/* Replacement Avatar - Only for weekdays */}
                {!isWeekend && (
                    <Box sx={{ ml: 1 }}>
                        {replacementEmployee ? (
                            <Tooltip 
                                title={`Vertretung: ${replacementEmployee.first_name} ${replacementEmployee.last_name}`}
                                arrow
                                placement="top"
                            >
                                <Avatar
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        bgcolor: getColorForTour(replacementEmployee.id),
                                        fontSize: '0.7rem',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            opacity: 0.8
                                        }
                                    }}
                                    onClick={handleReplacementMenuOpen}
                                >
                                    {`${replacementEmployee.first_name[0]}${replacementEmployee.last_name[0]}`.toUpperCase()}
                                </Avatar>
                            </Tooltip>
                        ) : (
                            <Tooltip title="Vertretung hinzufügen" arrow placement="top">
                                <IconButton
                                    size="small"
                                    onClick={handleReplacementMenuOpen}
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        p: 0,
                                        '&:hover': {
                                            backgroundColor: 'primary.50'
                                        }
                                    }}
                                >
                                    <PersonAdd sx={{ fontSize: 16, color: 'text.secondary' }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                )}
                </Box>

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

            {/* Replacement Menu */}
            <ReplacementMenu
                open={Boolean(replacementMenuAnchor)}
                anchorEl={replacementMenuAnchor}
                onClose={handleReplacementMenuClose}
                availableEmployees={availableEmployees}
                currentEmployeeId={employeeId}
                weekday={weekday}
                patientCountByEmployee={getPatientCountsForAllEmployees()}
                onSelectReplacement={handleSelectReplacement}
            />

            {/* Replacement Confirmation Dialog */}
            {pendingReplacement && (
                <ReplacementConfirmationDialog
                    open={confirmationDialogOpen}
                    onClose={handleCancelReplacement}
                    onConfirm={handleConfirmReplacement}
                    sourceEmployee={pendingReplacement.isRemoving ? replacementEmployee : availableEmployees.find(emp => emp.id === employeeId)}
                    targetEmployee={pendingReplacement.targetEmployee}
                    weekday={weekday}
                    patientCount={getPatientCountsForAllEmployees().get(pendingReplacement.isRemoving ? replacementEmployee?.id : employeeId) || 0}
                    targetPatientCount={getPatientCountsForAllEmployees().get(pendingReplacement.targetEmployee?.id) || 0}
                    isRemovingReplacement={pendingReplacement.isRemoving}
                />
            )}
        </>
    );
};
