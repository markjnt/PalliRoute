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
    created_at?: string;
    updated_at?: string;
}

export interface EmployeeFormData extends Omit<Employee, 'id' | 'created_at' | 'updated_at'> {
}

export interface EmployeeImportResponse {
    message: string;
    added_employees: Employee[];
    updated_employees: Employee[];
}

export type VisitType = 'HB' | 'NA' | 'TK';
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface Appointment {
    id?: number;
    patient_id: number;
    employee_id?: number;
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
    employee_id: number | null;
    weekday: string;
    route_order: number[];
    total_duration: number;
    total_distance: number;
    polyline: string;
    area: string; // Changed from Area to string to support weekend areas like 'Nord', 'Mitte', 'Süd'
    calendar_week?: number;  // Added for easier filtering
    created_at: string;
    updated_at: string;
} 