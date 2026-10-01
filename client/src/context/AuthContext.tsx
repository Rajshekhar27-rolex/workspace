import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/api';
import { api } from '../api/client';

interface AuthContextType {
  currentUser: User | null;
  availableUsers: User[];
  loading: boolean;
  error: string | null;
  switchUser: (userId: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAvailableUsers();
      setAvailableUsers(res.users);

      if (res.users.length > 0) {
        // Retrieve stored user or default to first user
        const savedUserId = localStorage.getItem('crd_user_id');
        const userToSelect = res.users.find((u) => u.id === savedUserId) || res.users[0];
        api.setUserId(userToSelect.id);
        setCurrentUser(userToSelect);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load user workspaces.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const switchUser = async (userId: string) => {
    const selected = availableUsers.find((u) => u.id === userId);
    if (selected) {
      api.setUserId(selected.id);
      localStorage.setItem('crd_user_id', selected.id);
      setCurrentUser(selected);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        availableUsers,
        loading,
        error,
        switchUser,
        refreshUsers: fetchUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
