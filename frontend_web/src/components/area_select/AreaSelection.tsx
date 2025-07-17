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
            <Paper elevation={3} sx={{ p: 3, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <PublicIcon color="primary" fontSize="large" />
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                        Kreisauswahl
                    </Typography>
                </Box>
                <AreaList
                    areas={AREAS}
                    onAreaSelect={handleAreaSelect}
                    selectedArea={currentArea}
                />
            </Paper>
        </Container>
    );
};

export default AreaSelection; 