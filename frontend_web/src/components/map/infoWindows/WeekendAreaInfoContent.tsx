import React from 'react';
import { Box, Typography } from '@mui/material';
import { MarkerData } from '../../../types/mapTypes';

interface WeekendAreaInfoContentProps {
  marker: MarkerData;
}

/**
 * Component for displaying weekend area information in marker info windows
 */
export const WeekendAreaInfoContent: React.FC<WeekendAreaInfoContentProps> = ({ marker }) => {
  const getAreaColor = (area?: string) => {
    if (area === 'Wochenend-Touren') return '#ff9800';
    switch (area) {
      case 'Nord': return '#1976d2';
      case 'Mitte': return '#7b1fa2';
      case 'Süd': return '#388e3c';
      default: return '#ff9800';
    }
  };

  const isGeneralWeekendMarker = marker.area === 'Wochenend-Touren';
  const area = marker.area || '';

  return (
    <>
      <Typography variant="subtitle1" component="div" sx={{ 
        fontWeight: 'bold',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 0.5,
        mb: 1
      }}>
        {marker.title}
      </Typography>
      
      {/* Weekend area type */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 1,
        p: 0.5,
        bgcolor: `${getAreaColor(marker.area)}20`,
        borderRadius: 1
      }}>
        <Box 
          sx={{ 
            width: 12, 
            height: 12, 
            borderRadius: '50%',
            bgcolor: getAreaColor(marker.area),
            mr: 1
          }} 
        />
        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
          {isGeneralWeekendMarker 
            ? 'Zentraler Startpunkt für alle Wochenend-Touren' 
            : `${marker.area}-Bereich`
          }
        </Typography>
      </Box>
      
      {/* Address */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          {(() => {
            switch (area) {
              case 'Nord':
                return <>Lüdenscheider Str. 5<br/>51688 Wipperfürth</>;
              case 'Mitte':
                return <>Auf der Brück 9<br/>51645 Gummersbach</>;
              case 'Süd':
                return <>Bahnhofstraße 1<br/>51545 Waldbröl</>;
              default:
                return <>Auf der Brück 9<br/>51645 Gummersbach</>;
            }
          })()}
        </Typography>
      </Box>
      
      {isGeneralWeekendMarker && (
        <Box sx={{ mt: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
            Wochenend-Bereiche:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              px: 1, 
              py: 0.5, 
              bgcolor: '#1976d2', 
              color: 'white', 
              borderRadius: 1,
              fontSize: '0.75rem'
            }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'white' }} />
              Nord
            </Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              px: 1, 
              py: 0.5, 
              bgcolor: '#7b1fa2', 
              color: 'white', 
              borderRadius: 1,
              fontSize: '0.75rem'
            }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'white' }} />
              Mitte
            </Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              px: 1, 
              py: 0.5, 
              bgcolor: '#388e3c', 
              color: 'white', 
              borderRadius: 1,
              fontSize: '0.75rem'
            }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'white' }} />
              Süd
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
};
