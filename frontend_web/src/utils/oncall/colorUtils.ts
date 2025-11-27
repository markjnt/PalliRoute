import { DutyType, OnCallArea } from '../../types/models';

// Color mapping for RB duties
const DUTY_COLORS: Record<string, string> = {
  'rb_nursing_weekday_Nord': '#f4c999',
  'rb_nursing_weekday_Süd': '#41b955',
  'rb_doctors_weekday_Nord': '#36afe2',
  'rb_doctors_weekday_Süd': '#fdec02',
  'rb_nursing_weekend_day_Nord': '#b8fcbb',
  'rb_nursing_weekend_night_Nord': '#f66522',
  'rb_nursing_weekend_day_Süd': '#f02a33',
  'rb_nursing_weekend_night_Süd': '#d746a5',
  'rb_doctors_weekend_Nord': '#36afe2',
  'rb_doctors_weekend_Süd': '#fdec02',
  // AW duties
  'aw_nursing_Nord': '#a4ddf3',
  'aw_nursing_Mitte': '#f7f28b',
  'aw_nursing_Süd': '#41b955',
};

export const getDutyColor = (dutyType: DutyType, area?: OnCallArea, hasAssignment: boolean = false): string => {
  const key = `${dutyType}_${area || ''}`;
  const baseColor = DUTY_COLORS[key] || '#9e9e9e';
  
  if (!hasAssignment) {
    // Return a lighter/paler version when no assignment
    return lightenColor(baseColor, 0.6);
  }
  
  // Return the full color when assignment exists
  return baseColor;
};

// Helper function to lighten a color
function lightenColor(color: string, factor: number): string {
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Lighten by mixing with white
  const newR = Math.round(r + (255 - r) * factor);
  const newG = Math.round(g + (255 - g) * factor);
  const newB = Math.round(b + (255 - b) * factor);
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

export const getCapacityColor = (remaining: number, limit: number): 'success' | 'warning' | 'error' => {
  if (limit === 0) return 'success';
  const percentage = (remaining / limit) * 100;
  if (percentage >= 50) return 'success';
  if (percentage >= 25) return 'warning';
  return 'error';
};

