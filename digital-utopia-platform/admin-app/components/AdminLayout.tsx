'use client';

import { ReactNode } from 'react';
import { useAuth } from '../contexts/auth-context';
import { useAdmin } from '../contexts/admin-context';
import { useNotification } from '../contexts/notification-context';
import AdminNavbar from './AdminNavbar';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function AdminLayout({ children, activeTab, setActiveTab }: AdminLayoutProps) {
  const { adminUser } = useAuth();
  const { notifications } = useNotification();
  const { error } = useAdmin();

  if (!adminUser) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      {/* Sidebar */}
      <AdminSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        adminUser={adminUser}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <AdminNavbar adminUser={adminUser} />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
              <p>{error}</p>
            </div>
          )}
          
          {children}
        </main>
      </div>
      
      {/* Notification Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.slice(0, 5).map((notification) => (
          <div
            key={notification.id}
            className={`
              px-4 py-3 rounded-lg shadow-lg border max-w-sm
              ${notification.type === 'success' ? 'bg-green-900/90 border-green-500 text-green-200' :
                notification.type === 'error' ? 'bg-red-900/90 border-red-500 text-red-200' :
                notification.type === 'warning' ? 'bg-yellow-900/90 border-yellow-500 text-yellow-200' :
                'bg-blue-900/90 border-blue-500 text-blue-200'
              }
            `}
          >
            <div className="flex items-start">
              <div className="flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
                <p className="text-xs opacity-75 mt-1">
                  {notification.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}