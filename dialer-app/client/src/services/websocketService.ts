import { AuthToken } from '../services/authToken.service';

interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
}

type MessageHandler = (data: any) => void;

// Interface for storing notification history
interface StoredNotification {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  displayed: boolean;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimer: any = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private connectionStatusListeners: Set<(connected: boolean) => void> = new Set();
  private isConnected: boolean = false;
  private pendingMessages: WebSocketMessage[] = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private heartbeatInterval: any = null;
  private lastHeartbeatResponse: number = 0;
  private recentNotifications: StoredNotification[] = [];
  private missedNotificationsChecked: boolean = false;
  
  constructor() {
    // Load recent notifications from storage
    this.loadRecentNotifications();
    
    // Check for existing token on init
    const token = localStorage.getItem('token');
    if (token) {
      this.connect();
    }
    
    // Listen for auth events
    window.addEventListener('auth_token_changed', (e: any) => {
      if (e.detail?.token) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
    
    // Add page visibility change listener
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Create a heartbeat to check connection health
    this.startHeartbeat();
  }
  
  public connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }
    
    this.disconnect(); // Clean up any existing connection
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.NODE_ENV === 'production' 
      ? window.location.host 
      : `${window.location.hostname}:3005`;
    
    console.log(`[WebSocket] Connecting to ${wsProtocol}//${wsHost}`);
    
    try {
      this.socket = new WebSocket(`${wsProtocol}//${wsHost}`);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('[WebSocket] Connection error', error);
      this.scheduleReconnect();
    }
  }
  
