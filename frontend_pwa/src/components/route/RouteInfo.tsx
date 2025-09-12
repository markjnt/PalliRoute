import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
} from '@mui/material';
import {
  DirectionsCar as DirectionsCarIcon,
  AccessTime as AccessTimeIcon,
  Route as RouteIcon,
} from '@mui/icons-material';
import { useUserStore } from '../../stores/useUserStore';
import { useWeekdayStore } from '../../stores/useWeekdayStore';
import { useRoutes, useOptimizeRoutes, useOptimizeWeekendRoutes } from '../../services/queries/useRoutes';
import { useEmployees } from '../../services/queries/useEmployees';
import { useRouteCompletionStore } from '../../stores/useRouteCompletionStore';
import { Weekday } from '../../types/models';

export const RouteInfo: React.FC = () => {
  const { selectedUserId, selectedWeekendArea } = useUserStore();
  const { selectedWeekday } = useWeekdayStore();
  const { clearCompletedStops } = useRouteCompletionStore();
  
  const { data: routes = [] } = useRoutes({ weekday: selectedWeekday as Weekday });
  const { data: employees = [] } = useEmployees();
  const optimizeRoutesMutation = useOptimizeRoutes();
  const optimizeWeekendRoutesMutation = useOptimizeWeekendRoutes();

  // Get German weekday name
  const getGermanWeekday = (weekday: string): string => {
    const weekdayMap: Record<string, string> = {
      'monday': 'Montag',
      'tuesday': 'Dienstag',
      'wednesday': 'Mittwoch',
      'thursday': 'Donnerstag',
      'friday': 'Freitag',
      'saturday': 'Samstag',
      'sunday': 'Sonntag'
    };
    return weekdayMap[weekday] || weekday;
  };

  // Immer nur die Route des ausgewählten Mitarbeiters oder Wochenend-Bereichs anzeigen
  const selectedRoute = useMemo(() => {
    if (selectedWeekendArea) {
      return routes.find(route => !route.employee_id && route.area === selectedWeekendArea && route.weekday === selectedWeekday);
    } else {
      return routes.find(route => route.employee_id === selectedUserId && route.weekday === selectedWeekday);
    }
  }, [routes, selectedUserId, selectedWeekendArea, selectedWeekday]);

  // Get selected employee for work_hours (only for employee routes)
  const selectedEmployee = useMemo(() => {
    return employees.find(emp => emp.id === selectedUserId);
  }, [employees, selectedUserId]);

  if (!selectedRoute) {
    return (
      <Box sx={{ px: 2, pb: 2 }}>
        <Box
          sx={{
            p: 2,
            bgcolor: 'rgba(0, 0, 0, 0.02)',
            borderRadius: 2,
            border: '1px solid rgba(0, 0, 0, 0.08)',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Keine Route für {getGermanWeekday(selectedWeekday)} verfügbar
          </Typography>
        </Box>
      </Box>
    );
  }

  // Format distance (backend already provides distance in km, format with German locale)
  const formatDistance = (distance: number): string => {
    return distance.toLocaleString('de-DE', { 
      minimumFractionDigits: 1, 
      maximumFractionDigits: 1 
    }) + ' km';
  };

  // Calculate utilization percentage with color logic
  const calculateUtilization = (duration: number) => {
    let targetMinutes: number;
    
    if (selectedWeekendArea) {
      // For weekend tours: 75% of 420 minutes = 315 minutes target
      targetMinutes = 315;
    } else {
      // For employees: based on work_hours percentage
      targetMinutes = Math.round(420 * ((selectedEmployee?.work_hours || 0) / 100));
    }
    
    // Calculate utilization percentage
    const utilizationPercent = targetMinutes > 0 ? Math.round((duration / targetMinutes) * 100) : 0;
    
    // Determine color based on utilization
    let utilizationColor = 'success.main'; // Green by default
    if (utilizationPercent > 100) {
      utilizationColor = 'error.main'; // Red if over 100%
    } else if (utilizationPercent > 90) {
      utilizationColor = 'warning.main'; // Orange if over 90%
    } else if (utilizationPercent > 70) {
      utilizationColor = 'success.light'; // Light green if over 70%
    }
    
    return {
      utilizationPercent,
      utilizationColor
    };
  };

  const utilizationInfo = calculateUtilization(selectedRoute.total_duration);

  const handleOptimize = async () => {
    if (!selectedWeekday) return;
    
    try {
      if (selectedWeekendArea) {
        // Optimize weekend route
        await optimizeWeekendRoutesMutation.mutateAsync({
          weekday: selectedWeekday,
          area: selectedWeekendArea
        });
      } else if (selectedUserId) {
        // Optimize employee route
        await optimizeRoutesMutation.mutateAsync({
          weekday: selectedWeekday,
          employeeId: selectedUserId
        });
      }
      
      // Reset route completion status after optimization
      clearCompletedStops();
    } catch (error) {
      console.error('Failed to optimize routes:', error);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          p: 2,
          bgcolor: 'rgba(0, 0, 0, 0.02)',
          borderRadius: 2,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1, // Uniform spacing between all elements
        }}
      >
        {/* Route Stats Grid */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 1, // Consistent gap matching the container gap
        }}>
          {/* Distance */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5, // Slightly more padding for better visual balance
              bgcolor: 'rgba(0, 122, 255, 0.1)',
              borderRadius: 1.5,
              border: '1px solid rgba(0, 122, 255, 0.2)',
            }}
          >
            <DirectionsCarIcon sx={{ color: '#007AFF', fontSize: 18 }} />
            <Box>
              <Typography variant="caption" sx={{ color: '#007AFF', fontWeight: 500, display: 'block' }}>
                Distanz
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1d1d1f' }}>
                {formatDistance(selectedRoute.total_distance)}
              </Typography>
            </Box>
          </Box>

          {/* Utilization with color logic */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5, // Consistent padding with distance box
              bgcolor: 'rgba(255, 149, 0, 0.1)',
              borderRadius: 1.5,
              border: '1px solid rgba(255, 149, 0, 0.2)',
            }}
          >
            <AccessTimeIcon sx={{ color: '#FF9500', fontSize: 18 }} />
            <Box>
              <Typography variant="caption" sx={{ color: '#FF9500', fontWeight: 500, display: 'block' }}>
                Auslastung
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: utilizationInfo.utilizationColor }}>
                {utilizationInfo.utilizationPercent}%
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Optimize Button - Full Width */}
        <Button
          variant="contained"
          onClick={handleOptimize}
          disabled={optimizeRoutesMutation.isPending || optimizeWeekendRoutesMutation.isPending}
          sx={{
            bgcolor: '#4CAF50',
            borderRadius: 1.5,
            textTransform: 'none',
            fontSize: '0.75rem',
            fontWeight: 500,
            p: 1.5, // Consistent padding with grid items
            minHeight: 'unset',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            justifyContent: 'flex-start',
            width: '100%',
            '&:hover': {
              bgcolor: '#388E3C',
            },
            '&:disabled': {
              bgcolor: 'rgba(76, 175, 80, 0.5)',
            }
          }}
        >
          <RouteIcon sx={{ fontSize: 18 }} />
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            {(optimizeRoutesMutation.isPending || optimizeWeekendRoutesMutation.isPending) 
              ? 'Optimiere...' 
              : 'Optimieren'}
          </Typography>
        </Button>
      </Box>
    </Box>
  );
};
