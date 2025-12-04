'use client';

import { useState, useEffect } from 'react';
import { useAdmin } from '../contexts/admin-context';
import { useNotification } from '../contexts/notification-context';
import { User } from 'firebase/auth';

export default function UserManagement() {
  const { 
    users, 
    selectedUser, 
    setSelectedUser, 
    updateUserStatus, 
    getUserTradingStats, 
    bulkUpdateUsers,
    loading, 
    error 
  } = useAdmin();
  
  const { showSuccess, showError, showInfo } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'date' | 'trades'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<{[key: string]: any}>({});

  // Mock users data for demonstration
  useEffect(() => {
    // In real implementation, this would come from Firebase
    const mockUsers: User[] = [
      {
        uid: 'user1',
        email: 'john.doe@example.com',
        displayName: 'John Doe',
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        providerId: 'firebase',
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => '',
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({}),
        phoneNumber: null,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString()
        }
      } as any,
      {
        uid: 'user2',
        email: 'jane.smith@example.com',
        displayName: 'Jane Smith',
        photoURL: null,
        emailVerified: false,
        isAnonymous: false,
        providerId: 'firebase',
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => '',
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({}),
        phoneNumber: null,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString()
        }
      } as any,
      {
        uid: 'user3',
        email: 'bob.wilson@example.com',
        displayName: 'Bob Wilson',
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        providerId: 'firebase',
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => '',
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({}),
        phoneNumber: null,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString()
        }
      } as any
    ];
    
    // Simulate setting users
    console.log('Mock users loaded:', mockUsers.length);
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleUserStatusUpdate = async (userId: string, status: 'active' | 'suspended' | 'banned') => {
    try {
      await updateUserStatus(userId, status);
      showSuccess(`User status updated to ${status}`);
    } catch (err) {
      showError('Failed to update user status');
    }
  };

  const handleBulkStatusUpdate = async (status: 'active' | 'suspended' | 'banned') => {
    if (selectedUsers.length === 0) {
      showError('Please select users first');
      return;
    }

    try {
      await bulkUpdateUsers(selectedUsers, { customClaims: { status } });
      showSuccess(`Bulk updated ${selectedUsers.length} users to ${status}`);
      setSelectedUsers([]);
    } catch (err) {
      showError('Failed to bulk update users');
    }
  };

  const handleUserSelect = (userId: string, checked: boolean) => {
    setSelectedUsers(prev => 
      checked ? [...prev, userId] : prev.filter(id => id !== userId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedUsers(checked ? filteredUsers.map(user => user.uid) : []);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-900/30';
      case 'suspended': return 'text-yellow-400 bg-yellow-900/30';
      case 'banned': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-2">Manage user accounts, status, and permissions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200">
            Export Users
          </button>
          <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors duration-200">
            Add New User
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-2">Search Users</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Users</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Sort By</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="email-asc">Email A-Z</option>
              <option value="email-desc">Email Z-A</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="mt-4 p-4 bg-slate-700 rounded-lg border border-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">
                {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleBulkStatusUpdate('active')}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('suspended')}
                  className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded"
                >
                  Suspend
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate('banned')}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                >
                  Ban
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-orange-600 bg-slate-700 border-slate-600 rounded focus:ring-orange-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Email Verified
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Join Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      <p>No users found</p>
                      <p className="text-sm mt-1">Try adjusting your search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.uid)}
                        onChange={(e) => handleUserSelect(user.uid, e.target.checked)}
                        className="w-4 h-4 text-orange-600 bg-slate-700 border-slate-600 rounded focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-medium text-sm">
                            {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.displayName || 'No Name'}</p>
                          <p className="text-gray-400 text-sm">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor('active')}`}>
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.emailVerified ? (
                        <span className="text-green-400 text-sm flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Verified
                        </span>
                      ) : (
                        <span className="text-red-400 text-sm flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-orange-400 hover:text-orange-300 text-sm"
                        >
                          View Details
                        </button>
                        <div className="relative">
                          <button className="text-gray-400 hover:text-gray-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal (placeholder) */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">User Details</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Name</p>
                  <p className="text-white">{selectedUser.displayName || 'No Name'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">User ID</p>
                  <p className="text-white font-mono text-sm">{selectedUser.uid}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor('active')}`}>
                    Active
                  </span>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => handleUserStatusUpdate(selectedUser.uid, 'suspended')}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
                >
                  Suspend User
                </button>
                <button
                  onClick={() => handleUserStatusUpdate(selectedUser.uid, 'banned')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  Ban User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}