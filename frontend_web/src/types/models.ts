export interface User {
    id: number;
    name: string;
    area: Area;
    created_at: string;
    avatarUrl?: string;
}

export type Area = 'Nordkreis' | 'Südkreis' | 'Nord- und Südkreis';

export interface UserFormData {
    name: string;
    area: Area;
}

export interface Employee {
    id?: number;
    first_name: string;
    last_name: string;
    street: string;
    zip_code: string;
    city: string;
    latitude?: number;
    longitude?: number;
    function: string;
    work_hours: number;
    area: Area;
    alias?: string;
    // Old capacity fields removed - now managed via EmployeeCapacity model
    created_at?: string;
    updated_at?: string;
}

export interface EmployeeFormData extends Omit<Employee, 'id' | 'created_at' | 'updated_at'> {
}

export interface EmployeeImportResponse {
    message: string;
    summary: {
        total_processed: number;
        added: number;
        updated: number;
        removed: number;
    };
    added_employees: Employee[];
    updated_employees: Employee[];
    removed_employees: Employee[];
}

export interface Pflegeheim {
    id: number;
    name: string;
    street: string;
    zip_code: string;
    city: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    created_at?: string;
    updated_at?: string;
}

export interface PflegeheimImportResponse {
    message: string;
    summary: {
        total_processed: number;
        added: number;
        updated: number;
        removed: number;
    };
    added_pflegeheime: Pflegeheim[];
    updated_pflegeheime: Pflegeheim[];
    removed_pflegeheime: Pflegeheim[];
}

export type VisitType = 'HB' | 'NA' | 'TK';
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface Appointment {
    id?: number;
    patient_id: number;
    employee_id?: number;
    origin_employee_id?: number;  // Original employee before replacement
    tour_employee_id?: number;  // Original employee from "Touren" column
    weekday: Weekday;
    time?: string; // Format: "HH:MM"
    visit_type: VisitType;
    duration: number;
    info?: string;
    area: Area;
    calendar_week?: number;  // Added for easier filtering
    created_at?: string;
    updated_at?: string;
}

export interface Patient {
    id?: number;
    first_name: string;
    last_name: string;
    full_name?: string;
    street: string;
    zip_code: string;
    city: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    phone1?: string;
    phone2?: string;
    calendar_week?: number;
    area?: string; // Nordkreis or Südkreis
    created_at?: string;
    updated_at?: string;
    appointments?: Appointment[];
}

export interface PatientImportResponse {
    message: string;
    patients: Patient[];
    appointments: Appointment[];
    calendar_week?: number;  // Keep for backward compatibility
    calendar_weeks?: number[];  // All calendar weeks found during import
    calendar_weeks_str?: string;  // Formatted string for display
}

export interface Route {
    id: number;
    employee_id: number;
    weekday: string;
    route_order: number[];
    total_duration: number;
    total_distance: number;
    polyline: string;
    area: Area;
    calendar_week?: number;  // Added for easier filtering
    created_at: string;
    updated_at: string;
}

export type DutyType = 
    | 'rb_nursing_weekday'           // Rufbereitschaft Pflege unter der Woche
    | 'rb_nursing_weekend_day'        // Rufbereitschaft Pflege Wochenende Tag
    | 'rb_nursing_weekend_night'      // Rufbereitschaft Pflege Wochenende Nacht
    | 'rb_doctors_weekday'            // Rufbereitschaft Ärzte unter der Woche
    | 'rb_doctors_weekend'            // Rufbereitschaft Ärzte Wochenende
    | 'aw_nursing';                   // Wochenenddienste Pflege

export type OnCallArea = 'Nord' | 'Süd' | 'Mitte';

// New scheduling models
export type ShiftCategory = 'RB_WEEKDAY' | 'RB_WEEKEND' | 'AW';
export type ShiftRole = 'NURSING' | 'DOCTOR';
export type ShiftTimeOfDay = 'DAY' | 'NIGHT' | 'NONE';
export type ShiftArea = 'Nord' | 'Süd' | 'Mitte';
export type CapacityType = 'RB_NURSING_WEEKDAY' | 'RB_NURSING_WEEKEND' | 'RB_DOCTORS_WEEKDAY' | 'RB_DOCTORS_WEEKEND' | 'AW_NURSING';
export type AssignmentSource = 'SOLVER' | 'MANUAL';

export interface ShiftDefinition {
    id: number;
    category: ShiftCategory;
    role: ShiftRole;
    area: ShiftArea;
    time_of_day: ShiftTimeOfDay;
    is_weekday: boolean;
    is_weekend: boolean;
}

export interface ShiftInstance {
    id: number;
    date: string;  // ISO date string (YYYY-MM-DD)
    calendar_week: number;
    month: string;  // Format: "YYYY-MM"
    shift_definition_id: number;
    shift_definition?: ShiftDefinition;  // Populated when fetched with details
}

export interface EmployeeCapacity {
    id: number;
    employee_id: number;
    capacity_type: CapacityType;
    max_count: number;
    assigned: number;  // Calculated from assignments (for a specific month)
    remaining: number;  // Calculated: max_count - assigned
    employee?: {
        id: number;
        first_name: string;
        last_name: string;
        function: string;
    };  // Populated when fetched with employee details
}

export interface Assignment {
    id: number;
    employee_id: number;
    shift_instance_id: number;
    source: AssignmentSource;
    employee?: {
        id: number;
        first_name: string;
        last_name: string;
        function: string;
        area: Area;
    };  // Populated when fetched with employee details
    shift_instance?: ShiftInstance;  // Populated when fetched with details
    shift_definition?: ShiftDefinition;  // Populated when shift_instance is included
} 