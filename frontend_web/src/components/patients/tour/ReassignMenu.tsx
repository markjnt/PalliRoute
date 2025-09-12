import React from 'react';
import { 
    Menu, 
    MenuItem, 
    Typography, 
    Box, 
    Chip, 
    ListItemText 
} from '@mui/material';
import { Employee } from '../../../types/models';
import { getColorForTour, employeeTypeColors } from '../../../utils/colors';

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
            {/* Active employees section */}
            <Typography 
                variant="subtitle2" 
                sx={{ px: 2, py: 1, bgcolor: 'background.default', fontWeight: 'bold' }}
            >
                Aktive Touren
            </Typography>
            
            {availableEmployees.map((emp) => {
                const patientCount = patientCountByEmployee.get(emp.id || 0) || 0;
                const isEmpty = patientCount === 0;
                
                return (
                    <MenuItem 
                        key={emp.id}
                        onClick={() => emp.id && onMoveAllPatients(emp.id)}
                        sx={{
                            py: 1,
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.04)'
                            }
                        }}
                    >
                        <ListItemText>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
        </Menu>
    );
};
