import React from 'react';
import { 
    Menu, 
    MenuItem, 
    Typography, 
    Box, 
    Chip, 
    ListItemText,
    Divider,
    Avatar
} from '@mui/material';
import { Employee } from '../../types/models';
import { getColorForTour, employeeTypeColors } from '../../utils/colors';
import { useEmployeePlanning } from '../../services/queries/useEmployeePlanning';
import { usePlanningWeekStore } from '../../stores/usePlanningWeekStore';
import { EmployeePlanningData } from '../../services/api/employeePlanning';

interface ReplacementMenuProps {
    open: boolean;
    anchorEl: HTMLElement | null;
    onClose: () => void;
    availableEmployees: Employee[];
    currentEmployeeId: number;
    weekday: string;
    patientCountByEmployee?: Map<number, number>;
    onSelectReplacement: (replacementId: number | null) => void;
}

export const ReplacementMenu: React.FC<ReplacementMenuProps> = ({
    open,
    anchorEl,
    onClose,
    availableEmployees,
    currentEmployeeId,
    weekday,
    patientCountByEmployee = new Map(),
    onSelectReplacement
}) => {
    const { selectedPlanningWeek, getCurrentPlanningWeek } = usePlanningWeekStore();
    const currentWeek = selectedPlanningWeek || getCurrentPlanningWeek();
    const { data: planningData, isLoading: planningLoading } = useEmployeePlanning();

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

    // Helper function to get employee status for current weekday
    const getEmployeeStatus = (employeeId: number) => {
        if (!planningData?.data || !dbWeekday) return 'available';
        
        const planningEntry = planningData.data.find(
            (entry: EmployeePlanningData) => entry.employee_id === employeeId && entry.weekday === dbWeekday
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

    // Filter out current employee and sort by function priority and name
    const filteredEmployees = React.useMemo(() => {
        const functionPriority: Record<string, number> = {
            'Pflegekraft': 1,
            'PDL': 2,
            'Physiotherapie': 3,
            'Arzt': 4,
            'Honorararzt': 5,
        };

        return availableEmployees
            .filter(emp => emp.id !== currentEmployeeId)
            .sort((a, b) => {
                // First sort by function priority
                const aPriority = functionPriority[a.function] || 999;
                const bPriority = functionPriority[b.function] || 999;
                
                if (aPriority !== bPriority) {
                    return aPriority - bPriority;
                }
                
                // Then sort by last name, then first name
                const aName = `${a.last_name} ${a.first_name}`.toLowerCase();
                const bName = `${b.last_name} ${b.first_name}`.toLowerCase();
                
                return aName.localeCompare(bName);
            });
    }, [availableEmployees, currentEmployeeId]);
    
    const availableEmployeesList = filteredEmployees.filter(emp => {
        const status = getEmployeeStatus(emp.id || 0);
        return status === 'available';
    });

    const unavailableEmployeesList = filteredEmployees.filter(emp => {
        const status = getEmployeeStatus(emp.id || 0);
        return status !== 'available';
    });

    // Function to create avatar props using tour colors
    const createTourAvatar = (employee: Employee) => {
        const tourColor = getColorForTour(employee.id);
        return {
            sx: {
                bgcolor: tourColor,
                width: 24,
                height: 24,
                fontSize: '0.75rem',
                color: 'white',
                fontWeight: 'bold',
            },
            children: `${employee.first_name[0]}${employee.last_name[0]}`.toUpperCase(),
        };
    };

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
            {/* Clear replacement option */}
            <MenuItem 
                onClick={() => {
                    onSelectReplacement(null);
                    onClose();
                }}
                sx={{
                    py: 1,
                    '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    }
                }}
            >
                <ListItemText>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                            sx={{ 
                                width: 24, 
                                height: 24, 
                                bgcolor: 'grey.400',
                                fontSize: '0.75rem'
                            }}
                        >
                            ×
                        </Avatar>
                        <Typography variant="body2" color="text.secondary">
                            Keine Vertretung
                        </Typography>
                    </Box>
                </ListItemText>
            </MenuItem>

            {/* Divider */}
            <Divider sx={{ my: 1 }} />

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
                    (entry: EmployeePlanningData) => entry.employee_id === emp.id && entry.weekday === dbWeekday
                );
                
                return (
                    <MenuItem 
                        key={emp.id}
                        onClick={() => {
                            onSelectReplacement(emp.id || 0);
                            onClose();
                        }}
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
                                <Avatar {...createTourAvatar(emp)} />
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
                    (entry: EmployeePlanningData) => entry.employee_id === emp.id && entry.weekday === dbWeekday
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
                                <Avatar {...createTourAvatar(emp)} />
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
