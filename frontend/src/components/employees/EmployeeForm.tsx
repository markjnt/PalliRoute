import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    FormControlLabel,
    Switch,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Employee, EmployeeFormData } from '../../types/models';
import { employeesApi } from '../../services/api/employees';

interface EmployeeFormProps {
    open: boolean;
    onClose: (updated?: boolean) => void;
    onSave: () => void;
    employee: Employee | null;
}

const validationSchema = Yup.object({
    first_name: Yup.string().required('Vorname ist erforderlich'),
    last_name: Yup.string().required('Nachname ist erforderlich'),
    street: Yup.string().required('Straße ist erforderlich'),
    zip_code: Yup.string().required('PLZ ist erforderlich'),
    city: Yup.string().required('Ort ist erforderlich'),
    function: Yup.string().required('Funktion ist erforderlich'),
    work_hours: Yup.number()
        .required('Stellenumfang ist erforderlich')
        .min(0, 'Stellenumfang muss mindestens 0% sein')
        .max(100, 'Stellenumfang kann maximal 100% sein'),
});

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
    open,
    onClose,
    onSave,
    employee,
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formik = useFormik({
        initialValues: {
            first_name: employee?.first_name || '',
            last_name: employee?.last_name || '',
            street: employee?.street || '',
            zip_code: employee?.zip_code || '',
            city: employee?.city || '',
            function: employee?.function || 'Pflegekraft',
            work_hours: employee?.work_hours || 100,
            tour_number: employee?.tour_number || undefined,
            is_active: employee?.is_active ?? true,
        },
        validationSchema,
        onSubmit: async (values: EmployeeFormData) => {
            setLoading(true);
            setError(null);
            
            try {
                if (employee) {
                    await employeesApi.update(employee.id!, values);
                } else {
                    await employeesApi.create(values);
                }
                onSave();
                onClose(true);
            } catch (error: any) {
                // Don't log expected errors (like duplicate employee)
                if (error.response?.status !== 400) {
                    console.error('Error saving employee:', error);
                }
                const errorMessage = error.response?.data?.error || 'Fehler beim Speichern des Mitarbeiters';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        },
    });

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="md" fullWidth>
            <DialogTitle>
                {employee ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
            </DialogTitle>
            <form onSubmit={formik.handleSubmit}>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Grid container spacing={2}>
                        <Grid size={6}>
                            <TextField
                                fullWidth
                                id="first_name"
                                name="first_name"
                                label="Vorname"
                                value={formik.values.first_name}
                                onChange={formik.handleChange}
                                error={formik.touched.first_name && Boolean(formik.errors.first_name)}
                                helperText={formik.touched.first_name && formik.errors.first_name}
                            />
                        </Grid>
                        <Grid size={6}>
                            <TextField
                                fullWidth
                                id="last_name"
                                name="last_name"
                                label="Nachname"
                                value={formik.values.last_name}
                                onChange={formik.handleChange}
                                error={formik.touched.last_name && Boolean(formik.errors.last_name)}
                                helperText={formik.touched.last_name && formik.errors.last_name}
                            />
                        </Grid>
                        <Grid size={12}>
                            <TextField
                                fullWidth
                                id="street"
                                name="street"
                                label="Straße"
                                value={formik.values.street}
                                onChange={formik.handleChange}
                                error={formik.touched.street && Boolean(formik.errors.street)}
                                helperText={formik.touched.street && formik.errors.street}
                            />
                        </Grid>
                        <Grid size={4}>
                            <TextField
                                fullWidth
                                id="zip_code"
                                name="zip_code"
                                label="PLZ"
                                value={formik.values.zip_code}
                                onChange={formik.handleChange}
                                error={formik.touched.zip_code && Boolean(formik.errors.zip_code)}
                                helperText={formik.touched.zip_code && formik.errors.zip_code}
                            />
                        </Grid>
                        <Grid size={8}>
                            <TextField
                                fullWidth
                                id="city"
                                name="city"
                                label="Ort"
                                value={formik.values.city}
                                onChange={formik.handleChange}
                                error={formik.touched.city && Boolean(formik.errors.city)}
                                helperText={formik.touched.city && formik.errors.city}
                            />
                        </Grid>
                        <Grid size={6}>
                            <FormControl fullWidth>
                                <InputLabel id="function-label">Funktion</InputLabel>
                                <Select
                                    labelId="function-label"
                                    id="function"
                                    name="function"
                                    value={formik.values.function}
                                    onChange={formik.handleChange}
                                    error={formik.touched.function && Boolean(formik.errors.function)}
                                    label="Funktion"
                                >
                                    <MenuItem value="PDL">PDL</MenuItem>
                                    <MenuItem value="Pflegekraft">Pflegekraft</MenuItem>
                                    <MenuItem value="Arzt">Arzt</MenuItem>
                                    <MenuItem value="Honorararzt">Honorararzt</MenuItem>
                                    <MenuItem value="Physiotherapie">Physiotherapie</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={6}>
                            <TextField
                                fullWidth
                                id="work_hours"
                                name="work_hours"
                                label="Stellenumfang (%)"
                                type="number"
                                value={formik.values.work_hours}
                                onChange={formik.handleChange}
                                error={formik.touched.work_hours && Boolean(formik.errors.work_hours)}
                                helperText={formik.touched.work_hours && formik.errors.work_hours}
                                InputProps={{
                                    inputProps: { min: 0, max: 100 }
                                }}
                            />
                        </Grid>
                        <Grid size={6}>
                            <TextField
                                fullWidth
                                id="tour_number"
                                name="tour_number"
                                label="Tournummer"
                                type="number"
                                value={formik.values.tour_number || ''}
                                onChange={formik.handleChange}
                                InputProps={{
                                    inputProps: { min: 0 }
                                }}
                            />
                        </Grid>
                        <Grid size={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formik.values.is_active}
                                        onChange={formik.handleChange}
                                        name="is_active"
                                    />
                                }
                                label="Aktiv"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => onClose(false)} disabled={loading}>
                        Abbrechen
                    </Button>
                    <Button 
                        type="submit" 
                        variant="contained" 
                        color="primary"
                        disabled={loading || !formik.isValid || !formik.dirty}
                    >
                        {loading ? (
                            <>
                                <CircularProgress size={20} sx={{ mr: 1 }} />
                                Speichert...
                            </>
                        ) : 'Speichern'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}; 