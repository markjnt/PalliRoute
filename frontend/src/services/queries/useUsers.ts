import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User, UserFormData } from '../../types/models';
import { usersApi } from '../api/users';

// Keys for React Query cache
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
};

// Hook to get all users
export const useUsers = () => {
  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: () => usersApi.getUsers(),
  });
};

// Hook to get a single user
export const useUser = (id: number) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.getUser(id),
    enabled: !!id, // Only run the query if we have an ID
  });
};

// Hook to create a user
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData: UserFormData) => usersApi.createUser(userData),
    onSuccess: (newUser) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      
      // Optionally update the cache directly
      queryClient.setQueryData(
        userKeys.lists(),
        (oldUsers: User[] = []) => [...oldUsers, newUser]
      );
    },
  });
};

// Hook to update a user
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, userData }: { id: number; userData: Partial<UserFormData> }) => 
      usersApi.updateUser(id, userData),
    onSuccess: (updatedUser) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(updatedUser.id) });
      
      // Optionally update the cache directly
      queryClient.setQueryData(
        userKeys.lists(),
        (oldUsers: User[] = []) => 
          oldUsers.map(user => (user.id === updatedUser.id ? updatedUser : user))
      );
    },
  });
};

// Hook to delete a user
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => usersApi.deleteUser(id),
    onSuccess: (_, id) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      
      // Remove from cache
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      
      // Optionally update the list cache directly
      queryClient.setQueryData(
        userKeys.lists(),
        (oldUsers: User[] = []) => oldUsers.filter(user => user.id !== id)
      );
    },
  });
}; 