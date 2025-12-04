'use client';

import { useState, useEffect } from 'react';
import { useAdmin } from '../contexts/admin-context';
import { useNotification } from '../contexts/notification-context';
import { Deposit, Withdrawal, Invoice, Payment } from '../../../shared/types';

export default function FinancialManagement() {
  const { 
    deposits, 
    withdrawals, 
    invoices, 
    payments,
    approveDeposit, 
    rejectDeposit,
    processWithdrawal,
    generateInvoice,
    loading, 
    error 
  } = useAdmin();
  
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals' | 'invoices' | 'payments'>('deposits');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Mock financial data
  useEffect(() => {
    const mockDeposits: Deposit[] = [
      {
        id: 'dep1',
        userId: 'user1',
        amount: 1000,
        currency: 'USD',
        method: 'bank_transfer',
        status: 'pending',
        transactionId: 'TXN123456',
        receiptUrl: 'receipts/dep1.pdf',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'dep2',
        userId: 'user2',
        amount: 2500,
        currency: 'USD',
        method: 'crypto',
        status: 'approved',
        transactionId: 'TXN123457',
        receiptUrl: 'receipts/dep2.pdf',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const mockWithdrawals: Withdrawal[] = [
      {
        id: 'wd1',
        userId: 'user1',
        amount: 500,
        currency: 'USD',
        method: 'bank_transfer',
        status: 'pending',
        bankDetails: {
          accountNumber: '****1234',
          routingNumber: '****5678',
          bankName: 'Chase Bank'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'wd2',
        userId: 'user3',
        amount: 1000,
        currency: 'USD',
        method: 'crypto',
        status: 'approved',
        walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const mockInvoices: Invoice[] = [
      {
        id: 'INV001',
        invoiceNumber: 'INV-001',
        userId: 'user1',
        status: 'paid',
        amount: 100,
        currency: 'USD',
        description: 'Trading Commission',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        items: [
          {
            description: 'Commission Fee',
            quantity: 1,
            unitPrice: 100,
            total: 100
          }
        ]
      }
    ];

    const mockPayments: Payment[] = [
      {
        id: 'PAY001',
        invoiceId: 'INV001',
        userId: 'user1',
        amount: 100,
        currency: 'USD',
        method: 'credit_card',
        status: 'completed',
        transactionId: 'CC_TXN_123',
        createdAt: new Date()
      }
    ];

    console.log('Mock financial data loaded');
  }, []);

  const handleDepositApproval = async (depositId: string) => {
    try {
      await approveDeposit(depositId);
      showSuccess('Deposit approved successfully');
    } catch (err) {
      showError('Failed to approve deposit');
    }
  };

  const handleDepositRejection = async (depositId: string, reason: string) => {
    try {
      await rejectDeposit(depositId, reason);
      showSuccess('Deposit rejected');
    } catch (err) {
      showError('Failed to reject deposit');
    }
  };

  const handleWithdrawalProcessing = async (withdrawalId: string, status: 'approved' | 'rejected') => {
    try {
      await processWithdrawal(withdrawalId, status);
      showSuccess(`Withdrawal ${status} successfully`);
    } catch (err) {
      showError('Failed to process withdrawal');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-900/30';
      case 'approved':
      case 'completed': 
      case 'paid': return 'text-green-400 bg-green-900/30';
      case 'rejected': return 'text-red-400 bg-red-900/30';
      case 'failed': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const filteredDeposits = deposits.filter(deposit => 
    deposit.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deposit.transactionId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWithdrawals = withdrawals.filter(withdrawal => 
    withdrawal.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderDeposits = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Deposits Management</h3>
        <div className="flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Deposit ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No deposits found
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((deposit) => (
                  <tr key={deposit.id} className="hover:bg-slate-700/50">
                    <td className="px-6 py-4 text-white font-mono text-sm">{deposit.id}</td>
                    <td className="px-6 py-4 text-gray-300">{deposit.userId}</td>
                    <td className="px-6 py-4 text-white">${deposit.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-300 capitalize">{deposit.method.replace('_', ' ')}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(deposit.status)}`}>
                        {deposit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {deposit.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {deposit.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleDepositApproval(deposit.id)}
                              className="text-green-400 hover:text-green-300 text-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDepositRejection(deposit.id, 'Manual rejection')}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button className="text-orange-400 hover:text-orange-300 text-sm">
                          View Receipt
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderWithdrawals = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Withdrawals Management</h3>
        <div className="flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Withdrawal ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Destination</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No withdrawals found
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-slate-700/50">
                    <td className="px-6 py-4 text-white font-mono text-sm">{withdrawal.id}</td>
                    <td className="px-6 py-4 text-gray-300">{withdrawal.userId}</td>
                    <td className="px-6 py-4 text-white">${withdrawal.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-300 capitalize">{withdrawal.method.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {withdrawal.method === 'bank_transfer' && withdrawal.bankDetails
                        ? `${withdrawal.bankDetails.bankName} ****${withdrawal.bankDetails.accountNumber.slice(-4)}`
                        : withdrawal.walletAddress
                        ? `${withdrawal.walletAddress.slice(0, 10)}...${withdrawal.walletAddress.slice(-10)}`
                        : 'N/A'
                      }
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(withdrawal.status)}`}>
                        {withdrawal.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {withdrawal.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleWithdrawalProcessing(withdrawal.id, 'approved')}
                              className="text-green-400 hover:text-green-300 text-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleWithdrawalProcessing(withdrawal.id, 'rejected')}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button className="text-orange-400 hover:text-orange-300 text-sm">
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Financial Management</h1>
          <p className="text-gray-400 mt-2">Manage deposits, withdrawals, and payments</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200">
            Export Report
          </button>
          <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors duration-200">
            Generate Invoice
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Deposits</p>
              <p className="text-2xl font-bold text-white mt-2">
                ${deposits.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-700 rounded-lg">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Withdrawals</p>
              <p className="text-2xl font-bold text-white mt-2">
                ${withdrawals.reduce((sum, w) => sum + w.amount, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-700 rounded-lg">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Pending Deposits</p>
              <p className="text-2xl font-bold text-yellow-400 mt-2">
                ${deposits.filter(d => d.status === 'pending').reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-700 rounded-lg">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Pending Withdrawals</p>
              <p className="text-2xl font-bold text-yellow-400 mt-2">
                ${withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-700 rounded-lg">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-2">Search</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by user ID or transaction ID..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Quick Actions</label>
            <button
              onClick={() => generateInvoice({ userId: 'user1', amount: 100, description: 'Test Invoice' })}
              className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors duration-200"
            >
              Generate Test Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="border-b border-slate-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'deposits', label: 'Deposits', count: deposits.length },
              { id: 'withdrawals', label: 'Withdrawals', count: withdrawals.length },
              { id: 'invoices', label: 'Invoices', count: invoices.length },
              { id: 'payments', label: 'Payments', count: payments.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'deposits' && renderDeposits()}
          {activeTab === 'withdrawals' && renderWithdrawals()}
          {activeTab === 'invoices' && (
            <div className="text-center text-gray-400 py-12">
              <p>Invoices management component - Placeholder</p>
            </div>
          )}
          {activeTab === 'payments' && (
            <div className="text-center text-gray-400 py-12">
              <p>Payments management component - Placeholder</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}