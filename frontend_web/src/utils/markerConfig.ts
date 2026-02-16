import { getColorForVisitType, getColorForEmployeeType } from './mapUtils';

export const createMarkerIcon = (type: 'employee' | 'patient' | 'weekend_area' | 'weekend_patient' | 'custom' | 'pflegeheim', employeeType?: string, visitType?: string, isGray: boolean = false, area?: string) => {
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

  if (type === 'pflegeheim') {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#388e3c',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 12,
    };
  }

  if (type === 'custom') {
    // Auffälliger Marker: größer, kräftiges Orange, mit Place-Icon
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="26" fill="#ff5722" stroke="#fff" stroke-width="3"/><path fill="#fff" d="M28 14c-6.07 0-11 4.93-11 11 0 8.25 11 18 11 18s11-9.75 11-18c0-6.07-4.93-11-11-11zm0 15c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>`;
    const encoded = encodeURIComponent(svg);
    return {
      url: `data:image/svg+xml,${encoded}`,
      scaledSize: new google.maps.Size(35, 35),
      anchor: new google.maps.Point(15, 15),
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