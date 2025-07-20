import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Flex,
  Link,
  Image,
  Button,
  Avatar,
  Text,
  Icon,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  HStack,
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
  FaFileAlt,
  FaChartBar,
  FaChevronDown,
} from 'react-icons/fa';
import { useCallCountsContext } from '../context/CallCountsContext';
import SoundToggleButton from './SoundToggleButton';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileImageKey, setProfileImageKey] = useState(Date.now());
  const [avatarError, setAvatarError] = useState(false);
  const { isOpen: isUserMenuOpen, onOpen: onUserMenuOpen, onClose: onUserMenuClose } = useDisclosure();

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
    setAvatarError(true);
  };

  // Check if a link is active
  const isActive = (path: string) => {
    if (path === '/groupme') {
      return location.pathname === '/groupme';
    }
    return location.pathname === path;
  };

  // Logout handler
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigation items organized in logical groups
  const navItems = [
    { title: 'Leads', path: '/leads', icon: FaClipboard },
    { title: 'Clients', path: '/clients', icon: FaUserTie },
    { title: 'Stats', path: '/stats', icon: FaChartBar },
    { title: 'Gmail', path: '/gmail', icon: FaEnvelope },
    { title: 'Spreadsheet', path: '/spreadsheet', icon: FaTable },
    { title: 'CSV Upload', path: '/csv-upload', icon: FaFileUpload },
    { title: 'Integrations', path: '/integrations', icon: FaPlug },
    { title: 'Page Two', path: '/page-two', icon: FaFileAlt },
  ];

  // CRM counter
  const { uniqueCount } = useCallCountsContext();

  // Update profile image handling
  useEffect(() => {
    if (user?.profilePicture) {
      setProfileImageKey(Date.now());
      setAvatarError(false);
    }
  }, [user?.profilePicture]);

  return (
    <>
      {/* Modern Dark Header with Horizontal Navigation */}
      <Box 
        as="nav" 
        bg="linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)" 
        boxShadow="0 4px 20px rgba(0, 0, 0, 0.3)" 
        position="fixed" 
        w="100%" 
        zIndex="sticky" 
        borderBottom="1px solid rgba(239, 191, 4, 0.2)"
      >
        <Flex w="100%" maxW="100vw" justify="space-between" align="center" px={6} py={3}>
          {/* Logo Section */}
          <Flex align="center" gap={3}>
            <Link as={RouterLink} to="/" display="flex" alignItems="center">
              <Image src="/images/HEADER LOGO.png?v=1" alt="Crokodial Logo" h="50px" mr={2} />
              <Image
                src="/images/CROKODIAL-TITLE-LOGO.png"
                alt="Crokodial"
                h="35px"
                style={{ maxWidth: 'none' }}
              />
              <Badge 
                colorScheme="orange" 
                variant="solid" 
                fontSize="xs" 
                ml={2}
                bg="#EFBF04"
                color="black"
                fontWeight="bold"
              >
                BETA
              </Badge>
            </Link>
          </Flex>

          {/* Horizontal Navigation Tabs */}
          <HStack spacing={1} flex={1} justify="center" maxW="800px">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  as={RouterLink}
                  to={item.path}
                  display="flex"
                  alignItems="center"
                  px={4}
                  py={2}
                  borderRadius="8px"
                  color={active ? "#EFBF04" : "whiteAlpha.800"}
                  bg={active ? "rgba(239, 191, 4, 0.1)" : "transparent"}
                  fontWeight={active ? "600" : "500"}
                  fontSize="sm"
                  transition="all 0.3s ease"
                  position="relative"
                  _hover={{
                    color: "#EFBF04",
                    bg: "rgba(239, 191, 4, 0.05)",
                    transform: "translateY(-1px)",
                  }}
                  _after={active ? {
                    content: '""',
                    position: "absolute",
                    bottom: "-12px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "30px",
                    height: "3px",
                    bg: "#EFBF04",
                    borderRadius: "2px",
                  } : {}}
                >
                  <Icon as={item.icon} boxSize={4} mr={2} />
                  <Text>{item.title}</Text>
                </Link>
              );
            })}
          </HStack>

          {/* Right Side: User Menu & Controls */}
          <Flex align="center" gap={4}>
            {/* CRM Counter Badge */}
            <Badge
              bg="rgba(239, 191, 4, 0.9)"
              color="black"
              fontSize="sm"
              px={3}
              py={1}
              borderRadius="full"
              fontWeight="bold"
              boxShadow="0 2px 8px rgba(239, 191, 4, 0.3)"
            >
              CRM: {uniqueCount}
            </Badge>

            {/* Sound Toggle */}
            <SoundToggleButton compact={true} />

            {/* User Menu */}
            <Menu isOpen={isUserMenuOpen} onClose={onUserMenuClose}>
              <MenuButton
                as={Button}
                variant="ghost"
                p={1}
                borderRadius="full"
                _hover={{ bg: "whiteAlpha.100" }}
                _active={{ bg: "whiteAlpha.200" }}
                onClick={onUserMenuOpen}
              >
                <Flex align="center" gap={3}>
                  <Avatar
                    key={profileImageKey}
                    size="sm"
                    name={getUserInitials()}
                    src={user?.profilePicture || undefined}
                    bg="#EFBF04"
                    color="black"
                    onError={handleAvatarError}
                    icon={(!user?.profilePicture || avatarError) ? <FaUser /> : undefined}
                  />
                  <Box textAlign="left" display={{ base: "none", md: "block" }}>
                    <Text color="white" fontSize="sm" fontWeight="600">
                      {user?.name || user?.email?.split('@')[0]}
                    </Text>
                    <Text color="whiteAlpha.700" fontSize="xs">
                      {user?.email}
                    </Text>
                  </Box>
                  <Icon as={FaChevronDown} color="whiteAlpha.700" boxSize={3} />
                </Flex>
              </MenuButton>
              <MenuList
                bg="rgba(26, 26, 26, 0.95)"
                backdropFilter="blur(20px)"
                border="1px solid rgba(239, 191, 4, 0.2)"
                borderRadius="12px"
                boxShadow="0 8px 32px rgba(0, 0, 0, 0.4)"
                minW="200px"
              >
                <MenuItem
                  onClick={() => navigate('/settings?tab=account')}
                  color="white"
                  _hover={{ bg: "rgba(239, 191, 4, 0.1)", color: "#EFBF04" }}
                  icon={<FaCog />}
                >
                  Settings
                </MenuItem>
                <MenuItem
                  onClick={handleLogout}
                  color="white"
                  _hover={{ bg: "rgba(239, 191, 4, 0.1)", color: "#EFBF04" }}
                  icon={<FaUser />}
                >
                  Logout
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Flex>
      </Box>

      {/* Spacer for fixed header */}
      <Box h="70px" />
    </>
  );
};

export default Navigation;
