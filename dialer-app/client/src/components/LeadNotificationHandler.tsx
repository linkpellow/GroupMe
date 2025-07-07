import React, { useEffect, useState, useRef } from 'react';
import { useNotification } from '../context/NotificationContext';
import { webSocketService } from '../services/websocketService';

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
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const lastPolledRef = useRef<number>(Date.now());
  const notificationCountRef = useRef<number>(0);
  
  // 1. Set up WebSocket notification listener
  useEffect(() => {
    console.log('[LeadNotification] Component mounted');
    
    const handleNewLeadNotification = (data: NewLeadNotification) => {
      try {
        const { leadId, name, source, isNew } = data.data;
        
        // Check if we've already shown this notification
        const notificationKey = `${leadId}-${data.timestamp}`;
        if (recentNotifications.has(notificationKey)) {
          console.log('[LeadNotification] Skipping duplicate notification:', name);
          return; // Skip duplicate notifications
        }
        
        // Only show notification for new NextGen leads
        if (isNew && source.toLowerCase() === 'nextgen') {
          console.log('[LeadNotification] Showing notification for new NextGen lead:', name);
          
          // Pre-load the sound file for Chrome
          const audio = new Audio('/sounds/Cash app sound.mp3');
          
          // Try to set autoplay policy-friendly attributes
          audio.muted = false;
          audio.volume = 0.3;
          audio.preload = 'auto';
          
          // Force a user interaction if this is Chrome
          if (navigator.userAgent.includes('Chrome')) {
            document.body.addEventListener('click', function playOnce() {
              audio.play().catch(e => console.error('[Sound] Failed to play notification sound:', e));
              document.body.removeEventListener('click', playOnce);
            }, { once: true });
          }
          
          // Show notification with NextGen type - sound will be played by the Notification component
          showNotification(`New NextGen Lead! ${name}`, 'nextgen');
          
          // Increment counter
          notificationCountRef.current++;
          setNotificationCount(notificationCountRef.current);
          
          // Track this notification to prevent duplicates
          recentNotifications.add(notificationKey);
          
          // Remove from tracking after a while to prevent memory leaks
          setTimeout(() => {
            recentNotifications.delete(notificationKey);
          }, 60000);
          
          // For Chrome, also try notification API as a backup
          try {
            if ('Notification' in window && Notification.permission === 'granted') {
              const notification = new Notification('New NextGen Lead!', {
                body: name,
                icon: '/images/nextgen.png',
                silent: true // We'll play our own sound
              });
              
              // Auto-close after 8 seconds
              setTimeout(() => notification.close(), 8000);
            } else if ('Notification' in window && Notification.permission !== 'denied') {
              // Request permission
              Notification.requestPermission();
            }
          } catch (error) {
            console.error('[Notification API] Error:', error);
          }
        }
      } catch (error) {
        console.error('[LeadNotification] Error processing notification:', error);
      }
    };
    
    // Register for WebSocket connection status
    const connectionUnsubscribe = webSocketService.addConnectionStatusListener((connected) => {
      console.log('[LeadNotification] WebSocket connection status:', connected);
      setIsConnected(connected);
    });
    
    // Register for WebSocket notifications
    const notificationUnsubscribe = webSocketService.addMessageListener(
      'new_lead_notification', 
      handleNewLeadNotification
    );
    
    // Register for window message events as legacy fallback (temporary during transition)
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' 
          ? JSON.parse(event.data) 
          : event.data;
        
        if (data?.type === 'new_lead_notification') {
          console.log('[LeadNotification] Received notification via window event');
          handleNewLeadNotification(data);
        }
      } catch (error) {
        // Ignore parsing errors from non-notification messages
      }
    };
    
    window.addEventListener('message', handleWindowMessage);
    
    // Toggle debug mode with Shift+D+N (Debug Notifications)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'D') {
        // Start listening for N key
        const handleNKey = (e2: KeyboardEvent) => {
          if (e2.key === 'N') {
            setShowDebug(prev => !prev);
            console.log('[LeadNotification] Debug mode:', !showDebug);
          }
          window.removeEventListener('keydown', handleNKey);
        };
        window.addEventListener('keydown', handleNKey, { once: true });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      console.log('[LeadNotification] Component unmounting');
      connectionUnsubscribe();
      notificationUnsubscribe();
      window.removeEventListener('message', handleWindowMessage);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotification, recentNotifications, showDebug]);
  
  // 2. Set up fallback polling mechanism when WebSocket is disconnected
  useEffect(() => {
    if (isConnected) {
      return; // No need for polling when WebSocket is connected
    }
    
    console.log('[LeadNotification] Starting fallback polling for disconnected WebSocket');
    
    // Poll every 30 seconds for new leads when WebSocket is disconnected
    const pollInterval = setInterval(async () => {
      try {
        const now = Date.now();
        const lastPolled = lastPolledRef.current;
        lastPolledRef.current = now;
        
        // Fetch leads created since last poll
        const response = await fetch(`/api/leads/recent?since=${lastPolled}&source=NextGen`);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        
        const leads = await response.json();
        console.log(`[LeadNotification] Poll found ${leads.length} leads since last check`);
        
        // Show notifications for any new leads
        leads.forEach((lead: any) => {
          const notificationKey = `${lead._id}-${lead.createdAt}`;
          if (!recentNotifications.has(notificationKey)) {
            console.log('[LeadNotification] Showing notification from polling:', lead.name);
            
            showNotification(`New NextGen Lead! ${lead.name}`, 'nextgen');
            recentNotifications.add(notificationKey);
            
            // Increment counter
            notificationCountRef.current++;
            setNotificationCount(notificationCountRef.current);
            
            setTimeout(() => {
              recentNotifications.delete(notificationKey);
            }, 60000);
          }
        });
      } catch (error) {
        console.error('[LeadNotification] Error polling for notifications:', error);
      }
    }, 30000);
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [isConnected, showNotification, recentNotifications]);
  
  // 3. Handle manual refresh
  const handleRefresh = () => {
    console.log('[LeadNotification] Manual refresh requested');
    webSocketService.checkForNewLeads();
  };
  
  // Build debug panel
  if (showDebug || process.env.NODE_ENV !== 'production') {
    return (
      <>
        <div style={{ 
          position: 'fixed', 
          bottom: 50, 
          right: 10, 
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          background: '#f5f5f5',
          border: '1px solid #ddd',
          zIndex: 9999,
          width: '220px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Notification Status:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              background: isConnected ? '#4CAF50' : '#f44336'
            }}></div>
            <div>{isConnected ? 'Connected' : 'Disconnected'}</div>
          </div>
          <div style={{ marginTop: '4px', fontSize: '11px' }}>Notifications: {notificationCount}</div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            <button 
              onClick={handleRefresh} 
              style={{ 
                padding: '4px 8px', 
                fontSize: '11px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              Check for Leads
            </button>
            <button 
              onClick={() => {
                webSocketService.connect();
              }} 
              style={{ 
                padding: '4px 8px', 
                fontSize: '11px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              Reconnect
            </button>
            <button 
              onClick={() => {
                // Simulate a notification for testing
                const notification = {
                  type: 'new_lead_notification',
                  data: {
                    leadId: `test-${Date.now()}`,
                    name: 'Test Lead',
                    source: 'NextGen',
                    isNew: true
                  },
                  timestamp: new Date().toISOString()
                };
                
                // Send as window message
                window.dispatchEvent(new MessageEvent('message', {
                  data: JSON.stringify(notification)
                }));
              }} 
              style={{ 
                padding: '4px 8px', 
                fontSize: '11px',
                backgroundColor: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              Test Notification
            </button>
          </div>
          <div style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7 }}>
            Press Shift+D+N to hide this panel
          </div>
        </div>
        <div style={{ 
          position: 'fixed', 
          bottom: 10, 
          right: 10, 
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          background: isConnected ? '#4CAF50' : '#f44336',
          color: 'white',
          opacity: 0.7,
          display: showDebug ? 'none' : 'block'
        }}>
          {isConnected ? 'WS Connected' : 'WS Disconnected'}
        </div>
      </>
    );
  }
  
  // Hidden floating button in corner for manual refresh
  return (
    <div 
      onClick={handleRefresh}
      style={{ 
        position: 'fixed', 
        bottom: 10, 
        right: 10, 
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: 'transparent',
        cursor: 'pointer',
        zIndex: 9999,
        opacity: 0 // Hidden unless in debug mode
      }} 
    />
  );
};

export default LeadNotificationHandler; 