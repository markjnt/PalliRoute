import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  Grid,
  Button,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Close as CloseIcon,
  Weekend as WeekendIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { Sheet } from 'react-modal-sheet';
import { useEmployees } from '../../services/queries/useEmployees';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore, Weekday } from '../../stores/useWeekdayStore';
import { Employee } from '../../types/models';
import { employeeTypeColors } from '../../utils/colors';
import WeekendTourSelector from './WeekendTourSelector';

interface UserSearchDrawerProps {
  open: boolean;
  onClose: () => void;
}

const UserSearchDrawer: React.FC<UserSearchDrawerProps> = ({ open, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isWeekendExpanded, setIsWeekendExpanded] = useState(false);
  const { data: employees = [], isLoading, error } = useEmployees();
  const { 
    selectedUserId, 
    selectedWeekendArea, 
    setSelectedUser, 
    setSelectedWeekendArea 
  } = useUserStore();
  const { setSelectedWeekday } = useWeekdayStore();

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    
    return employees.filter((employee: Employee) =>
      `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.function?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  // Helper function to get current weekday or fallback
  const getCurrentWeekdayOrFallback = (fallback: Weekday): Weekday => {
    const days: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date().getDay(); // 0 = Sonntag, 1 = Montag, etc.
    return days[today] || fallback;
  };

  const handleUserSelect = (userId: number) => {
    setSelectedUser(userId);
    setSelectedWeekendArea(null); // Clear weekend area selection
    setIsWeekendExpanded(false); // Collapse weekend menu
    // Set current day or Monday as fallback for employees
    const weekday = getCurrentWeekdayOrFallback('monday');
    setSelectedWeekday(weekday);
    onClose(); // Close the sheet after selecting a user
  };

  const handleWeekendAreaSelect = (area: string) => {
    setSelectedWeekendArea(area);
    setSelectedUser(null); // Clear user selection
    // Set current day if it's weekend (Saturday/Sunday), otherwise Saturday as fallback
    const days: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date().getDay(); // 0 = Sonntag, 1 = Montag, etc.
    const currentDay = days[today];
    const isWeekend = currentDay === 'saturday' || currentDay === 'sunday';
    const weekday = isWeekend ? currentDay : 'saturday';
    setSelectedWeekday(weekday);
    onClose(); // Close the sheet after selecting a weekend area
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getEmployeeColor = (employeeFunction: string) => {
    return employeeTypeColors[employeeFunction] || employeeTypeColors.default;
  };

  return (
    <Sheet
      isOpen={open}
      onClose={onClose}
      snapPoints={[0.95]}
    >
      <Sheet.Container>
        <Sheet.Header>
          {/* Drag handle */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '8px 0',
            cursor: 'grab',
          }}>
            <div style={{
              width: '60px',
              height: '4px',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
            }} />
          </div>

          {/* Fixed header with search */}
          <Box sx={{ p: 3, pb: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Mitarbeiter suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 2,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: 'rgba(0, 0, 0, 0.12)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(0, 0, 0, 0.24)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#007AFF',
                    },
                  },
                },
              }}
            />
          </Box>
        </Sheet.Header>

        <Sheet.Content>
          <Sheet.Scroller draggableAt="top">
            {/* Weekend Tour Selector */}
            <Box sx={{ px: 3, pt: 2 }}>
              <WeekendTourSelector
                selectedArea={selectedWeekendArea}
                onAreaSelect={handleWeekendAreaSelect}
                isExpanded={isWeekendExpanded}
                onToggleExpanded={() => setIsWeekendExpanded(!isWeekendExpanded)}
              />
            </Box>

            {/* Scrollable employee list */}
            <Box sx={{ 
              px: 3,
              py: 2,
            }}>
              {isLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                  <Typography variant="body1" color="text.secondary">
                    Lade Mitarbeiter...
                  </Typography>
                </Box>
              ) : error ? (
                <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                  <Typography variant="body1" color="error">
                    Fehler beim Laden der Mitarbeiter
                  </Typography>
                </Box>
              ) : filteredEmployees.length === 0 ? (
                <Box display="flex" flexDirection="column" alignItems="center" py={4}>
                  <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    {searchTerm ? 'Keine Mitarbeiter gefunden' : 'Keine Mitarbeiter verfügbar'}
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {filteredEmployees.map((employee: Employee) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={employee.id}>
                      <Card
                        onClick={() => handleUserSelect(employee.id as number)}
                        sx={{
                          cursor: 'pointer',
                          borderRadius: 2,
                          border: selectedUserId === employee.id ? '2px solid #007AFF' : '1px solid rgba(0, 0, 0, 0.08)',
                          background: selectedUserId === employee.id 
                            ? 'linear-gradient(135deg, #f0f8ff 0%, #ffffff 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
                            borderColor: selectedUserId === employee.id ? '#007AFF' : 'rgba(0, 122, 255, 0.3)',
                          },
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box display="flex" alignItems="center" mb={2}>
                            <Avatar
                              sx={{
                                width: 48,
                                height: 48,
                                bgcolor: selectedUserId === employee.id ? '#007AFF' : '#f0f0f0',
                                color: selectedUserId === employee.id ? 'white' : '#666',
                                mr: 2,
                                fontSize: '1.2rem',
                                fontWeight: 600,
                              }}
                            >
                              {getInitials(employee.first_name, employee.last_name)}
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
                                {`${employee.first_name} ${employee.last_name}`}
                              </Typography>
                              {employee.function && (
                                <Chip
                                  label={employee.function}
                                  size="small"
                                  sx={{
                                    bgcolor: getEmployeeColor(employee.function),
                                    color: 'white',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    height: 20,
                                    '& .MuiChip-label': {
                                      px: 1,
                                    },
                                  }}
                                />
                              )}
                            </Box>
                            <IconButton
                              size="small"
                              sx={{
                                color: selectedUserId === employee.id ? '#007AFF' : 'rgba(0, 0, 0, 0.3)',
                              }}
                            >
                              {selectedUserId === employee.id ? (
                                <CheckCircleIcon />
                              ) : (
                                <RadioButtonUncheckedIcon />
                              )}
                            </IconButton>
                          </Box>

                          <Box display="flex" flexWrap="wrap" gap={1}>
                            {employee.city && (
                              <Chip
                                label={employee.city}
                                size="small"
                                variant="outlined"
                                sx={{
                                  fontSize: '0.75rem',
                                  borderColor: 'rgba(0, 0, 0, 0.12)',
                                }}
                              />
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Sheet.Scroller>
        </Sheet.Content>
      </Sheet.Container>
    </Sheet>
  );
};

export default UserSearchDrawer; 