import React from 'react';
import { Box, Typography, Chip, LinearProgress } from '@mui/material';

interface TourInfoBoxProps {
  employeeName: string;
  area: string;
  utilization?: number; // Prozent, optional
  tourColor: string;
  durationMinutes?: number;
  targetMinutes?: number;
}

/**
 * Component for displaying tour information in a colored box
 * Used in both weekday and weekend marker info windows
 */
export const TourInfoBox: React.FC<TourInfoBoxProps> = ({ 
  employeeName, 
  area, 
  utilization, 
  tourColor, 
  durationMinutes, 
  targetMinutes 
}) => {
  // Handle both weekday areas (Nordkreis/Südkreis) and weekend areas (Nord/Mitte/Süd)
  const isNord = area?.includes('Nordkreis');
  const isWeekendArea = area === 'Nord' || area === 'Mitte' || area === 'Süd';
  const areaLabel = isWeekendArea ? area : (isNord ? 'N' : 'S');
  const barColor = utilization !== undefined && utilization > 100 ? 'error.main' : 'success.main';
  
  // Zeitformatierung
  const formatTime = (min?: number) => {
    if (typeof min !== 'number' || isNaN(min)) return '-';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{
      bgcolor: tourColor,
      borderRadius: 2,
      p: 1.2,
      mb: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, minWidth: 0 }}>
          {employeeName && (
            <Chip
              label={employeeName}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.18)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                letterSpacing: 0.5,
                maxWidth: '120px',
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }
              }}
            />
          )}
          <Chip
            label={areaLabel}
            size="small"
            sx={{
              bgcolor: isWeekendArea ? 'rgba(255,255,255,0.18)' : (isNord ? 'primary.main' : 'secondary.main'),
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1rem',
              letterSpacing: 0.5,
              flexShrink: 0
            }}
          />
        </Box>
        {/* Zeit-Box ganz rechts, falls Platz */}
        {durationMinutes !== undefined && targetMinutes !== undefined && (
          <Box sx={{
            bgcolor: 'white',
            borderRadius: 2,
            px: 1.2,
            py: 0.5,
            minWidth: 80,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            ml: 'auto'
          }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: barColor, fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(durationMinutes)} / {formatTime(targetMinutes)}
            </Typography>
          </Box>
        )}
      </Box>
      {utilization !== undefined && (
        <Box sx={{ width: '100%', mt: 1 }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'white',
            borderRadius: 2,
            px: 1.2,
            py: 0.5,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            width: '100%',
            gap: 1,
          }}>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(utilization, 100)}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#eee',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: barColor,
                  },
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ minWidth: 36, textAlign: 'right', fontWeight: 'bold', color: barColor, ml: 1 }}>
              {utilization !== undefined ? `${Math.round(utilization)}%` : '-'}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};
