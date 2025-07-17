import React from 'react';
import { IconButton, Tooltip } from '@chakra-ui/react';
import { MdVolumeUp, MdVolumeOff } from 'react-icons/md';
import { useNotificationSound } from '../context/NotificationSoundContext';

/**
 * Small speaker icon that toggles notification sounds.
 * Persisted via NotificationSoundContext (localStorage).
 */
const SoundToggleButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { soundEnabled, toggleSound } = useNotificationSound();

  const handleClick = () => {
    if (!soundEnabled) {
      // When enabling, optionally request browser notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
    toggleSound();
  };

  return (
    <Tooltip label={soundEnabled ? 'Mute notification sounds' : 'Enable notification sounds'} placement="left">
      <IconButton
        aria-label={soundEnabled ? 'Mute notification sounds' : 'Enable notification sounds'}
        icon={soundEnabled ? <MdVolumeUp /> : <MdVolumeOff />}
        size={compact ? 'sm' : 'md'}
        variant="ghost"
        colorScheme="orange"
        onClick={handleClick}
      />
    </Tooltip>
  );
};

export default SoundToggleButton; 