  public disconnect(): void {
    if (this.socket) {
      // Remove all event listeners
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      
      // Close the connection if it's open
      if (this.socket.readyState === WebSocket.OPEN || 
          this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      
      this.socket = null;
    }
    
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.setConnected(false);
  }
  
  public addMessageListener(type: string, handler: MessageHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(handler);
    
    // Check for missed notifications of this type immediately
    if (type === 'new_lead_notification' && !this.missedNotificationsChecked) {
      this.checkForMissedNotifications();
    }
    
    // Return unsubscribe function
    return () => {
      const typeListeners = this.listeners.get(type);
      if (typeListeners) {
        typeListeners.delete(handler);
        if (typeListeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }
  
  public addConnectionStatusListener(handler: (connected: boolean) => void): () => void {
    this.connectionStatusListeners.add(handler);
    
    // Immediately invoke with current status
    handler(this.isConnected);
    
    // Return unsubscribe function
    return () => {
      this.connectionStatusListeners.delete(handler);
    };
  }
  
  public isWebSocketConnected(): boolean {
    return this.isConnected;
  }
  
  // Method to manually check for notifications
  public checkForNewLeads(): void {
    console.log('[WebSocket] Manually checking for new leads');
    this.checkForMissedNotifications(true);
  }
  
  private handleOpen(): void {
    console.log('[WebSocket] Connected');
    this.setConnected(true);
    this.reconnectAttempts = 0;
    this.lastHeartbeatResponse = Date.now();
    
    // Authenticate
    const token = localStorage.getItem('token');
    if (token && this.socket) {
      this.socket.send(JSON.stringify({
        type: 'authenticate',
        token
      }));
      
      console.log('[WebSocket] Sent authentication message');
    }
    
    // Send any pending messages
    this.sendPendingMessages();
    
    // Check for missed notifications
    setTimeout(() => this.checkForMissedNotifications(), 2000);
  }
  
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('[WebSocket] Received message:', data);
      
      // Update heartbeat timestamp on any message
      this.lastHeartbeatResponse = Date.now();
      
      // Handle authentication success/failure
      if (data.type === 'auth_success') {
        console.log('[WebSocket] Authentication successful');
      } else if (data.type === 'auth_failure') {
        console.error('[WebSocket] Authentication failed:', data.message);
        // Don't reconnect on auth failure
        this.disconnect();
        return;
      }
      
      // Store notification if it's a new lead notification
      if (data.type === 'new_lead_notification') {
        this.storeNotification(data);
      }
      
      // Forward to registered listeners
      if (data.type && this.listeners.has(data.type)) {
        const typeListeners = this.listeners.get(data.type);
        if (typeListeners) {
          typeListeners.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error(`[WebSocket] Error in listener for ${data.type}:`, error);
            }
          });
        }
      }
      
      // Forward as window message for backward compatibility
      window.dispatchEvent(new MessageEvent('message', { 
        data: event.data 
      }));
      
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error, event.data);
    }
  }
  
  private handleClose(event: CloseEvent): void {
    console.log(`[WebSocket] Connection closed: ${event.code} ${event.reason}`);
    this.setConnected(false);
    this.scheduleReconnect();
  }
  
  private handleError(event: Event): void {
    console.error('[WebSocket] Error:', event);
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    // Exponential backoff with max attempts
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000);
      console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    } else {
      console.error(`[WebSocket] Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
    }
  }
  
  private setConnected(connected: boolean): void {
    if (this.isConnected !== connected) {
      this.isConnected = connected;
      this.connectionStatusListeners.forEach(handler => {
        try {
          handler(connected);
        } catch (error) {
          console.error('[WebSocket] Error in connection status listener:', error);
        }
      });
      
      // If we just connected, check for missed notifications
      if (connected) {
        this.checkForMissedNotifications();
      }
    }
  }
  
  private sendPendingMessages(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      while (this.pendingMessages.length > 0) {
        const message = this.pendingMessages.shift();
        if (message) {
          this.socket.send(JSON.stringify(message));
          console.log('[WebSocket] Sent pending message:', message);
        }
      }
    }
  }
  
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      console.log('[WebSocket] Page became visible, checking for missed notifications');
      this.checkForMissedNotifications();
      
      // Also reconnect if needed
      if (!this.isConnected) {
        console.log('[WebSocket] Reconnecting due to page becoming visible');
        this.connect();
      }
    }
  }
  
  private startHeartbeat(): void {
    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Check connection health every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      // If we haven't heard from the server in 60 seconds and we think we're connected
      if (this.isConnected && now - this.lastHeartbeatResponse > 60000) {
        console.log('[WebSocket] No heartbeat response, reconnecting');
        this.disconnect();
        this.connect();
      }
      
      // If we're connected, send a ping
      if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('[WebSocket] Error sending ping:', error);
        }
      }
    }, 30000);
  }
  
  private storeNotification(notification: any): void {
    // Store only new lead notifications
    if (notification.type !== 'new_lead_notification') {
      return;
    }
    
    // Create a unique ID
    const id = `${notification.data.leadId}-${notification.timestamp}`;
    
    // Check if we already have this notification
    if (this.recentNotifications.some(n => n.id === id)) {
      return;
    }
    
    // Add to recent notifications
    this.recentNotifications.push({
      id,
      type: notification.type,
      data: notification.data,
      timestamp: notification.timestamp,
      displayed: false
    });
    
    // Keep only last 50 notifications
    if (this.recentNotifications.length > 50) {
      this.recentNotifications.shift();
    }
    
    // Save to storage
    this.saveRecentNotifications();
  }
  
  private loadRecentNotifications(): void {
    try {
      const stored = localStorage.getItem('recentNotifications');
      if (stored) {
        this.recentNotifications = JSON.parse(stored);
        console.log(`[WebSocket] Loaded ${this.recentNotifications.length} stored notifications`);
      }
    } catch (error) {
      console.error('[WebSocket] Error loading stored notifications:', error);
      this.recentNotifications = [];
    }
  }
  
  private saveRecentNotifications(): void {
    try {
      localStorage.setItem('recentNotifications', JSON.stringify(this.recentNotifications));
    } catch (error) {
      console.error('[WebSocket] Error saving notifications:', error);
    }
  }
  
  private async checkForMissedNotifications(forceRefresh = false): Promise<void> {
    if (!forceRefresh && this.missedNotificationsChecked) {
      return; // Don't check multiple times unless forced
    }
    
    this.missedNotificationsChecked = true;
    console.log('[WebSocket] Checking for missed notifications');
    
    // First, show any unseen notifications from storage
    let unseenCount = 0;
    this.recentNotifications.forEach(notification => {
      if (!notification.displayed && notification.type === 'new_lead_notification') {
        // Mark as displayed
        notification.displayed = true;
        unseenCount++;
        
        // Forward to any registered listeners
        if (this.listeners.has('new_lead_notification')) {
          const listeners = this.listeners.get('new_lead_notification');
          if (listeners) {
            listeners.forEach(listener => {
              try {
                listener({
                  type: notification.type,
                  data: notification.data,
                  timestamp: notification.timestamp
                });
              } catch (error) {
                console.error('[WebSocket] Error forwarding stored notification:', error);
              }
            });
          }
        }
      }
    });
    
    // Update storage if we showed any notifications
    if (unseenCount > 0) {
      console.log(`[WebSocket] Displayed ${unseenCount} unseen notifications from storage`);
      this.saveRecentNotifications();
    }
    
    // Then query API for any recent leads we might have missed
    if (forceRefresh) {
      try {
        const lastCheck = this.getLastCheckTimestamp();
        const response = await fetch(`/api/leads/recent?since=${lastCheck}&source=NextGen`);
        
        if (response.ok) {
          const leads = await response.json();
          console.log(`[WebSocket] API returned ${leads.length} recent leads`);
          
          // Forward these as notifications if they're not already in our list
          leads.forEach(lead => {
            const leadId = lead._id;
            const existingNotification = this.recentNotifications.find(n => 
              n.data.leadId === leadId
            );
            
            if (!existingNotification) {
              console.log(`[WebSocket] Found new lead via API polling: ${lead.name}`);
              
              const notification = {
                type: 'new_lead_notification',
                data: {
                  leadId: lead._id,
                  name: lead.name,
                  source: lead.source,
                  isNew: true
                },
                timestamp: lead.createdAt || new Date().toISOString()
              };
              
              // Store it
              this.storeNotification(notification);
              
              // Forward to listeners
              if (this.listeners.has('new_lead_notification')) {
                const listeners = this.listeners.get('new_lead_notification');
                if (listeners) {
                  listeners.forEach(listener => {
                    try {
                      listener(notification);
                    } catch (error) {
                      console.error('[WebSocket] Error forwarding API notification:', error);
                    }
                  });
                }
              }
            }
          });
        } else {
          console.error('[WebSocket] Error fetching recent leads:', response.statusText);
        }
      } catch (error) {
        console.error('[WebSocket] Error checking for missed leads:', error);
      }
    }
    
    // Update last check timestamp
    this.updateLastCheckTimestamp();
  }
  
  private getLastCheckTimestamp(): number {
    const stored = localStorage.getItem('lastNotificationCheck');
    if (stored) {
      return parseInt(stored, 10);
    }
    // Default to 5 minutes ago
    return Date.now() - 5 * 60 * 1000;
  }
  
  private updateLastCheckTimestamp(): void {
    localStorage.setItem('lastNotificationCheck', Date.now().toString());
  }
}

// Singleton instance
export const webSocketService = new WebSocketService(); 