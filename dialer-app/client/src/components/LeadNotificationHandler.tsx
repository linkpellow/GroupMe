import React, { useEffect, useState, useRef } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useNotificationSound } from '../context/NotificationSoundContext';
import { webSocketService } from '../services/websocketService';
import { useQueryClient } from '@tanstack/react-query';
import { safeString } from '../utils/safeString';

// Professional System Notification Service
interface SystemNotificationOptions {
  title: string;
  body: string;
  leadId: string;
  leadName: string;
}

class SystemNotificationService {
  private static instance: SystemNotificationService;
  private permissionRequested = false;
  private notificationQueue: SystemNotificationOptions[] = [];

  static getInstance(): SystemNotificationService {
    if (!SystemNotificationService.instance) {
      SystemNotificationService.instance = new SystemNotificationService();
    }
    return SystemNotificationService.instance;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('[SystemNotification] Browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      console.warn('[SystemNotification] Notification permission denied by user');
      return 'denied';
    }

    // Request permission with user-friendly timing
    if (!this.permissionRequested) {
      this.permissionRequested = true;
      
      // Show a friendly prompt first
      const userWantsNotifications = window.confirm(
        '🎉 Get instant notifications for new NextGen leads!\n\nWould you like to enable desktop notifications so you never miss a lead, even when the browser is minimized?'
      );

      if (!userWantsNotifications) {
        return 'denied';
      }

      try {
        const permission = await Notification.requestPermission();
        console.log('[SystemNotification] Permission result:', permission);
        return permission;
      } catch (error) {
        console.error('[SystemNotification] Permission request failed:', error);
        return 'denied';
      }
    }

    return Notification.permission;
  }

  async showNotification(options: SystemNotificationOptions): Promise<void> {
    const permission = await this.requestPermission();
    
    if (permission !== 'granted') {
      console.warn('[SystemNotification] Permission not granted, skipping system notification');
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: '/images/nextgen.png',
        badge: '/images/nextgen.png',
        tag: `nextgen-lead-${options.leadId}`, // Prevents duplicate notifications
        requireInteraction: false, // Allow auto-dismiss
        silent: true, // We handle our own sound
        data: {
          leadId: options.leadId,
          leadName: options.leadName,
          url: window.location.origin
        }
      });

      // Handle notification click - focus window and navigate to leads
      notification.onclick = () => {
        console.log('[SystemNotification] Notification clicked, focusing window');
        
        // Focus the browser window
        if (window.parent) {
          window.parent.focus();
        }
        window.focus();

        // Close the notification
        notification.close();

        // Optional: Navigate to leads page or specific lead
        // You could add navigation logic here if needed
      };

      // Auto-close after 12 seconds for better UX
      setTimeout(() => {
        if (notification) {
          notification.close();
        }
      }, 12000);

      console.log('[SystemNotification] System notification displayed successfully');

    } catch (error) {
      console.error('[SystemNotification] Failed to show notification:', error);
    }
  }
}

const systemNotificationService = SystemNotificationService.getInstance();

// Helper function for easy access
const showSystemNotification = async (options: SystemNotificationOptions): Promise<void> => {
  return systemNotificationService.showNotification(options);
};

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
  const { soundEnabled } = useNotificationSound();
  const queryClient = useQueryClient();
  const [recentNotifications] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const lastPolledRef = useRef<number>(Date.now());
  const notificationCountRef = useRef<number>(0);
  
  const POLL_MS = 3000; // 3-second fallback interval

  // Preload notification audio once
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio('/sounds/Cash app sound.mp3');
      audio.preload = 'auto';
      audio.volume = 0.3;
      audioRef.current = audio;
    }
  }, []);
  
  // Helper to build a fully-shaped placeholder Lead object so renderers never see undefined.
  const createPlaceholderLead = (leadId: string, name: string, source: string) => ({
    _id: leadId,
    name: safeString(name),
    firstName: name.split(' ')[0] || '',
    lastName: name.split(' ').slice(1).join(' '),
    email: '',
    phone: '',
    status: 'New Lead',
    source: safeString(source),
    createdAt: new Date().toISOString(),
  });
  
  // 1. Set up WebSocket notification listener
  useEffect(() => {
    console.log('[LeadNotification] Component mounted');
    
    const handleNewLeadNotification = async (data: NewLeadNotification) => {
      try {
        // Log full payload for debugging
        console.log('[WS] new_lead_notification payload:', JSON.stringify(data, null, 2));
        
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

          if (soundEnabled && audioRef.current) {
            try {
              audioRef.current.currentTime = 0;
              audioRef.current.play();
            } catch (e) {
              console.warn('[Sound] play blocked', e);
            }
          }

          // 1. Trigger dopamine-triggering banner/SFX
          showNotification('New NextGen Lead!', 'nextgen', name);
          
          // 2. Optimistically inject into any cached first-page query to avoid flicker
          const cachedQueries = queryClient.getQueriesData({ queryKey: ['leads'] }) as any[];
          cachedQueries.forEach(([key, cached]) => {
            const cachedAny = cached as any;
            if (!cachedAny || !cachedAny.leads) return;
            const list = cachedAny.leads as any[];
            if (!Array.isArray(list)) return;
            const already = list.find((l) => l._id === leadId);
            if (!already) {
              // Prepend and trim to page limit if available
              const newList = [createPlaceholderLead(leadId, name, source), ...list];
              if (cachedAny.pagination?.limit && newList.length > cachedAny.pagination.limit) {
                newList.pop();
              }
              // Write back
              queryClient.setQueryData(key as any, {
                ...cachedAny,
                leads: newList,
                pagination: cachedAny.pagination
                  ? { ...cachedAny.pagination, total: cachedAny.pagination.total + 1 }
                  : cachedAny.pagination,
              });
            }
          });
          
          // 3. Schedule a silent background refresh after 10 s instead of immediate refetch
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
          }, 10000);
          
          // Increment counter
          notificationCountRef.current++;
          setNotificationCount(notificationCountRef.current);
          
          // Track this notification to prevent duplicates
          recentNotifications.add(notificationKey);
          
          // Remove from tracking after a while to prevent memory leaks
          setTimeout(() => {
            recentNotifications.delete(notificationKey);
          }, 60000);
          
          // Professional system-level notification
          try {
            await showSystemNotification({
              title: '🎉 New NextGen Lead!',
              body: `${name}\nReady to convert! 🚀`,
              leadId,
              leadName: name
            });
          } catch (error) {
            console.error('[System Notification] Error:', error);
          }
        }
      } catch (error) {
        console.error('[LeadNotification] FATAL: Error processing notification:', error);
        // Also log to Sentry or other error reporting service if available
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
  }, [showNotification, recentNotifications, showDebug, queryClient, soundEnabled]);
  
  // 2. Set up fallback polling mechanism when WebSocket is disconnected
  useEffect(() => {
    if (isConnected) {
      return; // No need for polling when WebSocket is connected
    }
    
    console.log(`[LeadNotification] Starting fallback polling every ${POLL_MS}ms for disconnected WebSocket`);
    
    // Poll every POLL_MS when WebSocket is disconnected
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
            
            showNotification('New NextGen Lead!', 'nextgen', lead.name);
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
    }, POLL_MS);
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [isConnected, showNotification, recentNotifications, POLL_MS]);
  
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