import React, { useEffect, useState, useRef } from 'react';
import styled from '@emotion/styled';

const NotificationContainer = styled.div`
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 600px;
  padding-top: 20px;
  pointer-events: none;
`;

interface NotificationItemProps {
  isClosing: boolean;
  notificationType?: 'nextgen' | 'marketplace';
}

const NotificationItem = styled.div<NotificationItemProps>`
  background: ${
    (props) =>
      props.notificationType === 'marketplace'
        ? 'rgba(75, 225, 208, 0.95)' // Marketplace teal
        : 'rgba(146, 220, 126, 0.95)' // NextGen green
  };
  color: ${
    (props) =>
      props.notificationType === 'marketplace'
        ? '#2C4352' // Marketplace dark blue
        : '#1a472a' // NextGen dark green
  };
  padding: 16px 24px;
  border-radius: 12px; // More rounded corners
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 12px;
  animation: ${(props) => (props.isClosing ? 'slideUp' : 'slideDown')} 0.5s
    cubic-bezier(0.34, 1.56, 0.64, 1);
  margin: 0 20px;
  font-size: 16px;
  pointer-events: auto;
  will-change: transform, opacity;
  z-index: 9999;
  cursor: pointer;
  transition:
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.3s ease;
  border: 1px solid
    ${
      (props) =>
        props.notificationType === 'marketplace'
          ? 'rgba(75, 225, 208, 0.4)' // Marketplace teal border
          : 'rgba(34, 197, 94, 0.4)' // NextGen green border
    };

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }

  @keyframes slideDown {
    from {
      transform: translateY(-120%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(-120%);
      opacity: 0;
    }
  }
`;

const NotificationLogo = styled.img`
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
`;

const NotificationText = styled.div`
  font-size: 16px;
  font-weight: 600;
  flex: 1;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.5);
`;

interface NotificationProps {
  message: string;
  onClose: () => void;
  duration?: number;
  notificationType?: 'nextgen' | 'marketplace';
}

const Notification: React.FC<NotificationProps> = ({
  message,
  onClose,
  duration = 8000,
  notificationType = 'nextgen',
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio('/sounds/Cash app sound.mp3');
    audioRef.current.volume = 0.3;

    // Add event listeners for debugging
    if (audioRef.current) {
      audioRef.current.addEventListener('canplaythrough', () => {
        console.log('Audio loaded and ready to play');
        audioRef.current?.play().catch((error) => {
          console.error('Error playing notification sound:', error);
        });
      });

      audioRef.current.addEventListener('error', (e) => {
        console.error('Error loading audio:', e);
      });
    }

    const timer = setTimeout(() => {
      setIsClosing(true);
      // Wait for animation to complete before removing
      setTimeout(onClose, 300);
    }, duration);

    return () => {
      clearTimeout(timer);
      // Cleanup audio element
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [duration, onClose]);

  const handleClick = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  return (
    <NotificationContainer>
      <NotificationItem
        isClosing={isClosing}
        onClick={handleClick}
        notificationType={notificationType}
      >
        <NotificationLogo
          src={
            notificationType === 'marketplace' ? '/images/marketplace.png' : '/images/nextgen.png'
          }
          alt={notificationType === 'marketplace' ? 'Marketplace' : 'NextGen'}
        />
        <NotificationText>{message}</NotificationText>
      </NotificationItem>
    </NotificationContainer>
  );
};

export default Notification;
