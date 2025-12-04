'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '../contexts/admin-context';
import { SystemMetrics, TradingStats } from '../../../shared/types';

export default function DashboardOverview() {
  const { systemMetrics, refreshMetrics, loading } = useAdmin();
  const [realTimeData, setRealTimeData] = useState({
    activeUsers: 0,
    tradesToday: 0,
    revenueToday: 0,
    systemLoad: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData(prev => ({
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 3) - 1,
        tradesToday: prev.tradesToday + Math.floor(Math.random() * 5),
        revenueToday: prev.revenueToday + Math.floor(Math.random() * 1000),
        systemLoad: Math.max(0, Math.min(100, prev.systemLoad + Math.floor(Math.random() * 11) - 5))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const metricCards = [
    {
      title: 'Total Users',
      value: systemMetrics?.totalUsers || 0,
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    },
    {
      title: 'Active Users',
      value: realTimeData.activeUsers,
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      title: 'Total Trades',
      value: systemMetrics?.totalTrades || 0,
      change: '+24.7%',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      title: 'Revenue Today',
      value: `$${realTimeData.revenueToday.toLocaleString()}`,
      change: '+15.3%',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    {
      title: 'System Uptime',
      value: `${systemMetrics?.systemUptime || 99.9}%`,
      change: 'Stable',
      changeType: 'neutral' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'System Load',
      value: `${realTimeData.systemLoad}%`,
      change: realTimeData.systemLoad < 50 ? 'Low' : realTimeData.systemLoad < 80 ? 'Medium' : 'High',
      changeType: realTimeData.systemLoad < 50 ? 'positive' as const : realTimeData.systemLoad < 80 ? 'neutral' as const : 'negative' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    }
  ];

  const recentActivities = [
    { type: 'user', message: 'New user registered: john.doe@example.com', time: '2 minutes ago', status: 'success' },
    { type: 'trade', message: 'Large trade executed: $50,000 BTC/USD', time: '5 minutes ago', status: 'info' },
    { type: 'deposit', message: 'Deposit approved: $1,000 from userID123', time: '8 minutes ago', status: 'success' },
    { type: 'system', message: 'System backup completed successfully', time: '1 hour ago', status: 'success' },
    { type: 'alert', message: 'High trading volume detected', time: '2 hours ago', status: 'warning' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-gray-400 mt-2">Real-time monitoring and analytics</p>
        </div>
        <button
          onClick={refreshMetrics}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metricCards.map((card, index) => (
          <div key={index} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">{card.title}</p>
                <p className="text-2xl font-bold text-white mt-2">{card.value}</p>
                <div className="flex items-center mt-2">
                  <span className={`text-sm font-medium ${
                    card.changeType === 'positive' ? 'text-green-400' :
                    card.changeType === 'negative' ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                    {card.change}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-slate-700 rounded-lg">
                <div className="text-orange-400">
                  {card.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trading Volume Chart */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Trading Volume (Last 24 Hours)</h3>
          <div className="h-64 flex items-center justify-center bg-slate-700 rounded-lg">
            <div className="text-center text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>Chart Integration Placeholder</p>
              <p className="text-sm mt-2">TradingView/Recharts integration needed</p>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activities</h3>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.status === 'success' ? 'bg-green-400' :
                  activity.status === 'warning' ? 'bg-yellow-400' :
                  activity.status === 'error' ? 'bg-red-400' :
                  'bg-blue-400'
                }`}></div>
                <div className="flex-1">
                  <p className="text-white text-sm">{activity.message}</p>
                  <p className="text-gray-400 text-xs mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-white font-medium">Database</h4>
            <p className="text-green-400 text-sm">Operational</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-white font-medium">API Services</h4>
            <p className="text-green-400 text-sm">All Active</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h4 className="text-white font-medium">Trading Engine</h4>
            <p className="text-yellow-400 text-sm">High Load</p>
          </div>
        </div>
      </div>
    </div>
  );
}