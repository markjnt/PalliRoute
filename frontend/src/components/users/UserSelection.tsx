import React, { useState } from 'react';
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
    Avatar,
    ListItemAvatar,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { User, UserFormData, Area } from '../../types/models';
import { useNavigate } from 'react-router-dom';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../../services/queries/useUsers';
import { useUserStore } from '../../stores/useUserStore';

// Function to generate a random color based on the user's name
const stringToColor = (string: string) => {
    let hash = 0;
    let i;

    for (i = 0; i < string.length; i += 1) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }

    let color = '#';

    for (i = 0; i < 3; i += 1) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.slice(-2);
    }

    return color;
};

// Function to create avatar props based on user's name
const stringAvatar = (name: string) => {
    return {
        sx: {
            bgcolor: stringToColor(name),
            '&:hover': {
                boxShadow: 3,
            },
        },
        children: name.split(' ').map(part => part[0]).join('').toUpperCase(),
    };
};

const UserSelection: React.FC = () => {
    const [openDialog, setOpenDialog] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [formData, setFormData] = useState<UserFormData>({ name: '', area: 'Nordkreis' });
    
    // React Query hooks
    const { data: users = [], isLoading, error } = useUsers();
    const createUserMutation = useCreateUser();
    const updateUserMutation = useUpdateUser();
    const deleteUserMutation = useDeleteUser();
    
    // Direkt useUserStore verwenden
    const { setCurrentUser } = useUserStore();
    
    const navigate = useNavigate();

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
    };

    const handleEditSubmit = async () => {
        if (!userToEdit) return;

        try {
            await updateUserMutation.mutateAsync({ 
                id: userToEdit.id, 
                userData: formData 
            });
            handleEditClose();
        } catch (err) {
            console.error('Error updating user:', err);
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
            await deleteUserMutation.mutateAsync(userToDelete.id);
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        } catch (err) {
            console.error('Error deleting user:', err);
        }
    };

    const handleSubmit = async () => {
        try {
            const newUser = await createUserMutation.mutateAsync(formData);
            handleCloseDialog();
            handleUserSelect(newUser);
        } catch (err) {
            console.error('Error creating user:', err);
        }
    };

    if (isLoading && users.length === 0) {
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
                {error instanceof Error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error.message}
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
                            <ListItemAvatar>
                                <Avatar {...stringAvatar(user.name)} />
                            </ListItemAvatar>
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
                                        disabled={isLoading || updateUserMutation.isPending}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton 
                                        edge="end" 
                                        aria-label="delete"
                                        onClick={(e) => handleDeleteClick(e, user)}
                                        disabled={isLoading || deleteUserMutation.isPending}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Stack>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List>
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleAddUser}
                    disabled={isLoading || createUserMutation.isPending}
                    sx={{ mt: 2 }}
                >
                    Neuen Benutzer erstellen
                </Button>
            </Paper>

            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <DialogTitle>Neuen Benutzer erstellen</DialogTitle>
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
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <FormControl fullWidth margin="normal">
                            <InputLabel id="area-label">Bereich</InputLabel>
                            <Select
                                labelId="area-label"
                                id="area"
                                value={formData.area}
                                label="Bereich"
                                onChange={(e) => setFormData({ ...formData, area: e.target.value as Area })}
                            >
                                <MenuItem value="Nordkreis">Nordkreis</MenuItem>
                                <MenuItem value="Südkreis">Südkreis</MenuItem>
                                <MenuItem value="Nord- und Südkreis">Nord- und Südkreis</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} disabled={createUserMutation.isPending}>
                        Abbrechen
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        variant="contained" 
                        color="primary"
                        disabled={createUserMutation.isPending || !formData.name}
                    >
                        {createUserMutation.isPending ? <CircularProgress size={24} /> : 'Erstellen'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={editDialogOpen} onClose={handleEditClose}>
                <DialogTitle>Benutzer bearbeiten</DialogTitle>
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
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <FormControl fullWidth margin="normal">
                            <InputLabel id="area-label">Bereich</InputLabel>
                            <Select
                                labelId="area-label"
                                id="area"
                                value={formData.area}
                                label="Bereich"
                                onChange={(e) => setFormData({ ...formData, area: e.target.value as Area })}
                            >
                                <MenuItem value="Nordkreis">Nordkreis</MenuItem>
                                <MenuItem value="Südkreis">Südkreis</MenuItem>
                                <MenuItem value="Nord- und Südkreis">Nord- und Südkreis</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleEditClose} disabled={updateUserMutation.isPending}>
                        Abbrechen
                    </Button>
                    <Button 
                        onClick={handleEditSubmit} 
                        variant="contained" 
                        color="primary"
                        disabled={updateUserMutation.isPending || !formData.name}
                    >
                        {updateUserMutation.isPending ? <CircularProgress size={24} /> : 'Aktualisieren'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Benutzer löschen</DialogTitle>
                <DialogContent>
                    <Typography>
                        Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setDeleteDialogOpen(false)} 
                        disabled={deleteUserMutation.isPending}
                    >
                        Abbrechen
                    </Button>
                    <Button 
                        onClick={handleDeleteConfirm} 
                        variant="contained" 
                        color="error"
                        disabled={deleteUserMutation.isPending}
                    >
                        {deleteUserMutation.isPending ? <CircularProgress size={24} /> : 'Löschen'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default UserSelection; 