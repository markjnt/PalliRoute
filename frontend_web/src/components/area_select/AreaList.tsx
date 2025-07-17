import React from 'react';
import { Box, Chip } from '@mui/material';

interface AreaListProps {
    areas: string[];
    onAreaSelect: (area: string) => void;
    selectedArea?: string | null;
}

const getAreaChipColor = (area: string) => {
    if (area === 'Nordkreis') return 'primary';
    if (area === 'Südkreis') return 'secondary';
    if (area === 'Nord- und Südkreis' || area === 'Gesamt') return 'default';
    return 'default';
};

const AreaList: React.FC<AreaListProps> = ({ areas, onAreaSelect, selectedArea }) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'stretch', mt: 2 }}>
            {areas.map((area) => {
                const isSelected = selectedArea === area;
                return (
                    <Chip
                        key={area}
                        label={area === 'Nord- und Südkreis' ? 'Gesamt' : area}
                        color={getAreaChipColor(area)}
                        onClick={() => onAreaSelect(area)}
                        clickable
                        sx={{
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            px: 4,
                            py: 2,
                            minHeight: 56,
                            minWidth: 0,
                            width: '100%',
                            maxWidth: '100%',
                            borderRadius: '24px',
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            boxShadow: isSelected ? '0 4px 24px rgba(0,0,0,0.18)' : '0 2px 8px rgba(0,0,0,0.08)',
                            outline: isSelected ? '3px solid #1976d2' : 'none',
                            outlineOffset: '2px',
                            transition: 'box-shadow 0.2s, outline 0.2s',
                            bgcolor: isSelected ? undefined : undefined,
                        }}
                    />
                );
            })}
        </Box>
    );
};

export default AreaList;
