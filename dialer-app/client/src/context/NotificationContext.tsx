import React, { createContext, useContext, useState, useCallback } from 'react';
import Notification from '../components/Notification';

interface NotificationContextType {
  showNotification: (
    message: string, 
    notificationType?: 'nextgen' | 'marketplace', 
    leadName?: string,
    leadPhone?: string,
    onCallLead?: (phone: string, name: string) => void
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationItem {
  id: string;
  message: string;
  notificationType?: 'nextgen' | 'marketplace';
  leadName?: string;
  leadPhone?: string;
  onCallLead?: (phone: string, name: string) => void;
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const showNotification = useCallback((
    message: string, 
    notificationType?: 'nextgen' | 'marketplace', 
    leadName?: string,
    leadPhone?: string,
    onCallLead?: (phone: string, name: string) => void
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { 
      id, 
      message, 
      notificationType, 
      leadName,
      leadPhone,
      onCallLead
    }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          onClose={() => removeNotification(notification.id)}
          notificationType={notification.notificationType}
          leadName={notification.leadName}
          leadPhone={notification.leadPhone}
          onCallLead={notification.onCallLead}
        />
      ))}
    </NotificationContext.Provider>
  );
};
