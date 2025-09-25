import React from 'react';
import { 
    Menu, 
    MenuItem, 
    Typography, 
    Box, 
    Chip, 
    ListItemText,
    Divider
} from '@mui/material';
import { Employee } from '../../../types/models';
import { getColorForTour, employeeTypeColors } from '../../../utils/colors';
import { useEmployeePlanning } from '../../../services/queries/useEmployeePlanning';
import { useWeekdayStore } from '../../../stores/useWeekdayStore';
import { EmployeePlanningData } from '../../../services/api/employeePlanning';

interface ReassignMenuProps {
    open: boolean;
    anchorEl: HTMLElement | null;
    onClose: () => void;
    availableEmployees: Employee[];
    patientCountByEmployee: Map<number, number>;
    onMoveAllPatients: (targetEmployeeId: number) => void;
}

export const ReassignMenu: React.FC<ReassignMenuProps> = ({
    open,
    anchorEl,
    onClose,
    availableEmployees,
    patientCountByEmployee,
    onMoveAllPatients
}) => {
    const { selectedWeekday } = useWeekdayStore();
    const { data: planningData, isLoading: planningLoading } = useEmployeePlanning();

    // Helper function to get employee status for current weekday
    const getEmployeeStatus = (employeeId: number) => {
        if (!planningData?.data || !selectedWeekday) return 'available';
        
        const planningEntry = planningData.data.find(
            (entry: EmployeePlanningData) => entry.employee_id === employeeId && entry.weekday === selectedWeekday
        );
        
        return planningEntry?.status || 'available';
    };

    // Helper function to get status display text
    const getStatusDisplayText = (status: string, customText?: string) => {
        switch (status) {
            case 'available':
                return 'Verfügbar';
            case 'vacation':
                return 'Urlaub';
            case 'sick':
                return 'Krank';
            case 'custom':
                return customText || 'Benutzerdefiniert';
            default:
                return 'Verfügbar';
        }
    };

    // Helper function to get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available':
                return 'success';
            case 'vacation':
                return 'warning';
            case 'sick':
                return 'error';
            case 'custom':
                return 'info';
            default:
                return 'success';
        }
    };

    // Group employees by availability
    const availableEmployeesList = availableEmployees.filter(emp => {
        const status = getEmployeeStatus(emp.id || 0);
        return status === 'available';
    });

    const unavailableEmployeesList = availableEmployees.filter(emp => {
        const status = getEmployeeStatus(emp.id || 0);
        return status !== 'available';
    });
    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            sx={{
                '& .MuiPaper-root': {
                    maxHeight: 300,
                    overflow: 'auto',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    borderRadius: 2
                }
            }}
        >
            {/* Available Employees Section */}
            {availableEmployeesList.length > 0 && (
                <MenuItem disabled sx={{ py: 0.5, px: 2, opacity: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'success.main', opacity: 1 }}>
                        Verfügbare Mitarbeiter
                    </Typography>
                </MenuItem>
            )}
            {availableEmployeesList.map((emp) => {
                const patientCount = patientCountByEmployee.get(emp.id || 0) || 0;
                const isEmpty = patientCount === 0;
                const status = getEmployeeStatus(emp.id || 0);
                const planningEntry = planningData?.data?.find(
                    (entry: EmployeePlanningData) => entry.employee_id === emp.id && entry.weekday === selectedWeekday
                );
                
                return (
                    <MenuItem 
                        key={emp.id}
                        onClick={() => emp.id && onMoveAllPatients(emp.id)}
                        sx={{
                            py: 1,
                            ml: 1,
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.04)'
                            }
                        }}
                    >
                        <ListItemText>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                    label={`${emp.first_name} ${emp.last_name}`}
                                    size="small"
                                    sx={{
                                        height: 20,
                                        bgcolor: emp.id ? getColorForTour(emp.id) : 'primary.main',
                                        color: 'white',
                                        '& .MuiChip-label': {
                                            px: 1,
                                            fontSize: '0.75rem'
                                        }
                                    }}
                                />
                                <Chip
                                    label={emp.function}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                        borderColor: employeeTypeColors[emp.function] || employeeTypeColors.default,
                                        color: employeeTypeColors[emp.function] || employeeTypeColors.default,
                                        '& .MuiChip-label': {
                                            px: 1,
                                            fontSize: '0.7rem'
                                        }
                                    }}
                                />
                                <Chip
                                    label={getStatusDisplayText(status, planningEntry?.custom_text)}
                                    size="small"
                                    color={getStatusColor(status) as any}
                                    sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                        '& .MuiChip-label': {
                                            px: 1,
                                            fontSize: '0.7rem'
                                        }
                                    }}
                                />
                                {isEmpty && (
                                    <Chip
                                        label="Leer"
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            height: 20,
                                            fontSize: '0.7rem',
                                            borderColor: 'warning.main',
                                            color: 'warning.main'
                                        }}
                                    />
                                )}
                                {!isEmpty && (
                                    <Typography 
                                        variant="caption" 
                                        sx={{ 
                                            color: 'text.secondary',
                                            fontSize: '0.7rem'
                                        }}
                                    >
                                        {patientCount} {patientCount === 1 ? 'Patient' : 'Patienten'}
                                    </Typography>
                                )}
                            </Box>
                        </ListItemText>
                    </MenuItem>
                );
            })}

            {/* Divider between sections */}
            {availableEmployeesList.length > 0 && unavailableEmployeesList.length > 0 && (
                <Divider sx={{ my: 1 }} />
            )}

            {/* Unavailable Employees Section */}
            {unavailableEmployeesList.length > 0 && (
                <MenuItem disabled sx={{ py: 0.5, px: 2, opacity: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'error.main', opacity: 1 }}>
                        Nicht verfügbare Mitarbeiter
                    </Typography>
                </MenuItem>
            )}
            {unavailableEmployeesList.map((emp) => {
                const patientCount = patientCountByEmployee.get(emp.id || 0) || 0;
                const status = getEmployeeStatus(emp.id || 0);
                const planningEntry = planningData?.data?.find(
                    (entry: EmployeePlanningData) => entry.employee_id === emp.id && entry.weekday === selectedWeekday
                );
                
                return (
                    <MenuItem 
                        key={emp.id}
                        disabled
                        sx={{
                            py: 1,
                            ml: 1,
                            opacity: 0.6
                        }}
                    >
                        <ListItemText>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                    label={`${emp.first_name} ${emp.last_name}`}
                                    size="small"
                                    sx={{
                                        height: 20,
                                        bgcolor: emp.id ? getColorForTour(emp.id) : 'primary.main',
                                        color: 'white',
                                        '& .MuiChip-label': {
                                            px: 1,
                                            fontSize: '0.75rem'
                                        }
                                    }}
                                />
                                <Chip
                                    label={emp.function}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                        borderColor: employeeTypeColors[emp.function] || employeeTypeColors.default,
                                        color: employeeTypeColors[emp.function] || employeeTypeColors.default,
                                        '& .MuiChip-label': {
                                            px: 1,
                                            fontSize: '0.7rem'
                                        }
                                    }}
                                />
                                <Chip
                                    label={getStatusDisplayText(status, planningEntry?.custom_text)}
                                    size="small"
                                    color={getStatusColor(status) as any}
                                    sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                        '& .MuiChip-label': {
                                            px: 1,
                                            fontSize: '0.7rem'
                                        }
                                    }}
                                />
                                {patientCount > 0 && (
                                    <Typography 
                                        variant="caption" 
                                        sx={{ 
                                            color: 'text.secondary',
                                            fontSize: '0.7rem'
                                        }}
                                    >
                                        {patientCount} {patientCount === 1 ? 'Patient' : 'Patienten'}
                                    </Typography>
                                )}
                            </Box>
                        </ListItemText>
                    </MenuItem>
                );
            })}
        </Menu>
    );
};
