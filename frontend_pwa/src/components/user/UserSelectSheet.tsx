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

type FilterType = 'all' | 'pflege-nord' | 'pflege-sued' | 'arzt' | 'honorararzt' | 'aw';

const UserSearchDrawer: React.FC<UserSearchDrawerProps> = ({ open, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
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
    let filtered = employees;

    // Apply filter
    if (activeFilter !== 'all' && activeFilter !== 'aw') {
      switch (activeFilter) {
        case 'pflege-nord':
          filtered = filtered.filter((emp: Employee) => 
            emp.function === 'Pflegekraft' && emp.area === 'Nordkreis'
          );
          break;
        case 'pflege-sued':
          filtered = filtered.filter((emp: Employee) => 
            emp.function === 'Pflegekraft' && emp.area === 'Südkreis'
          );
          break;
        case 'arzt':
          filtered = filtered.filter((emp: Employee) => 
            emp.function === 'Arzt'
          );
          break;
        case 'honorararzt':
          filtered = filtered.filter((emp: Employee) => 
            emp.function === 'Honorararzt'
          );
          break;
      }
    }

    // Apply search term
    if (searchTerm.trim()) {
      filtered = filtered.filter((employee: Employee) =>
        `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.function?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (activeFilter === 'all') {
      const getGroupOrder = (employee: Employee) => {
        const area = employee.area?.toLowerCase() || '';
        if (employee.function === 'Pflegekraft') {
          if (area.includes('nord')) return 1; // Pflege Nord
          if (area.includes('süd')) return 2; // Pflege Süd
          return 3; // Other Pflegekräfte without area
        }
        if (employee.function === 'PDL') return 4;
        if (employee.function === 'Arzt') return 5;
        if (employee.function === 'Honorararzt') return 6;
        return 999;
      };

      filtered = [...filtered].sort((a, b) => {
        const orderDiff = getGroupOrder(a) - getGroupOrder(b);
        if (orderDiff !== 0) {
          return orderDiff;
        }

        const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
        const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    return filtered;
  }, [employees, searchTerm, activeFilter]);

  // Helper function to get current weekday or fallback
  const getCurrentWeekdayOrFallback = (fallback: Weekday): Weekday => {
    const days: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    const isWeekday = today === 'monday' || today === 'tuesday' || today === 'wednesday' || today === 'thursday' || today === 'friday';
    return isWeekday && today ? today : fallback;
  };

  const handleUserSelect = (userId: number) => {
    setSelectedUser(userId);
    setSelectedWeekendArea(null); // Clear weekend area selection
    setIsWeekendExpanded(false); // Collapse weekend menu
    setActiveFilter('all'); // Reset filter when selecting a user
    // Set current day or Monday as fallback for employees
    const weekday = getCurrentWeekdayOrFallback('monday');
    setSelectedWeekday(weekday);
    onClose(); // Close the sheet after selecting a user
  };

  const handleWeekendAreaSelect = (area: string) => {
    setSelectedWeekendArea(area);
    setSelectedUser(null); // Clear user selection
    setActiveFilter('aw'); // Set filter to AW when weekend area is selected
    // Set current day if it's weekend (Saturday/Sunday), otherwise Saturday as fallback
    const days: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[new Date().getDay()];
    const isWeekend = currentDay === 'saturday' || currentDay === 'sunday';
    const weekday = isWeekend && currentDay ? currentDay : 'saturday';
    setSelectedWeekday(weekday);
    onClose(); // Close the sheet after selecting a weekend area
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    if (filter === 'aw') {
      setIsWeekendExpanded(true);
      // Don't reset selections when switching to AW filter - just show weekend tours
    } else {
      setIsWeekendExpanded(false);
      // Don't reset selections when changing filters
    }
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
            
            {/* Filter Chips */}
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label="Alle"
                onClick={() => handleFilterChange('all')}
                color={activeFilter === 'all' ? 'primary' : 'default'}
                variant={activeFilter === 'all' ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: activeFilter === 'all' ? 600 : 400,
                }}
              />
              <Chip
                label="Pflege Nord"
                onClick={() => handleFilterChange('pflege-nord')}
                color={activeFilter === 'pflege-nord' ? 'primary' : 'default'}
                variant={activeFilter === 'pflege-nord' ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: activeFilter === 'pflege-nord' ? 600 : 400,
                  bgcolor: activeFilter === 'pflege-nord' ? employeeTypeColors.default : undefined,
                  color: activeFilter === 'pflege-nord' ? 'white' : undefined,
                  '&:hover': {
                    bgcolor: activeFilter === 'pflege-nord' ? employeeTypeColors.default : undefined,
                  },
                }}
              />
              <Chip
                label="Pflege Süd"
                onClick={() => handleFilterChange('pflege-sued')}
                color={activeFilter === 'pflege-sued' ? 'primary' : 'default'}
                variant={activeFilter === 'pflege-sued' ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: activeFilter === 'pflege-sued' ? 600 : 400,
                  bgcolor: activeFilter === 'pflege-sued' ? employeeTypeColors.default : undefined,
                  color: activeFilter === 'pflege-sued' ? 'white' : undefined,
                  '&:hover': {
                    bgcolor: activeFilter === 'pflege-sued' ? employeeTypeColors.default : undefined,
                  },
                }}
              />
              <Chip
                label="Arzt"
                onClick={() => handleFilterChange('arzt')}
                color={activeFilter === 'arzt' ? 'primary' : 'default'}
                variant={activeFilter === 'arzt' ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: activeFilter === 'arzt' ? 600 : 400,
                  bgcolor: activeFilter === 'arzt' ? employeeTypeColors.Arzt : undefined,
                  color: activeFilter === 'arzt' ? 'white' : undefined,
                  '&:hover': {
                    bgcolor: activeFilter === 'arzt' ? employeeTypeColors.Arzt : undefined,
                  },
                }}
              />
              <Chip
                label="Honorararzt"
                onClick={() => handleFilterChange('honorararzt')}
                color={activeFilter === 'honorararzt' ? 'primary' : 'default'}
                variant={activeFilter === 'honorararzt' ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: activeFilter === 'honorararzt' ? 600 : 400,
                  bgcolor: activeFilter === 'honorararzt' ? employeeTypeColors.Honorararzt : undefined,
                  color: activeFilter === 'honorararzt' ? 'white' : undefined,
                  '&:hover': {
                    bgcolor: activeFilter === 'honorararzt' ? employeeTypeColors.Honorararzt : undefined,
                  },
                }}
              />
              <Chip
                label="AW"
                onClick={() => handleFilterChange('aw')}
                color={activeFilter === 'aw' ? 'primary' : 'default'}
                variant={activeFilter === 'aw' ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: activeFilter === 'aw' ? 600 : 400,
                  bgcolor: activeFilter === 'aw' ? '#ff9800' : undefined,
                  color: activeFilter === 'aw' ? 'white' : undefined,
                  '&:hover': {
                    bgcolor: activeFilter === 'aw' ? '#ff9800' : undefined,
                  },
                }}
              />
            </Box>
          </Box>
        </Sheet.Header>

        <Sheet.Content>
          <Sheet.Scroller draggableAt="top">
            {/* Scrollable employee list - Hide when AW filter is active */}
            {activeFilter !== 'aw' && (
            <Box sx={{ 
              px: 3,
              pt: 2,
              pb: 2,
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
                <Grid container spacing={1.5}>
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
                        <CardContent sx={{ p: 1.5 }}>
                          <Box display="flex" alignItems="center">
                            <Avatar
                              sx={{
                                width: 36,
                                height: 36,
                                bgcolor: selectedUserId === employee.id ? '#007AFF' : '#f0f0f0',
                                color: selectedUserId === employee.id ? 'white' : '#666',
                                mr: 1.5,
                                fontSize: '1rem',
                                fontWeight: 600,
                              }}
                            >
                              {getInitials(employee.first_name, employee.last_name)}
                            </Avatar>
                            <Box flex={1}>
                              <Typography
                                variant="subtitle1"
                                component="h3"
                                sx={{
                                  fontWeight: 600,
                                  color: '#1d1d1f',
                                  fontSize: '0.95rem',
                                  lineHeight: 1.3,
                                  mb: 0.25,
                                }}
                              >
                                {`${employee.first_name} ${employee.last_name}`}
                              </Typography>
                              <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
                                {employee.function && (
                                  <Chip
                                    label={employee.function}
                                    size="small"
                                    sx={{
                                      bgcolor: getEmployeeColor(employee.function),
                                      color: 'white',
                                      fontSize: '0.7rem',
                                      fontWeight: 500,
                                      height: 18,
                                      '& .MuiChip-label': {
                                        px: 0.75,
                                      },
                                    }}
                                  />
                                )}
                                {employee.city && (
                                  <Chip
                                    label={employee.city}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      fontSize: '0.7rem',
                                      borderColor: 'rgba(0, 0, 0, 0.12)',
                                      height: 18,
                                      '& .MuiChip-label': {
                                        px: 0.75,
                                      },
                                    }}
                                  />
                                )}
                              </Box>
                            </Box>
                            <IconButton
                              size="small"
                              sx={{
                                color: selectedUserId === employee.id ? '#007AFF' : 'rgba(0, 0, 0, 0.3)',
                                ml: 0.5,
                                '& .MuiSvgIcon-root': {
                                  fontSize: '1.2rem',
                                },
                              }}
                            >
                              {selectedUserId === employee.id ? (
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
              )}
            </Box>
            )}

            {/* Weekend Tour Selector - Only show when filter is 'all' or 'aw' */}
            {(activeFilter === 'all' || activeFilter === 'aw') && (
            <Box sx={{ px: 3, pt: activeFilter !== 'aw' ? 2 : 2, pb: 2 }}>
              <WeekendTourSelector
                selectedArea={selectedWeekendArea}
                onAreaSelect={handleWeekendAreaSelect}
                isExpanded={isWeekendExpanded || activeFilter === 'aw'}
                onToggleExpanded={() => setIsWeekendExpanded(!isWeekendExpanded)}
              />
            </Box>
            )}
          </Sheet.Scroller>
        </Sheet.Content>
      </Sheet.Container>
    </Sheet>
  );
};

export default UserSearchDrawer; 