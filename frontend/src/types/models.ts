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
    function: string;
    work_hours: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface EmployeeFormData extends Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'is_active'> {
    is_active?: boolean;
}

export interface EmployeeImportResponse {
    message: string;
    employees: Employee[];
} 