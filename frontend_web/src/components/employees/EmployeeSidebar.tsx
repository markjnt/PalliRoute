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
    Chip,
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
    Upload as UploadIcon,
    Add as AddIcon,
    ChangeCircle as ChangeIcon,
} from '@mui/icons-material';
import { Employee } from '../../types/models';
import { EmployeeForm } from './EmployeeForm';
import { EmployeeImport } from './EmployeeImport';
import { useAreaStore } from '../../stores/useAreaStore';
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

const getAreaChipColor = (area: string) => {
    if (area === 'Nordkreis') return 'primary';
    if (area === 'Südkreis') return 'secondary';
    if (area === 'Nord- und Südkreis' || area === 'Gesamt') return 'default';
    return 'default';
};

const getAreaInitial = (area: string) => {
    if (area === 'Nordkreis') return 'N';
    if (area === 'Südkreis') return 'S';
    if (area === 'Nord- und Südkreis' || area === 'Gesamt') return 'G';
    return '?';
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
    const { currentArea, setCurrentArea } = useAreaStore();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    // React Query hooks
    const { data: employees = [], isLoading, error } = useEmployees();
    const deleteEmployeeMutation = useDeleteEmployee();
    const toggleEmployeeActiveMutation = useToggleEmployeeActive();

    const handleAreaChange = () => {
        setCurrentArea(null);
        navigate('/select-area');
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
            setDeleteDialogOpen(false);
            setEmployeeToDelete(null);
        } catch (error) {
            console.error('Error deleting employee:', error);
            // Optional: Show error message to user
        }
    };

    const handleToggleAllActive = async (status: boolean) => {
        try {
            // Filter employees that need to be changed and have valid IDs
            const employeesToToggle = employees.filter(emp => emp.is_active !== status && emp.id);
            
            // Update all employees in parallel
            await Promise.all(
                employeesToToggle.map(emp => 
                    toggleEmployeeActiveMutation.mutateAsync({ id: emp.id!, isActive: status })
                )
            );
        } catch (error) {
            console.error('Error toggling all employees:', error);
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
            type: 'boolean',
            filterable: true,
            valueFormatter: (params: any) => params.value ? 'Aktiv' : 'Inaktiv',
            renderCell: (params: GridRenderCellParams) => (
                <Tooltip title={params.value ? 'Aktiv' : 'Inaktiv'}>
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
            minWidth: 120,
            filterable: true,
        },
        { 
            field: 'first_name', 
            headerName: 'Vorname', 
            flex: 1,
            minWidth: 120,
            filterable: true,
        },
        {
            field: 'area',
            headerName: 'Gebiet',
            width: 120,
            filterable: true,
            type: 'singleSelect',
            valueOptions: ['Nordkreis', 'Südkreis'],
        },
        {
            field: 'tour_number',
            headerName: 'Tournummer',
            width: 110,
            filterable: true,
            type: 'number',
        },
        { 
            field: 'street', 
            headerName: 'Straße', 
            flex: 1.5,
            minWidth: 150,
            filterable: true,
        },
        { 
            field: 'zip_code', 
            headerName: 'PLZ', 
            width: 80,
            filterable: true,
        },
        { 
            field: 'city', 
            headerName: 'Ort', 
            flex: 1,
            minWidth: 120,
            filterable: true,
        },
        { 
            field: 'function', 
            headerName: 'Funktion', 
            flex: 1,
            minWidth: 120,
            filterable: true,
        },
        {
            field: 'work_hours',
            headerName: 'Stellenumfang',
            width: 110,
            filterable: true,
            type: 'number',
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
                    <Chip
                        label={getAreaInitial(currentArea || '')}
                        color={getAreaChipColor(currentArea || '')}
                        onClick={handleAreaChange}
                        clickable
                        icon={<ChangeIcon fontSize="medium" />}
                        sx={{
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            px: 1,
                            py: 1,
                            borderRadius: '22px',
                            justifyContent: 'center',
                            textAlign: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                            cursor: 'pointer',
                            userSelect: 'none',
                        }}
                    />
                    <Typography variant="h6" component="h2">
                        Mitarbeiterverwaltung
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                    variant="contained"
                    onClick={() => setOpenImport(true)}
                    fullWidth
                    startIcon={<UploadIcon />}
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
                    startIcon={<AddIcon />}
                >
                    Mitarbeiter hinzufügen
                </Button>
            </Box>

            <Divider />

            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, width: '100%' }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleToggleAllActive(true)}
                        disabled={toggleEmployeeActiveMutation.isPending}
                        startIcon={<ActiveIcon />}
                    >
                        Alle aktivieren
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleToggleAllActive(false)}
                        disabled={toggleEmployeeActiveMutation.isPending}
                        startIcon={<InactiveIcon />}
                    >
                        Alle deaktivieren
                    </Button>
                </Box>

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
                            noRowsLabel: 'Keine Einträge',
                            filterPanelAddFilter: 'Filter hinzufügen',
                            filterPanelDeleteIconLabel: 'Löschen',
                            filterPanelInputLabel: 'Wert',
                            filterPanelInputPlaceholder: 'Filterwert',
                            filterOperatorContains: 'enthält',
                            filterOperatorEquals: 'ist gleich',
                            filterOperatorStartsWith: 'beginnt mit',
                            filterOperatorEndsWith: 'endet mit',
                            filterOperatorIsEmpty: 'ist leer',
                            filterOperatorIsNotEmpty: 'ist nicht leer',
                            filterOperatorIs: 'ist',
                            filterOperatorNot: 'ist nicht',
                            filterOperatorAfter: 'ist nach',
                            filterOperatorOnOrAfter: 'ist am oder nach',
                            filterOperatorBefore: 'ist vor',
                            filterOperatorOnOrBefore: 'ist am oder vor',
                            columnMenuFilter: 'Filter',
                            columnMenuHideColumn: 'Spalte ausblenden',
                            columnMenuShowColumns: 'Spalten anzeigen',
                            columnMenuManageColumns: 'Spalten verwalten',
                            columnMenuSortAsc: 'Aufsteigend sortieren',
                            columnMenuSortDesc: 'Absteigend sortieren',
                            columnMenuUnsort: 'Sortierung aufheben',
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
                            '& .MuiDataGrid-filterIcon': {
                                opacity: 1,
                            },
                            height: '100%',
                            border: 'none'
                        }}
                        initialState={{
                            filter: {
                                filterModel: {
                                    items: [],
                                    quickFilterValues: [''],
                                },
                            },
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