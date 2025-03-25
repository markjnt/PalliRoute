import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Route } from '../types/models';
import { patientsApi } from '../services/api/patients';
import { appointmentsApi } from '../services/api/appointments';
import { routesApi } from '../services/api/routes';

type DragContextType = {
  updatePatientTour: (patientId: number, newTourNumber: number | undefined) => Promise<void>;
  updateAppointmentEmployee: (appointmentId: number, newEmployeeId: number | undefined) => Promise<void>;
  updateRouteOrder: (routeId: number, newRouteOrder: number[]) => Promise<Route>;
  removeFromRouteOrder: (sourceRouteId: number, appointmentId: number) => Promise<Route>;
  loadingPatients: boolean;
  loadingAppointments: boolean;
  loadingRoutes: boolean;
  error: string | null;
};

const DragContext = createContext<DragContextType | undefined>(undefined);

export const DragProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Aktualisiert die Tour-Nummer eines Patienten
   * 
   * Schritt 1 im Prozess des Patientenverschiebens:
   * - Ändert die Tour-Nummer des Patienten in der Datenbank
   */
  const updatePatientTour = async (patientId: number, newTourNumber: number | undefined) => {
    setLoadingPatients(true);
    setError(null);
    try {
      await patientsApi.update(patientId, { tour: newTourNumber });
    } catch (err) {
      setError('Fehler beim Aktualisieren der Patienten-Tour');
      console.error('Fehler beim Aktualisieren der Patienten-Tour:', err);
    } finally {
      setLoadingPatients(false);
    }
  };

  /**
   * Aktualisiert den zuständigen Mitarbeiter für einen Termin
   * 
   * Schritt 2 im Prozess des Patientenverschiebens:
   * - Weist den Termin einem neuen Mitarbeiter zu
   * - Wird für alle Termine des Patienten durchgeführt
   */
  const updateAppointmentEmployee = async (appointmentId: number, newEmployeeId: number | undefined) => {
    setLoadingAppointments(true);
    setError(null);
    try {
      await appointmentsApi.update(appointmentId, { employee_id: newEmployeeId });
    } catch (err) {
      setError('Fehler beim Aktualisieren des Termin-Mitarbeiters');
      console.error('Fehler beim Aktualisieren des Termin-Mitarbeiters:', err);
    } finally {
      setLoadingAppointments(false);
    }
  };

  /**
   * Aktualisiert die Reihenfolge einer Route
   * 
   * Schritt 4.2 im Prozess des Patientenverschiebens:
   * - Aktualisiert die Besuchsreihenfolge in der Zielroute
   * - Fügt neue Termine zur bestehenden Reihenfolge hinzu
   */
  const updateRouteOrder = async (routeId: number, newRouteOrder: number[]) => {
    setLoadingRoutes(true);
    setError(null);
    try {
      console.log(`Aktualisiere Route-Reihenfolge für Route ID ${routeId}`, {
        routeId,
        newRouteOrder
      });
      
      // Stelle sicher, dass die Route-ID gültig ist
      if (!routeId || routeId <= 0) {
        throw new Error(`Ungültige Route-ID: ${routeId}`);
      }
      
      // Stelle sicher, dass die Reihenfolge ein Array ist
      if (!Array.isArray(newRouteOrder)) {
        console.error('Route-Reihenfolge ist kein Array:', newRouteOrder);
        throw new Error('Route-Reihenfolge muss ein Array sein');
      }
      
      // Alle Nicht-Zahlen und ungültigen IDs herausfiltern
      const validRouteOrder = newRouteOrder
        .filter(id => typeof id === 'number' && !isNaN(id) && id > 0)
        .map(id => parseInt(id.toString(), 10)); // Sichere Konvertierung zu Ganzzahlen
      
      console.log(`Sende gültige Route-Reihenfolge an Backend:`, validRouteOrder);
      
      // Sende die Route-Aktualisierung an das Backend
      const result = await routesApi.updateRoute(routeId, { 
        route_order: validRouteOrder 
      });
      
      console.log('Route-Aktualisierung erfolgreich', result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      console.error('Fehler beim Aktualisieren der Route-Reihenfolge:', errorMessage, err);
      setError(`Fehler beim Aktualisieren der Route-Reihenfolge: ${errorMessage}`);
      throw err;
    } finally {
      setLoadingRoutes(false);
    }
  };

  /**
   * Entfernt einen Termin aus der Route-Reihenfolge
   * 
   * Schritt 4.1 im Prozess des Patientenverschiebens:
   * - Entfernt Termine aus der Quellroute
   * - Wird für jeden zu verschiebenden Termin aufgerufen
   */
  const removeFromRouteOrder = async (routeId: number, appointmentId: number) => {
    setLoadingRoutes(true);
    setError(null);
    try {
      console.log(`Entferne Termin ${appointmentId} aus Route ${routeId}`);
      
      // Hole die aktuelle Route vom Backend
      const route = await routesApi.getRouteById(routeId);
      console.log('Route-Reihenfolge vor dem Entfernen:', route.route_order);
      
      if (!route) {
        throw new Error(`Route mit ID ${routeId} nicht gefunden`);
      }
      
      // Stelle sicher, dass route_order ein Array ist
      const currentRouteOrder = route.route_order || [];
      
      if (!Array.isArray(currentRouteOrder)) {
        console.error('Aktuelle Route-Reihenfolge ist kein Array:', currentRouteOrder);
        throw new Error('Aktuelle Route-Reihenfolge ist kein Array');
      }
      
      // Filtere den zu entfernenden Termin heraus
      const newRouteOrder = currentRouteOrder.filter(id => id !== appointmentId);

      console.log('Aktuelle Route-Reihenfolge:', currentRouteOrder);
      console.log('Neue Route-Reihenfolge nach Entfernen:', newRouteOrder);
      
      // Aktualisiere die Route
      const result = await routesApi.updateRoute(routeId, { route_order: newRouteOrder });
      console.log('Route-Aktualisierung nach Entfernen erfolgreich', result);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      console.error('Fehler beim Entfernen des Termins aus der Route:', errorMessage, err);
      setError(`Fehler beim Entfernen des Termins aus der Route: ${errorMessage}`);
      throw err;
    } finally {
      setLoadingRoutes(false);
    }
  };

  return (
    <DragContext.Provider
      value={{
        updatePatientTour,
        updateAppointmentEmployee,
        updateRouteOrder,
        removeFromRouteOrder,
        loadingPatients,
        loadingAppointments,
        loadingRoutes,
        error
      }}
    >
      {children}
    </DragContext.Provider>
  );
};

export const useDrag = (): DragContextType => {
  const context = useContext(DragContext);
  if (context === undefined) {
    throw new Error('useDrag must be used within a DragProvider');
  }
  return context;
}; 