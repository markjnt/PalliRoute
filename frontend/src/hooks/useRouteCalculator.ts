import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Employee, Appointment, Route } from '../types/models';
import { MarkerData, RoutePathData } from '../types/mapTypes';
import { useUpdateRoute } from '../services/queries/useRoutes';
import { parseRouteOrder, hasValidRouteOrder } from '../utils/mapUtils';
import { routeLineColors } from '../utils/colors';

/**
 * Custom hook to calculate and manage route data for the map
 */
export const useRouteCalculator = (
  map: google.maps.Map | null,
  markers: MarkerData[],
  filteredRoutes: Route[],
  appointments: Appointment[],
  employees: Employee[],
  selectedWeekday: string
) => {
  const [routePaths, setRoutePaths] = useState<RoutePathData[]>([]);
  const isCalculatingRoutes = useRef(false);
  const previousRouteOrder = useRef<string | null>(null);
  
  // Get the update route mutation
  const updateRouteMutation = useUpdateRoute();

  // Memoize valid routes to prevent unnecessary recalculations
  const validRoutes = useMemo(() => {
    // Include routes that either have valid route order OR are empty (to reset them to 0)
    return filteredRoutes.filter(route => {
      const routeOrder = parseRouteOrder(route.route_order);
      // Include route if it has no route_order (empty) or if it has valid appointments
      return routeOrder.length === 0 || hasValidRouteOrder(route, appointments, selectedWeekday);
    });
  }, [filteredRoutes, appointments, selectedWeekday]);

  // Helper function to create initial route path data
  const createRoutePathData = useCallback((route: Route, employee: Employee | undefined) => {
    const routeOrder = parseRouteOrder(route.route_order);
    const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee';
    const tourNumber = employee?.tour_number;
    const color = tourNumber ? routeLineColors[(Math.abs(tourNumber) - 1) % routeLineColors.length] : '#9E9E9E';

    return {
      employeeId: route.employee_id,
      routeId: route.id,
      routeOrder: routeOrder,
      color,
      directions: null,
      loading: false,
      error: false,
      totalDistance: undefined,
      totalTime: undefined,
      employeeName
    };
  }, []);

  // Helper function to update route in backend
  const updateRouteInBackend = useCallback(async (routeId: number, distance: number, duration: number) => {
    try {
      await updateRouteMutation.mutateAsync({ 
        id: routeId, 
        routeData: {
          total_distance: distance,
          total_duration: duration
        } 
      });
    } catch (error) {
      console.error(`Error saving route ${routeId}:`, error);
    }
  }, [updateRouteMutation]);

  // Helper function to handle empty routes
  const handleEmptyRoute = useCallback((routePath: RoutePathData, routeData: Route, updatedRoutePaths: RoutePathData[], routeIndex: number) => {
    const updatedPath = {
      ...routePath,
      error: false,
      loading: false,
      totalDistance: '0.0 km',
      totalTime: '0min'
    };
    
    updatedRoutePaths[routeIndex] = updatedPath;
    setRoutePaths([...updatedRoutePaths]);
    
    if (routeData.id) {
      updateRouteInBackend(routeData.id, 0, 0);
    }
  }, [updateRouteInBackend]);

  // Calculate routes
  const calculateRoutes = useCallback(async () => {
    if (!map || !validRoutes.length || !markers.length || isCalculatingRoutes.current) {
      setRoutePaths([]);
      isCalculatingRoutes.current = false;
      return;
    }
    
    isCalculatingRoutes.current = true;
    
    try {
      const newRoutePaths: RoutePathData[] = validRoutes.map((route) => {
        const employee = employees.find(e => e.id === route.employee_id);
        return createRoutePathData(route, employee);
      });
      
      setRoutePaths(newRoutePaths);
      
      for (let i = 0; i < newRoutePaths.length; i++) {
        await calculateDirections(i, newRoutePaths);
      }
    } catch (error) {
      console.error("Error calculating routes:", error);
    } finally {
      isCalculatingRoutes.current = false;
    }
  }, [map, validRoutes, markers, employees, createRoutePathData]);
  
  // Calculate directions for a single route
  const calculateDirections = async (routeIndex: number, updatedRoutePaths: RoutePathData[]) => {
    const routePath = updatedRoutePaths[routeIndex];
    const routeData = validRoutes.find(r => r.id === routePath.routeId);
    
    if (!routeData || !routePath.routeOrder?.length) {
      handleEmptyRoute(routePath, routeData!, updatedRoutePaths, routeIndex);
      return;
    }
    
    if (routePath.loading || routePath.directions || routePath.error) {
      return;
    }

    const employeeMarker = markers.find(
      marker => marker.type === 'employee' && marker.employeeId === routePath.employeeId
    );
    
    if (!employeeMarker) {
      handleEmptyRoute(routePath, routeData, updatedRoutePaths, routeIndex);
      return;
    }

    const { waypoints, validPatientMarkers } = routePath.routeOrder.reduce((acc, appointmentId) => {
      const patientMarker = markers.find(
        marker => marker.type === 'patient' && marker.appointmentId === appointmentId
      );
      
      if (patientMarker) {
        acc.validPatientMarkers.push(patientMarker);
        acc.waypoints.push({
          location: patientMarker.position,
          stopover: true
        });
      }
      return acc;
    }, { waypoints: [] as google.maps.DirectionsWaypoint[], validPatientMarkers: [] as MarkerData[] });
    
    if (!validPatientMarkers.length) {
      handleEmptyRoute(routePath, routeData, updatedRoutePaths, routeIndex);
      return;
    }

    updatedRoutePaths[routeIndex] = { ...routePath, loading: true };
    setRoutePaths([...updatedRoutePaths]);

    try {
      const result = await calculateRouteDirections(employeeMarker.position, waypoints);
      const { totalDistance, totalTime } = calculateRouteMetrics(result, validPatientMarkers, appointments);
      
      updatedRoutePaths[routeIndex] = {
        ...routePath,
        directions: result,
        totalDistance: `${(totalDistance / 1000).toFixed(1)} km`,
        totalTime: totalTime >= 60 ? `${Math.floor(totalTime / 60)}h ${totalTime % 60}min` : `${totalTime}min`,
        loading: false
      };
      
      if (routeData.id) {
        await updateRouteInBackend(routeData.id, totalDistance / 1000, totalTime);
      }
      
      setRoutePaths([...updatedRoutePaths]);
    } catch (error) {
      console.error(`Error calculating directions for route ${routeIndex}:`, error);
      updatedRoutePaths[routeIndex] = {
        ...routePath,
        loading: false,
        error: true
      };
      setRoutePaths([...updatedRoutePaths]);
    }
  };

  // Helper function to calculate route directions
  const calculateRouteDirections = (origin: google.maps.LatLng, waypoints: google.maps.DirectionsWaypoint[]): Promise<google.maps.DirectionsResult> => {
    return new Promise((resolve, reject) => {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route({
        origin,
        destination: origin,
        waypoints,
        optimizeWaypoints: false,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS
        }
      }, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  };

  // Helper function to calculate route metrics
  const calculateRouteMetrics = (
    result: google.maps.DirectionsResult,
    validPatientMarkers: MarkerData[],
    appointments: Appointment[]
  ) => {
    let totalDistance = 0;
    let totalDuration = 0;
    let totalVisitDuration = 0;

    // Calculate visit duration
    validPatientMarkers.forEach(marker => {
      const appointmentId = marker.appointmentId || 0;
      const appointment = appointments.find(a => a.id === appointmentId);
      totalVisitDuration += (appointment?.duration || 0);
    });

    // Calculate distance and driving time from legs
    if (result.routes[0]?.legs) {
      result.routes[0].legs.forEach(leg => {
        totalDistance += (leg.distance?.value || 0);
        totalDuration += (leg.duration?.value || 0);
      });
    }

    const drivingTimeMinutes = Math.round(totalDuration / 60);
    const totalTimeMinutes = drivingTimeMinutes + totalVisitDuration;

    return {
      totalDistance,
      totalTime: totalTimeMinutes
    };
  };

  // Trigger recalculation when route order or markers change
  useEffect(() => {
    if (!map || !validRoutes.length || !markers.length) {
      return;
    }
    
    const currentRouteOrderString = JSON.stringify(
      validRoutes.map(route => ({ 
        id: route.id, 
        order: route.route_order,
        // Add marker count to detect when all patients are removed
        markerCount: markers.filter(m => m.type === 'patient' && 
          route.route_order.includes(m.appointmentId || 0)).length
      }))
    );
    
    if (previousRouteOrder.current !== currentRouteOrderString) {
      previousRouteOrder.current = currentRouteOrderString;
      
      if (previousRouteOrder.current !== null) {
        calculateRoutes();
      }
    }
  }, [validRoutes, map, markers, calculateRoutes]);

  return {
    routePaths,
    calculateRoutes,
    isCalculating: isCalculatingRoutes.current
  };
}; 