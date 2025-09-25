import React, { useState } from 'react';
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
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    TableChart as TableIcon,
} from '@mui/icons-material';
import { Employee } from '../../types/models';
import { EmployeeForm } from './EmployeeForm';
import { EmployeeTablePopup } from './EmployeeTablePopup';
import { WeeklyPlanningTable } from './WeeklyPlanningTable';
import { useNavigate } from 'react-router-dom';
import { useEmployees, useDeleteEmployee, useImportEmployees } from '../../services/queries/useEmployees';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useLastUpdateStore } from '../../stores/useLastUpdateStore';

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
    const navigate = useNavigate();

    // React Query hooks
    const { data: employees = [], isLoading, error } = useEmployees();
    const deleteEmployeeMutation = useDeleteEmployee();
    const importEmployeesMutation = useImportEmployees();
    const { setNotification } = useNotificationStore();
    const { lastEmployeeImportTime, setLastEmployeeImportTime } = useLastUpdateStore();

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
            const totalEmployees = result.added_employees.length;
            setNotification(`${totalEmployees} Mitarbeiter wurden erfolgreich importiert`, 'success');
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
                justifyContent: 'flex-start',
                p: 2,
                height: 64,
                borderBottom: 1,
                borderColor: 'divider'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6" component="h2">
                        Mitarbeiterplanung
                    </Typography>
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