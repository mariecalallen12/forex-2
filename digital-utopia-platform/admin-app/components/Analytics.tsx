'use client';

import { useState, useEffect } from 'react';
import { useAdmin } from '../contexts/admin-context';

export default function Analytics() {
  const { systemMetrics, refreshMetrics, tradingStats, loading } = useAdmin();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'users' | 'trades' | 'revenue'>('trades');

  const chartData = {
    users: [
      { date: '2024-01-01', value: 150 },
      { date: '2024-01-02', value: 165 },
      { date: '2024-01-03', value: 180 },
      { date: '2024-01-04', value: 175 },
      { date: '2024-01-05', value: 190 },
      { date: '2024-01-06', value: 205 },
      { date: '2024-01-07', value: 220 }
    ],
    trades: [
      { date: '2024-01-01', value: 45 },
      { date: '2024-01-02', value: 52 },
      { date: '2024-01-03', value: 38 },
      { date: '2024-01-04', value: 61 },
      { date: '2024-01-05', value: 55 },
      { date: '2024-01-06', value: 67 },
      { date: '2024-01-07', value: 73 }
    ],
    revenue: [
      { date: '2024-01-01', value: 12500 },
      { date: '2024-01-02', value: 15200 },
      { date: '2024-01-03', value: 11800 },
      { date: '2024-01-04', value: 16700 },
      { date: '2024-01-05', value: 14200 },
      { date: '2024-01-06', value: 18900 },
      { date: '2024-01-07', value: 22100 }
    ]
  };

  const topPerformingAssets = [
    { symbol: 'BTC/USD', volume: 2450000, trades: 1200, change: '+5.2%' },
    { symbol: 'ETH/USD', volume: 1890000, trades: 980, change: '+3.8%' },
    { symbol: 'EUR/USD', volume: 1560000, trades: 750, change: '+1.2%' },
    { symbol: 'GBP/USD', volume: 980000, trades: 520, change: '-0.8%' },
    { symbol: 'SOL/USD', volume: 750000, trades: 340, change: '+12.5%' }
  ];

  const userInsights = [
    { metric: 'Average Session Time', value: '24m 32s', change: '+8.5%', type: 'positive' },
    { metric: 'Retention Rate', value: '78.4%', change: '+2.1%', type: 'positive' },
    { metric: 'Churn Rate', value: '4.2%', change: '-1.3%', type: 'positive' },
    { metric: 'Conversion Rate', value: '12.8%', change: '+0.7%', type: 'positive' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics & Reports</h1>
          <p className="text-gray-400 mt-2">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={refreshMetrics}
            disabled={loading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white rounded-lg transition-colors duration-200"
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-white mt-2">$1,247,832</p>
              <p className="text-green-400 text-sm mt-1">+15.3% vs last period</p>
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
              <p className="text-gray-400 text-sm font-medium">Active Users</p>
              <p className="text-2xl font-bold text-white mt-2">8,429</p>
              <p className="text-green-400 text-sm mt-1">+8.2% vs last period</p>
            </div>
            <div className="p-3 bg-slate-700 rounded-lg">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Trades</p>
              <p className="text-2xl font-bold text-white mt-2">47,293</p>
              <p className="text-green-400 text-sm mt-1">+24.7% vs last period</p>
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
              <p className="text-gray-400 text-sm font-medium">Conversion Rate</p>
              <p className="text-2xl font-bold text-white mt-2">12.8%</p>
              <p className="text-green-400 text-sm mt-1">+0.7% vs last period</p>
            </div>
            <div className="p-3 bg-slate-700 rounded-lg">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {selectedMetric === 'users' ? 'User Growth' : 
               selectedMetric === 'trades' ? 'Trading Volume' : 
               'Revenue Trends'}
            </h3>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            >
              <option value="users">Users</option>
              <option value="trades">Trades</option>
              <option value="revenue">Revenue</option>
            </select>
          </div>
          
          <div className="h-80 flex items-center justify-center bg-slate-700 rounded-lg">
            <div className="text-center text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-lg font-medium">Interactive Chart</p>
              <p className="text-sm mt-2">Recharts/Chart.js integration needed</p>
              <div className="mt-4 text-left max-w-md">
                {chartData[selectedMetric].map((point, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{point.date}</span>
                    <span>{selectedMetric === 'revenue' ? `$${point.value.toLocaleString()}` : point.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Assets */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Top Performing Assets</h3>
          <div className="space-y-4">
            {topPerformingAssets.map((asset, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{asset.symbol}</p>
                  <p className="text-gray-400 text-sm">${asset.volume.toLocaleString()} volume</p>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${asset.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                    {asset.change}
                  </p>
                  <p className="text-gray-400 text-sm">{asset.trades} trades</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Insights */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">User Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {userInsights.map((insight, index) => (
            <div key={index} className="text-center">
              <p className="text-gray-400 text-sm font-medium">{insight.metric}</p>
              <p className="text-2xl font-bold text-white mt-2">{insight.value}</p>
              <p className={`text-sm mt-1 ${
                insight.type === 'positive' ? 'text-green-400' : 'text-red-400'
              }`}>
                {insight.change}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Report */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Performance Report</h3>
          <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors duration-200">
            Export Report
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-700 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">System Performance</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Uptime</span>
                <span className="text-green-400">99.9%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Response Time</span>
                <span className="text-white">120ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Error Rate</span>
                <span className="text-white">0.01%</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-700 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Trading Metrics</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Win Rate</span>
                <span className="text-green-400">67.3%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Trade Size</span>
                <span className="text-white">$2,847</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Profit/Loss Ratio</span>
                <span className="text-white">1.45</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-700 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Financial Health</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Cash Flow</span>
                <span className="text-green-400">+24.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Revenue Growth</span>
                <span className="text-white">Monthly</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Profit Margin</span>
                <span className="text-white">18.2%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Reports */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Scheduled Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-white font-medium">Daily Reports</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <span className="text-gray-300">Daily Trading Summary</span>
                <span className="text-green-400 text-sm">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <span className="text-gray-300">Financial Overview</span>
                <span className="text-green-400 text-sm">Active</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-medium">Weekly Reports</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <span className="text-gray-300">User Analytics</span>
                <span className="text-yellow-400 text-sm">Pending</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <span className="text-gray-300">System Performance</span>
                <span className="text-green-400 text-sm">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}