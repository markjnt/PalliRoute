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
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="area-label">Bereich</InputLabel>
                                <Select
                                    labelId="area-label"
                                    id="area"
                                    value={formData?.area}
                                    label="Bereich"
                                    onChange={(e) => setFormData?.({ ...formData!, area: e.target.value as Area })}
                                >
                                    <MenuItem value="Nordkreis">Nordkreis</MenuItem>
                                    <MenuItem value="Südkreis">Südkreis</MenuItem>
                                    <MenuItem value="Nord- und Südkreis">Nord- und Südkreis</MenuItem>
                                </Select>
                            </FormControl>
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
        return isSubmitting || !formData?.name;
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: { width: '500px' }
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
                >
                    {isSubmitting ? <CircularProgress size={24} /> : getSubmitButtonText()}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UserDialog; 