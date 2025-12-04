'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { 
  AdminUser, 
  User, 
  Trade, 
  Deposit, 
  Withdrawal, 
  Invoice, 
  Payment,
  TradingStats,
  SystemMetrics 
} from '../../../shared/types';

interface AdminContextType {
  // Users Management
  users: User[];
  selectedUser: User | null;
  setSelectedUser: (user: User | null) => void;
  updateUserStatus: (userId: string, status: 'active' | 'suspended' | 'banned') => Promise<void>;
  getUserTradingStats: (userId: string) => Promise<TradingStats>;
  
  // Trading Management
  trades: Trade[];
  selectedTrade: Trade | null;
  setSelectedTrade: (trade: Trade | null) => void;
  approveTrade: (tradeId: string) => Promise<void>;
  rejectTrade: (tradeId: string, reason: string) => Promise<void>;
  
  // Financial Management
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  invoices: Invoice[];
  payments: Payment[];
  approveDeposit: (depositId: string) => Promise<void>;
  rejectDeposit: (depositId: string, reason: string) => Promise<void>;
  processWithdrawal: (withdrawalId: string, status: 'approved' | 'rejected') => Promise<void>;
  generateInvoice: (data: Partial<Invoice>) => Promise<string>;
  
  // Analytics & Metrics
  systemMetrics: SystemMetrics | null;
  tradingStats: TradingStats[];
  refreshMetrics: () => Promise<void>;
  
  // Bulk Operations
  bulkUpdateUsers: (userIds: string[], updates: any) => Promise<void>;
  bulkProcessDeposits: (depositIds: string[], action: 'approve' | 'reject') => Promise<void>;
  
  // Loading States
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [tradingStats, setTradingStats] = useState<TradingStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateUserStatus = async (userId: string, status: 'active' | 'suspended' | 'banned') => {
    try {
      setLoading(true);
      // In real implementation: update user status in Firestore
      setUsers(prev => prev.map(user => 
        user.uid === userId ? { ...user, customClaims: { status } } as any : user
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  const getUserTradingStats = async (userId: string): Promise<TradingStats> => {
    try {
      setLoading(true);
      // In real implementation: fetch from Firestore
      const stats: TradingStats = {
        totalTrades: 0,
        successfulTrades: 0,
        failedTrades: 0,
        totalVolume: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageProfit: 0,
        largestWin: 0,
        largestLoss: 0,
        tradingDays: 0,
        lastTradeDate: null,
        favoriteTradingPair: '',
        riskLevel: 'medium'
      };
      return stats;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trading stats');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const approveTrade = async (tradeId: string) => {
    try {
      setLoading(true);
      setTrades(prev => prev.map(trade => 
        trade.id === tradeId ? { ...trade, status: 'approved' as any } : trade
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve trade');
    } finally {
      setLoading(false);
    }
  };

  const rejectTrade = async (tradeId: string, reason: string) => {
    try {
      setLoading(true);
      setTrades(prev => prev.map(trade => 
        trade.id === tradeId ? { ...trade, status: 'rejected' as any, rejectionReason: reason } : trade
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject trade');
    } finally {
      setLoading(false);
    }
  };

  const approveDeposit = async (depositId: string) => {
    try {
      setLoading(true);
      setDeposits(prev => prev.map(deposit => 
        deposit.id === depositId ? { ...deposit, status: 'approved' as any } : deposit
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve deposit');
    } finally {
      setLoading(false);
    }
  };

  const rejectDeposit = async (depositId: string, reason: string) => {
    try {
      setLoading(true);
      setDeposits(prev => prev.map(deposit => 
        deposit.id === depositId ? { ...deposit, status: 'rejected' as any, rejectionReason: reason } : deposit
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject deposit');
    } finally {
      setLoading(false);
    }
  };

  const processWithdrawal = async (withdrawalId: string, status: 'approved' | 'rejected') => {
    try {
      setLoading(true);
      setWithdrawals(prev => prev.map(withdrawal => 
        withdrawal.id === withdrawalId ? { ...withdrawal, status: status as any } : withdrawal
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async (data: Partial<Invoice>): Promise<string> => {
    try {
      setLoading(true);
      const invoiceNumber = `INV-${Date.now()}`;
      const newInvoice: Invoice = {
        id: invoiceNumber,
        invoiceNumber,
        userId: data.userId || '',
        status: 'pending' as any,
        amount: data.amount || 0,
        currency: data.currency || 'USD',
        description: data.description || '',
        dueDate: data.dueDate || new Date(),
        createdAt: new Date(),
        items: data.items || []
      };
      setInvoices(prev => [...prev, newInvoice]);
      return invoiceNumber;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invoice');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshMetrics = async () => {
    try {
      setLoading(true);
      // In real implementation: fetch real metrics
      const metrics: SystemMetrics = {
        totalUsers: users.length,
        activeUsers: 0,
        totalTrades: trades.length,
        totalVolume: 0,
        totalRevenue: 0,
        systemUptime: 99.9,
        averageResponseTime: 120,
        errorRate: 0.01,
        lastUpdated: new Date()
      };
      setSystemMetrics(metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh metrics');
    } finally {
      setLoading(false);
    }
  };

  const bulkUpdateUsers = async (userIds: string[], updates: any) => {
    try {
      setLoading(true);
      setUsers(prev => prev.map(user => 
        userIds.includes(user.uid) ? { ...user, ...updates } : user
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk update users');
    } finally {
      setLoading(false);
    }
  };

  const bulkProcessDeposits = async (depositIds: string[], action: 'approve' | 'reject') => {
    try {
      setLoading(true);
      const status = action === 'approve' ? 'approved' : 'rejected';
      setDeposits(prev => prev.map(deposit => 
        depositIds.includes(deposit.id) ? { ...deposit, status: status as any } : deposit
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk process deposits');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminContext.Provider value={{
      users,
      selectedUser,
      setSelectedUser,
      updateUserStatus,
      getUserTradingStats,
      trades,
      selectedTrade,
      setSelectedTrade,
      approveTrade,
      rejectTrade,
      deposits,
      withdrawals,
      invoices,
      payments,
      approveDeposit,
      rejectDeposit,
      processWithdrawal,
      generateInvoice,
      systemMetrics,
      tradingStats,
      refreshMetrics,
      bulkUpdateUsers,
      bulkProcessDeposits,
      loading,
      error,
      setLoading,
      setError
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}