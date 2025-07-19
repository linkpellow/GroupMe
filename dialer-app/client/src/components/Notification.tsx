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
  hasClickAction?: boolean;
}

const NotificationItem = styled.div<NotificationItemProps>`
  background: ${
    (props) =>
      props.notificationType === 'marketplace'
        ? 'linear-gradient(135deg, rgba(75, 225, 208, 0.98) 0%, rgba(34, 197, 94, 0.95) 100%)' // Marketplace gradient
        : 'linear-gradient(135deg, rgba(134, 239, 172, 0.98) 0%, rgba(74, 222, 128, 0.95) 100%)' // Lighter NextGen green gradient
  };
  color: ${
    (props) =>
      props.notificationType === 'marketplace'
        ? '#1F2937' // Marketplace dark
        : '#1F2937' // NextGen dark
  };
  padding: 20px 28px;
  border-radius: 16px;
  box-shadow: 
    0 8px 25px rgba(34, 197, 94, 0.2),
    0 4px 12px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: flex-start;
  gap: 16px;
  animation: ${(props) => (props.isClosing ? 'slideUp' : 'celebrationSlideDown')} 0.6s
    cubic-bezier(0.175, 0.885, 0.32, 1.275);
  margin: 0 20px;
  pointer-events: auto;
  will-change: transform, opacity;
  z-index: 9999;
  cursor: ${(props) => props.hasClickAction ? 'pointer' : 'default'};
  transition:
    transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    box-shadow 0.4s ease,
    scale 0.2s ease;
  border: 2px solid
    ${
      (props) =>
        props.notificationType === 'marketplace'
          ? 'rgba(255, 255, 255, 0.5)' // Marketplace bright border
          : 'rgba(255, 255, 255, 0.5)' // NextGen bright border
    };
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.5s;
  }

  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 
      0 12px 35px rgba(34, 197, 94, 0.3),
      0 6px 18px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.4);

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(-4px) scale(0.98);
  }

  @keyframes celebrationSlideDown {
    0% {
      transform: translateY(-120%) scale(0.8);
      opacity: 0;
    }
    50% {
      transform: translateY(-10%) scale(1.05);
      opacity: 0.9;
    }
    100% {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    to {
      transform: translateY(-120%) scale(0.9);
      opacity: 0;
    }
  }
`;

const NotificationLogo = styled.img`
  width: 36px;
  height: 36px;
  object-fit: contain;
  filter: 
    drop-shadow(0 3px 6px rgba(0, 0, 0, 0.2))
    drop-shadow(0 1px 2px rgba(255, 255, 255, 0.3));
  animation: logoGlow 2s ease-in-out infinite alternate;
  flex-shrink: 0;

  @keyframes logoGlow {
    0% {
      filter: 
        drop-shadow(0 3px 6px rgba(0, 0, 0, 0.2))
        drop-shadow(0 1px 2px rgba(255, 255, 255, 0.3));
    }
    100% {
      filter: 
        drop-shadow(0 4px 8px rgba(34, 197, 94, 0.3))
        drop-shadow(0 2px 4px rgba(255, 255, 255, 0.5));
    }
  }
`;

const NotificationContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const NotificationTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  letter-spacing: 0.5px;
`;

const NotificationLeadName = styled.div`
  font-size: 20px;
  font-weight: 800;
  line-height: 1.1;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9);
  letter-spacing: 0.3px;
  margin-top: 2px;
`;

const NotificationSubtext = styled.div`
  font-size: 14px;
  font-weight: 500;
  opacity: 0.9;
  line-height: 1.3;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.6);
  margin-top: 1px;
