import React from 'react';
import { Tooltip, Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

const tooltipTitle = (name: string) => `Feiertag: ${name}`;

/**
 * Orangener Hinweis-Punkt für Feiertage; Name nur im Tooltip (RB/AW-Planung Spaltenkopf).
 */
export const HolidayChip: React.FC<{ name: string; compact?: boolean; sx?: SxProps<Theme> }> = ({
  name,
  compact,
  sx,
}) => {
  const size = compact ? 14 : 16;
  return (
    <Tooltip title={tooltipTitle(name)} arrow>
      <Box
        component="span"
        role="img"
        aria-label={tooltipTitle(name)}
        sx={[
          {
            display: 'inline-block',
            width: size,
            height: size,
            borderRadius: '50%',
            bgcolor: 'warning.main',
            cursor: 'default',
            flexShrink: 0,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      />
    </Tooltip>
  );
};
