import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Phone as PhoneIcon,
  Info as InfoIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { useDrag, useDrop } from 'react-dnd';
import { getColorForVisitType } from '../../utils/mapUtils';
import { useDragStore } from '../../stores/useDragStore';
import { useRouteCompletionStore } from '../../stores/useRouteCompletionStore';

// Drag and drop types
const ItemTypes = {
  ROUTE_STOP: 'routeStop'
};

interface DragItem {
  id: number;
  index: number;
  originalIndex: number;
  type: string;
}

interface RouteStop {
  id: number;
  position: number;
  patientName: string;
  address: string;
  visitType: string;
  time?: string;
  phone1?: string;
  phone2?: string;
  info?: string;
  isCompleted: boolean;
  responsibleEmployeeName?: string;  // For tour_employee appointments: shows "Zuständig: [Name]"
  tourEmployeeName?: string;  // For responsible employee: shows "Ursprungstour: [Name]"
  isTourEmployeeAppointment?: boolean;  // Mark tour_employee appointments for styling
  originEmployeeName?: string;  // For replacement appointments: shows "Ursprünglich (Vertretung): [Name]"
}

interface RouteStopItemProps {
  stop: RouteStop;
  index: number;
  moveStop: (dragIndex: number, hoverIndex: number) => void;
  onToggle: (stopId: number) => void;
}

