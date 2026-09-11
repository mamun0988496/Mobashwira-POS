import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const defaultAdminUser: User = {
    id: 1,
    username: 'admin',
    email: 'admin@shop.com',
    name: 'Alex Rivera (Owner)',
    role: 'admin',
    phone: '+1 555-0101',
    active: 1
  };

  const [user, setUser] = useState<User | null>(defaultAdminUser);
  const [token, setToken] = useState<string | null>(localStorage.getItem('shop_token'));
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchMe = async () => {
      const storedToken = localStorage.getItem('shop_token');
      if (storedToken) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            setToken(storedToken);
          }
        } catch {
          // Keep defaultAdminUser
        }
      }
    };

    fetchMe();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('shop_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    // No-op as login & logout options are disabled
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
