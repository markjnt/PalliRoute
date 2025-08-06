import React from 'react';
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
import { useCreateEmployee, useUpdateEmployee } from '../../services/queries/useEmployees';
import { useNotificationStore } from '../../stores/useNotificationStore';

interface EmployeeFormProps {
    open: boolean;
    onClose: (updated?: boolean) => void;
    employee: Employee | null;
}

const areaOptions = [
    { value: 'Nordkreis', label: 'Nordkreis' },
    { value: 'Südkreis', label: 'Südkreis' },
];

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
    area: Yup.string().oneOf(areaOptions.map(opt => opt.value)).required('Gebiet ist erforderlich'),
});

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
    open,
    onClose,
    employee,
}) => {
    const { setNotification } = useNotificationStore();
    const createEmployeeMutation = useCreateEmployee();
    const updateEmployeeMutation = useUpdateEmployee();
    
    const formik = useFormik<EmployeeFormData>({
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
            area: employee?.area || 'Nordkreis',
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                if (employee) {
                    await updateEmployeeMutation.mutateAsync({
                        id: employee.id!,
                        employeeData: values
                    });
                    setNotification('Mitarbeiter erfolgreich aktualisiert', 'success');
                } else {
                    await createEmployeeMutation.mutateAsync(values);
                    setNotification('Mitarbeiter erfolgreich erstellt', 'success');
                }
                onClose(true);
            } catch (error: any) {
                console.error('Error saving employee:', error);
                setNotification(error.message || 'Fehler beim Speichern des Mitarbeiters', 'error');
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
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
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
                        <Grid size={{ xs: 12, sm: 6 }}>
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
                        <Grid size={{ xs: 12 }}>
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
                        <Grid size={{ xs: 12, sm: 4 }}>
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
                        <Grid size={{ xs: 12, sm: 8 }}>
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
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth error={formik.touched.function && Boolean(formik.errors.function)}>
                                <InputLabel>Funktion</InputLabel>
                                <Select
                                    id="function"
                                    name="function"
                                    value={formik.values.function}
                                    onChange={formik.handleChange}
                                    label="Funktion"
                                >
                                    <MenuItem value="Pflegekraft">Pflegekraft</MenuItem>
                                    <MenuItem value="Arzt">Arzt</MenuItem>
                                    <MenuItem value="Physiotherapie">Physiotherapie</MenuItem>
                                    <MenuItem value="Honorararzt">Honorararzt</MenuItem>
                                    <MenuItem value="PDL">PDL</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
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
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth error={formik.touched.area && Boolean(formik.errors.area)}>
                                <InputLabel id="area-label">Gebiet</InputLabel>
                                <Select
                                    labelId="area-label"
                                    id="area"
                                    name="area"
                                    value={formik.values.area}
                                    onChange={formik.handleChange}
                                    label="Gebiet"
                                >
                                    {areaOptions.map(option => (
                                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
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
                    <Button onClick={() => onClose(false)}>Abbrechen</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={formik.isSubmitting || createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                        startIcon={(formik.isSubmitting || createEmployeeMutation.isPending || updateEmployeeMutation.isPending) ? <CircularProgress size={20} /> : undefined}
                    >
                        {formik.isSubmitting || createEmployeeMutation.isPending || updateEmployeeMutation.isPending
                            ? 'Speichern...'
                            : employee
                                ? 'Aktualisieren'
                                : 'Erstellen'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}; 