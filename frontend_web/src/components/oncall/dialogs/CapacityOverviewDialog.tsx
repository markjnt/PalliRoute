import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { Employee, EmployeeCapacity } from '../../../types/models';
import { CapacityOverview } from '../capacity/CapacityOverview';
import { formatMonthYear } from '../../../utils/oncall/dateUtils';
import { employeeTypeColors } from '../../../utils/colors';

type FilterType = 'all' | 'pflege' | 'arzt';

interface CapacityOverviewDialogProps {
  open: boolean;
  employees: Employee[];
  employeeCapacities: EmployeeCapacity[];
  currentDate: Date;
  onClose: () => void;
}

export const CapacityOverviewDialog: React.FC<CapacityOverviewDialogProps> = ({
  open,
  employees,
  employeeCapacities,
  currentDate,
  onClose,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: '1.25rem',
                letterSpacing: '-0.01em',
              }}
            >
              Kapazitätsübersicht
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: '0.875rem',
                fontWeight: 500,
                mt: 0.5,
              }}
            >
              {formatMonthYear(currentDate)}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Filter Chips */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <Chip
            label="Alle"
            onClick={() => setActiveFilter('all')}
            sx={{
              fontWeight: activeFilter === 'all' ? 600 : 500,
              fontSize: '0.875rem',
              height: 32,
              borderRadius: 2.5,
              backgroundColor: activeFilter === 'all' ? 'primary.main' : 'rgba(0, 0, 0, 0.04)',
              color: activeFilter === 'all' ? 'white' : 'text.primary',
              border: activeFilter === 'all' ? 'none' : '1px solid',
              borderColor: 'rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: activeFilter === 'all' ? 'primary.dark' : 'rgba(0, 0, 0, 0.08)',
                transform: 'translateY(-1px)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
            }}
          />
          <Chip
            label="Pflege"
            onClick={() => setActiveFilter('pflege')}
            sx={{
              fontWeight: activeFilter === 'pflege' ? 600 : 500,
              fontSize: '0.875rem',
              height: 32,
              borderRadius: 2.5,
              backgroundColor: activeFilter === 'pflege' ? employeeTypeColors.default : 'rgba(0, 0, 0, 0.04)',
              color: activeFilter === 'pflege' ? 'white' : 'text.primary',
              border: activeFilter === 'pflege' ? 'none' : '1px solid',
              borderColor: 'rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: activeFilter === 'pflege' ? employeeTypeColors.default : 'rgba(0, 0, 0, 0.08)',
                transform: 'translateY(-1px)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
            }}
          />
          <Chip
            label="Ärzte"
            onClick={() => setActiveFilter('arzt')}
            sx={{
              fontWeight: activeFilter === 'arzt' ? 600 : 500,
              fontSize: '0.875rem',
              height: 32,
              borderRadius: 2.5,
              backgroundColor: activeFilter === 'arzt' ? employeeTypeColors.Arzt : 'rgba(0, 0, 0, 0.04)',
              color: activeFilter === 'arzt' ? 'white' : 'text.primary',
              border: activeFilter === 'arzt' ? 'none' : '1px solid',
              borderColor: 'rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: activeFilter === 'arzt' ? employeeTypeColors.Arzt : 'rgba(0, 0, 0, 0.08)',
                transform: 'translateY(-1px)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
            }}
          />
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          pt: 3,
          pb: 3,
        }}
      >
        <CapacityOverview employees={employees} employeeCapacities={employeeCapacities} currentDate={currentDate} activeFilter={activeFilter} />
      </DialogContent>
    </Dialog>
  );
};

