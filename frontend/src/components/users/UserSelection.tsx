import React, { useState } from 'react';
import {
    Container,
    Paper,
    Typography,
    Button,
    Box,
    Alert,
    CircularProgress,
} from '@mui/material';
import { User, UserFormData } from '../../types/models';
import { useNavigate } from 'react-router-dom';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../../services/queries/useUsers';
import { useUserStore } from '../../stores/useUserStore';
import UserList from './UserList';
import UserDialog from './UserDialog';

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
        <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Benutzerauswahl
                </Typography>
                {error instanceof Error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error.message}
                    </Alert>
                )}
                <UserList
                    users={users}
                    onUserSelect={handleUserSelect}
                    onEditClick={handleEditClick}
                    onDeleteClick={handleDeleteClick}
                    isLoading={isLoading}
                    isUpdating={updateUserMutation.isPending}
                    isDeleting={deleteUserMutation.isPending}
                />
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleAddUser}
                        disabled={isLoading || createUserMutation.isPending}
                    >
                        Neuen Benutzer erstellen
                    </Button>
                </Box>
            </Paper>

            <UserDialog
                open={openDialog}
                onClose={handleCloseDialog}
                onSubmit={handleSubmit}
                type="create"
                formData={formData}
                setFormData={setFormData}
                isSubmitting={createUserMutation.isPending}
            />

            <UserDialog
                open={editDialogOpen}
                onClose={handleEditClose}
                onSubmit={handleEditSubmit}
                type="edit"
                formData={formData}
                setFormData={setFormData}
                isSubmitting={updateUserMutation.isPending}
            />

            <UserDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onSubmit={handleDeleteConfirm}
                type="delete"
                isSubmitting={deleteUserMutation.isPending}
            />
        </Container>
    );
};

export default UserSelection; 