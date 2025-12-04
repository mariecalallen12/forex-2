'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { AdminUser, UserRole } from '../../../shared/types';

interface AuthContextType {
  user: User | null;
  adminUser: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // In a real implementation, fetch admin user data from Firestore
        const adminData: AdminUser = {
          id: user.uid,
          email: user.email!,
          displayName: user.displayName || 'Admin User',
          role: UserRole.SUPER_ADMIN,
          permissions: ['user:read', 'user:write', 'trade:read', 'trade:write', 'financial:read', 'financial:write'],
          createdAt: new Date(),
          lastLogin: new Date(),
          isActive: true
        };
        setAdminUser(adminData);
      } else {
        setUser(null);
        setAdminUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin = adminUser?.role === UserRole.ADMIN || adminUser?.role === UserRole.SUPER_ADMIN;

  const hasPermission = (permission: string): boolean => {
    return adminUser?.permissions.includes(permission) || adminUser?.role === UserRole.SUPER_ADMIN;
  };

  return (
    <AuthContext.Provider value={{
      user,
      adminUser,
      loading,
      login,
      logout,
      isAdmin,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}