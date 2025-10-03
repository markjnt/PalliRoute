import { useCallback } from 'react';
import { Weekday } from '../types/models';
import { useMoveAppointment, useBatchMoveAppointments } from '../services/queries/useAppointments';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useCalendarWeekStore } from '../stores/useCalendarWeekStore';

interface UseAppointmentManagementProps {
  selectedDay: Weekday;
}

interface AppointmentManagementReturn {
  // Move single appointment
  moveAppointment: (params: {
    appointmentId: number;
    sourceEmployeeId?: number;
    targetEmployeeId?: number;
    sourceArea?: string;
    targetArea?: string;
  }) => Promise<void>;
  
  // Move all appointments for an employee
  moveAllAppointments: (params: {
    sourceEmployeeId?: number;
    targetEmployeeId?: number;
    sourceArea?: string;
    targetArea?: string;
  }) => Promise<void>;
  
  // Loading states
  isMoving: boolean;
  isBatchMoving: boolean;
}

export const useAppointmentManagement = ({
  selectedDay
}: UseAppointmentManagementProps): AppointmentManagementReturn => {
  const { setNotification, setLoading, resetLoading } = useNotificationStore();
  const { selectedCalendarWeek, getCurrentCalendarWeek } = useCalendarWeekStore();
  const moveAppointment = useMoveAppointment();
  const batchMoveAppointments = useBatchMoveAppointments();

  // Move single appointment
  const moveAppointmentHandler = useCallback(async (params: {
    appointmentId: number;
    sourceEmployeeId?: number;
    targetEmployeeId?: number;
    sourceArea?: string;
    targetArea?: string;
  }) => {
    try {
      setLoading('Termin wird zugewiesen...');
      const currentWeek = selectedCalendarWeek || getCurrentCalendarWeek();
      await moveAppointment.mutateAsync({
        ...params,
        calendarWeek: currentWeek
      });
      setNotification('Termin erfolgreich zugewiesen', 'success');
    } catch (error) {
      console.error('Fehler beim Zuweisen des Termins:', error);
      setNotification('Fehler beim Zuweisen des Termins', 'error');
    } finally {
      resetLoading();
    }
  }, [moveAppointment, selectedCalendarWeek, getCurrentCalendarWeek, setNotification, setLoading, resetLoading]);

  // Move all appointments for an employee or area
  const moveAllAppointments = useCallback(async (params: {
    sourceEmployeeId?: number;
    targetEmployeeId?: number;
    sourceArea?: string;
    targetArea?: string;
  }) => {
    try {
      setLoading('Alle Termine werden zugewiesen...');
      const currentWeek = selectedCalendarWeek || getCurrentCalendarWeek();
      await batchMoveAppointments.mutateAsync({
        ...params,
        weekday: selectedDay,
        calendarWeek: currentWeek
      });
      setNotification('Alle Termine erfolgreich zugewiesen', 'success');
    } catch (error) {
      console.error('Fehler beim Verschieben aller Termine:', error);
      setNotification('Fehler beim Verschieben aller Termine', 'error');
    } finally {
      resetLoading();
    }
  }, [batchMoveAppointments, selectedDay, selectedCalendarWeek, getCurrentCalendarWeek, setNotification, setLoading, resetLoading]);

  return {
    moveAppointment: moveAppointmentHandler,
    moveAllAppointments,
    isMoving: moveAppointment.isPending,
    isBatchMoving: batchMoveAppointments.isPending
  };
};
