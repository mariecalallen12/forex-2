'use client';

/**
 * Notification Context
 * 
 * Manages application notifications and alerts.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  showSuccess: (title: string, message?: string, duration?: number) => void;
  showError: (title: string, message?: string, duration?: number) => void;
  showWarning: (title: string, message?: string, duration?: number) => void;
  showInfo: (title: string, message?: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    // Show toast
    const toastOptions = {
      duration: notification.duration || 4000,
    };

    switch (notification.type) {
      case 'success':
        toast.success(notification.message, toastOptions);
        break;
      case 'error':
        toast.error(notification.message, toastOptions);
        break;
      case 'warning':
        toast(notification.message, { icon: '⚠️', ...toastOptions });
        break;
      case 'info':
        toast(notification.message, toastOptions);
        break;
    }

    // Auto remove after duration
    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 4000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const showSuccess = (title: string, message?: string, duration?: number) => {
    addNotification({
      type: 'success',
      title,
      message: message || title,
      duration,
    });
  };

  const showError = (title: string, message?: string, duration?: number) => {
    addNotification({
      type: 'error',
      title,
      message: message || title,
      duration,
    });
  };

  const showWarning = (title: string, message?: string, duration?: number) => {
    addNotification({
      type: 'warning',
      title,
      message: message || title,
      duration,
    });
  };

  const showInfo = (title: string, message?: string, duration?: number) => {
    addNotification({
      type: 'info',
      title,
      message: message || title,
      duration,
    });
  };

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}