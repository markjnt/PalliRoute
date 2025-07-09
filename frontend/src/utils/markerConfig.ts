import { getColorForVisitType, getColorForEmployeeType } from './mapUtils';

export const createMarkerIcon = (type: 'employee' | 'patient', employeeType?: string, visitType?: string, isGroup: boolean = false, isGray: boolean = false) => {
  if (isGroup) {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#4285F4',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 12,
    };
  }

  if (isGray) {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#757575', // Dunkleres Grau
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 12,
    };
  }

  if (type === 'employee') {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: getColorForEmployeeType(employeeType),
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 12,
    };
  }

  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: getColorForVisitType(visitType),
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale: 12,
  };
};

export const createMarkerLabel = (count?: number, visitType?: string, label?: string) => {
  if (count && count > 1) {
    return {
      text: count.toString(),
      color: 'white',
      fontWeight: 'bold',
      fontSize: '12px'
    };
  }

  if (visitType === 'HB' && label) {
    return {
      text: label,
      color: 'white',
      fontWeight: 'bold',
      fontSize: '14px'
    };
  }

  return undefined;
}; 