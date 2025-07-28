import React from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAreaStore } from '../../stores/useAreaStore';
import AreaList from './AreaList';
import { Public as PublicIcon } from '@mui/icons-material';

const AREAS = ['Nord- und Südkreis', 'Nordkreis', 'Südkreis'];

const AreaSelection: React.FC = () => {
    const { currentArea, setCurrentArea } = useAreaStore();
    const navigate = useNavigate();

    const handleAreaSelect = (area: string) => {
        setCurrentArea(area);
        navigate('/');
    };

    return (
        <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ 
                p: 4, 
                borderRadius: '20px', 
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                    <Box sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <PublicIcon sx={{ color: '#1976d2', fontSize: 28 }} />
                    </Box>
                    <Typography variant="h4" component="h1" sx={{ 
                        fontWeight: 600,
                        color: '#1d1d1f',
                        letterSpacing: '-0.5px'
                    }}>
                        Kreisauswahl
                    </Typography>
                </Box>
                <AreaList
                    areas={AREAS}
                    onAreaSelect={handleAreaSelect}
                    selectedArea={currentArea}
                />
            </Box>
        </Container>
    );
};

export default AreaSelection; 