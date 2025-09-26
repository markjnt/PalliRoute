import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    CircularProgress,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Popover,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    TableChart as TableIcon,
    CalendarMonth as CalendarIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { Employee } from '../../types/models';
import { EmployeeForm } from './EmployeeForm';
import { EmployeeTablePopup } from './EmployeeTablePopup';
import { WeeklyPlanningTable } from './WeeklyPlanningTable';
import { useNavigate } from 'react-router-dom';
import { useEmployees, useDeleteEmployee, useImportEmployees } from '../../services/queries/useEmployees';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useLastUpdateStore } from '../../stores/useLastUpdateStore';
import { usePlanningWeekStore } from '../../stores/usePlanningWeekStore';

// Function to generate a random color based on the user's name
const stringToColor = (string: string) => {
    let hash = 0;
    let i;

    for (i = 0; i < string.length; i += 1) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }

    let color = '#';

    for (i = 0; i < 3; i += 1) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.slice(-2);
    }

    return color;
};

// Function to create avatar props based on user's name
const stringAvatar = (name: string) => {
    return {
        sx: {
            bgcolor: stringToColor(name),
            marginRight: 2,
            '&:hover': {
                cursor: 'pointer',
                boxShadow: 3,
                transform: 'scale(1.1)',
            },
        },
        children: name.split(' ').map(part => part[0]).join('').toUpperCase(),
    };
};


interface EmployeeSidebarProps {
    width?: number;
}

