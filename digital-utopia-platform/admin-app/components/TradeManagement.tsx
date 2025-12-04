'use client';

import { useState, useEffect } from 'react';
import { useAdmin } from '../contexts/admin-context';
import { useNotification } from '../contexts/notification-context';
import { Trade } from '../../../shared/types';

export default function TradeManagement() {
  const { 
    trades, 
    selectedTrade, 
    setSelectedTrade, 
    approveTrade, 
    rejectTrade, 
    loading, 
    error 
  } = useAdmin();
  
  const { showSuccess, showError } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [pairFilter, setPairFilter] = useState('all');
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);

  // Mock trades data
  useEffect(() => {
    const mockTrades: Trade[] = [
      {
        id: 'trade1',
        userId: 'user1',
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        quantity: 0.5,
        price: 45000,
        status: 'pending',
        timestamp: new Date(),
        profit: 0,
        loss: 0,
        leverage: 2,
        stopLoss: 42000,
        takeProfit: 48000
      },
      {
        id: 'trade2',
        userId: 'user2',
        symbol: 'ETH/USD',
        side: 'sell',
        type: 'limit',
        quantity: 2.0,
        price: 3000,
        status: 'pending',
        timestamp: new Date(),
        profit: 0,
        loss: 0,
        leverage: 1,
        stopLoss: 3200,
        takeProfit: 2800
      },
      {
        id: 'trade3',
        userId: 'user3',
        symbol: 'EUR/USD',
        side: 'buy',
        type: 'market',
        quantity: 10000,
        price: 1.0850,
        status: 'approved',
        timestamp: new Date(),
        profit: 150,
        loss: 0,
        leverage: 10,
        stopLoss: 1.0800,
        takeProfit: 1.0900
      }
    ];
    
    console.log('Mock trades loaded:', mockTrades.length);
  }, []);

  const handleTradeApproval = async (tradeId: string) => {
    try {
      await approveTrade(tradeId);
      showSuccess('Trade approved successfully');
    } catch (err) {
      showError('Failed to approve trade');
    }
  };

  const handleTradeRejection = async (tradeId: string, reason: string) => {
    try {
      await rejectTrade(tradeId, reason);
      showSuccess('Trade rejected');
    } catch (err) {
      showError('Failed to reject trade');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-900/30';
      case 'approved': return 'text-green-400 bg-green-900/30';
      case 'rejected': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const getSideColor = (side: string) => {
    return side === 'buy' ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Trading Management</h1>
          <p className="text-gray-400 mt-2">Monitor and manage all trading activities</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200">
            Export Trades
          </button>
          <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors duration-200">
            Bulk Actions
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Trades</p>
              <p className="text-2xl font-bold text-white mt-2">{trades.length}</p>
            </div>
            <div className="p-3 bg-slate-700 rounded-lg">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Pending Trades</p>
              <p className="text-2xl font-bold text-yellow-400 mt-2">
                {trades.filter(t => t.status === 'pending').length}
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
              <p className="text-gray-400 text-sm font-medium">Approved Today</p>
              <p className="text-2xl font-bold text-green-400 mt-2">
                {trades.filter(t => t.status === 'approved').length}
              </p>
            </div>
            <div className="p-3 bg-slate-700 rounded-lg">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Volume</p>
              <p className="text-2xl font-bold text-white mt-2">
                ${trades.reduce((sum, t) => sum + (t.quantity * t.price), 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-700 rounded-lg">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-2">Search Trades</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by symbol or user ID..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Trading Pair</label>
            <select
              value={pairFilter}
              onChange={(e) => setPairFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Pairs</option>
              <option value="BTC/USD">BTC/USD</option>
              <option value="ETH/USD">ETH/USD</option>
              <option value="EUR/USD">EUR/USD</option>
              <option value="GBP/USD">GBP/USD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Trade ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Side
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <p>No trades found</p>
                      <p className="text-sm mt-1">Trades will appear here once users start trading</p>
                    </div>
                  </td>
                </tr>
              ) : (
                trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <span className="text-white font-mono text-sm">{trade.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300">{trade.userId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{trade.symbol}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium capitalize ${getSideColor(trade.side)}`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300 capitalize">{trade.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white">{trade.quantity}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white">${trade.price.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white">${(trade.quantity * trade.price).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(trade.status)}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {trade.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleTradeApproval(trade.id)}
                              className="text-green-400 hover:text-green-300 text-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleTradeRejection(trade.id, 'Manual rejection')}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setSelectedTrade(trade)}
                          className="text-orange-400 hover:text-orange-300 text-sm"
                        >
                          View
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

      {/* Trade Details Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Trade Details</h3>
              <button
                onClick={() => setSelectedTrade(null)}
                className="text-gray-400 hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Trade ID</p>
                <p className="text-white font-mono">{selectedTrade.id}</p>
              </div>
              <div>
                <p className="text-gray-400">User ID</p>
                <p className="text-white">{selectedTrade.userId}</p>
              </div>
              <div>
                <p className="text-gray-400">Symbol</p>
                <p className="text-white">{selectedTrade.symbol}</p>
              </div>
              <div>
                <p className="text-gray-400">Side</p>
                <p className={`font-medium ${getSideColor(selectedTrade.side)}`}>{selectedTrade.side}</p>
              </div>
              <div>
                <p className="text-gray-400">Type</p>
                <p className="text-white capitalize">{selectedTrade.type}</p>
              </div>
              <div>
                <p className="text-gray-400">Quantity</p>
                <p className="text-white">{selectedTrade.quantity}</p>
              </div>
              <div>
                <p className="text-gray-400">Price</p>
                <p className="text-white">${selectedTrade.price.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400">Value</p>
                <p className="text-white">${(selectedTrade.quantity * selectedTrade.price).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400">Leverage</p>
                <p className="text-white">{selectedTrade.leverage}x</p>
              </div>
              <div>
                <p className="text-gray-400">Status</p>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedTrade.status)}`}>
                  {selectedTrade.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}