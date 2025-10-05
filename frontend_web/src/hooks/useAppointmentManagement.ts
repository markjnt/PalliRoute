import { useCallback } from 'react';
import { Weekday } from '../types/models';
import { useMoveAppointment, useCheckReplacement } from '../services/queries/useAppointments';
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
    respectReplacement?: boolean;
  }) => Promise<void>;
  
  // Check for replacement
  checkReplacement: (targetEmployeeId: number, weekday: string, calendarWeek?: number) => Promise<any>;
  
  // Loading states
  isMoving: boolean;
  isCheckingReplacement: boolean;
}

export const useAppointmentManagement = ({
  selectedDay
}: UseAppointmentManagementProps): AppointmentManagementReturn => {
  const { setNotification, setLoading, resetLoading } = useNotificationStore();
  const { selectedCalendarWeek, getCurrentCalendarWeek } = useCalendarWeekStore();
  const moveAppointment = useMoveAppointment();
  const checkReplacement = useCheckReplacement();

  // Move single appointment
  const moveAppointmentHandler = useCallback(async (params: {
    appointmentId: number;
    sourceEmployeeId?: number;
    targetEmployeeId?: number;
    sourceArea?: string;
    targetArea?: string;
    respectReplacement?: boolean;
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

  // Check for replacement
  const checkReplacementHandler = useCallback(async (targetEmployeeId: number, weekday: string, calendarWeek?: number) => {
    try {
      const currentWeek = calendarWeek || selectedCalendarWeek || getCurrentCalendarWeek();
      return await checkReplacement.mutateAsync({
        targetEmployeeId,
        weekday,
        calendarWeek: currentWeek
      });
    } catch (error) {
      console.error('Fehler beim Prüfen der Vertretung:', error);
      throw error;
    }
  }, [checkReplacement, selectedCalendarWeek, getCurrentCalendarWeek]);


  return {
    moveAppointment: moveAppointmentHandler,
    checkReplacement: checkReplacementHandler,
    isMoving: moveAppointment.isPending,
    isCheckingReplacement: checkReplacement.isPending
  };
};