export const RouteStopItem: React.FC<RouteStopItemProps> = ({ 
  stop, 
  index, 
  moveStop, 
  onToggle
}) => {
  const { setIsDragging } = useDragStore();
  const { completedStops } = useRouteCompletionStore();
  
  const isCompleted = completedStops.has(stop.id);
  
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.ROUTE_STOP,
    item: { id: stop.id, index, originalIndex: index, type: ItemTypes.ROUTE_STOP },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !stop.isTourEmployeeAppointment, // Disable drag for tour employee appointments
  });

  // Update global drag state
  useEffect(() => {
    setIsDragging(isDragging);
  }, [isDragging, setIsDragging]);

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.ROUTE_STOP,
    hover: (item: DragItem, monitor) => {
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
    drop: (item: DragItem) => {
      // Use the original index that we saved
      const originalIndex = item.originalIndex;
      const targetIndex = index;

      // Only call moveStop when actually dropping
      moveStop(originalIndex, targetIndex);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <Box
      ref={(node: HTMLElement | null) => {
        if (node) {
          drop(node);
        }
      }}
      sx={{
        opacity: isDragging ? 0.6 : (stop.isTourEmployeeAppointment ? 0.5 : 1),
        transform: isDragging ? 'rotate(1deg) scale(1.02)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        bgcolor: isOver ? 'rgba(0, 122, 255, 0.08)' : 'transparent',
        borderTop: isOver ? '3px solid #007AFF' : 'none',
        borderRadius: 1,
        mx: 0.5,
        my: 0.25,
        filter: stop.isTourEmployeeAppointment ? 'grayscale(0.3)' : 'none',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: { xs: 1.25, sm: 1.5 },
          transition: 'all 0.2s ease',
        }}
      >
        {/* Position Number with Drag Handle */}
        {!stop.isTourEmployeeAppointment && (
          <Box
            ref={(node: HTMLElement | null) => {
              if (node) {
                drag(node);
              }
            }}
            sx={{
              width: { xs: 32, sm: 36 },
              height: { xs: 32, sm: 36 },
              borderRadius: '50%',
              bgcolor: isCompleted ? '#34C759' : '#007AFF',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              fontWeight: 700,
              mr: { xs: 1.5, sm: 2 },
              flexShrink: 0,
              position: 'relative',
              boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)',
              transition: 'all 0.2s ease',
              cursor: 'grab',
              '&:active': {
                cursor: 'grabbing',
              },

            }}
          >
            {stop.position}
            <DragIcon 
              sx={{ 
                position: 'absolute',
                top: { xs: -6, sm: -8 },
                right: { xs: -6, sm: -8 },
                fontSize: { xs: 14, sm: 16 },
                color: '#8E8E93',
                bgcolor: 'white',
                borderRadius: '50%',
                p: { xs: 0.2, sm: 0.25 },
                cursor: 'grab',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease',
                '&:active': {
                  cursor: 'grabbing',
                  transform: 'scale(1.1)',
                },

              }} 
            />
          </Box>
        )}

                  {/* Stop Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: isCompleted ? '#8E8E93' : '#1d1d1f',
                  textDecoration: isCompleted ? 'line-through' : 'none',
                  flex: 1,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  lineHeight: 1.3,
                }}
              >
                {stop.patientName}
              </Typography>
              <Chip
                label={stop.visitType === 'HB' ? 'HB' : stop.visitType}
                size="small"
                sx={{
                  bgcolor: `${getColorForVisitType(stop.visitType)}15`,
                  color: getColorForVisitType(stop.visitType),
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  height: { xs: 18, sm: 20 },
                  ml: { xs: 0.75, sm: 1 },
                  fontWeight: 600,
                  border: `1px solid ${getColorForVisitType(stop.visitType)}30`,
                }}
              />
            </Box>
            
            {/* Zuständig anzeigen (nur beim tour_employee) */}
            {stop.responsibleEmployeeName && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#007AFF',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  Zuständig: {stop.responsibleEmployeeName}
                </Typography>
              </Box>
            )}
            
            {/* Ursprungstour anzeigen (nur beim zuständigen Mitarbeiter) */}
            {stop.tourEmployeeName && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#007AFF',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  Ursprungstour: {stop.tourEmployeeName}
                </Typography>
              </Box>
            )}
            
            {/* Ursprünglich (Vertretung) anzeigen */}
            {stop.originEmployeeName && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#007AFF',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  Ursprünglich (Vertretung): {stop.originEmployeeName}
                </Typography>
              </Box>
            )}
          
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocationIcon sx={{ 
                fontSize: { xs: 13, sm: 14 }, 
                color: '#8E8E93', 
                mr: 0.5 
              }} />
              <Typography
                variant="caption"
                sx={{
                  color: '#8E8E93',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                }}
                onClick={() => {
                  const encodedAddress = encodeURIComponent(stop.address);
                  window.location.href = `https://maps.google.com/?q=${encodedAddress}`;
                }}
              >
                {stop.address}
              </Typography>
            </Box>
          
          {stop.time && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <TimeIcon sx={{ fontSize: 14, color: '#8E8E93', mr: 0.5 }} />
              <Typography
                variant="caption"
                sx={{
                  color: '#8E8E93',
                  fontSize: '0.75rem',
                }}
              >
                {stop.time}
              </Typography>
            </Box>
          )}
          
          {stop.info && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <InfoIcon sx={{ fontSize: 14, color: '#007AFF', mr: 0.5 }} />
              <Typography
                variant="caption"
                sx={{
                  color: '#007AFF',
                  fontSize: '0.75rem',
                  bgcolor: 'rgba(0, 122, 255, 0.1)',
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                }}
              >
                {stop.info}
              </Typography>
            </Box>
          )}
          
          {(stop.phone1 || stop.phone2) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
              {stop.phone1 && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PhoneIcon sx={{ fontSize: 14, color: '#8E8E93', mr: 0.5 }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#8E8E93',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      const cleanPhone = stop.phone1!.replace(/\s+/g, '');
                      window.location.href = `tel:${cleanPhone}`;
                    }}
                  >
                    {stop.phone1}
                  </Typography>
                </Box>
              )}
              {stop.phone2 && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PhoneIcon sx={{ fontSize: 14, color: '#8E8E93', mr: 0.5 }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#8E8E93',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      const cleanPhone = stop.phone2!.replace(/\s+/g, '');
                      window.location.href = `tel:${cleanPhone}`;
                    }}
                  >
                    {stop.phone2}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Checkbox */}
        {!stop.isTourEmployeeAppointment && (
          <Checkbox
            checked={isCompleted}
            icon={<UncheckedIcon sx={{ color: '#C7C7CC' }} />}
            checkedIcon={<CheckCircleIcon sx={{ color: '#34C759' }} />}
            sx={{
              ml: 1,
              '&:hover': {
                bgcolor: 'transparent',
              },
            }}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggle(stop.id)}
          />
        )}
      </Box>
    </Box>
  );
};

export default RouteStopItem;
