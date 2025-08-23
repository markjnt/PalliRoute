import React from 'react';
import { Box, Avatar } from '@mui/material';
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
        left: 20,
        zIndex: 1000,
      }}
    >
      <Avatar
        onClick={onUserSwitch}
        sx={{
          width: 56,
          height: 56,
          bgcolor: selectedEmployee ? getEmployeeColor(selectedEmployee.function) : '#007AFF',
          color: 'white',
          fontSize: '1.2rem',
          fontWeight: 600,
          cursor: 'pointer',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
          '&:hover': {
            bgcolor: selectedEmployee ? getEmployeeColor(selectedEmployee.function) : '#007AFF',
            transform: 'scale(1.05)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 6px 20px rgba(0, 0, 0, 0.1)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {selectedEmployee ? (
          getInitials(selectedEmployee.first_name, selectedEmployee.last_name)
        ) : (
          '?'
        )}
      </Avatar>
    </Box>
  );
};
