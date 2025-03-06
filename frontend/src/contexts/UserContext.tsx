import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types/models';

interface UserContextType {
    currentUser: User | null;
    setCurrentUser: (user: User | null) => void;
    users: User[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);

    return (
        <UserContext.Provider value={{ currentUser, setCurrentUser, users }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}; 