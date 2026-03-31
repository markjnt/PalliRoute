import { useCallback } from 'react';
import { Route, Weekday } from '../types/models';
import { useOptimizeRoutes, useOptimizeTourAreaRoutes, useReorderAppointment } from '../services/queries/useRoutes';
import { useNotificationStore } from '../stores/useNotificationStore';

interface UseRouteManagementProps {
  selectedDay: Weekday;
  employeeId?: number;
  area?: string;
}

interface RouteManagementReturn {
  optimizeRoute: () => Promise<void>;
  optimizeTourAreaRoute: () => Promise<void>;
  movePatientUp: (routeId: number, appointmentId: number) => Promise<void>;
  movePatientDown: (routeId: number, appointmentId: number) => Promise<void>;
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
  const optimizeTourAreaRoutes = useOptimizeTourAreaRoutes();
  const reorderAppointment = useReorderAppointment();

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

  const optimizeTourAreaRoute = useCallback(async () => {
    if (!area) {
      setNotification('Kein Bereich ausgewählt', 'error');
      return;
    }

    try {
      setLoading('AW-Tour wird optimiert...');
      await optimizeTourAreaRoutes.mutateAsync({
        weekday: selectedDay.toLowerCase(),
        area
      });
      setNotification('Route erfolgreich optimiert', 'success');
    } catch (error) {
      console.error('Fehler beim Optimieren der AW-Flächenroute:', error);
      setNotification('Fehler beim Optimieren der Route', 'error');
    } finally {
      resetLoading();
    }
  }, [area, selectedDay, optimizeTourAreaRoutes, setNotification, setLoading, resetLoading]);

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
    optimizeTourAreaRoute,
    movePatientUp,
    movePatientDown,
    isOptimizing: optimizeRoutes.isPending || optimizeTourAreaRoutes.isPending,
    isReordering: reorderAppointment.isPending
  };
};
