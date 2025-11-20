import React from 'react';
import { Box, Button, Typography, Chip } from '@mui/material';
import {
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useLastUpdateStore } from '../../stores/useLastUpdateStore';
import { useRefresh } from '../../services/queries/useRefresh';

export const FloatingRefreshButton: React.FC = () => {
  const { lastUpdateTime } = useLastUpdateStore();
  const { refreshData } = useRefresh();

  // Format last update time for display
  const formatLastUpdateTime = (time: Date | null): { date: string; time: string } => {
    if (!time) return { date: 'Noch nicht', time: 'aktualisiert' };
    
    return {
      date: time.toLocaleDateString('de-DE'),
      time: time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const timeInfo = formatLastUpdateTime(lastUpdateTime);

  return (
    <>
      {/* Refresh Button - fixed position, no container */}
      <Button
        variant="contained"
        onClick={refreshData}
        sx={{
          position: 'absolute',
          top: 95, // Position under TopOverviewBar (64px height + 20px margin + 11px for spacing)
          right: 28, // Align with the Avatar button (20px from edge + 8px margin-right)
          zIndex: 1000,
          bgcolor: 'rgba(33, 150, 243, 0.9)',
          backdropFilter: 'blur(20px)',
          borderRadius: 2,
          textTransform: 'none',
          width: 48, // Same size as TopBar buttons
          height: 48,
          minWidth: 'unset',
          minHeight: 'unset',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          '&:hover': {
            bgcolor: 'rgba(25, 118, 210, 0.9)',
          }
        }}
      >
        <RefreshIcon sx={{ fontSize: 18 }} />
      </Button>
      
      {/* Time chip - absolutely positioned below button */}
      {lastUpdateTime && (
        <Chip
          label={
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.2 }}>
              <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 500, lineHeight: 1 }}>
                {timeInfo.date}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 500, lineHeight: 1 }}>
                {timeInfo.time}
              </Typography>
            </Box>
          }
          size="small"
          sx={{
            position: 'absolute',
            top: 150, // Position below button (95 + 48 + 7px gap)
            right: 21, // Same horizontal position as button
            zIndex: 1000,
            width: 66,
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            height: 'auto',
            py: 0.5,
            '& .MuiChip-label': {
              p: 0.5,
            }
          }}
        />
      )}
    </>
  );
};
