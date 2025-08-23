import { getColorForVisitType, getColorForEmployeeType } from './mapUtils';

// Create marker icon based on type and properties
export const createMarkerIcon = (
  type: 'employee' | 'patient',
  employeeType?: string,
  visitType?: string,
  isInactive: boolean = false,
  routeColor?: string
): google.maps.Symbol | undefined => {
  let baseColor = type === 'employee' 
    ? getColorForEmployeeType(employeeType)
    : getColorForVisitType(visitType);
  
  // If routeColor is provided, use it instead of the default color
  if (routeColor) {
    baseColor = routeColor;
  }
  
  const color = isInactive ? '#9E9E9E' : baseColor;
  
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: type === 'employee' ? 12 : 12,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 2,
  };
};

// Create marker label
export const createMarkerLabel = (
  routePosition?: number,
  visitType?: string,
  customLabel?: string
): google.maps.MarkerLabel | undefined => {
  if (customLabel) {
    return {
      text: customLabel,
      color: '#FFFFFF',
      fontSize: '12px',
      fontWeight: 'bold',
    };
  }
  
  if (routePosition) {
    return {
      text: routePosition.toString(),
      color: '#FFFFFF',
      fontSize: '10px',
      fontWeight: 'bold',
    };
  }
  
  return undefined;
}; 