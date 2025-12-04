'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/auth-context';
import { useAdmin } from '../contexts/admin-context';
import { useNotification } from '../contexts/notification-context';

export default function Settings() {
  const { adminUser } = useAuth();
  const { error, setError } = useAdmin();
  const { showSuccess, showError } = useNotification();

  const [activeSection, setActiveSection] = useState<'general' | 'security' | 'trading' | 'notifications' | 'api'>('general');
  const [settings, setSettings] = useState({
    general: {
      platformName: 'Digital Utopia',
      platformUrl: 'https://digitalutopia.com',
      supportEmail: 'support@digitalutopia.com',
      timezone: 'UTC',
      language: 'en',
      maintenanceMode: false,
      allowRegistrations: true
    },
    security: {
      twoFactorRequired: true,
      sessionTimeout: 30,
      passwordMinLength: 8,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      requireEmailVerification: true,
      allowSocialLogin: true
    },
    trading: {
      minimumDeposit: 100,
      maximumDeposit: 100000,
      minimumWithdrawal: 50,
      maximumWithdrawal: 50000,
      tradingFee: 0.1,
      withdrawalFee: 2.5,
      leverageLimit: 100,
      maxOpenPositions: 10,
      autoApproval: false
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      dailyReports: true,
      weeklyReports: true,
      monthlyReports: false,
      alertThresholds: {
        largeTrades: 10000,
        systemAlerts: true,
        securityAlerts: true
      }
    },
    api: {
      rateLimit: 1000,
      enableWebhooks: true,
      webhookUrl: '',
      apiVersion: 'v1',
      enableCORS: true,
      allowedOrigins: ['https://app.digitalutopia.com', 'https://admin.digitalutopia.com']
    }
  });

  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const handleSettingChange = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value
      }
    }));
    setUnsavedChanges(true);
  };

  const handleNestedSettingChange = (section: string, parent: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [parent]: {
          ...(prev[section as keyof typeof prev] as any)[parent],
          [key]: value
        }
      }
    }));
    setUnsavedChanges(true);
  };

  const saveSettings = async () => {
    try {
      // In real implementation, save to database
      console.log('Saving settings:', settings);
      showSuccess('Settings saved successfully');
      setUnsavedChanges(false);
    } catch (err) {
      showError('Failed to save settings');
    }
  };

  const resetSettings = () => {
    setUnsavedChanges(false);
    showInfo('Settings reset to saved values');
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Platform Name</label>
          <input
            type="text"
            value={settings.general.platformName}
            onChange={(e) => handleSettingChange('general', 'platformName', e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Platform URL</label>
          <input
            type="url"
            value={settings.general.platformUrl}
            onChange={(e) => handleSettingChange('general', 'platformUrl', e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Support Email</label>
          <input
            type="email"
            value={settings.general.supportEmail}
            onChange={(e) => handleSettingChange('general', 'supportEmail', e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Timezone</label>
          <select
            value={settings.general.timezone}
            onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Asia/Tokyo">Tokyo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Default Language</label>
          <select
            value={settings.general.language}
            onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">Maintenance Mode</h4>
            <p className="text-gray-400 text-sm">Enable to show maintenance page to users</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.general.maintenanceMode}
              onChange={(e) => handleSettingChange('general', 'maintenanceMode', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">Allow New Registrations</h4>
            <p className="text-gray-400 text-sm">Control if new users can register</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.general.allowRegistrations}
              onChange={(e) => handleSettingChange('general', 'allowRegistrations', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Session Timeout (minutes)</label>
          <input
            type="number"
            value={settings.security.sessionTimeout}
            onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Minimum Password Length</label>
          <input
            type="number"
            value={settings.security.passwordMinLength}
            onChange={(e) => handleSettingChange('security', 'passwordMinLength', parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Max Login Attempts</label>
          <input
            type="number"
            value={settings.security.maxLoginAttempts}
            onChange={(e) => handleSettingChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Lockout Duration (minutes)</label>
          <input
            type="number"
            value={settings.security.lockoutDuration}
            onChange={(e) => handleSettingChange('security', 'lockoutDuration', parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        {[
          { key: 'twoFactorRequired', label: 'Require Two-Factor Authentication', desc: 'All users must enable 2FA' },
          { key: 'requireEmailVerification', label: 'Require Email Verification', desc: 'Users must verify their email address' },
          { key: 'allowSocialLogin', label: 'Allow Social Login', desc: 'Enable login with Google, Facebook, etc.' }
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">{item.label}</h4>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.security[item.key as keyof typeof settings.security] as boolean}
                onChange={(e) => handleSettingChange('security', item.key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTradingSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Minimum Deposit ($)</label>
          <input
            type="number"
            value={settings.trading.minimumDeposit}
            onChange={(e) => handleSettingChange('trading', 'minimumDeposit', parseFloat(e.target.value))}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Maximum Deposit ($)</label>
          <input
            type="number"
            value={settings.trading.maximumDeposit}
            onChange={(e) => handleSettingChange('trading', 'maximumDeposit', parseFloat(e.target.value))}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Minimum Withdrawal ($)</label>
          <input
            type="number"
            value={settings.trading.minimumWithdrawal}
            onChange={(e) => handleSettingChange('trading', 'minimumWithdrawal', parseFloat(e.target.value))}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Maximum Withdrawal ($)</label>
          <input
            type="number"
            value={settings.trading.maximumWithdrawal}
            onChange={(e) => handleSettingChange('trading', 'maximumWithdrawal', parseFloat(e.target.value))}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Trading Fee (%)</label>
          <input
            type="number"
            step="0.01"
            value={settings.trading.tradingFee}
            onChange={(e) => handleSettingChange('trading', 'tradingFee', parseFloat(e.target.value))}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Withdrawal Fee ($)</label>
          <input
            type="number"
            step="0.01"
            value={settings.trading.withdrawalFee}
            onChange={(e) => handleSettingChange('trading', 'withdrawalFee', parseFloat(e.target.value))}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Maximum Leverage</label>
          <input
            type="number"
            value={settings.trading.leverageLimit}
            onChange={(e) => handleSettingChange('trading', 'leverageLimit', parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Max Open Positions</label>
          <input
            type="number"
            value={settings.trading.maxOpenPositions}
            onChange={(e) => handleSettingChange('trading', 'maxOpenPositions', parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-white font-medium">Automatic Trade Approval</h4>
          <p className="text-gray-400 text-sm">Automatically approve trades below threshold</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.trading.autoApproval}
            onChange={(e) => handleSettingChange('trading', 'autoApproval', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">System Settings</h1>
          <p className="text-gray-400 mt-2">Configure platform settings and preferences</p>
        </div>
        <div className="flex items-center space-x-3">
          {unsavedChanges && (
            <>
              <button
                onClick={resetSettings}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200"
              >
                Reset
              </button>
              <button
                onClick={saveSettings}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors duration-200"
              >
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Settings Navigation */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="border-b border-slate-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'general', label: 'General', icon: '⚙️' },
              { id: 'security', label: 'Security', icon: '🔒' },
              { id: 'trading', label: 'Trading', icon: '📈' },
              { id: 'notifications', label: 'Notifications', icon: '🔔' },
              { id: 'api', label: 'API', icon: '🔧' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeSection === tab.id
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeSection === 'general' && renderGeneralSettings()}
          {activeSection === 'security' && renderSecuritySettings()}
          {activeSection === 'trading' && renderTradingSettings()}
          {activeSection === 'notifications' && (
            <div className="text-center text-gray-400 py-12">
              <p>Notification settings component - Placeholder</p>
            </div>
          )}
          {activeSection === 'api' && (
            <div className="text-center text-gray-400 py-12">
              <p>API settings component - Placeholder</p>
            </div>
          )}
        </div>
      </div>

      {/* System Information */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-gray-400 text-sm">Version</p>
            <p className="text-white font-medium">v2.0.0</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Build Date</p>
            <p className="text-white font-medium">2024-12-05</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Environment</p>
            <p className="text-white font-medium">Production</p>
          </div>
        </div>
      </div>
    </div>
  );
}