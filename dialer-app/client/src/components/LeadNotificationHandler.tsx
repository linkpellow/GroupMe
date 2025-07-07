import React, { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationContext';

interface NewLeadNotification {
  type: 'new_lead_notification';
  data: {
    leadId: string;
    name: string;
    source: string;
    isNew: boolean;
  };
  timestamp: string;
}

/**
 * Component that listens for new lead notifications from WebSockets
 * and shows visual notifications with sound
 */
const LeadNotificationHandler: React.FC = () => {
  const { showNotification } = useNotification();
  const [recentNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleNewLeadNotification = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' 
          ? JSON.parse(event.data) 
          : event.data;

        // Check if this is a new lead notification
        if (data?.type === 'new_lead_notification') {
          const notification = data as NewLeadNotification;
          const { leadId, name, source, isNew } = notification.data;

          // Check if we've already shown this notification
          const notificationKey = `${leadId}-${notification.timestamp}`;
          if (recentNotifications.has(notificationKey)) {
            return; // Skip duplicate notifications
          }

          // Only show notification for new NextGen leads
          if (isNew && source.toLowerCase() === 'nextgen') {
            console.log('Showing notification for new NextGen lead:', name);
            
            // Show notification with NextGen type - sound will be played by the Notification component
            showNotification(`New NextGen Lead! ${name}`, 'nextgen');
            
            // Track this notification to prevent duplicates
            recentNotifications.add(notificationKey);
            
            // Remove from tracking after a while to prevent memory leaks
            setTimeout(() => {
              recentNotifications.delete(notificationKey);
            }, 60000);
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    // Add event listener for WebSocket messages
    window.addEventListener('message', handleNewLeadNotification);

    return () => {
      // Clean up
      window.removeEventListener('message', handleNewLeadNotification);
    };
  }, [showNotification, recentNotifications]);

  // This component doesn't render anything
  return null;
};

export default LeadNotificationHandler; 