export const EmployeeSidebar: React.FC<EmployeeSidebarProps> = ({
    width = 400,
}) => {
    const [openForm, setOpenForm] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<{id: number, name: string} | null>(null);
    const [tablePopupOpen, setTablePopupOpen] = useState(false);
    const [kwAnchorEl, setKwAnchorEl] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();

    // React Query hooks
    const { data: employees = [], isLoading, error } = useEmployees();
    const deleteEmployeeMutation = useDeleteEmployee();
    const importEmployeesMutation = useImportEmployees();
    const { setNotification } = useNotificationStore();
    const { lastEmployeeImportTime, setLastEmployeeImportTime } = useLastUpdateStore();
    
    // Planning week store
    const { 
        selectedPlanningWeek, 
        setSelectedPlanningWeek,
        getCurrentPlanningWeek,
        getAvailablePlanningWeeks 
    } = usePlanningWeekStore();
    
    const availablePlanningWeeks = getAvailablePlanningWeeks();

    // Format last update time for display
    const formatLastUpdateTime = (time: Date | null): string => {
        if (!time) return 'Noch nicht aktualisiert';
        
        return 'zuletzt ' + time.toLocaleDateString('de-DE') + ' ' + time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    };

    const handleEdit = (employee: Employee) => {
        setSelectedEmployee(employee);
        setOpenForm(true);
    };

    const handleDeleteClick = (employee: Employee) => {
        if (!employee.id) return;
        
        setEmployeeToDelete({
            id: employee.id,
            name: `${employee.first_name} ${employee.last_name}`
        });
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!employeeToDelete) return;
        
        try {
            await deleteEmployeeMutation.mutateAsync(employeeToDelete.id);
            setDeleteDialogOpen(false);
            setEmployeeToDelete(null);
        } catch (error) {
            console.error('Error deleting employee:', error);
            // Optional: Show error message to user
        }
    };



    const handleImport = async () => {
        try {
            const result = await importEmployeesMutation.mutateAsync();
            
            // Create detailed success message
            const { summary } = result;
            let message = 'Import erfolgreich: ';
            const parts = [];
            
            if (summary.added > 0) {
                parts.push(`${summary.added} hinzugefügt`);
            }
            if (summary.updated > 0) {
                parts.push(`${summary.updated} aktualisiert`);
            }
            if (summary.removed > 0) {
                parts.push(`${summary.removed} entfernt`);
            }
            
            if (parts.length > 0) {
                message += parts.join(', ');
                
                // Add detailed breakdown if there are multiple types of changes
                if (parts.length > 1) {
                    message += ` (Gesamt: ${summary.total_processed})`;
                }
            } else {
                message = 'Keine Änderungen erforderlich';
            }
            
            setNotification(message, 'success');
        } catch (error: any) {
            console.error('Error importing employees:', error);
            let message = 'Fehler beim Importieren der Mitarbeiter';
            if (error?.response?.data?.error) {
                message = error.response.data.error;
            } else if (error?.message) {
                message = error.message;
            }
            setNotification(message, 'error');
        }
    };

    const handleFormClose = (updated?: boolean) => {
        setOpenForm(false);
        setSelectedEmployee(null);
        
        // Events entfernt, React Query übernimmt die Datensynchronisierung
    };

    // Handle KW popover open/close
    const handleKwPopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setKwAnchorEl(event.currentTarget);
    };

    const handleKwPopoverClose = () => {
        setKwAnchorEl(null);
    };

    // Handle week navigation
    const handlePreviousWeek = () => {
        if (selectedPlanningWeek && selectedPlanningWeek > 1) {
            setSelectedPlanningWeek(selectedPlanningWeek - 1);
        }
    };

    const handleNextWeek = () => {
        if (selectedPlanningWeek && selectedPlanningWeek < 52) {
            setSelectedPlanningWeek(selectedPlanningWeek + 1);
        }
    };

    // Check if selected week matches current week
    const isCurrentWeek = selectedPlanningWeek === getCurrentPlanningWeek();

    // Set current week if no week is selected
    useEffect(() => {
        if (selectedPlanningWeek === null) {
            setSelectedPlanningWeek(getCurrentPlanningWeek());
        }
    }, [selectedPlanningWeek, setSelectedPlanningWeek, getCurrentPlanningWeek]);


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
                <Typography variant="h6" component="h2" sx={{ pl: 2 }}>
                    Mitarbeiterplanung
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, mr: 5 }}>
                    {/* Previous Week Button */}
                    <IconButton
                        onClick={handlePreviousWeek}
                        disabled={!selectedPlanningWeek || selectedPlanningWeek <= 1}
                        size="small"
                        sx={{ 
                            color: 'primary.main',
                            '&:hover': { backgroundColor: 'primary.50' }
                        }}
                    >
                        <ChevronLeftIcon />
                    </IconButton>
                    
                    {/* Calendar Week Selector Button */}
                    {selectedPlanningWeek && (
                        <Button
                            variant="outlined"
                            onClick={handleKwPopoverOpen}
                            startIcon={<CalendarIcon />}
                            endIcon={<ExpandMoreIcon />}
                            sx={{
                                minWidth: 100,
                                justifyContent: 'space-between',
                                textTransform: 'none',
                                fontWeight: 500,
                                borderColor: isCurrentWeek ? 'success.main' : 'primary.main',
                                color: isCurrentWeek ? 'success.main' : 'primary.main',
                                backgroundColor: isCurrentWeek ? 'success.50' : 'transparent',
                                '&:hover': {
                                    borderColor: isCurrentWeek ? 'success.dark' : 'primary.dark',
                                    backgroundColor: isCurrentWeek ? 'success.100' : 'primary.50',
                                }
                            }}
                        >
                            KW {selectedPlanningWeek}
                        </Button>
                    )}
                    
                    {/* Next Week Button */}
                    <IconButton
                        onClick={handleNextWeek}
                        disabled={!selectedPlanningWeek || selectedPlanningWeek >= 52}
                        size="small"
                        sx={{ 
                            color: 'primary.main',
                            '&:hover': { backgroundColor: 'primary.50' }
                        }}
                    >
                        <ChevronRightIcon />
                    </IconButton>
                </Box>
            </Box>

            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                    variant="contained"
                    onClick={handleImport}
                    fullWidth
                    startIcon={<RefreshIcon />}
                    disabled={importEmployeesMutation.isPending}
                >
                    {importEmployeesMutation.isPending ? 'Importiere...' : `Excel Import${lastEmployeeImportTime ? ` (${formatLastUpdateTime(lastEmployeeImportTime)})` : ''}`}
                </Button>
                <Button
                    variant="outlined"
                    onClick={() => setTablePopupOpen(true)}
                    fullWidth
                    startIcon={<TableIcon />}
                >
                    Mitarbeiterübersicht öffnen
                </Button>
            </Box>

            <Divider />

            <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <WeeklyPlanningTable employees={employees} />
            </Box>

            {/* Calendar Week Selection Popover */}
            <Popover
                open={Boolean(kwAnchorEl)}
                anchorEl={kwAnchorEl}
                onClose={handleKwPopoverClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                PaperProps={{
                    sx: {
                        minWidth: 150,
                        mt: 1,
                        borderRadius: 2,
                        boxShadow: 3,
                    }
                }}
            >
                <List sx={{ p: 1 }}>
                    {availablePlanningWeeks.map((week) => {
                        const isCurrentWeekItem = week === getCurrentPlanningWeek();
                        const isSelected = week === selectedPlanningWeek;
                        
                        return (
                            <ListItem key={week} disablePadding>
                                <ListItemButton
                                    onClick={() => {
                                        setSelectedPlanningWeek(week);
                                        handleKwPopoverClose();
                                    }}
                                    selected={isSelected}
                                    sx={{
                                        borderRadius: 1,
                                        mb: 0.5,
                                        backgroundColor: isCurrentWeekItem ? 'success.50' : 'transparent',
                                        '&.Mui-selected': {
                                            backgroundColor: isCurrentWeekItem ? 'success.main' : 'primary.main',
                                            color: 'white',
                                            '&:hover': {
                                                backgroundColor: isCurrentWeekItem ? 'success.dark' : 'primary.dark',
                                            }
                                        },
                                        '&:hover': {
                                            backgroundColor: isCurrentWeekItem ? 'success.100' : 'primary.50',
                                        }
                                    }}
                                >
                                    <ListItemText 
                                        primary={`KW ${week}`}
                                        primaryTypographyProps={{
                                            fontWeight: isSelected ? 600 : 400,
                                            fontSize: '0.875rem',
                                            color: isCurrentWeekItem && !isSelected ? 'success.dark' : 'inherit'
                                        }}
                                    />
                                    {isCurrentWeekItem && (
                                        <Box
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                backgroundColor: isSelected ? 'white' : 'success.main',
                                                ml: 1,
                                                opacity: 0.9
                                            }}
                                        />
                                    )}
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Popover>

            {openForm && (
                <EmployeeForm
                    open={openForm}
                    onClose={handleFormClose}
                    employee={selectedEmployee}
                />
            )}

            <EmployeeTablePopup
                open={tablePopupOpen}
                onClose={() => setTablePopupOpen(false)}
                employees={employees}
                isLoading={isLoading}
                error={error}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onAdd={() => {
                    setSelectedEmployee(null);
                    setOpenForm(true);
                }}
                isDeleting={deleteEmployeeMutation.isPending}
            />

            <Dialog
                open={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setEmployeeToDelete(null);
                }}
            >
                <DialogTitle>Mitarbeiter löschen</DialogTitle>
                <DialogContent>
                    <Typography>
                        Sind Sie sicher, dass Sie den Mitarbeiter {employeeToDelete?.name} löschen möchten?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Hinweis: Alle zugehörigen Termine und Routen werden ebenfalls gelöscht.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => {
                            setDeleteDialogOpen(false);
                            setEmployeeToDelete(null);
                        }}
                        disabled={deleteEmployeeMutation.isPending}
                    >
                        Abbrechen
                    </Button>
                    <Button 
                        onClick={handleDeleteConfirm}
                        variant="contained"
                        color="error"
                        disabled={deleteEmployeeMutation.isPending}
                    >
                        {deleteEmployeeMutation.isPending ? <CircularProgress size={24} /> : 'Löschen'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}; 