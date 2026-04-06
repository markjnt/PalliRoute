/** Payload for HTML5 drag; `getData()` is not available during dragover, so we keep this in module scope. */
export type AssignmentDragPayload = {
  assignmentId: number;
  sourceDate: string;
};

let active: AssignmentDragPayload | null = null;

export function setAssignmentDragPayload(payload: AssignmentDragPayload): void {
  active = payload;
}

export function getAssignmentDragPayload(): AssignmentDragPayload | null {
  return active;
}

export function clearAssignmentDragPayload(): void {
  active = null;
}
