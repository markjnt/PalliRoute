import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    CircularProgress,
    Typography,
    Chip,
    Stack,
    Paper,
} from '@mui/material';
import { UserFormData, Area } from '../../types/models';

type DialogType = 'create' | 'edit' | 'delete';

interface UserDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: () => void;
    type: DialogType;
    formData?: UserFormData;
    setFormData?: (data: UserFormData) => void;
    isSubmitting: boolean;
}

const UserDialog: React.FC<UserDialogProps> = ({
    open,
    onClose,
    onSubmit,
    type,
    formData,
    setFormData,
    isSubmitting,
}) => {
    // Hilfsfunktion, um die aktuelle Auswahl als Array zu bekommen
    const getAreaArray = () => {
        if (formData?.area === 'Nord- und Südkreis') return ['Nordkreis', 'Südkreis'];
        if (formData?.area) return [formData.area];
        return [];
    };
    const areaArray = getAreaArray();

    const getDialogContent = () => {
        switch (type) {
            case 'delete':
                return (
                    <DialogContent>
                        <Typography>
                            Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?
                        </Typography>
                    </DialogContent>
                );
            default:
                return (
                    <DialogContent>
                        <Box component="form" sx={{ mt: 1 }}>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="name"
                                label="Name"
                                name="name"
                                autoComplete="name"
                                autoFocus
                                value={formData?.name}
                                onChange={(e) => setFormData?.({ ...formData!, name: e.target.value })}
                            />
                            <Box sx={{ mt: 2 }}>
                              <Stack direction="row" spacing={1}>
                                {['Nordkreis', 'Südkreis'].map(areaOption => {
                                  const isSelected = areaArray.includes(areaOption);
                                  return (
                                    <Chip
                                      key={areaOption}
                                      label={areaOption}
                                      color={areaOption === 'Nordkreis' ? 'primary' : 'secondary'}
                                      variant={isSelected ? 'filled' : 'outlined'}
                                      clickable
                                      onClick={() => {
                                        let newAreaArr = isSelected
                                          ? areaArray.filter(a => a !== areaOption)
                                          : [...areaArray, areaOption];
                                        let newArea: Area = '' as Area;
                                        if (newAreaArr.length === 2) newArea = 'Nord- und Südkreis' as Area;
                                        else if (newAreaArr.length === 1) newArea = newAreaArr[0] as Area;
                                        setFormData?.({ ...formData!, area: newArea });
                                      }}
                                      sx={{ fontWeight: 'bold', fontSize: '0.95rem', letterSpacing: 0.2 }}
                                    />
                                  );
                                })}
                              </Stack>
                            </Box>
                        </Box>
                    </DialogContent>
                );
        }
    };

    const getDialogTitle = () => {
        switch (type) {
            case 'create':
                return 'Neuen Benutzer erstellen';
            case 'edit':
                return 'Benutzer bearbeiten';
            case 'delete':
                return 'Benutzer löschen';
        }
    };

    const getSubmitButtonText = () => {
        switch (type) {
            case 'create':
                return 'Erstellen';
            case 'edit':
                return 'Aktualisieren';
            case 'delete':
                return 'Löschen';
        }
    };

    const getSubmitButtonColor = () => {
        return type === 'delete' ? 'error' : 'primary';
    };

    const isSubmitDisabled = () => {
        if (type === 'delete') return isSubmitting;
        return isSubmitting || !formData?.name || !formData?.area;
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: { width: '500px', borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }
                }
            }}
        >
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            {getDialogContent()}
            <DialogActions>
                <Button onClick={onClose} disabled={isSubmitting}>
                    Abbrechen
                </Button>
                <Button 
                    onClick={onSubmit} 
                    variant="contained" 
                    color={getSubmitButtonColor()}
                    disabled={isSubmitDisabled()}
                    sx={{ position: 'relative', minWidth: 110 }}
                >
                    {isSubmitting ? <CircularProgress size={24} sx={{ position: 'absolute', left: '50%', top: '50%', marginTop: '-12px', marginLeft: '-12px' }} /> : getSubmitButtonText()}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UserDialog; 