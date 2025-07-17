// Definiert die Arten von Elementen, die gedraggt werden können
export enum DragItemTypes {
  PATIENT = 'patient',
}

// Interface für Patient-Draggable-Item
export interface PatientDragItem {
  type: typeof DragItemTypes.PATIENT;
  patientId: number;
  appointmentIds: number[];
  sourceTourNumber?: number;
} 