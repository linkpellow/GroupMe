import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Text,
  Input,
  Button,
  VStack,
  HStack,
  Avatar,
  Flex,
  Spinner,
  useToast,
  Icon,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Switch,
  SlideFade,
  Image,
} from '@chakra-ui/react';
import { useGroupMeConfig } from '../context/GroupMeContext';
import {
  FaBell,
  FaSearch,
  FaPlus,
  FaExpand,
  FaThLarge,
  FaUserCircle,
  FaArrowLeft,
  FaThumbtack,
  FaEllipsisV,
  FaBellSlash,
} from 'react-icons/fa';
import { groupMeOAuthService } from '../services/groupMeOAuth.service';
import { useAuth } from '../context/AuthContext';

declare global {
  interface Window {
    Faye: {
      Client: new (
        url: string,
        options?: any
      ) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subscribe: (channel: string, callback: (message: any) => void) => void;
        unsubscribe: (channel: string) => void;
        setHeader: (name: string, value: string) => void;
      };
    };
    emergencySelectGroupMe?: (groupId: string, source: string) => void;
  }
}

interface DisplayableGroupMeGroup {
  groupId: string;
  groupName: string;
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

interface Message {
  id?: string;
  messageId?: string;
  text: string;
  name?: string;
  senderName?: string;
  avatar_url?: string;
  avatarUrl?: string;
  created_at?: number | string | Date;
  createdAt?: Date;
  sender_type?: string;
  group_id?: string;
  system?: boolean;
  attachments?: any[];
}

interface LiveMessage {
  id: string;
  groupId: string;
  groupName: string;
  text: string;
  senderName: string;
  timestamp: number | Date;
}

interface GroupMeChatProps {
  setActiveTab?: (tab: 'chat' | 'settings') => void;
  inSidebar?: boolean;
}

const formatTimestamp = (unixTimestamp?: number | Date | string | null): string => {
  if (!unixTimestamp) return '';
  let dateObj: Date;

  if (typeof unixTimestamp === 'number') {
    // GroupMe API sometimes sends timestamps in seconds (Unix timestamp)
    // and sometimes in milliseconds. We need to handle both.
    dateObj = new Date(unixTimestamp * (unixTimestamp > 10000000000 ? 1 : 1000));
  } else if (typeof unixTimestamp === 'string') {
    dateObj = new Date(unixTimestamp); // Attempt to parse if string
  } else {
    dateObj = unixTimestamp; // Already a Date object
  }

  if (isNaN(dateObj.getTime())) return '';

  // Get current time and calculate difference in minutes
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  // Show relative time for recent messages
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  // For messages from today, show time only
  if (
    dateObj.getDate() === now.getDate() &&
    dateObj.getMonth() === now.getMonth() &&
    dateObj.getFullYear() === now.getFullYear()
  ) {
    return dateObj.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // For messages from yesterday, show "Yesterday"
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }

  // For older messages, show date
  return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const hasEmoji = (str: string): boolean => {
  // Simple emoji detection - not perfect but works for most common emojis
  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  return emojiRegex.test(str);
};

const extractEmojis = (str: string): string => {
  // Simple emoji extraction - not perfect but works for most common emojis
  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const matches = str.match(emojiRegex);
  return matches ? matches.join('') : '';
};

const MessageItem: React.FC<{ message: Message }> = React.memo(({ message }) => {
  const isUserMessage = message.sender_type === 'user';

  return (
    <HStack
      py={1.5}
      px={1}
      alignItems="flex-start"
      w="100%"
      justifyContent={isUserMessage ? 'flex-end' : 'flex-start'}
      spacing={2}
    >
      {!isUserMessage && (
        <Avatar
          size="sm"
          name={message.name || message.senderName || 'Unknown'}
          src={message.avatar_url || message.avatarUrl}
          mr={1}
          borderRadius="50%" // Keep circular avatars
        />
      )}
      <Flex direction="column" maxWidth="75%" position="relative">
        {!isUserMessage && (
          <Text fontWeight="bold" color="gray.200" fontSize="xs" mb={0.5} ml={1}>
            {message.name || message.senderName || 'Unknown'}
          </Text>
        )}
        <Box
          bg={isUserMessage ? 'blue.600' : '#262626'} // Dark theme message bubbles
          color={isUserMessage ? 'white' : 'gray.100'}
          px={3}
          py={2}
          borderRadius="18px"
          borderTopLeftRadius={!isUserMessage ? '4px' : undefined}
          borderTopRightRadius={isUserMessage ? '4px' : undefined}
          boxShadow="0 1px 2px rgba(0,0,0,0.3)"
          position="relative"
        >
          <Text fontSize="15px" lineHeight="1.4" wordBreak="break-word">
            {message.text || ''}
          </Text>
        </Box>
        {/* Timestamp under the message */}
        <Text
          fontSize="11px"
          color="gray.500"
          alignSelf={isUserMessage ? 'flex-end' : 'flex-start'}
          mt={0.5}
          mx={1}
        >
          {formatTimestamp(message.created_at || message.createdAt)}
        </Text>
      </Flex>
      {isUserMessage && (
        <Avatar
          size="sm"
          name={message.name || message.senderName || 'Unknown'}
          src={message.avatar_url || message.avatarUrl}
          ml={1}
          borderRadius="50%" // Keep circular avatars
        />
      )}
    </HStack>
  );
});

const GroupItem: React.FC<{
  group: DisplayableGroupMeGroup;
  hasNewMessages: boolean;
  lastMessageText: string;
  lastMessageSender?: string;
  lastMessageTimestamp?: number | Date | string;
  unreadCount: string | number;
  displayUnread: boolean;
  isPinned: boolean;
  hasNotifications: boolean;
  renderGroupAvatar: (group: DisplayableGroupMeGroup) => React.ReactNode;
  onGroupClick: (e: React.MouseEvent, groupId: string) => void;
  onTogglePinned: (groupId: string) => void;
  onToggleNotifications: (groupId: string) => void;
}> = React.memo(
  ({
    group,
    hasNewMessages,
    lastMessageText,
    lastMessageSender,
    lastMessageTimestamp,
    unreadCount,
    displayUnread,
    isPinned,
    hasNotifications,
    renderGroupAvatar,
    onGroupClick,
    onTogglePinned,
    onToggleNotifications,
  }) => {
    return (
      <Flex
        p={3}
        alignItems="center"
        cursor="pointer"
        onClick={(e) => {
          // Direct call to group selection with explicit console logging
          e.stopPropagation(); // Prevent event bubbling
          e.preventDefault(); // Prevent default behavior
          console.log(`DIRECT GROUP SELECTION: ${group.groupId} - ${group.groupName}`);

          // Call handle group select directly with no intermediate functions
          if (typeof onGroupClick === 'function') {
            // Try the normal handler first
            onGroupClick(e, group.groupId);
          } else {
            // Direct emergency method - find the parent component's handleGroupSelect and call it
            console.log('EMERGENCY: Using direct selection method');
            const groupId = group.groupId;
            // We need to call the handleGroupSelect function exposed by the parent
            // The second argument is for debugging to track call origin
            if (window.emergencySelectGroupMe) {
              window.emergencySelectGroupMe(groupId, 'direct-from-group-item');
            } else {
              // Last resort - force an update to the URL with the group ID
              console.log('CRITICAL: Attempting URL-based group selection');
              const event = new CustomEvent('groupme-select', {
                detail: { groupId: groupId },
                bubbles: true,
                cancelable: true,
              });
              document.dispatchEvent(event);
            }
          }
        }}
        data-group-id={group.groupId}
        data-testid="group-item"
        role="button"
        aria-label={`Open chat with ${group.groupName}`}
        _hover={{ bg: '#222222' }} // Dark theme hover
        borderBottomWidth="1px"
        borderColor="#262626" // Dark theme border
        bg={hasNewMessages ? 'rgba(59, 130, 246, 0.2)' : undefined} // Keep blue highlight for new messages
        transition="background-color 0.2s ease"
        position="relative"
      >
        {/* Pin indicator */}
        {isPinned && (
          <Icon
            as={FaThumbtack}
            color="blue.400" // Keep blue for pins
            mr={2}
            transform="rotate(45deg)"
            boxSize={3}
          />
        )}

        {/* Group avatar with emoji if available */}
        {renderGroupAvatar(group)}

        <Box flex={1} minWidth={0} pr={0}>
          <HStack>
            <Text fontWeight="bold" color="white" noOfLines={1} fontSize="md">
              {group.groupName}
            </Text>
            {/* Display group emoji if there's an emoji in the name */}
            {hasEmoji(group.groupName) ? (
              <Text fontSize="md">{extractEmojis(group.groupName)}</Text>
            ) : null}
            {hasNewMessages && (
              <Text fontSize="xs" color="blue.400" fontWeight="bold">
                NEW
              </Text> // Keep blue for new message indicator
            )}
          </HStack>
          <Text
            fontSize="sm"
            color="gray.400" // Dark theme text
            noOfLines={1}
            maxWidth="310px"
            textOverflow="ellipsis"
            overflow="hidden"
            whiteSpace="nowrap"
          >
            {lastMessageSender ? `${lastMessageSender}: ` : ''}
            {lastMessageText}
          </Text>
        </Box>

        <Flex alignItems="center" ml={0} minWidth="auto">
          <VStack alignItems="flex-end" spacing={0} minWidth="30px" mr={0}>
            <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
              {formatTimestamp(lastMessageTimestamp)}
            </Text>
            {displayUnread && (
              <Flex
                mt={1}
                bg="blue.500" // Keep blue for unread badge
                color="white"
                borderRadius="full"
                px={unreadCount === '99+' ? 1.5 : 2}
                py={0.5}
                fontSize="xs"
                minWidth="20px"
                justifyContent="center"
                alignItems="center"
                fontWeight="bold"
              >
                {unreadCount}
              </Flex>
            )}
          </VStack>

          {/* Group menu with styling updates */}
          <Box className="group-menu" onClick={(e) => e.stopPropagation()} ml={0}>
            <Menu placement="bottom-end">
              <MenuButton
                as={IconButton}
                aria-label="Group options"
                icon={<FaEllipsisV />}
                variant="ghost"
                size="sm"
                color="gray.400"
                _hover={{ color: 'white', bg: 'whiteAlpha.200' }} // Dark theme hover
                padding={0}
                minWidth="20px"
                height="20px"
              />
              <MenuList bg="#262626" borderColor="#333" boxShadow="lg">
                <MenuItem
                  onClick={() => onTogglePinned(group.groupId)}
                  bg="#262626"
                  _hover={{ bg: '#333' }}
                  color="white"
                  icon={<Icon as={FaThumbtack} color={isPinned ? 'blue.400' : 'gray.400'} />}
                >
                  {isPinned ? 'Unpin Chat' : 'Pin Chat'}
                </MenuItem>
                <MenuItem
                  onClick={() => onToggleNotifications(group.groupId)}
                  bg="#262626"
                  _hover={{ bg: '#333' }}
                  color="white"
                  icon={
                    <Icon
                      as={hasNotifications ? FaBell : FaBellSlash}
                      color={hasNotifications ? 'green.400' : 'gray.400'}
                    />
                  }
                >
                  <HStack justify="space-between" width="100%">
                    <Text>{hasNotifications ? 'Notifications On' : 'Notifications Off'}</Text>
                    <Switch size="sm" isChecked={hasNotifications} colorScheme="green" ml={2} />
                  </HStack>
                </MenuItem>
              </MenuList>
            </Menu>
          </Box>
        </Flex>
      </Flex>
    );
  }
);

const LiveMessageItem: React.FC<{
  message: LiveMessage;
  index: number;
  onMessageClick: (groupId: string) => void;
}> = React.memo(({ message, index, onMessageClick }) => {
  return (
    <SlideFade
      in={true}
      offsetY="20px"
      style={{
        position: 'relative',
        transitionDuration: '0.5s',
        opacity: index === 0 ? 1 : 0.8 - index * 0.2,
      }}
    >
      <Box
        bg="#0084ff"
        color="white"
        borderRadius="18px"
        px={3}
        py={2}
        maxWidth="300px"
        boxShadow="md"
        _hover={{ opacity: 1 }}
        cursor="pointer"
        onClick={() => onMessageClick(message.groupId)}
      >
        <HStack>
          <Text fontWeight="bold" fontSize="sm">
            {message.groupName}:
          </Text>
          <Text fontSize="xs" color="whiteAlpha.800">
            {formatTimestamp(message.timestamp)}
          </Text>
        </HStack>
        <Text fontSize="sm" fontWeight="medium">
          {message.senderName && `${message.senderName}: `}
          {message.text}
        </Text>
      </Box>
    </SlideFade>
  );
});

const GroupMeChatComponent: React.FC<GroupMeChatProps> = ({ setActiveTab, inSidebar = false }) => {
  const {
    config,
    groups: contextGroupsFromAPI,
    messages: contextMessages, // This will now be updated by WebSocket via context
    sendMessage,
    fetchMessages, // Still used for initial load of a selected group
    togglePinned,
    toggleNotifications,
    isPinned,
    hasNotifications,
    setActiveGroupId,
    isWebSocketConnected, // New from context
  } = useGroupMeConfig();

  const { user } = useAuth();
  const toast = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // newMessageGroups can still be useful for highlighting groups with recent activity not yet viewed
  const [newMessageGroups, setNewMessageGroups] = useState<string[]>([]);
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]); // For temporary pop-up notifications
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  // Add a new state to track if the component is handling internal click events
  const [handlingInternalEvent, setHandlingInternalEvent] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const handleGroupSelectRef = useRef<(groupId: string | null) => void>();

