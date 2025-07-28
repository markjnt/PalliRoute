import React from 'react';
import { Box, Chip, Typography } from '@mui/material';

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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'stretch' }}>
            {areas.map((area) => {
                const isSelected = selectedArea === area;
                const areaColor = getAreaChipColor(area);
                const displayText = area === 'Nord- und Südkreis' ? 'Gesamt' : area;
                const areaInitial = area === 'Nordkreis' ? 'N' : area === 'Südkreis' ? 'S' : 'G';
                
                return (
                    <Box
                        key={area}
                        onClick={() => onAreaSelect(area)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            p: 3,
                            borderRadius: '16px',
                            backgroundColor: isSelected 
                                ? (areaColor === 'primary' ? 'rgba(25, 118, 210, 0.08)' : 
                                   areaColor === 'secondary' ? 'rgba(220, 0, 78, 0.08)' : 
                                   'rgba(0, 0, 0, 0.04)')
                                : 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            border: isSelected 
                                ? (areaColor === 'primary' ? '1px solid #1976d2' : 
                                   areaColor === 'secondary' ? '1px solid #dc004e' : 
                                   '1px solid rgba(0, 0, 0, 0.2)')
                                : '1px solid rgba(0, 0, 0, 0.08)',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                backgroundColor: isSelected 
                                    ? (areaColor === 'primary' ? 'rgba(25, 118, 210, 0.12)' : 
                                       areaColor === 'secondary' ? 'rgba(220, 0, 78, 0.12)' : 
                                       'rgba(0, 0, 0, 0.06)')
                                    : 'rgba(255, 255, 255, 0.8)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                            },
                            '&:active': {
                                transform: 'translateY(0)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                            },
                        }}
                    >
                        <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            backgroundColor: isSelected 
                                ? (areaColor === 'primary' ? '#1976d2' : 
                                   areaColor === 'secondary' ? '#dc004e' : 
                                   '#1d1d1f')
                                : (areaColor === 'primary' ? 'rgba(25, 118, 210, 0.1)' : 
                                   areaColor === 'secondary' ? 'rgba(220, 0, 78, 0.1)' : 
                                   'rgba(0, 0, 0, 0.06)'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSelected ? 'white' : 
                                   (areaColor === 'primary' ? '#1976d2' : 
                                    areaColor === 'secondary' ? '#dc004e' : 
                                    '#1d1d1f'),
                            fontWeight: 600,
                            fontSize: '1.2rem',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}>
                            {areaInitial}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={{
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                color: isSelected ? '#1d1d1f' : '#6e6e73',
                                letterSpacing: '-0.2px',
                            }}>
                                {displayText}
                            </Typography>
                            <Typography sx={{
                                fontSize: '0.875rem',
                                color: '#86868b',
                                mt: 0.5,
                            }}>
                                {area === 'Nord- und Südkreis' ? 'Gesamter Bereich' : 
                                 area === 'Nordkreis' ? 'Nördlicher Bereich' : 
                                 'Südlicher Bereich'}
                            </Typography>
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
};

export default AreaList;
