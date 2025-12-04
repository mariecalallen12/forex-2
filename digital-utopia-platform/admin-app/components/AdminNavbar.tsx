'use client';

import { useState } from 'react';
import { AdminUser } from '../../../shared/types';
import { useAuth } from '../contexts/auth-context';
import { useAdmin } from '../contexts/admin-context';

interface AdminNavbarProps {
  adminUser: AdminUser;
}

export default function AdminNavbar({ adminUser }: AdminNavbarProps) {
  const { logout } = useAuth();
  const { refreshMetrics } = useAdmin();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshMetrics();
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
    }
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-white">
            Digital Utopia Admin Dashboard
          </h1>
          <div className="text-sm text-gray-400">
            Role: <span className="text-orange-400 font-medium">{adminUser.role}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors duration-200"
            >
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {adminUser.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-left">
                <p className="text-white text-sm font-medium">{adminUser.displayName}</p>
                <p className="text-gray-400 text-xs">{adminUser.email}</p>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-slate-700">
                    <p className="text-white text-sm font-medium">{adminUser.displayName}</p>
                    <p className="text-gray-400 text-xs">{adminUser.email}</p>
                    <p className="text-orange-400 text-xs mt-1">Role: {adminUser.role}</p>
                  </div>
                  <button
                    onClick={() => setShowUserMenu(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white"
                  >
                    Profile Settings
                  </button>
                  <button
                    onClick={() => setShowUserMenu(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white"
                  >
                    System Settings
                  </button>
                  <hr className="border-slate-700 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}