import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import axiosInstance from "../api/axiosInstance";
import { clearAllAuthData } from "../utils/clearAuthData";

interface GroupMeMessage {
  messageId: string;
  groupId: string;
  groupName: string;
  senderId: string;
  senderName: string;
  avatarUrl: string;
  text: string;
  attachments: Array<any>;
  createdAt: Date;
  system: boolean;
}

interface GroupMeGroup {
  groupId: string;
  groupName: string;
  botId: string;
  enabled: boolean;
  displayOrder: number;
  displayInDashboard: boolean;
  image_url?: string;
  last_message?: {
    id: string;
    created_at: number;
    user_id: string;
    name: string;
    text: string;
    avatar_url?: string;
    attachments: any[];
  };
  messages_count?: number;
}

interface GroupMeConfig {
  accessToken: string;
  groups: Record<string, string>; // groupId -> groupName
}

interface GroupPreferences {
  pinned: boolean;
  notifications: boolean;
}

interface GroupMeContextType {
  config: GroupMeConfig | null;
  loading: boolean;
  error: string | null;
  saveConfig: (config: GroupMeConfig) => Promise<void>;
  refreshConfig: () => Promise<void>;
  groups: GroupMeGroup[];
  activeGroupId: string | null;
  messages: Record<string, GroupMeMessage[]>;
  isLoading: boolean;
  sendMessage: (groupId: string, text: string) => Promise<void>;
  fetchMessages: (groupId: string) => Promise<void>;
  setActiveGroupId: (groupId: string | null) => void;
  refreshGroups: () => Promise<void>;
  groupPreferences: Record<string, GroupPreferences>;
  togglePinned: (groupId: string) => void;
  toggleNotifications: (groupId: string) => void;
  isPinned: (groupId: string) => boolean;
  hasNotifications: (groupId: string) => boolean;
  isWebSocketConnected: boolean;
}

const GroupMeContext = createContext<GroupMeContextType | undefined>(undefined);

const DEFAULT_GROUP_PREFERENCES: GroupPreferences = {
  pinned: false,
  notifications: false,
};

