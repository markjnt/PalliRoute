import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Box,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
    IconButton,
    Stack,
    Snackbar,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { User, UserFormData, Area } from '../../types/models';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../../services/api/users';

const UserSelection: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [formData, setFormData] = useState<UserFormData>({ name: '', area: 'Nordkreis' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { currentUser, setCurrentUser } = useUser();
    const navigate = useNavigate();

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const fetchedUsers = await usersApi.getUsers();
            setUsers(fetchedUsers);
        } catch (err) {
            setError('Fehler beim Laden der Benutzer');
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUserSelect = (user: User) => {
        setCurrentUser(user);
        navigate('/');
    };

    const handleAddUser = () => {
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setFormData({ name: '', area: 'Nordkreis' });
        setError(null);
    };

    const handleEditClick = (event: React.MouseEvent, user: User) => {
        event.stopPropagation();
        setUserToEdit(user);
        setFormData({ name: user.name, area: user.area });
        setEditDialogOpen(true);
    };

    const handleEditClose = () => {
        setEditDialogOpen(false);
        setUserToEdit(null);
        setFormData({ name: '', area: 'Nordkreis' });
        setError(null);
    };

    const handleEditSubmit = async () => {
        if (!userToEdit) return;

        try {
            setLoading(true);
            setError(null);
            const updatedUser = await usersApi.updateUser(userToEdit.id, formData);
            
            // Aktualisiere die User-Liste
            setUsers(users.map(u => u.id === userToEdit.id ? updatedUser : u));
            
            // Aktualisiere auch den currentUser, falls dieser bearbeitet wurde
            if (currentUser?.id === userToEdit.id) {
                setCurrentUser(updatedUser);
            }
            
            handleEditClose();
        } catch (err) {
            setError('Fehler beim Aktualisieren des Benutzers');
            console.error('Error updating user:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (event: React.MouseEvent, user: User) => {
        event.stopPropagation();
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;

        try {
            setLoading(true);
            setError(null);
            await usersApi.deleteUser(userToDelete.id);
            
            setUsers(users.filter(u => u.id !== userToDelete.id));
            
            if (currentUser?.id === userToDelete.id) {
                setCurrentUser(null);
            }
            
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        } catch (err) {
            setError('Fehler beim Löschen des Benutzers');
            console.error('Error deleting user:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError(null);
            const newUser = await usersApi.createUser(formData);
            setUsers([...users, newUser]);
            handleCloseDialog();
            handleUserSelect(newUser);
        } catch (err) {
            setError('Fehler beim Erstellen des Benutzers');
            console.error('Error creating user:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && users.length === 0) {
        return (
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                height: '100vh'
            }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Benutzerauswahl
                </Typography>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <List>
                    {users.map((user) => (
                        <ListItem
                            key={user.id}
                            onClick={() => handleUserSelect(user)}
                            sx={{ 
                                mb: 1, 
                                border: 1, 
                                borderColor: 'grey.300', 
                                borderRadius: 1,
                                cursor: 'pointer',
                                '&:hover': {
                                    backgroundColor: 'action.hover'
                                }
                            }}
                        >
                            <ListItemText
                                primary={user.name}
                                secondary={`Bereich: ${user.area}`}
                            />
                            <ListItemSecondaryAction>
                                <Stack direction="row" spacing={1}>
                                    <IconButton 
                                        edge="end" 
                                        aria-label="edit"
                                        onClick={(e) => handleEditClick(e, user)}
                                        disabled={loading}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton 
                                        edge="end" 
                                        aria-label="delete"
                                        onClick={(e) => handleDeleteClick(e, user)}
                                        disabled={loading}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Stack>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List>
                <Box sx={{ mt: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={handleAddUser}
                        disabled={loading}
                    >
                        Neuen Benutzer hinzufügen
                    </Button>
                </Box>
            </Paper>

            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <DialogTitle>Neuen Benutzer erstellen</DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                            {error}
                        </Alert>
                    )}
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Name"
                        fullWidth
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={loading}
                    />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Bereich</InputLabel>
                        <Select
                            value={formData.area}
                            label="Bereich"
                            onChange={(e) => setFormData({ ...formData, area: e.target.value as Area })}
                            disabled={loading}
                        >
                            <MenuItem value="Nordkreis">Nordkreis</MenuItem>
                            <MenuItem value="Südkreis">Südkreis</MenuItem>
                            <MenuItem value="Nord- und Südkreis">Nord- und Südkreis</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} disabled={loading}>
                        Abbrechen
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        variant="contained" 
                        color="primary"
                        disabled={loading || !formData.name.trim()}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Erstellen'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={editDialogOpen} onClose={handleEditClose}>
                <DialogTitle>Benutzer bearbeiten</DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                            {error}
                        </Alert>
                    )}
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Name"
                        fullWidth
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={loading}
                    />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Bereich</InputLabel>
                        <Select
                            value={formData.area}
                            label="Bereich"
                            onChange={(e) => setFormData({ ...formData, area: e.target.value as Area })}
                            disabled={loading}
                        >
                            <MenuItem value="Nordkreis">Nordkreis</MenuItem>
                            <MenuItem value="Südkreis">Südkreis</MenuItem>
                            <MenuItem value="Nord- und Südkreis">Nord- und Südkreis</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleEditClose} disabled={loading}>
                        Abbrechen
                    </Button>
                    <Button 
                        onClick={handleEditSubmit} 
                        variant="contained" 
                        color="primary"
                        disabled={loading || !formData.name.trim()}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Speichern'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Benutzer löschen</DialogTitle>
                <DialogContent>
                    <Typography>
                        Sind Sie sicher, dass Sie den Benutzer "{userToDelete?.name}" löschen möchten?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setDeleteDialogOpen(false)} 
                        disabled={loading}
                    >
                        Abbrechen
                    </Button>
                    <Button 
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Löschen'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default UserSelection; 