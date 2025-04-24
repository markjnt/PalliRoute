import { useState, useRef, useCallback, useEffect } from 'react';
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

  // Calculate routes
  const calculateRoutes = useCallback(async () => {
    // Early return if necessary data is missing
    if (!map || !filteredRoutes.length || !markers.length || !appointments.length) {
      console.log("Missing data for route calculation, resetting routePaths", {
        hasMap: !!map,
        filteredRoutesLength: filteredRoutes.length,
        markersLength: markers.length,
        appointmentsLength: appointments.length
      });
      setRoutePaths([]);
      isCalculatingRoutes.current = false;
      return;
    }
    
    // Prevent duplicate calculation
    if (isCalculatingRoutes.current) {
      console.log("Calculations already running, skipping...");
      return;
    }
    
    console.log("Starting route calculation with:", {
      filteredRoutesCount: filteredRoutes.length, 
      markersCount: markers.length,
      appointmentsCount: appointments.length
    });
    
    // Find routes with empty route_order
    const emptyRoutes = filteredRoutes.filter(route => !hasValidRouteOrder(route, appointments, selectedWeekday));
    if (emptyRoutes.length > 0) {
      console.log(`${emptyRoutes.length} routes with empty route_order found`);
    }
    
    // Filter routes again to ensure only valid routes are used
    const validRoutes = filteredRoutes.filter(route => hasValidRouteOrder(route, appointments, selectedWeekday));
    
    if (validRoutes.length === 0) {
      console.log("No valid routes with non-empty route_order found");
      setRoutePaths([]);
      isCalculatingRoutes.current = false;
      return;
    }
    
    console.log(`Initializing and calculating ${validRoutes.length} valid routes for ${selectedWeekday}`);
    
    // Mark that we're now calculating routes
    isCalculatingRoutes.current = true;
    
    // A set to track which routes have already been calculated
    const calculatedRouteIds = new Set<number>();
    
    // Initialize and calculate routes
    const initializeAndCalculateRoutes = async () => {
      try {
        // First clear old route paths
        setRoutePaths([]);
        
        // Create new route paths only for routes with valid route_order
        const newRoutePaths: RoutePathData[] = validRoutes.map((route) => {
          const routeOrder = parseRouteOrder(route.route_order);
          
          // Find the employee name for the hover info
          const employee = employees.find(e => e.id === route.employee_id);
          const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee';
          
          // Use same color assignment logic as in TourContainer
          const tourNumber = employee?.tour_number;
          let color = '#9E9E9E'; // Default grey for undefined tour
          
          if (tourNumber) {
            // Ensure tourNumber is a positive number and convert to zero-based index
            const index = (Math.abs(tourNumber) - 1) % routeLineColors.length;
            color = routeLineColors[index];
          }
          
          return {
            employeeId: route.employee_id,
            routeId: route.id,
            routeOrder: routeOrder,
            color: color,
            directions: null,
            loading: false,
            error: false,
            totalDistance: undefined,
            totalTime: undefined,
            employeeName: employeeName
          };
        });
        
        // Set initial routes
        setRoutePaths(newRoutePaths);
        
        // Calculate directions for all routes
        for (let i = 0; i < newRoutePaths.length; i++) {
          await calculateDirections(i, newRoutePaths);
        }
        
      } catch (error) {
        console.error("Error calculating routes:", error);
      } finally {
        // Reset calculation status
        isCalculatingRoutes.current = false;
      }
    };
    
    // Function to calculate a single route
    const calculateDirections = async (routeIndex: number, updatedRoutePaths: RoutePathData[]) => {
      const routePath = updatedRoutePaths[routeIndex];
      
      // Check again if route_order is empty
      if (!routePath.routeOrder || routePath.routeOrder.length === 0) {
        console.log(`Empty route_order for route ${routePath.routeId}, skipping.`);
        updatedRoutePaths[routeIndex] = {
          ...routePath,
          error: true
        };
        setRoutePaths([...updatedRoutePaths]);
        return;
      }
      
      // Skip if already loading, already has directions, or has an error
      if (routePath.loading || routePath.directions || routePath.error) {
        return;
      }
      
      // Find the route data based on the route ID
      const routeData = filteredRoutes.find(r => r.id === routePath.routeId);
      
      // Check if this route has already been calculated
      if (routeData && routeData.id && calculatedRouteIds.has(routeData.id)) {
        console.log(`Route ${routeData.id} has already been calculated, skipping.`);
        return;
      }

      // Mark this route as calculated
      if (routeData && routeData.id) {
        calculatedRouteIds.add(routeData.id);
      }

      // Find the employee marker for this route
      const employeeMarker = markers.find(
        marker => marker.type === 'employee' && marker.employeeId === routePath.employeeId
      );
      
      if (!employeeMarker) {
        console.log(`No employee marker found for route ${routePath.routeId}.`);
        updatedRoutePaths[routeIndex] = {
          ...routePath,
          error: true
        };
        setRoutePaths([...updatedRoutePaths]);
        return;
      }

      // Find all patient markers in route_order
      const waypoints: google.maps.DirectionsWaypoint[] = [];
      const validPatientMarkers: MarkerData[] = [];
      
      for (const appointmentId of routePath.routeOrder) {
        const patientMarker = markers.find(
          marker => marker.type === 'patient' && marker.appointmentId === appointmentId
        );
        
        if (patientMarker) {
          validPatientMarkers.push(patientMarker);
          waypoints.push({
            location: patientMarker.position,
            stopover: true
          });
        }
      }
      
      // Skip if no valid patient markers
      if (!validPatientMarkers.length) {
        console.log(`No valid patient markers found for route ${routePath.routeId}.`);
        updatedRoutePaths[routeIndex] = {
          ...routePath,
          error: true
        };
        setRoutePaths([...updatedRoutePaths]);
        return;
      }

      // Mark as loading
      updatedRoutePaths[routeIndex] = {
        ...routePath,
        loading: true
      };
      setRoutePaths([...updatedRoutePaths]);

      // Use DirectionsService directly
      const directionsService = new google.maps.DirectionsService();

      try {
        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route({
            origin: employeeMarker.position,
            destination: employeeMarker.position, // Return to start
            waypoints: waypoints,
            optimizeWaypoints: false, // We already have the order
            travelMode: google.maps.TravelMode.DRIVING,
            provideRouteAlternatives: false,
            drivingOptions: {
              departureTime: new Date(), // Now
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

        // Calculate total distance, driving time, and visit times
        if (result && result.routes && result.routes.length > 0) {
          const routeResult = result.routes[0];
          
          // Calculate distance and driving time
          let totalDistanceValue = 0;
          let totalDurationValue = 0;
          let totalVisitDuration = 0;
          
          // Calculate visit duration
          validPatientMarkers.forEach(marker => {
            const appointmentId = marker.appointmentId || 0;
            const appointment = appointments.find(a => a.id === appointmentId);
            const duration = (appointment && appointment.duration) ? appointment.duration : 0;
            totalVisitDuration += duration;
          });
          
          // Calculate distance and driving time from legs
          if (routeResult.legs) {
            routeResult.legs.forEach(leg => {
              if (leg.distance && leg.distance.value) {
                totalDistanceValue += leg.distance.value;
              }
              if (leg.duration && leg.duration.value) {
                totalDurationValue += leg.duration.value;
              }
            });
          }
          
          // Convert distance from meters to kilometers
          const distanceKm = totalDistanceValue / 1000;
          
          // Convert driving time from seconds to minutes
          const drivingTimeMinutes = Math.round(totalDurationValue / 60);
          
          // Calculate total time (driving time + visit time)
          const totalTimeMinutes = drivingTimeMinutes + totalVisitDuration;
          
          // Update the route with all calculated values (for UI)
          updatedRoutePaths[routeIndex] = {
            ...updatedRoutePaths[routeIndex],
            directions: result,
            totalDistance: `${distanceKm.toFixed(1)} km`,
            totalTime: totalTimeMinutes >= 60 
              ? `${Math.floor(totalTimeMinutes / 60)}h ${totalTimeMinutes % 60}min` 
              : `${totalTimeMinutes}min`,
            loading: false
          };
          
          // Save only important values to the backend with React Query mutation
          if (routeData && routeData.id) {
            try {
              // Save values to backend with React Query mutation
              updateRouteMutation.mutate({ 
                id: routeData.id, 
                routeData: {
                  total_distance: distanceKm,
                  total_duration: totalTimeMinutes
                } 
              });
              
              console.log(`Route ${routeData.id} updated: ${distanceKm}km, ${totalTimeMinutes}min`);
              
            } catch (error) {
              console.error(`Error saving route ${routeData.id}:`, error);
            }
          }
        }
        
        // Update state
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

    // Start the process
    initializeAndCalculateRoutes();
    
  }, [map, filteredRoutes, markers, appointments, employees, selectedWeekday, updateRouteMutation]);
  
  // Debug logging for input data
  useEffect(() => {
    console.log('useRouteCalculator input data:', {
      hasMap: !!map,
      markersCount: markers.length,
      filteredRoutesCount: filteredRoutes.length,
      appointmentsCount: appointments.length,
      employeesCount: employees.length,
      selectedWeekday
    });
  }, [map, markers.length, filteredRoutes.length, appointments.length, employees.length, selectedWeekday]);

  // Trigger recalculation when the route_order changes
  useEffect(() => {
    // Early return if we don't have necessary data yet
    if (!map || !filteredRoutes.length || !markers.length) {
      return;
    }
    
    // Create a serialized version of all route orders to detect changes
    const currentRouteOrderString = JSON.stringify(
      filteredRoutes.map(route => ({ 
        id: route.id, 
        order: route.route_order 
      }))
    );
    
    // Check if the route order has changed
    if (previousRouteOrder.current !== currentRouteOrderString) {
      console.log('Route order changed, triggering recalculation');
      
      // Update the reference for future comparisons
      previousRouteOrder.current = currentRouteOrderString;
      
      // Don't trigger on first load (previousRouteOrder would be null)
      if (previousRouteOrder.current !== null) {
        // Only trigger if we already have calculated routes
        if (routePaths.length > 0) {
          console.log('Recalculating routes because route_order changed');
          calculateRoutes();
        }
      }
    }
  }, [filteredRoutes, map, markers, calculateRoutes, routePaths.length]);

  // Return the route calculation results and the function to trigger calculation
  return {
    routePaths,
    calculateRoutes,
    isCalculating: isCalculatingRoutes.current
  };
}; 