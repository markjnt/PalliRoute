import React from 'react';
import { Box, Button, Avatar, Chip, Typography } from '@mui/material';
import { Person as PersonIcon, SwapHoriz as SwapHorizIcon } from '@mui/icons-material';
import { useEmployees } from '../../services/queries/useEmployees';
import { useUserStore } from '../../stores/useUserStore';
import { employeeTypeColors } from '../../utils/colors';

interface UserSelectionButtonProps {
  onUserSwitch: () => void;
}

export const UserSelectionButton: React.FC<UserSelectionButtonProps> = ({ onUserSwitch }) => {
  const { selectedUserId } = useUserStore();
  const { data: employees = [] } = useEmployees();

  const selectedEmployee = employees.find(emp => emp.id === selectedUserId);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getEmployeeColor = (employeeFunction: string) => {
    return employeeTypeColors[employeeFunction] || employeeTypeColors.default;
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 50,
        left: 10,
        right: 10,
        zIndex: 1000,
      }}
    >
      <Button
        onClick={onUserSwitch}
        sx={{
          width: '100%',
          height: 64,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
          color: '#1d1d1f',
          textTransform: 'none',
          justifyContent: 'space-between',
          px: 3,
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 1)',
            transform: 'scale(1.02)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 6px 20px rgba(0, 0, 0, 0.1)',
          },
          '&:active': {
            transform: 'scale(1)',
          },
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {selectedEmployee ? (
            <>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: '#007AFF',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                }}
              >
                {getInitials(selectedEmployee.first_name, selectedEmployee.last_name)}
              </Avatar>
              <Box sx={{ textAlign: 'left' }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 600,
                    color: '#1d1d1f',
                    fontSize: '1rem',
                    lineHeight: 1.2,
                  }}
                >
                  {`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                </Typography>
                {selectedEmployee.function && (
                  <Chip
                    label={selectedEmployee.function}
                    size="small"
                    sx={{
                      bgcolor: getEmployeeColor(selectedEmployee.function),
                      color: 'white',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      height: 18,
                      mt: 0.5,
                      '& .MuiChip-label': {
                        px: 1,
                      },
                    }}
                  />
                )}
              </Box>
            </>
          ) : (
            <>
              <PersonIcon sx={{ color: '#86868b', fontSize: 24 }} />
              <Typography variant="body1" sx={{ color: '#86868b', fontWeight: 500 }}>
                Mitarbeiter auswählen
              </Typography>
            </>
          )}
        </Box>
        <SwapHorizIcon sx={{ color: '#007AFF', fontSize: 20 }} />
      </Button>
    </Box>
  );
};
