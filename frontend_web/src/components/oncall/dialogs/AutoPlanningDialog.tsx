import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  FormControlLabel,
  Switch,
  Radio,
  RadioGroup,
  FormControl,
  Paper,
} from '@mui/material';
import { AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';

export interface AutoPlanningSettings {
  // Existing assignments handling
  existingAssignmentsHandling: 'overwrite' | 'respect';
  // Constraints
  allowOverplanning: boolean;
  includeAplano: boolean;
}

interface AutoPlanningDialogProps {
  open: boolean;
  onClose: () => void;
  onStart: (settings: AutoPlanningSettings) => void;
  currentDate: Date;
}

export const AutoPlanningDialog: React.FC<AutoPlanningDialogProps> = ({
  open,
  onClose,
  onStart,
  currentDate,
}) => {
  const [settings, setSettings] = useState<AutoPlanningSettings>({
    existingAssignmentsHandling: 'respect',
    allowOverplanning: false,
    includeAplano: true,
  });

  const handleExistingAssignmentsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings((prev) => ({
      ...prev,
      existingAssignmentsHandling: event.target.value as 'overwrite' | 'respect',
    }));
  };

  const handleOverplanningChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings((prev) => ({ ...prev, allowOverplanning: event.target.checked }));
  };

  const handleAplanoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings((prev) => ({ ...prev, includeAplano: event.target.checked }));
  };

  const handleStart = () => {
    onStart(settings);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 2,
          pt: 4,
          px: 4,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,1))',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.2)',
            }}
          >
            <AutoAwesomeIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
            Automatische Planung
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 6.5 }}>
          Konfigurieren Sie die Einstellungen für die automatische Planung
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 4, py: 3, backgroundColor: '#fafafa' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
          {/* Bestehende Zuweisungen */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              backgroundColor: 'white',
              border: '1px solid',
              borderColor: 'rgba(0, 0, 0, 0.06)',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, fontSize: '0.95rem' }}>
              Bestehende Zuweisungen
            </Typography>
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={settings.existingAssignmentsHandling}
                onChange={handleExistingAssignmentsChange}
              >
                <FormControlLabel
                  value="overwrite"
                  control={
                    <Radio
                      sx={{
                        '& .MuiSvgIcon-root': {
                          fontSize: 20,
                        },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                        Bestehende überschreiben
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        Alle Positionen werden neu geplant, bestehende Zuweisungen werden ersetzt
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 1.5, alignItems: 'flex-start' }}
                />
                <FormControlLabel
                  value="respect"
                  control={
                    <Radio
                      sx={{
                        '& .MuiSvgIcon-root': {
                          fontSize: 20,
                        },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                        Bestehende berücksichtigen
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        Bestehende Zuweisungen werden bei der Planung berücksichtigt und nicht verändert
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start' }}
                />
              </RadioGroup>
            </FormControl>
          </Paper>

          {/* Überplanung erlauben */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              backgroundColor: 'white',
              border: '1px solid',
              borderColor: 'rgba(0, 0, 0, 0.06)',
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={settings.allowOverplanning}
                  onChange={handleOverplanningChange}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: 'primary.main',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: 'primary.main',
                    },
                  }}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                    Überplanung erlauben
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    Mitarbeiter können über die maximale Kapazität hinaus verplant werden
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', m: 0 }}
            />
          </Paper>

          {/* Aplano berücksichtigen */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              backgroundColor: 'white',
              border: '1px solid',
              borderColor: 'rgba(0, 0, 0, 0.06)',
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={settings.includeAplano}
                  onChange={handleAplanoChange}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: 'primary.main',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: 'primary.main',
                    },
                  }}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                    Aplano berücksichtigen
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    Abwesenheiten und weitere Informationen aus Aplano werden berücksichtigt
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', m: 0 }}
            />
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 4,
          py: 3,
          pt: 2,
          backgroundColor: 'white',
          borderTop: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.06)',
        }}
      >
        <Button
          onClick={handleCancel}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            px: 3,
            py: 1,
            borderRadius: 2,
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          Abbrechen
        </Button>
        <Button
          onClick={handleStart}
          variant="contained"
          startIcon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1,
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)',
            },
            '&:disabled': {
              backgroundColor: 'rgba(0, 0, 0, 0.12)',
              color: 'rgba(0, 0, 0, 0.26)',
            },
          }}
        >
          Planung starten (bald verfügbar)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

