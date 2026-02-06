import React, { useState, useEffect } from 'react';
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
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { AutoAwesome as AutoAwesomeIcon, UploadFile as UploadFileIcon } from '@mui/icons-material';
import { formatMonthYear } from '../../../utils/oncall/dateUtils';
import { configApi } from '../../../services/api';

export interface AutoPlanningSettings {
  // Existing assignments handling
  existingAssignmentsHandling: 'overwrite' | 'respect';
  // Constraints
  allowOverplanning: boolean;
  includeAplano: boolean; // Include Aplano sync before planning
}

interface AutoPlanningDialogProps {
  open: boolean;
  onClose: () => void;
  onStart: (settings: AutoPlanningSettings, timeAccountFile?: File | null) => void;
  onReset?: () => void;
  currentDate: Date;
  isLoading?: boolean;
  isResetting?: boolean;
  viewMode?: 'month' | 'week';
}

export const AutoPlanningDialog: React.FC<AutoPlanningDialogProps> = ({
  open,
  onClose,
  onStart,
  onReset,
  currentDate,
  isLoading = false,
  isResetting = false,
  viewMode = 'month',
}) => {
  // Calculate month range for planning (always full month)
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const monthName = formatMonthYear(currentDate);
  const [settings, setSettings] = useState<AutoPlanningSettings>({
    existingAssignmentsHandling: 'respect',
    allowOverplanning: false,
    includeAplano: true,
  });
  const [timeAccountFile, setTimeAccountFile] = useState<File | null>(null);
  const [timeAccountAsOf, setTimeAccountAsOf] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    configApi.getTimeAccountAsOf().then((res) => setTimeAccountAsOf(res.time_account_as_of ?? null)).catch(() => setTimeAccountAsOf(null));
  }, [open]);

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
    onStart(settings, timeAccountFile);
    // Don't close immediately - let parent handle closing after async operation
  };

  const formatStandDate = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={isLoading}
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
            Automatische Planung für {monthName}
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
                    Abwesenheiten aus Aplano werden berücksichtigt
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', m: 0 }}
            />
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                backgroundColor: 'grey.50',
                border: '1px solid',
                borderColor: 'grey.200',
                display: 'none',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.primary' }}>
                    Stundenkonto aus Aplano
                  </Typography>
                  {timeAccountAsOf && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Aktueller Stand: {formatStandDate(timeAccountAsOf)}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <input
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  id="time-account-excel"
                  type="file"
                  onChange={(e) => setTimeAccountFile(e.target.files?.[0] ?? null)}
                />
                <label htmlFor="time-account-excel">
                  <Button
                    variant="outlined"
                    size="small"
                    component="span"
                    startIcon={<UploadFileIcon />}
                    sx={{ textTransform: 'none' }}
                  >
                    Excel auswählen
                  </Button>
                </label>
                {timeAccountFile && (
                  <Typography variant="caption" color="text.secondary">
                    {timeAccountFile.name}
                  </Typography>
                )}
                  </Box>
                </Box>
                <Box sx={{ flexShrink: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textAlign: 'right' }}>
                    Erforderliche Spalten (Dezimalstunden):
                  </Typography>
                  <Table size="small" sx={{ maxWidth: 320, '& td, & th': { py: 0.5, px: 1, fontSize: '0.75rem' }, border: '1px solid', borderColor: 'grey.300', borderRadius: 1, overflow: 'hidden' }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.200' }}>
                        <TableCell component="th">Mitarbeiter</TableCell>
                        <TableCell component="th">Stundenkonto</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Max Mustermann</TableCell>
                        <TableCell>12,5</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Anna Schmidt</TableCell>
                        <TableCell>-3,0</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            </Box>
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
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Button
          onClick={onReset}
          disabled={isLoading || isResetting || !onReset}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            px: 3,
            py: 1,
            borderRadius: 2,
            color: 'error.main',
            '&:hover': {
              backgroundColor: 'rgba(211, 47, 47, 0.08)',
            },
            '&:disabled': {
              color: 'rgba(0, 0, 0, 0.26)',
            },
          }}
        >
          {isResetting ? 'Zurücksetzen...' : 'Planung zurücksetzen'}
        </Button>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            onClick={handleCancel}
            disabled={isLoading || isResetting}
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
            disabled={isLoading || isResetting}
            startIcon={
              isLoading ? (
                <CircularProgress size={18} sx={{ color: 'white' }} />
              ) : (
                <AutoAwesomeIcon sx={{ fontSize: 18 }} />
              )
            }
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
                backgroundColor: 'primary.main',
                color: 'white',
                opacity: 0.7,
              },
            }}
          >
            {isLoading ? 'Planung läuft...' : 'Planung starten'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