`;

// Keep a global audio element to prevent Chrome autoplay issues
let globalAudio: HTMLAudioElement | null = null;

// Function to safely play audio with multiple fallbacks for Chrome
const safePlayAudio = (audioElement: HTMLAudioElement) => {
  // Flag to track if we successfully played
  let played = false;
  
  // Try standard play first
  audioElement.play()
    .then(() => {
      console.log('Audio played successfully via standard play()');
      played = true;
    })
    .catch(async (error) => {
      console.warn('Standard audio play failed:', error);
      
      // Chrome autoplay policy workaround #1: Try muted first, then unmute
      if (!played) {
        try {
          // Mute, play, then unmute
          audioElement.muted = true;
          await audioElement.play();
          audioElement.muted = false;
          console.log('Audio played successfully via mute/unmute strategy');
          played = true;
        } catch (error2) {
          console.warn('Muted play attempt failed:', error2);
        }
      }
      
      // Chrome autoplay policy workaround #2: Listen for user interaction
      if (!played) {
        const playOnUserInteraction = () => {
          audioElement.play()
            .then(() => console.log('Audio played after user interaction'))
            .catch(e => console.error('Even with interaction, playback failed:', e));
          
          // Remove listeners after one interaction
          document.removeEventListener('click', playOnUserInteraction);
          document.removeEventListener('touchstart', playOnUserInteraction);
          document.removeEventListener('keydown', playOnUserInteraction);
        };
        
        document.addEventListener('click', playOnUserInteraction, { once: true });
        document.addEventListener('touchstart', playOnUserInteraction, { once: true });
        document.addEventListener('keydown', playOnUserInteraction, { once: true });
        
        console.log('Added user interaction listeners for audio playback');
      }
    });
};

// Initialize the global audio if needed
const getGlobalAudio = (): HTMLAudioElement => {
  if (!globalAudio) {
    globalAudio = new Audio('/sounds/Cash app sound.mp3');
    globalAudio.volume = 0.3;
    globalAudio.preload = 'auto';
    
    // Add error handling for audio loading
    globalAudio.addEventListener('error', (e) => {
      console.error('Audio loading failed:', e);
    });
    
    globalAudio.addEventListener('canplaythrough', () => {
      console.log('Audio loaded and ready to play');
    });
    
    // Preload the audio when the document is first interacted with
    const preloadAudio = () => {
      if (globalAudio) {
        globalAudio.load();
        // Try to enable audio context on user interaction
                 globalAudio.play().then(() => {
           if (globalAudio) {
             globalAudio.pause();
             globalAudio.currentTime = 0;
           }
          console.log('Audio context enabled via user interaction');
        }).catch(() => {
          console.log('Audio context not yet enabled, will retry on notification');
        });
      }
      document.removeEventListener('click', preloadAudio);
      document.removeEventListener('touchstart', preloadAudio);
      document.removeEventListener('keydown', preloadAudio);
    };
    
    document.addEventListener('click', preloadAudio, { once: true });
    document.addEventListener('touchstart', preloadAudio, { once: true });
    document.addEventListener('keydown', preloadAudio, { once: true });
  }
  return globalAudio;
};

interface NotificationProps {
  message: string;
  onClose: () => void;
  duration?: number;
  notificationType?: 'nextgen' | 'marketplace';
  leadName?: string;
  leadPhone?: string;
  onCallLead?: (phone: string, name: string) => void;
}

const Notification: React.FC<NotificationProps> = ({
  message,
  onClose,
  duration = 8000,
  notificationType = 'nextgen',
  leadName,
  leadPhone,
  onCallLead,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isChrome = navigator.userAgent.includes('Chrome');

  useEffect(() => {
    // Use global audio element for Chrome to avoid autoplay issues
    if (isChrome) {
      audioRef.current = getGlobalAudio();
    } else {
      // For other browsers, create a new audio instance each time
      audioRef.current = new Audio('/sounds/Cash app sound.mp3');
      audioRef.current.volume = 0.3;
      audioRef.current.preload = 'auto';
    }

    // Enhanced audio playback with better error handling
    if (audioRef.current) {
      // Reset the audio to beginning for playback
      audioRef.current.currentTime = 0;
      
      console.log(`[Notification Sound] Attempting to play sound (Chrome: ${isChrome})`);
      
      if (isChrome) {
        // For Chrome, use our safe play method
        safePlayAudio(audioRef.current);
      } else {
        // For other browsers, use standard approach with better error handling
        audioRef.current.play()
          .then(() => {
            console.log('[Notification Sound] Audio played successfully');
          })
          .catch((error) => {
            console.error('[Notification Sound] Error playing notification sound:', error);
            // Try the same fallback strategy as Chrome
            safePlayAudio(audioRef.current!);
          });
      }
    } else {
      console.warn('[Notification Sound] Audio element not available');
    }

    const timer = setTimeout(() => {
      setIsClosing(true);
      // Wait for animation to complete before removing
      setTimeout(onClose, 300);
    }, duration);

    return () => {
      clearTimeout(timer);
      // Don't pause global audio
      if (!isChrome && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [duration, onClose, isChrome]);

  const handleClick = () => {
    // If click-to-call is available, initiate call
    if (onCallLead && leadPhone && leadName) {
      console.log('[Notification] Initiating call to:', leadName, leadPhone);
      onCallLead(leadPhone, leadName);
    }
    
    setIsClosing(true);
    setTimeout(onClose, 300);
    
    // Try playing audio on click as a fallback (user interaction enables audio)
    if (audioRef.current) {
      console.log('[Notification Sound] User clicked, attempting audio playback');
      audioRef.current.currentTime = 0;
      audioRef.current.play()
        .then(() => {
          console.log('[Notification Sound] Audio played successfully on click');
        })
        .catch((error) => {
          console.warn('[Notification Sound] Click audio playback failed:', error);
        });
    }
  };

  return (
    <NotificationContainer>
      <NotificationItem
        isClosing={isClosing}
        onClick={handleClick}
        notificationType={notificationType}
        hasClickAction={!!(onCallLead && leadPhone && leadName)}
      >
        <NotificationLogo
          src={
            notificationType === 'marketplace' ? '/images/marketplace.png' : '/images/nextgen.png'
          }
          alt={notificationType === 'marketplace' ? 'Marketplace' : 'NextGen'}
        />
        <NotificationContent>
          {leadName ? (
            <>
              <NotificationTitle>🎉 New NextGen Lead!</NotificationTitle>
              <NotificationLeadName>{leadName}</NotificationLeadName>
              <NotificationSubtext>Ready to convert! 🚀</NotificationSubtext>
            </>
          ) : (
            <NotificationTitle>{message}</NotificationTitle>
          )}
        </NotificationContent>
      </NotificationItem>
    </NotificationContainer>
  );
};

export default Notification;
