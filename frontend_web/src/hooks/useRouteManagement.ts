import { useCallback } from 'react';
import { Route, Weekday } from '../types/models';
import { useOptimizeRoutes, useOptimizeWeekendRoutes, useReorderAppointment } from '../services/queries/useRoutes';
import { useNotificationStore } from '../stores/useNotificationStore';

interface UseRouteManagementProps {
  selectedDay: Weekday;
  employeeId?: number;
  area?: string;
}

interface RouteManagementReturn {
  // Route optimization
  optimizeRoute: () => Promise<void>;
  optimizeWeekendRoute: () => Promise<void>;
  
  // Route reordering
  movePatientUp: (routeId: number, appointmentId: number) => Promise<void>;
  movePatientDown: (routeId: number, appointmentId: number) => Promise<void>;
  
  // Loading states
  isOptimizing: boolean;
  isReordering: boolean;
}

export const useRouteManagement = ({
  selectedDay,
  employeeId,
  area
}: UseRouteManagementProps): RouteManagementReturn => {
  const { setNotification, setLoading, resetLoading } = useNotificationStore();
  const optimizeRoutes = useOptimizeRoutes();
  const optimizeWeekendRoutes = useOptimizeWeekendRoutes();
  const reorderAppointment = useReorderAppointment();

  // Optimize regular route
  const optimizeRoute = useCallback(async () => {
    if (!employeeId) {
      setNotification('Kein Mitarbeiter ausgewählt', 'error');
      return;
    }

    try {
      setLoading('Route wird optimiert...');
      await optimizeRoutes.mutateAsync({
        weekday: selectedDay.toLowerCase(),
        employeeId
      });
      setNotification('Route erfolgreich optimiert', 'success');
    } catch (error) {
      console.error('Fehler beim Optimieren der Route:', error);
      setNotification('Fehler beim Optimieren der Route', 'error');
    } finally {
      resetLoading();
    }
  }, [employeeId, selectedDay, optimizeRoutes, setNotification, setLoading, resetLoading]);

  // Optimize weekend route
  const optimizeWeekendRoute = useCallback(async () => {
    if (!area) {
      setNotification('Kein Bereich ausgewählt', 'error');
      return;
    }

    try {
      setLoading('Wochenend-Route wird optimiert...');
      await optimizeWeekendRoutes.mutateAsync({
        weekday: selectedDay.toLowerCase(),
        area
      });
      setNotification('Route erfolgreich optimiert', 'success');
    } catch (error) {
      console.error('Fehler beim Optimieren der Wochenend-Route:', error);
      setNotification('Fehler beim Optimieren der Route', 'error');
    } finally {
      resetLoading();
    }
  }, [area, selectedDay, optimizeWeekendRoutes, setNotification, setLoading, resetLoading]);

  // Move patient up in route
  const movePatientUp = useCallback(async (routeId: number, appointmentId: number) => {
    try {
      setLoading('Patient wird verschoben...');
      await reorderAppointment.mutateAsync({
        routeId,
        appointmentId,
        direction: 'up'
      });
      setNotification('Patient verschoben', 'success');
    } catch (error) {
      console.error('Fehler beim Verschieben des Patienten:', error);
      setNotification('Fehler beim Verschieben des Patienten', 'error');
    } finally {
      resetLoading();
    }
  }, [reorderAppointment, setNotification, setLoading, resetLoading]);

  // Move patient down in route
  const movePatientDown = useCallback(async (routeId: number, appointmentId: number) => {
    try {
      setLoading('Patient wird verschoben...');
      await reorderAppointment.mutateAsync({
        routeId,
        appointmentId,
        direction: 'down'
      });
      setNotification('Patient verschoben', 'success');
    } catch (error) {
      console.error('Fehler beim Verschieben des Patienten:', error);
      setNotification('Fehler beim Verschieben des Patienten', 'error');
    } finally {
      resetLoading();
    }
  }, [reorderAppointment, setNotification, setLoading, resetLoading]);

  return {
    optimizeRoute,
    optimizeWeekendRoute,
    movePatientUp,
    movePatientDown,
    isOptimizing: optimizeRoutes.isPending || optimizeWeekendRoutes.isPending,
    isReordering: reorderAppointment.isPending
  };
};
