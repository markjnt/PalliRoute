import React from 'react';
import {
    Box,
    Button,
    Typography,
    IconButton,
    Tooltip,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
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
    Close as CloseIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import { Employee } from '../../types/models';

interface EmployeeTablePopupProps {
    open: boolean;
    onClose: () => void;
    employees: Employee[];
    isLoading: boolean;
    error: Error | null;
    onEdit: (employee: Employee) => void;
    onDelete: (employee: Employee) => void;
    onAdd: () => void;
    isDeleting: boolean;
}

export const EmployeeTablePopup: React.FC<EmployeeTablePopupProps> = ({
    open,
    onClose,
    employees,
    isLoading,
    error,
    onEdit,
    onDelete,
    onAdd,
    isDeleting,
}) => {
    const columns: GridColDef[] = [
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
            field: 'alias',
            headerName: 'Alias',
            width: 150,
            filterable: true,
            renderCell: (params: GridRenderCellParams) => (
                params.value || '-'
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
                            onClick={() => onEdit(params.row)} 
                            size="small"
                        >
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Löschen">
                        <IconButton 
                            onClick={() => onDelete(params.row)} 
                            color="error" 
                            size="small"
                            disabled={isDeleting}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            PaperProps={{
                sx: {
                    height: '90vh',
                    maxHeight: '90vh',
                }
            }}
        >
            <DialogTitle
                component="div"
                sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                pb: 1
            }}>
                <Box component="h2" sx={{ fontSize: '1.25rem', fontWeight: 600, m: 0 }}>
                    Mitarbeiterübersicht
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                        variant="contained"
                        onClick={onAdd}
                        startIcon={<AddIcon />}
                        size="small"
                    >
                        Mitarbeiter hinzufügen
                    </Button>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            
            <DialogContent sx={{ p: 0, height: '100%' }}>
                <Box sx={{ height: '100%', p: 2 }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error.message}
                        </Alert>
                    )}
                    
                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box sx={{ height: '100%', minHeight: 0 }}>
                            <DataGrid
                                rows={employees}
                                columns={columns}
                                hideFooter={false}
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
                        </Box>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
};
