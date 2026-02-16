import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Place as PlaceIcon } from '@mui/icons-material';

interface AddCustomMarkerDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (name: string, address: string, lat: number, lng: number) => void;
}

/**
 * Dialog zum Hinzufügen eines benutzerdefinierten Markers auf der Karte.
 * Ermöglicht Eingabe von Adresse und Name, geocodet die Adresse und erstellt einen Marker.
 */
export const AddCustomMarkerDialog: React.FC<AddCustomMarkerDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !address.trim()) {
      setError('Bitte Name und Adresse eingeben.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const geocoder = new google.maps.Geocoder();
      const result = await new Promise<google.maps.GeocoderResult | null>((resolve) => {
        geocoder.geocode(
          { address: address.trim(), region: 'DE' },
          (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              resolve(results[0]);
            } else {
              resolve(null);
            }
          }
        );
      });

      if (!result || !result.geometry?.location) {
        setError('Adresse konnte nicht gefunden werden. Bitte überprüfen Sie die Eingabe.');
        setLoading(false);
        return;
      }

      const lat = result.geometry.location.lat();
      const lng = result.geometry.location.lng();
      onSuccess(name.trim(), address.trim(), lat, lng);
      setName('');
      setAddress('');
      onClose();
    } catch (err) {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setAddress('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PlaceIcon sx={{ color: '#ff5722' }} />
        Marker hinzufügen
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Wichtiger Ort"
            fullWidth
            autoFocus
            disabled={loading}
          />
          <TextField
            label="Adresse"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="z.B. Hauptstraße 1, 51643 Gummersbach"
            fullWidth
            disabled={loading}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Abbrechen
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !name.trim() || !address.trim()}
          sx={{ backgroundColor: '#ff5722', '&:hover': { backgroundColor: '#e64a19' } }}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlaceIcon sx={{ color: 'inherit' }} />}
        >
          {loading ? 'Suche...' : 'Marker setzen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
