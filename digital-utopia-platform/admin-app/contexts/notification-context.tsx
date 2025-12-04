'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Notification, NotificationType } from '../../../shared/types';

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (message: string, type: NotificationType, duration?: number) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (message: string, type: NotificationType, duration = 5000) => {
    const id = Date.now().toString();
    const notification: Notification = {
      id,
      message,
      type,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  const showSuccess = (message: string) => {
    return showNotification(message, 'success');
  };

  const showError = (message: string) => {
    return showNotification(message, 'error');
  };

  const showWarning = (message: string) => {
    return showNotification(message, 'warning');
  };

  const showInfo = (message: string) => {
    return showNotification(message, 'info');
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      showNotification,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      removeNotification,
      clearAllNotifications
    }}>
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