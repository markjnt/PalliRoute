import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    IconButton,
    Tooltip,
    CircularProgress,
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
} from '@mui/icons-material';
import { Employee } from '../../types/models';
import { employeesApi } from '../../services/api/employees';
import { EmployeeForm } from './EmployeeForm';
import { EmployeeImport } from './EmployeeImport';

export const EmployeeList: React.FC = () => {
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
            // TODO: Add error handling/notification
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
                // TODO: Add success notification
            } catch (error) {
                console.error('Error deleting employee:', error);
                // TODO: Add error notification
            }
        }
    };

    const handleToggleActive = async (id: number, currentStatus: boolean) => {
        try {
            await employeesApi.toggleActive(id, !currentStatus);
            await fetchEmployees();
            // TODO: Add success notification
        } catch (error) {
            console.error('Error toggling employee status:', error);
            // TODO: Add error notification
        }
    };

    const columns: GridColDef[] = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'first_name', headerName: 'Vorname', width: 130 },
        { field: 'last_name', headerName: 'Nachname', width: 130 },
        { field: 'street', headerName: 'Straße', width: 200 },
        { field: 'zip_code', headerName: 'PLZ', width: 100 },
        { field: 'city', headerName: 'Ort', width: 130 },
        { field: 'function', headerName: 'Funktion', width: 130 },
        {
            field: 'work_hours',
            headerName: 'Stellenumfang',
            width: 130,
            valueFormatter: (params: GridRenderCellParams) => `${params.value}%`,
        },
        {
            field: 'is_active',
            headerName: 'Status',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Tooltip title={params.row.is_active ? 'Aktiv' : 'Inaktiv'}>
                    <IconButton
                        onClick={() => handleToggleActive(params.row.id, params.row.is_active)}
                        color={params.row.is_active ? 'success' : 'error'}
                    >
                        {params.row.is_active ? <ActiveIcon /> : <InactiveIcon />}
                    </IconButton>
                </Tooltip>
            ),
        },
        {
            field: 'actions',
            headerName: 'Aktionen',
            width: 130,
            renderCell: (params: GridRenderCellParams) => (
                <Box>
                    <Tooltip title="Bearbeiten">
                        <IconButton onClick={() => handleEdit(params.row)}>
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Löschen">
                        <IconButton onClick={() => handleDelete(params.row.id)} color="error">
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    return (
        <Box sx={{ height: '100%', width: '100%', p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h5" component="h2">
                    Mitarbeiterverwaltung
                </Typography>
                <Box>
                    <Button
                        variant="contained"
                        onClick={() => setOpenImport(true)}
                        sx={{ mr: 1 }}
                    >
                        Excel Import
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            setSelectedEmployee(null);
                            setOpenForm(true);
                        }}
                    >
                        Mitarbeiter hinzufügen
                    </Button>
                </Box>
            </Box>

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
                    checkboxSelection
                    disableRowSelectionOnClick
                    autoHeight
                />
            )}

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