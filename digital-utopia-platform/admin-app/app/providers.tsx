'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '../contexts/auth-context';
import { AdminProvider } from '../contexts/admin-context';
import { NotificationProvider } from '../contexts/notification-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <AdminProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </AdminProvider>
    </AuthProvider>
  );
}