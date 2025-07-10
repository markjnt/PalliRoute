import React from 'react';
import { Chip, Box } from '@mui/material';

const getAreaChipColor = (area: string) => {
  if (area === 'Nordkreis') return 'primary';
  if (area === 'Südkreis') return 'secondary';
  return 'default';
};

const AreaChip: React.FC<{ area: string }> = ({ area }) => {
  if (area === 'Nord- und Südkreis') {
    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Chip
          label="Nordkreis"
          color="primary"
          size="small"
          sx={{ fontWeight: 'bold', fontSize: '0.95rem', letterSpacing: 0.2 }}
        />
        <Chip
          label="Südkreis"
          color="secondary"
          size="small"
          sx={{ fontWeight: 'bold', fontSize: '0.95rem', letterSpacing: 0.2 }}
        />
      </Box>
    );
  }
  return (
    <Chip
      label={area}
      color={getAreaChipColor(area)}
      size="small"
      sx={{ fontWeight: 'bold', fontSize: '0.95rem', letterSpacing: 0.2 }}
    />
  );
};

export default AreaChip; 