  const handleConnectGroupMe = async () => {
    if (!user?.id) {
      toast({ title: 'Not logged in', description: 'Please log in again.', status: 'error', duration: 4000 });
      return;
    }
    try {
      setIsConnecting(true);
      const { authUrl } = await groupMeOAuthService.initiateOAuth(user.id);
      window.location.href = authUrl; // redirect to GroupMe OAuth
    } catch (err: any) {
      console.error('Failed to initiate GroupMe OAuth', err);
      toast({ title: 'Error', description: err?.response?.data?.message || 'Could not start GroupMe connection', status: 'error', duration: 5000 });
    } finally {
      setIsConnecting(false);
    }
  };

  // Prevent click events from propagating to parent elements
  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      // Only stop propagation if we're inside the sidebar
      if (inSidebar) {
        e.stopPropagation();
        setHandlingInternalEvent(true);

        // Reset the internal event handling state after a short delay
        setTimeout(() => {
          setHandlingInternalEvent(false);
        }, 100);
      }
    },
    [inSidebar]
  );

  // Add a side effect to capture and handle focus within the component
  useEffect(() => {
    if (!inSidebar || !chatContainerRef.current) return;

    const container = chatContainerRef.current;

    // Function to handle clicks inside the container
    const handleInternalClick = (e: MouseEvent) => {
      // Stop event from propagating to parent
      e.stopPropagation();
      setHandlingInternalEvent(true);

      // Reset after a short delay
      setTimeout(() => {
        setHandlingInternalEvent(false);
      }, 100);
    };

    // Add event listeners
    container.addEventListener('click', handleInternalClick);
    container.addEventListener('mousedown', handleInternalClick);

    // Cleanup
    return () => {
      container.removeEventListener('click', handleInternalClick);
      container.removeEventListener('mousedown', handleInternalClick);
    };
  }, [inSidebar]);

  const getMessagesHash = useCallback((messages: Message[]) => {
    if (!messages || !messages.length) return '';
    return messages
      .slice(0, 10)
      .map((m) => m.id || m.messageId)
      .join('|');
  }, []);

  const handleGroupSelect = useCallback(
    (groupId: string | null) => {
      console.log(`GroupMeChat: handleGroupSelect called with groupId: ${groupId}`);
      setSelectedGroup(groupId);

      if (groupId) {
        setActiveGroupId?.(groupId);
        if (fetchMessages) {
          console.log(`GroupMeChat: Fetching initial messages for selected group ${groupId}`);
          setLoadingMessages(true);
          setDisplayedMessages([]);
          fetchMessages(groupId)
            .then(() => {
              console.log(`GroupMeChat: Finished initial fetch for group ${groupId}`);
              // Messages will be updated via the contextMessages useEffect
              setLoadingMessages(false);
            })
            .catch((err: any) => {
              console.error(`GroupMeChat: Error during initial fetch for group ${groupId}:`, err);
              setLoadingMessages(false);
              toast({
                title: 'Error',
                description: 'Failed to load messages.',
                status: 'error',
              });
            });
        }
        // Remove group from newMessageGroups when selected
        setNewMessageGroups((prev) => prev.filter((id) => id !== groupId));
      } else {
        setActiveGroupId?.(null);
        setDisplayedMessages([]);
      }
    },
    [fetchMessages, setActiveGroupId, toast]
  );

  useEffect(() => {
    handleGroupSelectRef.current = handleGroupSelect;
  }, [handleGroupSelect]);

  const isPinnedSafe = useCallback(
    (groupId: string): boolean => {
      return isPinned && typeof isPinned === 'function' ? isPinned(groupId) : false;
    },
    [isPinned]
  );

  const hasNotificationsSafe = useCallback(
    (groupId: string): boolean => {
      return hasNotifications && typeof hasNotifications === 'function'
        ? hasNotifications(groupId)
        : true;
    },
    [hasNotifications]
  );

  const togglePinnedSafe = useCallback(
    (groupId: string): void => {
      if (togglePinned && typeof togglePinned === 'function') {
        togglePinned(groupId);
      }
    },
    [togglePinned]
  );

  const toggleNotificationsSafe = useCallback(
    (groupId: string): void => {
      if (toggleNotifications && typeof toggleNotifications === 'function') {
        toggleNotifications(groupId);
      }
    },
    [toggleNotifications]
  );

  const getGroupImageForName = useCallback((groupName: string): string | undefined => {
    if (!groupName) return undefined;

    const groupImageMap: Record<string, string> = {
      'CLOSERS REGION': '/images/groups/IMG_8191.JPG',
      'The Money Team': '/images/groups/IMG_8192.JPG',
      "Cant Stop. Won't Stop.": '/images/groups/IMG_8193.JPG',
      "Cant Stop Won't Stop": '/images/groups/IMG_8193.JPG',
      'CANT STOP': '/images/groups/IMG_8193.JPG',
      'MAXED OUT': '/images/groups/IMG_8194.JPG',
      Squadzilla: '/images/groups/IMG_8195.PNG',
      'HOT SHOTS': '/images/groups/IMG_8016.JPG',
      'Elevate Your Faith': '/images/groups/IMG_8196.JPG',
    };

    // Try exact match first
    if (groupImageMap[groupName]) {
      return groupImageMap[groupName];
    }

    // Special case for Cant Stop Won't Stop with different punctuation
    if (
      groupName.toLowerCase().includes('cant stop') &&
      (groupName.toLowerCase().includes("won't stop") ||
        groupName.toLowerCase().includes('wont stop'))
    ) {
      return '/images/groups/IMG_8193.JPG';
    }

    // Try case-insensitive partial match for other groups
    const lowerName = groupName.toLowerCase();
    for (const [key, url] of Object.entries(groupImageMap)) {
      if (lowerName.includes(key.toLowerCase())) {
        return url;
      }
    }

    return undefined;
  }, []);

  const renderGroupAvatar = useCallback(
    (group: DisplayableGroupMeGroup) => {
      if (!group) return null;

      // Try to get custom image first
      const customImage = getGroupImageForName(group.groupName);

      return (
        <Box position="relative" mr={2}>
          <Avatar
            size="md"
            name={group.groupName}
            mr={1}
            src={customImage || group.image_url}
            bg={!customImage && !group.image_url ? 'gray.600' : undefined}
            loading="eager"
            ignoreFallback={!!customImage}
          />
          {hasNotificationsSafe(group.groupId) && (
            <Box
              position="absolute"
              bottom="-1px"
              right="-1px"
              bg="green.400"
              borderRadius="full"
              w="12px"
              h="12px"
              border="2px solid black"
            />
          )}
        </Box>
      );
    },
    [hasNotificationsSafe, getGroupImageForName]
  );

  const renderLiveMessages = useCallback(() => {
    return (
      <VStack
        position="fixed"
        bottom="80px"
        right="20px"
        spacing={2}
        align="flex-end"
        maxWidth="80%"
        zIndex={1000}
      >
        {liveMessages.map((message, index) => (
          <LiveMessageItem
            key={message.id}
            message={message}
            index={index}
            onMessageClick={handleGroupSelect}
          />
        ))}
      </VStack>
    );
  }, [liveMessages, handleGroupSelect]);

  const handleGroupClick = useCallback(
    (e: React.MouseEvent, groupId: string) => {
      // Add debug logging
      console.log(`GroupMeChat: handleGroupClick called for group ${groupId}`);

      // If clicking on the menu or its children, don't navigate
      if ((e.target as HTMLElement).closest('.group-menu')) {
        console.log('GroupMeChat: Click on menu detected, not navigating');
        return;
      }
      console.log(`GroupMeChat: Calling handleGroupSelect with groupId: ${groupId}`);
      handleGroupSelect(groupId);
    },
    [handleGroupSelect]
  );

  const handleSendMessage = useCallback(async () => {
    if (!selectedGroup || !newMessage.trim()) {
      toast({
        title: 'Cannot Send Message',
        description: selectedGroup ? 'Message cannot be empty.' : 'No group selected.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!sendMessage) {
      toast({
        title: 'Send Not Implemented',
        description: 'Message sending is not available',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    // Generate a unique ID for this message for optimistic updates
    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Create an optimistic message to show immediately
    const optimisticMessage = {
      id: optimisticId,
      text: newMessage,
      sender_type: 'user',
      name: 'You', // Will be replaced when the real message comes in
      created_at: new Date().toISOString(),
      is_optimistic: true, // Flag to identify optimistic messages
    };

    // Add the optimistic message to the display
    setDisplayedMessages((prevMessages) => [optimisticMessage, ...prevMessages]);

    // Clear input for better UX
    const messageToSend = newMessage;
    setNewMessage('');

    try {
      console.log(`GroupMeChat: Sending message to group ${selectedGroup}`);

      // Actually send the message
      await sendMessage(selectedGroup, messageToSend);

      // Fetch fresh messages to get the real message with server ID
      if (fetchMessages) {
        console.log(`GroupMeChat: Message sent, fetching updated message list`);
        await fetchMessages(selectedGroup);
      }
    } catch (error) {
      console.error('GroupMeChat: Error sending message:', error);

      // Show error toast
      toast({
        title: 'Failed to Send Message',
        description: 'Your message was not delivered. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });

      // Remove the optimistic message
      setDisplayedMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== optimisticId));

      // Put the message back in the input
      setNewMessage(messageToSend);
    }
  }, [selectedGroup, newMessage, sendMessage, fetchMessages, toast]);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 30;

    setUserHasScrolled(!isAtBottom);
  }, []);

  // Effect to update displayedMessages when contextMessages change for the selected group
  useEffect(() => {
    if (selectedGroup && contextMessages && contextMessages[selectedGroup]) {
      const newMessages = contextMessages[selectedGroup];
      const currentHash = getMessagesHash(displayedMessages);
      const newHash = getMessagesHash(newMessages);

      if (newHash !== currentHash) {
        console.log(
          `GroupMeChat: Updating displayedMessages for group ${selectedGroup} from context.`
        );
        setDisplayedMessages(newMessages);
      }
    } else if (!selectedGroup) {
      // If no group is selected, ensure displayedMessages is empty
      if (displayedMessages.length > 0) {
        setDisplayedMessages([]);
      }
    }
  }, [selectedGroup, contextMessages, displayedMessages, getMessagesHash]); // Add displayedMessages to prevent potential stale closures

  // Effect for auto-scrolling
  useEffect(() => {
    if (!userHasScrolled && displayedMessages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayedMessages, userHasScrolled]); // Only depends on these two

  // Effect to manage newMessageGroups based on incoming context messages
  useEffect(() => {
    if (!contextMessages || !contextGroupsFromAPI) return;

    const updatedNewMessageGroups = new Set<string>(newMessageGroups);
    const newLiveMessagesToShow: LiveMessage[] = [];

    contextGroupsFromAPI.forEach((group) => {
      if (!group || !group.groupId) return;
      const groupMsgs = contextMessages[group.groupId];
      if (groupMsgs && groupMsgs.length > 0) {
        const latestMessage = groupMsgs[0]; // Assuming messages are sorted newest first in context

        let lastDisplayedMsgIdForGroup: string | undefined = undefined;
        for (let i = displayedMessages.length - 1; i >= 0; i--) {
          if (displayedMessages[i].group_id === group.groupId) {
            // Ensure we check messageId first, then fallback to id if it exists on displayedMessage type
            lastDisplayedMsgIdForGroup =
              displayedMessages[i].messageId || (displayedMessages[i] as any).id;
            break;
          }
        }

        const latestMessageId = latestMessage.messageId; // GroupMeMessage from context uses messageId

        if (
          latestMessageId &&
          latestMessageId !== lastDisplayedMsgIdForGroup &&
          group.groupId !== selectedGroup
        ) {
          if (!newMessageGroups.includes(group.groupId)) {
            updatedNewMessageGroups.add(group.groupId);
            if (hasNotificationsSafe(group.groupId)) {
              newLiveMessagesToShow.push({
                id: latestMessageId, // Use the definite latestMessageId
                groupId: group.groupId,
                groupName: group.groupName || 'Unknown Group',
                text: latestMessage.text || '',
                senderName: latestMessage.senderName || '',
                timestamp: new Date(latestMessage.createdAt || Date.now()),
              });
            }
          }
        }
      }
    });

    if (
      updatedNewMessageGroups.size !== newMessageGroups.length ||
      newLiveMessagesToShow.length > 0
    ) {
      setNewMessageGroups(Array.from(updatedNewMessageGroups));
    }

    if (newLiveMessagesToShow.length > 0) {
      setLiveMessages((prev) => [...newLiveMessagesToShow, ...prev].slice(0, 3));
    }
  }, [
    contextMessages,
    contextGroupsFromAPI,
    selectedGroup,
    displayedMessages,
    newMessageGroups,
    hasNotificationsSafe,
  ]);

  // Clear live messages after a delay
  useEffect(() => {
    if (liveMessages.length > 0) {
      const timer = setTimeout(() => {
        setLiveMessages((prev) => prev.slice(0, prev.length - 1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [liveMessages]);

  // Global emergency select (can remain as is, uses handleGroupSelectRef)
  useEffect(() => {
    window.emergencySelectGroupMe = (groupId: string, source: string) => {
      console.log(`EMERGENCY GROUP SELECT from ${source}: ${groupId}`);
      handleGroupSelectRef.current?.(groupId);
    };
    const handleGlobalGroupSelect = (e: CustomEvent) => {
      if (e.detail && e.detail.groupId) {
        console.log(`DOCUMENT EVENT GROUP SELECT: ${e.detail.groupId}`);
        handleGroupSelectRef.current?.(e.detail.groupId);
      }
    };
    document.addEventListener('groupme-select', handleGlobalGroupSelect as EventListener);
    return () => {
      window.emergencySelectGroupMe = undefined;
      document.removeEventListener('groupme-select', handleGlobalGroupSelect as EventListener);
    };
  }, []);

  // Handle component in not-configured state
  if (!config || !config.accessToken) {
    return (
      <Box p={4} bg="#121212" color="gray.300" h="100%" display="flex" flexDirection="column" alignItems="center" justifyContent="center">
        <Text mb={4}>Connect your GroupMe account to start chatting.</Text>
        <Button colorScheme="blue" size="sm" onClick={handleConnectGroupMe} isLoading={isConnecting}>
          Connect GroupMe
        </Button>
      </Box>
    );
  }

  // Cast to our expected type
  const displayableGroups: DisplayableGroupMeGroup[] = (contextGroupsFromAPI ||
    []) as DisplayableGroupMeGroup[];

  // Add an emergency direct selection function for testing
  const emergencySelectGroup = (index: number) => {
    console.log('EMERGENCY: Trying direct group selection by index', index);
    if (displayableGroups && displayableGroups.length > index) {
      const targetGroup = displayableGroups[index];
      console.log('EMERGENCY: Found target group', targetGroup);
      handleGroupSelect(targetGroup.groupId);
    } else {
      console.error(
        'EMERGENCY: No group found at index',
        index,
        'from',
        displayableGroups?.length || 0,
        'groups'
      );
    }
  };

  // Filter groups based on search term
  const filteredGroups = displayableGroups.filter((group) =>
    group.groupName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find the name of the currently selected group for the header
  const currentSelectedGroupName = displayableGroups.find(
    (g) => g.groupId === selectedGroup
  )?.groupName;

  // Sort groups: pinned first, then alphabetically by name
  const sortedGroups = [...filteredGroups].sort((a, b) => {
    const aPinned = isPinnedSafe(a.groupId);
    const bPinned = isPinnedSafe(b.groupId);

    // First sort by pinned status
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    // Then sort alphabetically
    return a.groupName.localeCompare(b.groupName);
  });

  // Render the component
  return (
    <Box
      h="100%"
      w="100%"
      display="flex"
      flexDirection="column"
      position="relative"
      bg="black"
      ref={chatContainerRef}
      onClick={handleContainerClick}
      onMouseDown={handleContainerClick}
      {...(inSidebar && {
        maxHeight: 'calc(100vh - 320px)',
        overflow: 'hidden',
      })}
    >
      {/* Live Message Notifications */}
      {!inSidebar && renderLiveMessages()}

      {/* Header: Show Chat List Header OR Selected Group Header */}
      <Flex
        p={3}
        alignItems="center"
        borderBottomWidth="1px"
        borderColor="#262626" // Dark theme border
        flexShrink={0}
        bg="#000000" // Dark header
        {...(inSidebar && { p: 2, minHeight: '48px' })}
      >
        {selectedGroup ? (
          <>
            <Icon
              as={FaArrowLeft}
              color="gray.400" // Dark theme icon
              cursor="pointer"
              _hover={{ color: 'white' }}
              onClick={() => handleGroupSelect(null)}
              mr={3}
              boxSize={5}
            />
            <Text fontSize="lg" fontWeight="bold" color="white" noOfLines={1} flex={1}>
              {currentSelectedGroupName || (
                <Image
                  src="/images/groups/GroupMe_gradient_logo.svg.png"
                  alt="GroupMe"
                  h="24px"
                  display="inline"
                />
              )}
            </Text>
          </>
        ) : (
          <>
            <Image
              src="/images/groups/GroupMe_gradient_logo.svg.png"
              alt="GroupMe"
              h="28px"
              mr={4}
            />
            <InputGroup flex={1} size="sm" mr={2}>
              <InputLeftElement pointerEvents="none">
                <Icon as={FaSearch} color="gray.500" />
              </InputLeftElement>
              <Input
                placeholder="Search chats"
                bg="#262626" // Dark input
                borderColor="#262626"
                color="gray.300"
                borderRadius="md"
                fontSize="sm"
                _placeholder={{ color: 'gray.500' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            <Icon
              as={FaThLarge}
              color="gray.400"
              cursor="pointer"
              _hover={{ color: 'white' }}
              mr={3}
            />
            <Icon as={FaPlus} color="gray.400" cursor="pointer" _hover={{ color: 'white' }} />
          </>
        )}
      </Flex>

      {/* Content: Show Chat List OR Messages for Selected Group */}
      <Box
        ref={messagesContainerRef}
        flex={1}
        overflowY="auto"
        onScroll={handleScroll}
        bg="#000000" // Dark background
        {...(inSidebar && { maxHeight: 'calc(100vh - 428px)' })}
      >
        {!selectedGroup ? (
          <VStack spacing={0} align="stretch">
            {sortedGroups.map((group) => {
              // Get message data for this group
              const contextGroupMessages =
                contextMessages && contextMessages[group.groupId]
                  ? contextMessages[group.groupId]
                  : [];
              const lastMessageFromContext =
                contextGroupMessages.length > 0 ? contextGroupMessages[0] : null;

              // Use last_message from group or from context, whichever is available
              const lastMessageText =
                group.last_message?.text || lastMessageFromContext?.text || 'No messages yet';
              const lastMessageSender =
                group.last_message?.name || lastMessageFromContext?.senderName;
              const lastMessageTimestamp =
                group.last_message?.created_at || lastMessageFromContext?.createdAt;
              const unreadCount =
                group.messages_count && group.messages_count > 100
                  ? '99+'
                  : group.messages_count || 0;
              const displayUnread =
                typeof unreadCount === 'number' ? unreadCount > 0 : unreadCount === '99+';
              const hasNewMessages = newMessageGroups.includes(group.groupId);

              return (
                <GroupItem
                  key={group.groupId}
                  group={group}
                  hasNewMessages={hasNewMessages}
                  lastMessageText={lastMessageText}
                  lastMessageSender={lastMessageSender}
                  lastMessageTimestamp={lastMessageTimestamp}
                  unreadCount={unreadCount}
                  displayUnread={displayUnread}
                  isPinned={isPinnedSafe(group.groupId)}
                  hasNotifications={hasNotificationsSafe(group.groupId)}
                  renderGroupAvatar={renderGroupAvatar}
                  onGroupClick={handleGroupClick}
                  onTogglePinned={togglePinnedSafe}
                  onToggleNotifications={toggleNotificationsSafe}
                />
              );
            })}
            {filteredGroups.length === 0 && (
              <Text p={4} color="gray.500" textAlign="center">
                {searchTerm ? 'No chats match your search.' : 'No chats found.'}
              </Text>
            )}
          </VStack>
        ) : (
          // Message Display Area for the selected group
          <VStack spacing={2} align="stretch" p={3} bg="#000000">
            {loadingMessages ? (
              <Flex justify="center" align="center" h="200px">
                <Spinner color="blue.400" size="lg" thickness="3px" speed="0.65s" />
              </Flex>
            ) : displayedMessages.length > 0 ? (
              // Map messages using the MessageItem component
              displayedMessages.map((msg) => (
                <MessageItem
                  key={msg.id || msg.messageId || `msg-${Date.now()}-${Math.random()}`}
                  message={msg}
                />
              ))
            ) : (
              <Text color="gray.400" textAlign="center" mt={4}>
                No messages in this group yet.
              </Text>
            )}
            <div ref={messagesEndRef} />
          </VStack>
        )}
      </Box>

      {/* Footer: Input bar if a group is selected, otherwise main nav icons */}
      <Box
        {...(selectedGroup
          ? {
              p: inSidebar ? 2 : 3,
              borderTopWidth: '1px',
              borderColor: '#262626', // Dark theme
              bg: '#1a1a1a', // Dark theme
              flexShrink: 0,
            }
          : {
              as: 'nav',
              p: inSidebar ? 1 : 2,
              borderTopWidth: '1px',
              borderColor: '#262626', // Dark theme
              justifyContent: 'space-around',
              alignItems: 'center',
              bg: '#000000', // Dark theme
              flexShrink: 0,
              display: 'flex',
            })}
      >
        {selectedGroup ? (
          <HStack
            as="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <Input
              placeholder="Send a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              flex="1"
              bg="#262626" // Dark theme input
              color="white"
              borderColor="#333333"
              _placeholder={{ color: 'gray.500' }}
              borderRadius="full"
              size="sm"
            />
            <Button
              colorScheme="blue"
              type="submit"
              isDisabled={!newMessage.trim()}
              size="sm"
              borderRadius="full"
            >
              Send
            </Button>
          </HStack>
        ) : (
          <Flex
            as="nav"
            p={2}
            borderTopWidth="1px"
            borderColor="#262626"
            justifyContent="space-around"
            alignItems="center"
            bg="#000000"
            flexShrink={0}
          >
            <Icon
              as={FaBell}
              color="gray.400"
              boxSize={6}
              cursor="pointer"
              _hover={{ color: 'white' }}
            />
            <Icon
              as={FaSearch}
              color="gray.400"
              boxSize={6}
              cursor="pointer"
              _hover={{ color: 'white' }}
            />
            <Box
              bg="blue.500"
              borderRadius="full"
              p={2}
              cursor="pointer"
              _hover={{ bg: 'blue.600' }}
            >
              <Icon as={FaPlus} color="white" boxSize={5} />
            </Box>
            <Icon
              as={FaExpand}
              color="gray.400"
              boxSize={6}
              cursor="pointer"
              _hover={{ color: 'white' }}
            />
            <Icon
              as={FaUserCircle}
              color="gray.400"
              boxSize={7}
              cursor="pointer"
              _hover={{ color: 'white' }}
            />
          </Flex>
        )}
      </Box>

      {/* Add a debug button to the list when in non-sidebar mode */}
      {!inSidebar && !selectedGroup && filteredGroups.length > 0 && (
        <Box
          position="absolute"
          top="70px"
          right="10px"
          zIndex={100}
          backgroundColor="red.500"
          color="white"
          padding="4px 8px"
          borderRadius="4px"
          fontSize="12px"
          cursor="pointer"
          onClick={() => emergencySelectGroup(0)}
        >
          DEBUG: Click First Group
        </Box>
      )}
    </Box>
  );
};

// Export a memoized version of the component
const GroupMeChat = React.memo(GroupMeChatComponent);

export default GroupMeChat;
