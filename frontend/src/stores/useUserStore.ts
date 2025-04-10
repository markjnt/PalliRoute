import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserFormData } from '../types/models';
import { usersApi } from '../services/api/users';

interface UserState {
  // State
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  setUsers: (users: User[]) => void;
  fetchUsers: () => Promise<void>;
  createUser: (userData: UserFormData) => Promise<User>;
  updateUser: (id: number, userData: Partial<UserFormData>) => Promise<User>;
  deleteUser: (id: number) => Promise<void>;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // State
      currentUser: null,
      users: [],
      isLoading: false,
      error: null,
      
      // Actions
      setCurrentUser: (user) => set({ currentUser: user }),
      setUsers: (users) => set({ users }),
      clearUser: () => set({ currentUser: null }),
      
      fetchUsers: async () => {
        set({ isLoading: true, error: null });
        try {
          const users = await usersApi.getUsers();
          set({ users, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden der Benutzer';
          set({ 
            error: errorMessage, 
            isLoading: false 
          });
          console.error('Error fetching users:', error);
        }
      },
      
      createUser: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const newUser = await usersApi.createUser(userData);
          set((state) => ({ 
            users: [...state.users, newUser],
            isLoading: false 
          }));
          return newUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Fehler beim Erstellen des Benutzers';
          set({ 
            error: errorMessage, 
            isLoading: false 
          });
          console.error('Error creating user:', error);
          throw error;
        }
      },
      
      updateUser: async (id, userData) => {
        set({ isLoading: true, error: null });
        try {
          const updatedUser = await usersApi.updateUser(id, userData);
          set((state) => ({ 
            users: state.users.map(u => u.id === id ? updatedUser : u),
            currentUser: state.currentUser?.id === id ? updatedUser : state.currentUser,
            isLoading: false 
          }));
          return updatedUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Benutzers';
          set({ 
            error: errorMessage, 
            isLoading: false 
          });
          console.error('Error updating user:', error);
          throw error;
        }
      },
      
      deleteUser: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await usersApi.deleteUser(id);
          set((state) => ({ 
            users: state.users.filter(u => u.id !== id),
            // Wenn der gelöschte Benutzer der aktuelle Benutzer ist, setzen wir currentUser auf null
            currentUser: state.currentUser?.id === id ? null : state.currentUser,
            isLoading: false 
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Fehler beim Löschen des Benutzers';
          set({ 
            error: errorMessage, 
            isLoading: false 
          });
          console.error('Error deleting user:', error);
          throw error;
        }
      }
    }),
    {
      name: 'user-storage', // Name des localStorage-Eintrags
      partialize: (state) => ({ currentUser: state.currentUser }), // Nur currentUser persistieren
    }
  )
); 