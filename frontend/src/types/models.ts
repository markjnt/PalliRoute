export interface User {
    id: number;
    name: string;
    area: Area;
    created_at: string;
}

export type Area = 'Nordkreis' | 'Südkreis' | 'Nord- und Südkreis';

export interface UserFormData {
    name: string;
    area: Area;
} 