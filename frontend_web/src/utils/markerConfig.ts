import { getColorForVisitType, getColorForEmployeeType } from './mapUtils';

export const createMarkerIcon = (type: 'employee' | 'patient' | 'weekend_area' | 'weekend_patient', employeeType?: string, visitType?: string, isGray: boolean = false, area?: string) => {
  if (isGray) {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: getColorForVisitType(visitType),
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

  if (type === 'weekend_area') {
    // Single color for weekend start marker
    const getAreaColor = (area?: string) => {
      if (area === 'Wochenend-Touren') return '#ff9800'; // Orange for general weekend marker
      switch (area) {
        case 'Nord': return '#1976d2'; // Blue
        case 'Mitte': return '#7b1fa2'; // Purple
        case 'Süd': return '#388e3c'; // Green
        default: return '#ff9800'; // Orange
      }
    };
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: getAreaColor(area),
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 12,
    };
  }

  if (type === 'weekend_patient') {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: getColorForVisitType(visitType),
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

  // Show route position for HB and NA appointments (both are routed)
  if ((visitType === 'HB' || visitType === 'NA') && label) {
    return {
      text: label,
      color: 'white',
      fontWeight: 'bold',
      fontSize: '14px'
    };
  }

  return undefined;
}; 