export const GroupMeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [config, setConfig] = useState<GroupMeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupMeGroup[]>([]);
  const [messages, setMessages] = useState<Record<string, GroupMeMessage[]>>(
    {},
  );
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [groupPreferences, setGroupPreferences] = useState<
    Record<string, GroupPreferences>
  >({});
  const [isWebSocketConnected, setIsWebSocketConnected] =
    useState<boolean>(false);
  const webSocketRef = useRef<WebSocket | null>(null);

  const refreshConfig = useCallback(async () => {
    console.log("GroupMeContext: refreshConfig called");
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get("/api/groupme/config");
      if (response.data && response.data.accessToken) {
        setConfig(response.data);
        localStorage.setItem("groupme_config", JSON.stringify(response.data));
      } else {
        const savedConfig = localStorage.getItem("groupme_config");
        if (savedConfig) setConfig(JSON.parse(savedConfig));
        else setConfig(null);
      }
    } catch (err: any) {
      // Handle 401 gracefully - this is expected when GroupMe isn't connected
      if (err.response?.status === 401) {
        console.log("GroupMeContext: No GroupMe config found (401) - this is normal if not connected");
        setConfig(null);
        localStorage.removeItem("groupme_config");
      } else {
        console.error("Error fetching GroupMe config:", err);
        setError("Failed to load GroupMe configuration");
        const savedConfig = localStorage.getItem("groupme_config");
        if (savedConfig) setConfig(JSON.parse(savedConfig));
        else setConfig(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshGroups = useCallback(async () => {
    if (!config || !config.accessToken) {
      // setError('Cannot refresh groups: Access token not available.'); // Potentially too noisy
      console.log("GroupMeContext: refreshGroups - No token, skipping fetch.");
      setGroups([]); // Clear groups if no token
      return;
    }
    console.log("GroupMeContext: refreshGroups called");
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/api/groupme/groups");
      console.log("GroupMeContext: Groups response received:", response.data);
      
      // Handle different response formats
      let groupsData = [];
      
      if (response.data && response.data.success && response.data.data) {
        // Handle wrapped response format
        groupsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        // Handle direct array format
        groupsData = response.data;
      }
      
      // Map the data to ensure consistent format
      const formattedGroups = groupsData.map((group: any) => ({
        groupId: group.groupId || group.id,
        groupName: group.groupName || group.name,
        image_url: group.image_url,
        last_message: group.last_message,
        messages_count: group.messages_count
      }));
      
      console.log("GroupMeContext: Formatted groups:", formattedGroups);
      setGroups(formattedGroups);
    } catch (err) {
      console.error("Error fetching GroupMe groups:", err);
      setError("Failed to load GroupMe groups.");
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  }, [config, axiosInstance]);

  const fetchMessages = useCallback(
    async (groupId: string) => {
      if (!config || !config.accessToken) {
        console.log(
          "GroupMeContext: fetchMessages - No token, skipping fetch for group:",
          groupId,
        );
        return;
      }

      console.log(`GroupMeContext: fetchMessages called for group ${groupId}`);
      setIsLoading(true);

      try {
        // Generate a unique timestamp for proper cache busting
        const timestamp = Date.now();

        // Request with parameters to ensure newest messages and prevent caching
        const response = await axiosInstance.get(
          `/api/groupme/groups/${groupId}/messages`,
          {
            params: {
              limit: 100, // Request more messages for better user experience
              before_id: null, // Ensures we get the most recent messages
              _: timestamp, // Cache busting parameter
            },
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          },
        );

        if (
          response.data &&
          response.data.success &&
          Array.isArray(response.data.data.messages)
        ) {
          console.log(
            `GroupMeContext: Raw messages received for group ${groupId}, count:`,
            response.data.data.messages.length,
          );

          // Sort messages by timestamp, newest first, with consistent timestamp normalization
          const sortedMessages = [...response.data.data.messages].sort(
            (a, b) => {
              // Normalize timestamps to always be in milliseconds
              const getTimestamp = (msg: any) => {
                if (msg.created_at) {
                  // Convert seconds to milliseconds if needed (GroupMe sometimes uses seconds)
                  return typeof msg.created_at === "number"
                    ? msg.created_at > 9999999999
                      ? msg.created_at
                      : msg.created_at * 1000
                    : new Date(msg.created_at).getTime();
                }
                if (msg.createdAt) {
                  return new Date(msg.createdAt).getTime();
                }
                return 0; // Fallback
              };

              const timeA = getTimestamp(a);
              const timeB = getTimestamp(b);

              return timeB - timeA; // Sort newest first
            },
          );

          // Log message range for debugging
          if (sortedMessages.length > 0) {
            const firstMsg = sortedMessages[0];
            const lastMsg = sortedMessages[sortedMessages.length - 1];
            const firstTime = new Date(
              firstMsg.created_at || firstMsg.createdAt,
            ).toLocaleString();
            const lastTime = new Date(
              lastMsg.created_at || lastMsg.createdAt,
            ).toLocaleString();

            console.log(`GroupMeContext: Message range for ${groupId}:`, {
              newest: firstTime,
              oldest: lastTime,
              count: sortedMessages.length,
            });
          }

          // Update messages state atomically to ensure consistent rendering
          setMessages((prev) => {
            // Log message count changes
            const prevCount = prev[groupId]?.length || 0;
            console.log(
              `GroupMeContext: Updating messages for ${groupId}: was ${prevCount}, now ${sortedMessages.length}`,
            );

            return { ...prev, [groupId]: sortedMessages };
          });
        } else {
          console.log(
            `GroupMeContext: No valid messages received for group ${groupId}`,
          );
          setMessages((prev) => ({ ...prev, [groupId]: [] }));
        }
      } catch (err) {
        console.error(
          `GroupMeContext: Error fetching messages for group ${groupId}:`,
          err,
        );
        setError("Failed to load messages");
        setMessages((prev) => ({ ...prev, [groupId]: [] }));
      } finally {
        setIsLoading(false);
      }
    },
    [config, axiosInstance],
  );

  const saveConfig = useCallback(async (newConfig: GroupMeConfig) => {
    console.log("GroupMeContext: saveConfig called");
    setIsLoading(true);
    setError(null);
    try {
      await axiosInstance.post("/api/groupme/config", newConfig);
      setConfig(newConfig);
      localStorage.setItem("groupme_config", JSON.stringify(newConfig));
      // After saving, refresh groups as the token might allow access to different groups
      // await refreshGroups(); // Calling this can be problematic if config isn't updated yet
    } catch (err) {
      console.error("Error saving GroupMe config:", err);
      setError("Failed to save GroupMe configuration");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []); // refreshGroups removed to avoid potential loop

  const sendMessage = useCallback(
    async (groupId: string, text: string) => {
      if (!config || !config.accessToken || !text.trim()) {
        console.log("GroupMeContext: sendMessage - Prerequisites not met.");
        return;
      }
      console.log(
        `GroupMeContext: sendMessage to group ${groupId} with text: "${text}"`,
      );
      setIsLoading(true); // Indicate loading state
      try {
        // Actual send logic
        await axiosInstance.post(`/api/groupme/groups/${groupId}/messages`, {
          text,
        });
        console.log(`GroupMeContext: Message sent to group ${groupId}`);

        // Optimistically add or wait for Faye, for now, explicitly fetch
        await fetchMessages(groupId);
      } catch (err) {
        console.error(`Error sending message to group ${groupId}:`, err);
        setError("Failed to send message.");
        // Potentially re-throw or handle UI feedback for the error
      } finally {
        setIsLoading(false);
      }
    },
    [config, fetchMessages, axiosInstance],
  ); // Added axiosInstance to dependencies

  // WebSocket connection logic
  useEffect(() => {
    const token = localStorage.getItem("token");
    
    // Don't connect if no token or if already connected
    if (!token || webSocketRef.current?.readyState === WebSocket.OPEN || webSocketRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    // Use ws:// for local development, wss:// for production
    const wsProtocol =
      window.location.protocol === "https:" ? "wss://" : "ws://";
    // If running locally on Vite (5173) we still want to hit the API/WebSocket on 3001
    const host = window.location.hostname;
    const wsPort =
      process.env.NODE_ENV === "production" ? window.location.port : "3001";
    const wsUrl = `${wsProtocol}${host}:${wsPort}`;

    console.log("GroupMeContext: Attempting to connect to WebSocket at", wsUrl);
    
    let reconnectTimeout: NodeJS.Timeout;
    let isIntentionallyClosed = false;
    
    const connectWebSocket = () => {
      if (isIntentionallyClosed || webSocketRef.current?.readyState === WebSocket.OPEN) {
        return;
      }
      
      const ws = new WebSocket(wsUrl);
      webSocketRef.current = ws;

      ws.onopen = () => {
        console.log("GroupMeContext: WebSocket connection established.");
        setIsWebSocketConnected(true);
        // Authenticate the WebSocket connection
        const authToken = localStorage.getItem("token");
        if (authToken) {
          ws.send(JSON.stringify({ type: "authenticate", token: authToken }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const received = JSON.parse(event.data as string);
          console.log("GroupMeContext: WebSocket message received:", received);

          if (received.type === "NEW_GROUPME_MESSAGE") {
            const newMessage: GroupMeMessage = received.payload;
            setMessages((prevMessages) => {
              const groupMessages = prevMessages[newMessage.groupId] || [];
              // Add new message and prevent duplicates, then sort
              const updatedMessages = [
                newMessage,
                ...groupMessages.filter(
                  (msg) => msg.messageId !== newMessage.messageId,
                ),
              ].sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              );
              return { ...prevMessages, [newMessage.groupId]: updatedMessages };
            });
            // Optionally, if this message is for the active group and the user is viewing it,
            // you might want to trigger a UI notification or scroll.
          } else if (received.type === "GROUP_UPDATE") {
            // Handle group updates (e.g., new group, name change)
            console.log("GroupMeContext: Received GROUP_UPDATE");
            refreshGroups(); // Re-fetch all groups for simplicity, or handle specific update
          } else if (received.type === "auth_success") {
            console.log("GroupMeContext: WebSocket authenticated successfully.");
          } else if (received.type === "auth_failure") {
            console.warn(
              "GroupMeContext: WebSocket authentication failed:",
              received.message,
              received.code,
            );
            
            if (received.code === "TOKEN_MISMATCH" || received.code === "INVALID_TOKEN") {
              console.warn("JWT token mismatch detected (dev mode safeguard)");
              if (process.env.NODE_ENV === "production") {
                clearAllAuthData();
                window.location.href = "/login";
              }
            }
            
            // Don't reconnect on auth failure
            isIntentionallyClosed = true;
          }

          // Forward notesUpdated events globally so other hooks/components can consume
          if (received && received.type === 'LEAD_NOTES_UPDATED') {
            window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(received) }));
          }
        } catch (e) {
          console.error("GroupMeContext: Error processing WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        console.log("GroupMeContext: WebSocket connection closed.");
        setIsWebSocketConnected(false);
        webSocketRef.current = null;
        
        // Only attempt reconnect if not intentionally closed
        if (!isIntentionallyClosed) {
          reconnectTimeout = setTimeout(() => {
            console.log("GroupMeContext: Attempting to reconnect...");
            connectWebSocket();
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error("GroupMeContext: WebSocket error:", error);
        // No need to set isWebSocketConnected to false here, onclose will handle it.
      };
    };

    // Initial connection
    connectWebSocket();

    return () => {
      isIntentionallyClosed = true;
      clearTimeout(reconnectTimeout);
      if (
        webSocketRef.current &&
        webSocketRef.current.readyState === WebSocket.OPEN
      ) {
        console.log("GroupMeContext: Closing WebSocket connection on unmount.");
        webSocketRef.current.close();
      }
      webSocketRef.current = null;
    };
  }, []); // Run once on mount

  // Initial config load
  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  // Effect to refresh groups when config (especially accessToken) changes
  useEffect(() => {
    if (config && config.accessToken) {
      console.log(
        "GroupMeContext: Config updated with accessToken, calling refreshGroups.",
      );
      refreshGroups();
    }
  }, [config, refreshGroups]);

  // Load preferences from localStorage on init
  useEffect(() => {
    const savedPreferences = localStorage.getItem("groupme_preferences");
    if (savedPreferences) {
      try {
        setGroupPreferences(JSON.parse(savedPreferences));
      } catch (err) {
        console.error(
          "Error loading GroupMe preferences from localStorage:",
          err,
        );
      }
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (Object.keys(groupPreferences).length > 0) {
      localStorage.setItem(
        "groupme_preferences",
        JSON.stringify(groupPreferences),
      );
    }
  }, [groupPreferences]);

  // Toggle pinned status for a group
  const togglePinned = useCallback((groupId: string) => {
    setGroupPreferences((prev) => {
      const current = prev[groupId] || { ...DEFAULT_GROUP_PREFERENCES };
      return {
        ...prev,
        [groupId]: {
          ...current,
          pinned: !current.pinned,
        },
      };
    });
  }, []);

  // Toggle notifications for a group
  const toggleNotifications = useCallback((groupId: string) => {
    setGroupPreferences((prev) => {
      const current = prev[groupId] || { ...DEFAULT_GROUP_PREFERENCES };
      return {
        ...prev,
        [groupId]: {
          ...current,
          notifications: !current.notifications,
        },
      };
    });
  }, []);

  // Helper functions to check preferences
  const isPinned = useCallback(
    (groupId: string) => {
      return !!groupPreferences[groupId]?.pinned;
    },
    [groupPreferences],
  );

  const hasNotifications = useCallback(
    (groupId: string) => {
      return !!groupPreferences[groupId]?.notifications;
    },
    [groupPreferences],
  );

  // After all the callback definitions and before returning the provider
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(
    () => ({
      config,
      loading,
      error,
      saveConfig,
      refreshConfig,
      groups,
      activeGroupId,
      setActiveGroupId, // Expose this to allow chat component to set it
      messages,
      isLoading,
      sendMessage,
      fetchMessages,
      refreshGroups,
      groupPreferences,
      togglePinned,
      toggleNotifications,
      isPinned,
      hasNotifications,
      isWebSocketConnected,
    }),
    [
      config,
      loading,
      error,
      saveConfig,
      refreshConfig,
      groups,
      activeGroupId,
      messages,
      isLoading,
      sendMessage,
      fetchMessages,
      refreshGroups,
      groupPreferences,
      togglePinned,
      toggleNotifications,
      isPinned,
      hasNotifications,
      isWebSocketConnected,
    ],
  );

  return (
    <GroupMeContext.Provider value={contextValue}>
      {children}
    </GroupMeContext.Provider>
  );
};

export const useGroupMeConfig = () => {
  const context = useContext(GroupMeContext);
  if (context === undefined) {
    throw new Error("useGroupMeConfig must be used within a GroupMeProvider");
  }
  return context;
};

export const useGroupMe = () => {
  const context = useContext(GroupMeContext);
  if (context === undefined) {
    throw new Error("useGroupMe must be used within a GroupMeProvider");
  }
  return context;
};

export default GroupMeContext;
