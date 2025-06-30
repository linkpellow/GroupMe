import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box,
  Flex,
  Link,
  Image,
  Button,
  Avatar,
  Text,
  VStack,
  Icon,
  Divider,
  IconButton,
  Badge,
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaCog,
  FaUser,
  FaClipboard,
  FaTable,
  FaFileUpload,
  FaEnvelope,
  FaPlug,
  FaUserTie,
  FaTimes,
  FaFile,
  FaFileAlt,
} from 'react-icons/fa';
import GroupMeChatWrapper from './GroupMeChatWrapper';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useSidebarToggle } from '../context/SidebarToggleContext';
import TripleChevronIcon from './icons/TripleChevronIcon';
import { useCallCountsContext } from '../context/CallCountsContext';
import DailyGoals from './DailyGoals';

const Navigation: React.FC = () => {
  const { user, logout, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileImageKey, setProfileImageKey] = useState(Date.now());
  const [avatarError, setAvatarError] = useState(false);
  const [profileImageLoaded, setProfileImageLoaded] = useState(false);
  const { isOpen: isSidebarCollapsed, toggle: toggleSidebar } = useSidebarToggle();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const userDataRef = useRef(user); // Reference to track user data state

  // Enhanced hover intent tracking with better protection
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMouseInSidebar = useRef(false);
  const isHoverBlocked = useRef(false); // Prevent hover changes during interactions
  const lastToggleTime = useRef<number>(0);

  // Add a debounce timer ref to prevent rapid API calls
  const userRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);
  const MIN_REFRESH_INTERVAL = 60000; // Minimum 60 seconds between profile refreshes

  // Generate user's initials for avatar fallback
  const getUserInitials = () => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U';
  };

  // Handle avatar load error
  const handleAvatarError = () => {
    /* removed log */
    setAvatarError(true);
  };

  // Determine if we should show the fallback icon
  const shouldShowFallback = !user?.profilePicture || avatarError || !profileImageLoaded;

  // Check if a link is active
  const isActive = (path: string) => {
    if (path === '/groupme') {
      return location.pathname === '/groupme';
    }
    return location.pathname === path;
  };

  // Logout handler
  const handleLogout = () => {
    // Block hover changes during logout
    isHoverBlocked.current = true;
    logout();
    navigate('/login');
  };

  // More robust mouse enter handler with protections
  const handleMouseEnter = useCallback(() => {
    // Skip hover expansion if blocked or if we've toggled recently
    if (isHoverBlocked.current) return;

    isMouseInSidebar.current = true;

    // Clear any pending collapse timeout
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }

    // Immediate expansion for better UX
    lastToggleTime.current = Date.now();
  }, []);

  // More robust mouse leave handler
  const handleMouseLeave = useCallback(() => {
    // Skip hover collapse if blocked
    if (isHoverBlocked.current) return;

    isMouseInSidebar.current = false;

    // Clear any pending expand timeout
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
      expandTimeoutRef.current = null;
    }

    // Use a longer delay before collapsing
    collapseTimeoutRef.current = setTimeout(() => {
      if (!isMouseInSidebar.current) {
        lastToggleTime.current = Date.now();
      }
    }, 1000); // Increased delay to prevent premature collapse
  }, []);

  // Handle click outside the sidebar to force close it
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      // If sidebar is open and click is outside sidebar area
      if (
        !isSidebarCollapsed &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        // Set hover block to prevent immediate re-opening
        isHoverBlocked.current = true;

        // Force collapse the sidebar
        toggleSidebar();

        // Reset hover block after a delay
        setTimeout(() => {
          isHoverBlocked.current = false;
        }, 500);
      }
    },
    [isSidebarCollapsed, toggleSidebar]
  );

  // Add event listener for click outside
  useEffect(() => {
    // Only add listener when sidebar is expanded
    if (!isSidebarCollapsed) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarCollapsed, handleClickOutside]);

  // Use memoized avatar to prevent re-renders
  const userAvatar = React.useMemo(() => {
    // Reuse the existing avatar with better stability
    return (
      <Avatar
        key={profileImageKey}
        size="md"
        name={getUserInitials()}
        src={user?.profilePicture || undefined}
        bg="orange.500"
        color="white"
        onError={handleAvatarError}
        icon={shouldShowFallback ? <FaUser /> : undefined}
        w="40px"
        h="40px"
        mr={isSidebarCollapsed ? 0 : 3}
        // Add loading="eager" to prioritize avatar loading
        loading="eager"
      />
    );
  }, [profileImageKey, user?.profilePicture, avatarError, profileImageLoaded, isSidebarCollapsed]);

  // Preserve user data reference to prevent flickering from repeated API calls
  useEffect(() => {
    // Only update reference if we have actual user data
    if (user && Object.keys(user).length > 0) {
      userDataRef.current = user;
    }
  }, [user]);

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    };
  }, []);

  // More controlled profile loading to prevent excessive refreshes
  useEffect(() => {
    let isMounted = true; // Track component mounted state

    const loadProfileDataOnce = async () => {
      try {
        // Skip if we refreshed recently or already have user data
        const now = Date.now();
        if (now - lastRefreshTimeRef.current < MIN_REFRESH_INTERVAL) {
          /* removed log */
          return;
        }

        if (!userDataRef.current || !Object.keys(userDataRef.current).length) {
          /* removed log */

          // Clear any pending refreshes
          if (userRefreshTimerRef.current) {
            clearTimeout(userRefreshTimerRef.current);
            userRefreshTimerRef.current = null;
          }

          // Set a loading flag to avoid duplicate requests
          lastRefreshTimeRef.current = now;

          try {
            // Only call refresh if component is still mounted
            if (isMounted) {
              await refreshUserData();
              /* removed log */
            }
          } catch (error) {
            console.error('Failed to load profile data:', error);
            // Reset timer on error to allow retry
            lastRefreshTimeRef.current = 0;
          }
        }
      } catch (error) {
        console.error('Failed to refresh user data on mount:', error);
      }
    };

    // Only run once on mount with fixed dependency
    loadProfileDataOnce();

    // Clean up any pending timers on unmount
    return () => {
      isMounted = false; // Mark component as unmounted
      if (userRefreshTimerRef.current) {
        clearTimeout(userRefreshTimerRef.current);
      }
    };
  }, [refreshUserData]); // Include refreshUserData to avoid ESLint warnings

  // Update the profile image handling to be more stable
  useEffect(() => {
    if (!user?.profilePicture || user.profilePicture === userDataRef.current?.profilePicture) {
      return; // Skip if no change to prevent flicker
    }

    /* removed log */

    // Block hover changes during profile loading
    isHoverBlocked.current = true;

    setProfileImageKey(Date.now());
    setAvatarError(false);
    setProfileImageLoaded(false);

    // Preload the image
    if (user?.profilePicture) {
      const img = new window.Image();
      img.onload = () => {
        /* removed log */
        setProfileImageLoaded(true);
        // Unblock hover changes after loading completes
        setTimeout(() => {
          isHoverBlocked.current = false;
        }, 300);
      };
      img.onerror = () => {
        /* removed log */
        setAvatarError(true);
        // Unblock hover changes after error
        isHoverBlocked.current = false;
      };
      img.src = user.profilePicture;
    }
  }, [user?.profilePicture]);

  const menuPages = [
    [
      { title: 'Leads', path: '/leads', icon: FaClipboard },
      { title: 'Clients', path: '/clients', icon: FaUserTie },
      { title: 'GMAIL', path: '/gmail', icon: FaEnvelope },
      { title: 'Spreadsheet', path: '/spreadsheet', icon: FaTable },
      { title: 'CSV Upload', path: '/csv-upload', icon: FaFileUpload },
      { title: 'Integrations', path: '/integrations', icon: FaPlug },
      { title: 'Settings', path: '/settings', icon: FaCog },
    ],
    [
      { title: 'Page One', path: '/page-one', icon: FaFile },
    ],
    [
      { title: 'Page Two', path: '/page-two', icon: FaFileAlt },
    ],
  ] as const;

  const [menuPage, setMenuPage] = useState<number>(() => {
    const saved = localStorage.getItem('nav_menu_page');
    return saved ? Number(saved) % menuPages.length : 0;
  });

  const changePage = (delta: number) => {
    setMenuPage((prev) => {
      const next = (prev + delta + menuPages.length) % menuPages.length;
      localStorage.setItem('nav_menu_page', String(next));
      return next;
    });
  };

  const navItems = menuPages[menuPage];

  // CRM counter
  const { uniqueCount } = useCallCountsContext();

  return (
    <>
      <Box as="nav" bg="black" boxShadow="md" position="fixed" w="100%" zIndex="sticky" h="100px">
        <Flex w="100%" h="100%" maxW="100vw" justify="center" align="center">
          {/* Absolutely centred logo group */}
          <Flex
            position="absolute"
            left="50%"
            transform="translateX(-50%)"
            align="center"
            gap={2}
          >
            <Link as={RouterLink} to="/" display="flex" alignItems="center">
              <Image src="/images/HEADER LOGO.png?v=1" alt="Crokodial Logo" h="75px" mr={2} />
              <Image
                src="/images/CROKODIAL-TITLE-LOGO.png"
                alt="Crokodial"
                h="50px"
                style={{ maxWidth: 'none' }}
              />
              <Badge colorScheme="orange" variant="solid" fontSize="xs" mt={1} color="black">
                BETA
              </Badge>
            </Link>
          </Flex>
        </Flex>
      </Box>

      {/* Add click-away overlay when sidebar is expanded */}
      {!isSidebarCollapsed && (
        <Box
          position="fixed"
          top="100px"
          left="0"
          right="360px" // Width minus sidebar width
          bottom="0"
          bg="transparent"
          zIndex={999}
          onClick={() => {
            isHoverBlocked.current = true;
            toggleSidebar();
            setTimeout(() => {
              isHoverBlocked.current = false;
            }, 500);
          }}
        />
      )}

      {/* Expand the hover protection zone for better UX */}
      <Box
        position="fixed"
        top="100px"
        right={isSidebarCollapsed ? '60px' : '360px'}
        bottom="0"
        width="50px"
        zIndex={999}
        onMouseEnter={handleMouseEnter}
        pointerEvents="auto"
        bg="transparent"
      />

      {/* Sidebar Navigation Menu */}
      <Box
        ref={sidebarRef}
        position="fixed"
        right={0}
        top="100px"
        width={isSidebarCollapsed ? '60px' : '360px'}
        bottom="0"
        bg="blackAlpha.900"
        zIndex={1000}
        boxShadow="0 4px 12px rgba(0,0,0,0.3)"
        borderLeft="1px solid rgba(255,255,255,0.1)"
        overflowX="hidden"
        overflowY="hidden"
        transition="width 0.25s ease-in-out"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        display="flex"
        flexDirection="column"
      >
        {/* Sidebar toggle button at top */}
        <Flex justify="center" py={2} mt={4}>
          <IconButton
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            icon={<TripleChevronIcon direction={isSidebarCollapsed ? 'right' : 'left'} boxSize={4} color="orange.400" />}
            variant="unstyled"
            _hover={{ transform: 'scale(1.05)' }}
            boxSize="24px"
            size="sm"
            onClick={toggleSidebar}
          />
        </Flex>

        {/* Admin Profile Section */}
        <Flex
          direction="column"
          align={isSidebarCollapsed ? 'center' : 'flex-start'}
          justify="center"
          p={4}
          borderBottomWidth="1px"
          borderColor="rgba(255,255,255,0.1)"
          flexShrink={0}
        >
          <Flex
            align="center"
            mb={2}
            width="100%"
            justifyContent={isSidebarCollapsed ? 'center' : 'flex-start'}
            onClick={() => {
              // Block hover changes during navigation
              isHoverBlocked.current = true;
              navigate('/settings?tab=account');
              // Reset after navigation
              setTimeout(() => {
                isHoverBlocked.current = false;
              }, 1000);
            }}
            cursor="pointer"
            _hover={{ opacity: 0.8 }}
          >
            {userAvatar}
            {!isSidebarCollapsed && (
              <Box>
                <Text color="white" fontSize="sm" fontWeight="bold">
                  {user?.name || user?.email?.split('@')[0]}
                </Text>
                <Text color="whiteAlpha.700" fontSize="xs">
                  {user?.email}
                </Text>
              </Box>
            )}
          </Flex>

          {!isSidebarCollapsed && (
            <Button
              onClick={handleLogout}
              color="white"
              fontSize="14px"
              fontWeight="500"
              px={4}
              py={1}
              border="1px solid white"
              borderRadius="6px"
              bg="transparent"
              _hover={{
                bg: 'whiteAlpha.200',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              }}
              transition="all 0.2s ease"
              width="100%"
              h="30px"
            >
              Logout
            </Button>
          )}
        </Flex>

        {/* Navigation Items */}
        <VStack
          spacing={0}
          align="stretch"
          overflowY="auto"
          flexShrink={0}
          mb={isSidebarCollapsed || !user ? 4 : 0}
        >
          {navItems.map((item) => {
            const commonLinkProps = {
              display: 'flex',
              alignItems: 'center',
              p: 4,
              color: 'white',
              fontWeight: isActive(item.path) ? '700' : '500',
              bg: isActive(item.path) ? 'rgba(239,191,4,0.25)' : 'transparent',
              borderLeft: isActive(item.path) ? '4px solid #EFBF04' : '4px solid transparent',
              _hover: {
                bg: 'rgba(239,191,4,0.2)',
                borderLeft: '4px solid #EFBF04',
              },
              transition: 'all 0.2s ease',
              justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
              width: '100%',
            };
            return (
              <Link key={item.path} {...commonLinkProps} as={RouterLink} to={item.path}>
                <Icon as={item.icon} boxSize={5} />
                {!isSidebarCollapsed && (
                  <Text ml={3} fontSize="md">
                    {item.title}
                  </Text>
                )}
              </Link>
            );
          })}
        </VStack>

        {/* Pager buttons */}
        <Flex justify="center" align="center" py={2} mt="auto" mb={2} gap={2}>
          <IconButton
            aria-label="Previous menu page"
            icon={<ChevronLeftIcon />}
            size="sm"
            variant="ghost"
            onClick={() => changePage(-1)}
          />
          <Text color="white" fontSize="xs">
            {menuPage + 1}/{menuPages.length}
          </Text>
          <IconButton
            aria-label="Next menu page"
            icon={<ChevronRightIcon />}
            size="sm"
            variant="ghost"
            onClick={() => changePage(1)}
          />
        </Flex>

        {/* GroupMe Chat Area - always present at the bottom of expanded sidebar */}
        {!isSidebarCollapsed && user && (
          <>
            <Divider borderColor="rgba(255,255,255,0.2)" my={2} />
            <Box flexGrow={1} w="100%" overflowY="auto" pl={2} pr={2} pb={2} position="relative">
              <GroupMeChatWrapper
                setActiveTab={(tab) => console.log(`Tab changed to: ${tab}`)}
                inSidebar={true}
              />
            </Box>
          </>
        )}

        <DailyGoals />
      </Box>

      {/* CRM badge under zoom controls (assumed at top-right) */}
      <Badge
        position="fixed"
        top="52px"        /* 10px padding + 32px zoom button height + margin */
        right="12px"
        bg="#EFBF04"
        color="black"
        fontSize="sm"
        px={2}
        py={1}
        borderRadius="md"
        zIndex={10001} /* just below zoom controls (10000) */
      >
        CRM: {uniqueCount}
      </Badge>
    </>
  );
};

export default Navigation;
