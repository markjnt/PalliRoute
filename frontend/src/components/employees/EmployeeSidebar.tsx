import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    IconButton,
    Tooltip,
    CircularProgress,
    Divider,
    Collapse,
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
    ExpandLess as CollapseIcon,
    ExpandMore as ExpandIcon,
} from '@mui/icons-material';
import { Employee } from '../../types/models';
import { employeesApi } from '../../services/api/employees';
import { EmployeeForm } from './EmployeeForm';
import { EmployeeImport } from './EmployeeImport';

interface EmployeeSidebarProps {
    expanded: boolean;
    onExpandToggle: () => void;
}

export const EmployeeSidebar: React.FC<EmployeeSidebarProps> = ({
    expanded,
    onExpandToggle,
}) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [openForm, setOpenForm] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [openImport, setOpenImport] = useState(false);

    const fetchEmployees = async () => {
        try {
            const data = await employeesApi.getAll();
            setEmployees(data);
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleEdit = (employee: Employee) => {
        setSelectedEmployee(employee);
        setOpenForm(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Sind Sie sicher, dass Sie diesen Mitarbeiter löschen möchten?')) {
            try {
                await employeesApi.delete(id);
                await fetchEmployees();
            } catch (error) {
                console.error('Error deleting employee:', error);
            }
        }
    };

    const handleToggleActive = async (id: number, currentStatus: boolean) => {
        try {
            await employeesApi.toggleActive(id, !currentStatus);
            await fetchEmployees();
        } catch (error) {
            console.error('Error toggling employee status:', error);
        }
    };

    const columns: GridColDef[] = [
        { field: 'first_name', headerName: 'Vorname', width: 130 },
        { field: 'last_name', headerName: 'Nachname', width: 130 },
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
                    >
                        {params.row.is_active ? <ActiveIcon /> : <InactiveIcon />}
                    </IconButton>
                </Tooltip>
            ),
        },
        {
            field: 'actions',
            headerName: 'Aktionen',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Box>
                    <Tooltip title="Bearbeiten">
                        <IconButton onClick={() => handleEdit(params.row)} size="small">
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Löschen">
                        <IconButton onClick={() => handleDelete(params.row.id)} color="error" size="small">
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 2,
                borderBottom: 1,
                borderColor: 'divider'
            }}>
                <Typography variant="h6" component="h2">
                    Mitarbeiterverwaltung
                </Typography>
                <IconButton onClick={onExpandToggle}>
                    {expanded ? <CollapseIcon /> : <ExpandIcon />}
                </IconButton>
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
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <DataGrid
                        rows={employees}
                        columns={columns}
                        initialState={{
                            pagination: {
                                paginationModel: { page: 0, pageSize: 10 },
                            },
                        }}
                        pageSizeOptions={[10, 25, 50]}
                        disableRowSelectionOnClick
                        autoHeight
                    />
                )}
            </Box>

            {openForm && (
                <EmployeeForm
                    open={openForm}
                    onClose={() => {
                        setOpenForm(false);
                        setSelectedEmployee(null);
                    }}
                    onSave={fetchEmployees}
                    employee={selectedEmployee}
                />
            )}

            {openImport && (
                <EmployeeImport
                    open={openImport}
                    onClose={() => setOpenImport(false)}
                    onImportSuccess={fetchEmployees}
                />
            )}
        </Box>
    );
}; 