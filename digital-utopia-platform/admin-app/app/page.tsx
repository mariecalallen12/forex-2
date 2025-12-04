'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/auth-context';
import { useAdmin } from '../contexts/admin-context';
import { useNotification } from '../contexts/notification-context';
import AdminLayout from '../components/AdminLayout';
import DashboardOverview from '../components/DashboardOverview';
import UserManagement from '../components/UserManagement';
import TradeManagement from '../components/TradeManagement';
import FinancialManagement from '../components/FinancialManagement';
import Analytics from '../components/Analytics';
import Settings from '../components/Settings';

type ActiveTab = 'dashboard' | 'users' | 'trades' | 'financial' | 'analytics' | 'settings';

export default function AdminDashboard() {
  const { user, adminUser, loading: authLoading } = useAuth();
  const { refreshMetrics } = useAdmin();
  const { showError } = useNotification();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  useEffect(() => {
    if (!authLoading && (!user || !adminUser)) {
      showError('Access denied. Admin privileges required.');
    } else if (adminUser) {
      refreshMetrics();
    }
  }, [user, adminUser, authLoading, refreshMetrics, showError]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!user || !adminUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400">Admin privileges required to access this dashboard.</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'users':
        return <UserManagement />;
      case 'trades':
        return <TradeManagement />;
      case 'financial':
        return <FinancialManagement />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
}
