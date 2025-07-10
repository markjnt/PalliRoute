import React from 'react';
import {
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Stack,
    Avatar,
    ListItemAvatar,
    Chip,
    Paper,
    Box,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { User } from '../../types/models';
import AreaChip from './AreaChip';

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
        },
        children: name.split(' ').map(part => part[0]).join('').toUpperCase(),
    };
};

interface UserListProps {
    users: User[];
    onUserSelect: (user: User) => void;
    onEditClick: (event: React.MouseEvent, user: User) => void;
    onDeleteClick: (event: React.MouseEvent, user: User) => void;
    isLoading: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
}

const UserList: React.FC<UserListProps> = ({
    users,
    onUserSelect,
    onEditClick,
    onDeleteClick,
    isLoading,
    isUpdating,
    isDeleting,
}) => {
    return (
        <List>
            {users.map((user) => (
                <ListItem
                    key={user.id}
                    onClick={() => onUserSelect(user)}
                    sx={{ 
                        mb: 1,
                        borderRadius: 2,
                        cursor: 'pointer',
                        background: 'white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        transition: 'box-shadow 0.2s, background 0.2s',
                        '&:hover': {
                            backgroundColor: 'primary.50',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.10)'
                        },
                        alignItems: 'center',
                        minHeight: 64
                    }}
                >
                    <ListItemAvatar>
                        <Avatar {...stringAvatar(user.name)} />
                    </ListItemAvatar>
                    <ListItemText
                        primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>{user.name}</span>
                                <AreaChip area={user.area} />
                            </Box>
                        }
                        secondary={null}
                    />
                    <ListItemSecondaryAction>
                        <Stack direction="row" spacing={1}>
                            <IconButton 
                                edge="end" 
                                aria-label="edit"
                                onClick={(e) => onEditClick(e, user)}
                                disabled={isLoading || isUpdating}
                            >
                                <EditIcon />
                            </IconButton>
                            <IconButton 
                                edge="end" 
                                aria-label="delete"
                                onClick={(e) => onDeleteClick(e, user)}
                                disabled={isLoading || isDeleting}
                            >
                                <DeleteIcon sx={{ color: 'error.main' }} />
                            </IconButton>
                        </Stack>
                    </ListItemSecondaryAction>
                </ListItem>
            ))}
        </List>
    );
};

export default UserList; 