import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import {
  FiMoreVertical,
  FiEdit,
  FiCalendar,
  FiSend,
  FiMessageSquare,
  FiUserPlus,
} from 'react-icons/fi';
import { lockScroll, unlockScroll } from '../shared/scrollLock';

// Professional styled components with modern UI/UX
const ActionsButton = styled.button`
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  color: #4a5568;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 100;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.2);
    color: #2d3748;
  }

  &:active {
    transform: translateY(1px);
  }

  &:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  svg {
    width: 18px;
    height: 18px;
    pointer-events: none;
  }
`;

const MenuPortal = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  z-index: 99999;
  display: ${(props) => (props.$isOpen ? 'block' : 'none')};
  pointer-events: ${(props) => (props.$isOpen ? 'auto' : 'none')};
`;

const MenuContainer = styled.div`
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  min-width: 220px;
  transform-origin: top right;
  animation: menuSlideIn 0.15s ease-out;
  opacity: 1;
  transition: opacity 0.15s ease, transform 0.15s ease;

  @keyframes menuSlideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-5px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  &.closing {
    opacity: 0;
    transform: scale(0.97) translateY(-4px);
  }
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: ${(props) => (props.$danger ? '#e53e3e' : '#4a5568')};
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    background: ${(props) =>
      props.$danger ? 'rgba(229, 62, 62, 0.1)' : 'rgba(74, 85, 104, 0.08)'};
    color: ${(props) => (props.$danger ? '#c53030' : '#2d3748')};
  }

  &:active {
    background: ${(props) =>
      props.$danger ? 'rgba(229, 62, 62, 0.15)' : 'rgba(74, 85, 104, 0.12)'};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const MenuDivider = styled.div`
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
  margin: 8px 0;
`;

interface LeadActionsMenuProps {
  lead: any; // Using any to accept different Lead type definitions
  onEdit: (lead: any) => void;
  onSendToSpreadsheet: (lead: any) => void;
  onBookAppointment: (lead: any) => void;
  onAddToCampaign: (lead: any) => void;
  onQuickDrip: (lead: any) => void;
  onReferralPartner: (lead: any) => void;
  onAddToReminders?: (lead: any) => void;
  onPopoutNotes?: (lead: any) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const LeadActionsMenu: React.FC<LeadActionsMenuProps> = ({
  lead,
  onEdit,
  onSendToSpreadsheet,
  onBookAppointment,
  onAddToCampaign,
  onQuickDrip,
  onReferralPartner,
  onAddToReminders,
  onPopoutNotes,
  className,
  style,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Ensure component is mounted before rendering portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Calculate menu position to keep it within viewport
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 320; // Approximate menu height
      const menuWidth = 220;

      let top = buttonRect.bottom + 8;
      let left = buttonRect.right - menuWidth;

      // Check if menu would go off screen bottom
      if (top + menuHeight > window.innerHeight) {
        top = buttonRect.top - menuHeight - 8;
      }

      // Check if menu would go off screen left
      if (left < 8) {
        left = 8;
      }

      // Check if menu would go off screen right
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }

      setMenuPosition({ top, left });
    }
  }, [isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Global scroll lock when menu open
  useEffect(() => {
    if (isOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [isOpen]);

  const handleMenuItemClick = (action: () => void) => {
    action();
    setIsOpen(false);
    setClosing(false);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <ActionsButton
        ref={buttonRef}
        onClick={handleButtonClick}
        className={className}
        style={style}
        aria-label="Lead actions menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        type="button" // Explicitly set button type
      >
        <FiMoreVertical />
      </ActionsButton>

      {isMounted &&
        (isOpen || closing) &&
        createPortal(
          <MenuPortal $isOpen={true}>
            <MenuContainer
              ref={menuRef}
              style={{
                position: 'fixed',
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
              role="menu"
              aria-label="Lead actions"
              onClick={(e) => e.stopPropagation()}
              onMouseLeave={() => {
                if (closing) return;
                setClosing(true);
                setTimeout(() => {
                  setClosing(false);
                  setIsOpen(false);
                }, 150);
              }}
              className={closing ? 'closing' : ''}
            >
              <MenuItem onClick={() => handleMenuItemClick(() => onEdit(lead))} role="menuitem">
                <FiEdit />
                Edit Lead
              </MenuItem>

              <MenuItem
                onClick={() => handleMenuItemClick(() => onSendToSpreadsheet(lead))}
                role="menuitem"
              >
                <FiSend />
                Send to Spreadsheet
              </MenuItem>

              <MenuItem
                onClick={() => handleMenuItemClick(() => onBookAppointment(lead))}
                role="menuitem"
              >
                <FiCalendar />
                Book Appointment
              </MenuItem>

              <MenuItem
                onClick={() => handleMenuItemClick(() => onAddToCampaign(lead))}
                role="menuitem"
              >
                <FiSend />
                Add to Drip Campaign
              </MenuItem>

              <MenuItem
                onClick={() => handleMenuItemClick(() => onQuickDrip(lead))}
                role="menuitem"
              >
                <FiMessageSquare />
                Quick Drip Message
              </MenuItem>

              <MenuItem
                onClick={() => handleMenuItemClick(() => onReferralPartner(lead))}
                role="menuitem"
              >
                <FiUserPlus />
                Referral Partner
              </MenuItem>

              <MenuDivider />
            </MenuContainer>
          </MenuPortal>,
          document.body
        )}
    </>
  );
};

// Export a memoized version for performance
export default React.memo(LeadActionsMenu);
