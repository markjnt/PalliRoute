import React, { useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Button,
    Modal
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAreaStore } from '../../stores/useAreaStore';
import AreaList from './AreaList';
import { Public as PublicIcon, ChangeCircle as ChangeIcon } from '@mui/icons-material';

const AREAS = ['Nord- und Südkreis', 'Nordkreis', 'Südkreis'];

// Hilfsfunktionen für Area-Styling (gleich wie in EmployeeSidebar)
const getAreaChipColor = (area: string) => {
    if (area === 'Nordkreis') return 'primary';
    if (area === 'Südkreis') return 'secondary';
    if (area === 'Nord- und Südkreis' || area === 'Gesamt') return 'default';
    return 'default';
};

const getAreaInitial = (area: string) => {
    if (area === 'Nordkreis') return 'N';
    if (area === 'Südkreis') return 'S';
    if (area === 'Nord- und Südkreis' || area === 'Gesamt') return 'G';
    return '?';
};

interface AreaSelectionProps {
    compact?: boolean;
    onAreaChange?: () => void;
}

const AreaSelection: React.FC<AreaSelectionProps> = ({ compact = false, onAreaChange }) => {
    const { currentArea, setCurrentArea } = useAreaStore();
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);

    const handleAreaSelect = (area: string) => {
        setCurrentArea(area);
        if (compact) {
            setModalOpen(false);
            onAreaChange?.();
        } else {
            navigate('/');
        }
    };

    const handleButtonClick = () => {
        if (compact) {
            setModalOpen(true);
        }
    };

    // Kompakte Version für die Karte
    if (compact) {
        return (
            <>
                <Button
                    onClick={handleButtonClick}
                    variant="outlined"
                    startIcon={<ChangeIcon />}
                    sx={{
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1rem',
                        px: 2,
                        py: 1,
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        backgroundColor: getAreaChipColor(currentArea || '') === 'primary' ? 'rgba(25, 118, 210, 0.1)' : 
                                        getAreaChipColor(currentArea || '') === 'secondary' ? 'rgba(220, 0, 78, 0.1)' : 
                                        'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(10px)',
                        color: getAreaChipColor(currentArea || '') === 'primary' ? '#1976d2' : 
                               getAreaChipColor(currentArea || '') === 'secondary' ? '#dc004e' : 
                               '#1d1d1f',
                        borderColor: getAreaChipColor(currentArea || '') === 'primary' ? 'rgba(25, 118, 210, 0.3)' : 
                                    getAreaChipColor(currentArea || '') === 'secondary' ? 'rgba(220, 0, 78, 0.3)' : 
                                    'rgba(0, 0, 0, 0.12)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        '&:hover': {
                            backgroundColor: getAreaChipColor(currentArea || '') === 'primary' ? 'rgba(25, 118, 210, 0.15)' : 
                                           getAreaChipColor(currentArea || '') === 'secondary' ? 'rgba(220, 0, 78, 0.15)' : 
                                           'rgba(255, 255, 255, 0.95)',
                            borderColor: getAreaChipColor(currentArea || '') === 'primary' ? 'rgba(25, 118, 210, 0.5)' : 
                                        getAreaChipColor(currentArea || '') === 'secondary' ? 'rgba(220, 0, 78, 0.5)' : 
                                        'rgba(0, 0, 0, 0.2)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
                        },
                        '&:active': {
                            transform: 'translateY(0)',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                        },
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    {getAreaInitial(currentArea || '')}
                </Button>

                <Modal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 2,
                    }}
                >
                    <Box sx={{
                        width: '100%',
                        maxWidth: 400,
                        bgcolor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                        p: 3,
                        outline: 'none',
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                            <Box sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '10px',
                                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <ChangeIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                            </Box>
                            <Typography variant="h5" component="h2" sx={{ 
                                fontWeight: 600,
                                color: '#1d1d1f',
                                letterSpacing: '-0.3px'
                            }}>
                                Gebiet wählen
                            </Typography>
                        </Box>
                        <AreaList
                            areas={AREAS}
                            onAreaSelect={handleAreaSelect}
                            selectedArea={currentArea}
                        />
                    </Box>
                </Modal>
            </>
        );
    }

    // Vollständige Version für die Seite
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
