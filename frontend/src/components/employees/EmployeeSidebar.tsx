import React, { useState } from 'react';
import {
    Box,
    Button,
    Typography,
    IconButton,
    Tooltip,
    CircularProgress,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Avatar,
    Menu,
    MenuItem,
    Alert,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
} from '@mui/x-data-grid';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle as ActiveIcon,
    Cancel as InactiveIcon,
    LocationOn as LocationIcon,
    ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { Employee } from '../../types/models';
import { EmployeeForm } from './EmployeeForm';
import { EmployeeImport } from './EmployeeImport';
import { useUserStore } from '../../stores/useUserStore';
import { useNavigate } from 'react-router-dom';
import { useEmployees, useDeleteEmployee, useToggleEmployeeActive } from '../../services/queries/useEmployees';

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
    const [openImport, setOpenImport] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<{id: number, name: string} | null>(null);
    const { currentUser, setCurrentUser } = useUserStore();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    // React Query hooks
    const { data: employees = [], isLoading, error } = useEmployees();
    const deleteEmployeeMutation = useDeleteEmployee();
    const toggleEmployeeActiveMutation = useToggleEmployeeActive();

    const handleUserChange = () => {
        setCurrentUser(null);
        navigate('/select-user');
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
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
            setEmployeeToDelete(null);
            
            // Events entfernt, React Query übernimmt die Datensynchronisierung
        } catch (error) {
            console.error('Error deleting employee:', error);
        }
    };

    const handleToggleActive = async (id: number, currentStatus: boolean) => {
        try {
            await toggleEmployeeActiveMutation.mutateAsync({ id, isActive: !currentStatus });
            
            // Events entfernt, React Query übernimmt die Datensynchronisierung
        } catch (error) {
            console.error('Error toggling employee status:', error);
        }
    };

    const handleFormClose = (updated?: boolean) => {
        setOpenForm(false);
        setSelectedEmployee(null);
        
        // Events entfernt, React Query übernimmt die Datensynchronisierung
    };

    const columns: GridColDef[] = [
        {
            field: 'is_active',
            headerName: 'Status',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Tooltip title={params.row.is_active ? 'Aktiv' : 'Inaktiv'}>
                    <IconButton
                        onClick={() => handleToggleActive(params.row.id, params.row.is_active)}
                        color={params.row.is_active ? 'success' : 'error'}
                        size="small"
                        disabled={toggleEmployeeActiveMutation.isPending}
                    >
                        {params.row.is_active ? <ActiveIcon /> : <InactiveIcon />}
                    </IconButton>
                </Tooltip>
            ),
        },
        { 
            field: 'last_name', 
            headerName: 'Nachname', 
            flex: 1,
            minWidth: 120
        },
        { 
            field: 'first_name', 
            headerName: 'Vorname', 
            flex: 1,
            minWidth: 120
        },
        {
            field: 'tour_number',
            headerName: 'Tournummer',
            width: 110,
        },
        { 
            field: 'street', 
            headerName: 'Straße', 
            flex: 1.5,
            minWidth: 150
        },
        { 
            field: 'zip_code', 
            headerName: 'PLZ', 
            width: 80
        },
        { 
            field: 'city', 
            headerName: 'Ort', 
            flex: 1,
            minWidth: 120
        },
        { 
            field: 'function', 
            headerName: 'Funktion', 
            flex: 1,
            minWidth: 120
        },
        {
            field: 'work_hours',
            headerName: 'Stellenumfang',
            width: 110,
            renderCell: (params: GridRenderCellParams) => (
                params.value === undefined || params.value === null ? '-' : `${params.value} %`
            )
        },
        {
            field: 'actions',
            headerName: 'Aktionen',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Box>
                    <Tooltip title="Bearbeiten">
                        <IconButton 
                            onClick={() => handleEdit(params.row)} 
                            size="small"
                        >
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Löschen">
                        <IconButton 
                            onClick={() => handleDeleteClick(params.row)} 
                            color="error" 
                            size="small"
                            disabled={deleteEmployeeMutation.isPending}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

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
                    <Avatar
                        onClick={(event) => setAnchorEl(event.currentTarget)}
                        {...stringAvatar(currentUser?.name || '')}
                    />
                    <Typography variant="h6" component="h2">
                        Mitarbeiterverwaltung
                    </Typography>
                </Box>
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                    PaperProps={{
                        elevation: 3,
                        sx: {
                            minWidth: 200,
                            mt: 1,
                            borderRadius: 2,
                            overflow: 'visible',
                            '&:before': {
                                content: '""',
                                display: 'block',
                                position: 'absolute',
                                top: 0,
                                left: 14,
                                width: 10,
                                height: 10,
                                bgcolor: 'background.paper',
                                transform: 'translateY(-50%) rotate(45deg)',
                                zIndex: 0,
                            },
                        },
                    }}
                    transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
                >
                    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Avatar 
                            {...stringAvatar(currentUser?.name || '')}
                            sx={{ 
                                width: 60, 
                                height: 60, 
                                mb: 1,
                                bgcolor: stringToColor(currentUser?.name || '')
                            }}
                        />
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {currentUser?.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <LocationIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                                {currentUser?.area}
                            </Typography>
                        </Box>
                    </Box>
                    
                    <Divider />
                    
                    <MenuItem onClick={handleUserChange} sx={{ mt: 1 }}>
                        <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                        <Typography>Benutzer wechseln</Typography>
                    </MenuItem>
                </Menu>
            </Box>

            <Box sx={{ p: 2 }}>
                <Button
                    variant="contained"
                    onClick={() => setOpenImport(true)}
                    fullWidth
                    sx={{ mb: 1 }}
                >
                    Excel Import
                </Button>
                <Button
                    variant="contained"
                    onClick={() => {
                        setSelectedEmployee(null);
                        setOpenForm(true);
                    }}
                    fullWidth
                >
                    Mitarbeiter hinzufügen
                </Button>
            </Box>

            <Divider />

            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                {error instanceof Error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error.message}
                    </Alert>
                )}
                
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <DataGrid
                        rows={employees}
                        columns={columns}
                        hideFooter={true}
                        disableRowSelectionOnClick
                        localeText={{
                            noRowsLabel: 'Keine Einträge'
                        }}
                        sx={{
                            '& .MuiDataGrid-cell': {
                                py: 1
                            },
                            '& .MuiDataGrid-main': {
                                overflow: 'auto',
                                width: 'auto',
                                minWidth: '100%',
                            },
                            '& .MuiDataGrid-virtualScroller': {
                                overflow: 'auto !important'
                            },
                            height: '100%',
                            border: 'none'
                        }}
                    />
                )}
            </Box>

            {openForm && (
                <EmployeeForm
                    open={openForm}
                    onClose={handleFormClose}
                    employee={selectedEmployee}
                />
            )}

            {openImport && (
                <EmployeeImport
                    open={openImport}
                    onClose={() => setOpenImport(false)}
                />
            )}

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