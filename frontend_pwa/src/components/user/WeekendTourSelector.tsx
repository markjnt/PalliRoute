import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Chip,
  Avatar,
  Collapse,
  Button,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Weekend as WeekendIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

interface WeekendTourSelectorProps {
  selectedArea: string | null;
  onAreaSelect: (area: string) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const WeekendTourSelector: React.FC<WeekendTourSelectorProps> = ({ 
  selectedArea, 
  onAreaSelect,
  isExpanded,
  onToggleExpanded
}) => {
  const weekendAreas = [
    { id: 'Nord', label: 'RB/AW Nord', color: '#ff9800', chipColor: '#1976d2' },
    { id: 'Mitte', label: 'RB/AW Mitte', color: '#ff9800', chipColor: '#7b1fa2' },
    { id: 'Süd', label: 'RB/AW Süd', color: '#ff9800', chipColor: '#388e3c' },
  ];

  const getAreaColor = (area: string) => {
    const areaConfig = weekendAreas.find(a => a.id === area);
    return areaConfig?.color || '#ff9800';
  };

  const getInitials = (area: string) => {
    switch (area) {
      case 'Nord': return 'N';
      case 'Mitte': return 'M';
      case 'Süd': return 'S';
      default: return area.charAt(0).toUpperCase();
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      {/* Header with expand/collapse button */}
      <Button
        onClick={onToggleExpanded}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          mb: 1,
          bgcolor: selectedArea ? 'rgba(255, 152, 0, 0.1)' : 'rgba(0, 0, 0, 0.02)',
          border: selectedArea ? '2px solid #ff9800' : '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: 2,
          textTransform: 'none',
          '&:hover': {
            bgcolor: selectedArea ? 'rgba(255, 152, 0, 0.15)' : 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <WeekendIcon sx={{ color: '#ff9800', mr: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1d1d1f' }}>
            Wochenend-Touren
          </Typography>
          {selectedArea && (
            <Chip
              label={selectedArea}
              size="small"
              sx={{
                bgcolor: getAreaColor(selectedArea),
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 500,
                height: 20,
                ml: 1,
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          )}
        </Box>
        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Button>

      {/* Collapsible content */}
      <Collapse in={isExpanded}>
        <Grid container spacing={2}>
          {weekendAreas.map((area) => (
            <Grid size={{ xs: 12, sm: 6 }} key={area.id}>
              <Card
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAreaSelect(area.id);
                }}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 2,
                  border: selectedArea === area.id ? '2px solid #007AFF' : '1px solid rgba(0, 0, 0, 0.08)',
                  background: selectedArea === area.id 
                    ? 'linear-gradient(135deg, #f0f8ff 0%, #ffffff 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
                    borderColor: selectedArea === area.id ? '#007AFF' : 'rgba(0, 122, 255, 0.3)',
                  },
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: selectedArea === area.id ? '#007AFF' : area.color,
                        color: 'white',
                        mr: 2,
                        fontSize: '1.2rem',
                        fontWeight: 600,
                      }}
                    >
                      {getInitials(area.id)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{
                          fontWeight: 600,
                          color: '#1d1d1f',
                          mb: 0.5,
                        }}
                      >
                        {area.label}
                      </Typography>
                      <Chip
                        label={area.id}
                        size="small"
                        sx={{
                          bgcolor: area.chipColor,
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          height: 20,
                          '& .MuiChip-label': {
                            px: 1,
                          },
                        }}
                      />
                    </Box>
                    <IconButton
                      size="small"
                      sx={{
                        color: selectedArea === area.id ? '#007AFF' : 'rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      {selectedArea === area.id ? (
                        <CheckCircleIcon />
                      ) : (
                        <RadioButtonUncheckedIcon />
                      )}
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Collapse>
    </Box>
  );
};

export default WeekendTourSelector;
