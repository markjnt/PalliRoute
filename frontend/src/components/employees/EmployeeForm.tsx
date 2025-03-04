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
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Employee, EmployeeFormData } from '../../types/models';
import { employeesApi } from '../../services/api/employees';

interface EmployeeFormProps {
    open: boolean;
    onClose: () => void;
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
    const formik = useFormik({
        initialValues: {
            first_name: employee?.first_name || '',
            last_name: employee?.last_name || '',
            street: employee?.street || '',
            zip_code: employee?.zip_code || '',
            city: employee?.city || '',
            function: employee?.function || '',
            work_hours: employee?.work_hours || 100,
            is_active: employee?.is_active ?? true,
        },
        validationSchema,
        onSubmit: async (values: EmployeeFormData) => {
            try {
                if (employee) {
                    await employeesApi.update(employee.id!, values);
                } else {
                    await employeesApi.create(values);
                }
                onSave();
                onClose();
                // TODO: Add success notification
            } catch (error) {
                console.error('Error saving employee:', error);
                // TODO: Add error notification
            }
        },
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {employee ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
            </DialogTitle>
            <form onSubmit={formik.handleSubmit}>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
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
                        <Grid item xs={6}>
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
                        <Grid item xs={12}>
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
                        <Grid item xs={4}>
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
                        <Grid item xs={8}>
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
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                id="function"
                                name="function"
                                label="Funktion"
                                value={formik.values.function}
                                onChange={formik.handleChange}
                                error={formik.touched.function && Boolean(formik.errors.function)}
                                helperText={formik.touched.function && formik.errors.function}
                            />
                        </Grid>
                        <Grid item xs={6}>
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
                        <Grid item xs={12}>
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
                    <Button onClick={onClose}>Abbrechen</Button>
                    <Button type="submit" variant="contained" color="primary">
                        Speichern
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}; 