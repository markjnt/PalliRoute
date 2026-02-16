import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  IconButton,
  Typography,
} from '@mui/material';
import { Business as BusinessIcon, Refresh as RefreshIcon, Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon, Close as CloseIcon } from '@mui/icons-material';
import { usePflegeheime, useImportPflegeheime } from '../../services/queries/usePflegeheime';
import { useLastUpdateStore } from '../../stores/useLastUpdateStore';
import { usePflegeheimeVisibilityStore } from '../../stores/usePflegeheimeVisibilityStore';
import { useNotificationStore } from '../../stores/useNotificationStore';

interface PflegeheimeDialogProps {
  open: boolean;
  onClose: () => void;
}

const formatLastUpdateTime = (time: Date): string => {
  return 'zuletzt ' + time.toLocaleDateString('de-DE') + ' ' + time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};

export const PflegeheimeDialog: React.FC<PflegeheimeDialogProps> = ({
  open,
  onClose,
}) => {
  const { data: pflegeheime = [], isLoading, error } = usePflegeheime();
  const importPflegeheimeMutation = useImportPflegeheime();
  const { lastPflegeheimeImportTime } = useLastUpdateStore();
  const { showPflegeheimeOnMap, toggleShowPflegeheimeOnMap } = usePflegeheimeVisibilityStore();
  const { setNotification } = useNotificationStore();

  const handleImport = async () => {
    try {
      const result = await importPflegeheimeMutation.mutateAsync();
      const { summary } = result;
      const parts = [];
      if (summary.added > 0) parts.push(`${summary.added} hinzugefügt`);
      if (summary.updated > 0) parts.push(`${summary.updated} aktualisiert`);
      if (summary.removed > 0) parts.push(`${summary.removed} entfernt`);
      const message = parts.length > 0
        ? 'Import erfolgreich: ' + parts.join(', ') + (parts.length > 1 ? ` (Gesamt: ${summary.total_processed})` : '')
        : 'Keine Änderungen erforderlich';
      setNotification(message, 'success');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      const message = e?.response?.data?.error ?? e?.message ?? 'Fehler beim Importieren der Pflegeheime';
      setNotification(message, 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BusinessIcon sx={{ color: '#388e3c' }} />
        Pflegeheime
        <Box sx={{ flex: 1 }} />
        <IconButton
          onClick={toggleShowPflegeheimeOnMap}
          color={showPflegeheimeOnMap ? 'primary' : 'default'}
          title={showPflegeheimeOnMap ? 'Pflegeheime auf Karte ausblenden' : 'Pflegeheime auf Karte anzeigen'}
          size="small"
        >
          {showPflegeheimeOnMap ? <VisibilityIcon /> : <VisibilityOffIcon />}
        </IconButton>
        <IconButton onClick={onClose} aria-label="Schließen" size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>
          <Button
            variant="contained"
            onClick={handleImport}
            fullWidth
            startIcon={importPflegeheimeMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
            disabled={importPflegeheimeMutation.isPending}
            sx={{ bgcolor: '#388e3c', '&:hover': { bgcolor: '#2e7d32' } }}
          >
            {importPflegeheimeMutation.isPending
              ? 'Importiere...'
              : `Excel Import${lastPflegeheimeImportTime ? ` (${formatLastUpdateTime(lastPflegeheimeImportTime)})` : ''}`}
          </Button>

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          )}
          {error && (
            <Typography color="error">Fehler beim Laden der Pflegeheime.</Typography>
          )}
          {!isLoading && !error && (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Straße</TableCell>
                    <TableCell>Ort</TableCell>
                    <TableCell>PLZ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pflegeheime.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                        Keine Pflegeheime. Excel importieren.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pflegeheime.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.street}</TableCell>
                        <TableCell>{p.city}</TableCell>
                        <TableCell>{p.zip_code}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
