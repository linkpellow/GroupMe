import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  useToast,
  Flex,
  Input as ChakraInput,
  Button as ChakraButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Text,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  useDisclosure,
  Spinner,
} from '@chakra-ui/react';
import { FaTimes, FaPhone, FaPhoneSlash, FaBirthdayCake, FaThumbtack } from 'react-icons/fa';
import { FiChevronLeft, FiChevronRight, FiDownload } from 'react-icons/fi';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import { ChevronDownIcon } from '@chakra-ui/icons';
import TripleChevronIcon from '../components/icons/TripleChevronIcon';

import axiosInstance from '../api/axiosInstance';
import { useLeads } from '../context/LeadContext';
import LoadingCroc from '../components/LoadingCroc';
import MultiStateFilter from '../components/MultiStateFilter';
import MultiDispositionFilter from '../components/MultiDispositionFilter';
import { useLeadsQuery } from '../hooks/useLeadsQuery';
import { useLeadsData } from '../hooks/useLeadsData';
import { LeadsQueryState } from '../types/queryTypes';
import type { QUERY_CONFIG } from '@shared/config/queryConfig';
import StateIcon from '../components/StateIcon';
import LocalTime from '../components/LocalTime';
import LeadActionsMenu from '../components/LeadActionsMenu';
import EditLeadModal from '../components/EditLeadModal';
import BookAppointmentModal from '../components/BookAppointmentModal';
import TextdripIcon from "../components/icons/TextdripIcon";
import { AddToCampaignModal } from "../components/AddToCampaignModal";
import { QuickDripModal } from '../components/QuickDripModal';
import { getTimezoneFromZipCode, getAbbreviation } from '../utils/timezoneUtils';
import { leadsApi } from '../services/leadsApi';
import NotesEditor from '../components/NotesEditor';
import { useQuery } from '@tanstack/react-query';
import { useCallCountsContext } from '../context/CallCountsContext';
import {
  refreshCountsFromServer,
  normalizePhone,
} from '../utils/lifetimeCounts';
import { useLifetimeCounts } from '../context/LifetimeCountsContext';
import { dialPhone } from '../utils/dial';
import FollowUpStrip from '../components/FollowUpStrip'; // Corrected import path
import RemindersStrip from '../components/RemindersStrip';
import { lockScroll, unlockScroll } from '../shared/scrollLock';
import PullToRefresh from 'react-simple-pull-to-refresh';
import CrocLoader from '../components/CrocLoader';
import { safeStr } from '../utils/string';

// Define disposition colors
const DISPOSITION_COLORS = {
  'Positive Contact': '#38A169',
  'Negative Contact': '#E53E3E',
  'Employer Coverage': '#2196F3',
  Brokie: '#FF9800',
  'Buy Or Die': '#9C27B0',
  'Unhealthy/Referred': '#795548',
  Foreign: '#607D8B',
  Quoted: '#00BCD4',
  SOLD: '#84CC16',
  Appointment: '#FFC107',
  'No Contact': '#805AD5',
  'Invalid/Disconnected': '#E91E63',
  'Hung Up': '#9E9E9E',
  Ghosted: '#E6F0F5',
  default: '#FFFFFF',
};

// Helper functions
const safe = (v: string | null | undefined): string => (v ?? '');

const formatPhoneNumber = (phone: string | undefined | null) => {
  if (!phone) {
    console.warn('[Leads.tsx] formatPhoneNumber received null or undefined phone value.');
    return ''; // Return empty string if phone is null or undefined
  }
  const cleaned = safeStr(phone).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return phone;
};

const formatHeight = (height: string | undefined | null) => {
  if (!height) return '';
  if (safeStr(height).includes("'")) {
    return height;
  }
  const totalInches = parseInt(safeStr(height));
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
};

const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return '';
  try {
    if (safeStr(dateString).includes('/')) {
      return dateString;
    }
    const [year, month, day] = safeStr(dateString).split('-');
    if (year && month && day) {
      return `${month}/${day}/${year}`;
    }
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
    }
  } catch (error) {
    // Silently fail and return original string for production
  }
  return dateString;
};

const formatEmail = (email: string | undefined | null) => {
  if (!email) return '';
  if (safeStr(email).length > 25) {
    const atIndex = email.indexOf('@');
    if (atIndex !== -1) {
      const username = email.substring(0, atIndex);
      const domain = email.substring(atIndex);
      return `${username}\n${domain}`;
    }
  }
  return email;
};

// Production-grade copy to clipboard function with visual feedback
const copyToClipboard = async (text: string, toast: any, fieldName?: string) => {
  if (!text) return;

  try {
    // Use modern clipboard API if available
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'absolute';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
      } catch (err) {
        throw new Error('Copy failed');
      } finally {
        textArea.remove();
      }
    }

    // Show success toast
    toast({
      title: fieldName ? `${fieldName} copied!` : 'Copied to clipboard!',
      status: 'success',
      duration: 1500,
      isClosable: false,
      position: 'top',
    });
  } catch (err) {
    // Show error toast
    toast({
      title: 'Failed to copy',
      description: 'Please try selecting and copying manually',
      status: 'error',
      duration: 2000,
      isClosable: true,
    });
  }
};

// Types
interface Lead {
  _id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zipcode: string;
  dob: string;
  height: string;
  weight: string;
  gender: string;
  state: string;
  disposition: string;
  notes: string;
  source: string;
  status: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  city: string;
  street1: string;
  street2: string;
  householdSize: string;
  householdIncome: string;
  military: boolean;
  pregnant: boolean;
  tobaccoUser: boolean;
  hasPrescription: boolean;
  hasMedicarePartsAB: boolean;
  hasMedicalCondition: boolean;
  medicalConditions: string[];
  insuranceTimeframe: string;
  campaignName: string;
  product: string;
  vendorName: string;
  accountName: string;
  bidType: string;
  price: string;
  callLogId: string;
  callDuration: string;
  sourceHash: string;
  subIdHash: string;
  vendor_id?: string;
  nextgenId?: string;
}

interface DetachedLead {
  id: string;
  lead: Lead;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

// Styled components
const GlobalStyles = createGlobalStyle`
  /* Misc global tweaks */
  html, body, .leads-page-container {
    /* Reserve space for the vertical scrollbar so its appearance doesn't shift content */
    scrollbar-gutter: stable;
  }
  body.disable-ptr {
    overscroll-behavior-y: contain; /* Prevents rubber-band refresh on mobile */
  }
`;

const LeadsContainer = styled.div<{
  $pullDistance: number;
  $isRefreshing: boolean;
}>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: visible;
  overflow-x: hidden;
  padding: 10px 60px 10px 60px;
  margin-bottom: 140px;
  position: relative;
  transform: translateY(${(props) => Math.min(props.$pullDistance, 350)}px);
  transition: ${(props) =>
    props.$isRefreshing
      ? 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
      : props.$pullDistance > 0
        ? 'none'
        : 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)'};
`;

// Wrapper that reserves scrollbar gutter so width never changes
const LeadsScrollWrapper = styled.div`
  position: relative;
  overflow-y: auto;
  padding-right: 17px; /* permanent gutter equal to typical scrollbar */
  box-sizing: border-box;
  flex: 1 1 auto;
`;

const SearchContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const SearchInput = styled.input`
  width: 180px;
  min-width: 120px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 0.875rem;
  height: 36px;
  border: none;
  border-radius: 4px;
  padding: 0 10px;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-weight: 600;
  &::placeholder {
    color: #b3b0a7;
  }
  &:focus {
    outline: none;
    border: 1px solid #EFBF04;
    box-shadow: 0 0 0 1px #EFBF04;
  }
`;

const ClearButton = styled.button`
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;

  &:hover {
    color: white;
  }
`;

const DetachedLeadWindow = styled.div`
  position: fixed;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
`;

// StyledLeadCard with production features
const StyledLeadCard = styled.div<{
  $isDragging?: boolean;
  $isOver?: boolean;
  $moveUp?: boolean;
  $moveDown?: boolean;
  $backgroundColor: string;
  $isActive?: boolean;
  $isSelected?: boolean;
  $isDeleteMode?: boolean;
  $isClicked?: boolean;
}>`
  padding: 8px 0 0 0;
  margin: 0;
  background: ${(props) => props.$backgroundColor};
  border-radius: 0;
  position: relative;
  transition:
    transform 0.3s ease,
    opacity 0.2s ease,
    margin 0.3s ease,
    box-shadow 0.3s ease,
    outline 0.2s ease;
  transform-origin: center center;
  transform: ${(props) => {
    if (props.$isDragging) return 'scale(0.98)';
    if (props.$moveUp) return 'translateY(-100%)';
    if (props.$moveDown) return 'translateY(100%)';
    if (props.$isClicked) return 'translateY(-2px)';
    return 'none';
  }};
  box-shadow: ${(props) => {
    if (props.$isDragging) return '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
    if (props.$isClicked) return '0 6px 15px rgba(0, 0, 0, 0.35), 0 0 0 3px #B8860B';
    return '0 1px 3px rgba(0, 0, 0, 0.1)';
  }};
  outline: ${(props) => (props.$isSelected ? '2px solid #FF8C00' : 'none')};
  outline-offset: -2px;
  user-select: none;
  margin: ${(props) => {
    if (props.$isOver) return '1rem 0';
    if (props.$isClicked) return '0.75rem 0';
    return '0';
  }};
  opacity: ${(props) => (props.$isDragging ? '0.8' : '1')};
  z-index: ${(props) => {
    if (props.$isDragging) return 1000;
    if (props.$isClicked) return 2000;
    return 1;
  }};
  width: 100%;
  min-width: 100%;
  box-sizing: border-box;
  border-radius: 0;
  margin-right: 0;
  margin-bottom: 10px; /* space between cards */

  &:hover:not(:active):not(:has(select:focus)):not(:has(select:hover)):not(:has(select:active)) {
    transform: scale(1.01);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
    z-index: 500;
    transform-origin: center center;
  }

  &:has(.disposition-section select:active),
  &:has(.disposition-section select:focus),
  &:has(.disposition-section select:hover) {
    transform: none !important;
    box-shadow: ${(props) => {
      if (props.$isClicked) return '0 6px 15px rgba(0, 0, 0, 0.35), 0 0 0 3px #B8860B';
      return '0 1px 3px rgba(0, 0, 0, 0.1)';
    }} !important;
  }

  .drag-handle {
    width: 100%;
    height: 20px;
    background: ${(props) => props.$backgroundColor};
    cursor: grab;
    position: relative;
    margin-top: -1px;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    z-index: 3;

    &:active {
      cursor: grabbing;
    }

    &:after {
      content: '';
      display: block;
      width: 40px;
      height: 4px;
      background: rgba(0, 0, 0, 0.15);
      border-radius: 2px;
      transition: width 0.2s ease;
    }

    &:hover:after {
      width: 50px;
    }
  }

  .grid-container {
    display: grid !important;
    grid-template-columns: 2.025fr 2.025fr 1.525fr 1.025fr 1.025fr 1.025fr 1.025fr 1.025fr 1.025fr 1.25fr !important;
    grid-auto-flow: row !important;
    grid-template-rows: auto auto !important;
    column-gap: 8px !important;
    row-gap: 0 !important;
    align-items: center !important;
    padding: 0 !important;
    width: 100% !important;
    box-sizing: border-box !important;
    min-height: 60px !important;
  }

  .grid-header {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 24px !important;
    box-sizing: border-box !important;
    width: 100% !important;
    border: 1px solid #000 !important;
    font-size: 0.75rem !important;
    font-weight: bold !important;
    color: white !important;
    background-color: black !important;
    text-align: center !important;
    margin-bottom: 4px !important;
    border-radius: 2px !important;
  }

  .grid-item {
    min-width: 0 !important;
    overflow: hidden !important;
    padding: 0 !important;
    box-sizing: border-box !important;
    text-align: center !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 36px !important;
    width: 100% !important;
    position: relative !important;
  }

  .text-content {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.4;
    font-size: 0.95em;
    padding: 4px;
    width: 100%;
    min-height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .text-content.value {
    font-size: 0.95em;
    font-weight: 700;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.5);
    min-height: 32px;
    height: 32px;
    border: 1px solid black;

    &:hover {
      color: #EFBF04;
      background: rgba(255, 255, 255, 0.8);
    }
  }

  .notes-textarea {
    width: 100%;
    min-height: 350px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.9em;
    resize: vertical;
    background: white;
    margin-top: 8px;

    &:focus {
      outline: none;
      border-color: #EFBF04;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }
  }

  /* macOS window buttons */
  .mac-buttons {
    display: flex;
    gap: 6px;
    align-items: center;
    margin: 6px 0 4px 6px;
  }
  .mac-buttons .btn {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    cursor: pointer;
    flex-shrink: 0;
  }
  .mac-buttons .red {
    background: #ff5f57;
  }
  .mac-buttons .green {
    background: #28c840;
  }
  .mac-buttons .btn:hover {
    filter: brightness(0.9);
  }
  .mac-buttons .tack {
    background: transparent;
    border: none;
    width: auto;
    height: auto;
    padding: 0;
  }
`;

const CallButton = styled.button`
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 36px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.2),
    inset 0 -4px 4px rgba(0, 0, 0, 0.1);
  border: 2px solid #000;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  min-width: 100px;

  &:hover {
    background-color: #45a049;
    transform: translateY(-2px);
    box-shadow:
      0 6px 8px rgba(0, 0, 0, 0.3),
      inset 0 -4px 4px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(1px);
    box-shadow:
      0 2px 3px rgba(0, 0, 0, 0.2),
      inset 0 -2px 2px rgba(0, 0, 0, 0.1);
  }
`;

const HangUpButton = styled.button`
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 36px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.2),
    inset 0 -4px 4px rgba(0, 0, 0, 0.1);
  border: 2px solid #000;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  min-width: 120px;

  &:hover {
    background-color: #c82333;
    transform: translateY(-2px);
    box-shadow:
      0 6px 8px rgba(0, 0, 0, 0.3),
      inset 0 -4px 4px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(1px);
    box-shadow:
      0 2px 3px rgba(0, 0, 0, 0.2),
      inset 0 -2px 2px rgba(0, 0, 0, 0.1);
  }
`;

const DispositionSelect = styled.select`
  width: 100%;
  padding: 4px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  font-size: 0.9em;
  cursor: pointer !important;
  position: relative;
  z-index: 10;
  isolation: isolate;
  pointer-events: auto;
  user-select: auto;

  &:focus {
    outline: none;
    border-color: #EFBF04;
    box-shadow: 0 0 0 1px #EFBF04;
  }

  option {
    background-color: #ffffff;
    color: #000;
  }

  option:checked,
  option:hover {
    background-color: #EFBF04;
    color: #000;
  }
`;

// Remove old simple LeadCard and rename StyledLeadCard to LeadCard
const LeadCard = StyledLeadCard;

const FilterBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, max-content));
  gap: 4px; /* thin space */
  align-items: center;
  padding: 0.5rem 60px;
  background: rgba(0, 0, 0, 0.5);
  overflow-x: auto;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: 0.875rem;
  grid-auto-flow: row;
`;

const FilterButton = styled.button`
  width: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  color: white;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-weight: 600;
  font-size: 0.875rem;
  line-height: 1.2;
  height: 36px;
  letter-spacing: 0.01em;
  padding: 0 10px;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  border: 1px solid transparent;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: #EFBF04;
  }
  &.active {
    background-color: rgba(239, 191, 4, 0.25);
    color: #000;
    border-width: 2px;
    border-color: #EFBF04;
  }
`;

const DropdownContainer = styled.div`
  position: fixed;
  min-width: 120px;
  background-color: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 9999;
  padding: 5px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.15s ease, transform 0.15s ease;

  &.closing {
    opacity: 0;
    transform: translateY(-6px);
  }
`;

const DropdownItem = styled.div`
  padding: 8px 16px;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  pointer-events: auto;
  white-space: nowrap; /* prevent mid-word wraps like "Marketplace" */
  overflow: hidden;
  text-overflow: ellipsis;
  &:hover {
    background: #EFBF04;
    color: #000;
  }
`;

const ChevronIcon = () => (
  <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M1 1L6 5L11 1"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AddButton = styled.button`
  border-radius: 4px;
  width: 40px;
  height: 36px;
  font-size: 1.5rem;
  background: #fb923c;
  color: white;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  margin-left: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// Create a reusable dropdown component that uses React Portal
interface DropdownPortalProps {
  isOpen: boolean;
  buttonRef: React.RefObject<HTMLButtonElement>;
  onClose?: () => void;
  children: React.ReactNode;
}

const DropdownPortal: React.FC<DropdownPortalProps> = ({ isOpen, buttonRef, onClose, children }) => {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      lockScroll();
    } else {
      unlockScroll();
    }
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    // Cleanup in case component unmounts while open
    return () => {
      if (isOpen) unlockScroll();
    };
  }, [isOpen, buttonRef]);

  if (!isOpen && !closing) return null;

  return ReactDOM.createPortal(
    <DropdownContainer
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
      }}
      data-dropdown-portal
      onClick={(e) => {
        console.log('[DEBUG] DropdownContainer clicked', e.target);
        // Don't stop propagation - let the clicks go through to items
      }}
      onMouseLeave={() => {
        if (closing) return;
        setClosing(true);
        setTimeout(() => {
          setClosing(false);
          onClose && onClose();
        }, 150);
      }}
      className={closing ? 'closing' : ''}
    >
      {children}
    </DropdownContainer>,
    document.body
  );
};

// Main component
export default function Leads() {
  const toast = useToast();

  // Get context values we need
  const { getColorForDisposition } = useLeads();

  // Use the integrated hooks
  const { queryState, updateQueryState, queryVersion } = useLeadsQuery();

  // Get available states and dispositions - these should come from your context or constants
  // For now, using common US states and dispositions as placeholders
  const availableStates: string[] = [
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DE',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY',
  ];

  // Fetch dispositions list so dropdowns stay in sync with Settings page
  const { data: dispositionsList } = useQuery({
    queryKey: ['dispositions'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/api/dispositions');
        // API may return array directly or under .dispositions
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data?.dispositions)) return res.data.dispositions;
        return [];
      } catch {
        return [];
      }
    },
    staleTime: 60 * 1000,
  });

  // Ensure special sentinel option always exists
  const availableDispositions: string[] = React.useMemo(() => {
    // Add console warning if the upstream data is missing
    if (!dispositionsList) {
      console.warn('[Leads.tsx] dispositionsList is null or undefined. Using empty array for dropdown.');
    }
    const names: string[] = Array.isArray(dispositionsList)
      ? dispositionsList.map((d: any) => d.name)
      : [];

    // Prepend the synthetic option if the API doesn\'t provide it
    if (!names.includes('No Disposition')) {
      names.unshift('No Disposition');
    }

    return names;
  }, [dispositionsList]);

  // useLeadsData expects an object with queryState and queryVersion
  const { leads, isLoading, error, pagination, refetch } = useLeadsData({
    queryState,
    queryVersion,
    enabled: true,
  });

  // Local state
  const [detachedLeads, setDetachedLeads] = useState<DetachedLead[]>([]);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [bulkEditMode, setBulkEditMode] = useState<'none' | 'delete' | 'move'>('none');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEditLead, setSelectedEditLead] = useState<Lead | null>(null);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaignLeadId, setCampaignLeadId] = useState<string | null>(null);
  const [quickDripLead, setQuickDripLead] = useState<Lead | null>(null);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [selectedAppointmentLead, setSelectedAppointmentLead] = useState<Lead | null>(null);
  const { incrementCount, counts } = useLifetimeCounts();
  // CRM unique call counter
  const { increment } = useCallCountsContext();
  const [isReferralOpen, setReferralOpen] = useState(false);
  const [referralLead, setReferralLead] = useState<Lead | null>(null);
  type IframeStatus = 'loading' | 'loaded' | 'blocked';
  const [iframeStatus, setIframeStatus] = useState<IframeStatus>('loading');
  const [isDownloading, setIsDownloading] = useState(false);

  const leadsContainerRef = useRef<HTMLDivElement>(null);

  // Create refs for each dropdown button
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const pipelineButtonRef = useRef<HTMLButtonElement>(null);
  const timeZoneButtonRef = useRef<HTMLButtonElement>(null);
  const editAllButtonRef = useRef<HTMLButtonElement>(null);

  const [sortOpen, setSortOpen] = useState(false);
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [timeZoneOpen, setTimeZoneOpen] = useState(false);
  const [editAllOpen, setEditAllOpen] = useState(false);

  // Time-zone custom sort direction (client-side only)
  const [useTimeZoneSort, setUseTimeZoneSort] = useState(false);
  const [timeZoneSortDir, setTimeZoneSortDir] = useState<'asc' | 'desc'>('asc');

  // ===== Time-Zone Filter (dropdown lists EST, EDT, etc.)
  const [selectedTzFilter, setSelectedTzFilter] = useState<string | null>(null);

  // Add a global message listener for pop-out window updates
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      // Basic security: check the origin of the message
      if (event.origin !== window.location.origin) {
        return;
      }

      const { type } = event.data;
      if (type === 'LEAD_NOTES_UPDATED' || type === 'LEAD_DISPOSITION_UPDATED') {
        console.log(`[Leads.tsx] Received ${type}, refetching data...`);
        refetch();
      }
    };

    window.addEventListener('message', messageHandler);

    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, [refetch]); // Dependency on refetch ensures it has the latest query scope

  // Fetch persistent counts from server for visible leads
  React.useEffect(() => {
    if (leads && Array.isArray(leads) && leads.length) {
      const phones = leads.map((l: any) => l.phone).filter(Boolean);
      refreshCountsFromServer(phones);
    }
  }, [leads]);

  // Handle click outside for all dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Check if the click is within a portal dropdown
      const dropdownContainers = document.querySelectorAll('[data-dropdown-portal]');
      const clickedInDropdown = Array.from(dropdownContainers).some((container) =>
        container.contains(target)
      );

      if (clickedInDropdown) {
        return; // Don't close if clicking inside any dropdown
      }

      if (sortButtonRef.current && !sortButtonRef.current.contains(target)) {
        setSortOpen(false);
      }
      if (pipelineButtonRef.current && !pipelineButtonRef.current.contains(target)) {
        setPipelineOpen(false);
      }
      if (timeZoneButtonRef.current && !timeZoneButtonRef.current.contains(target)) {
        setTimeZoneOpen(false);
      }
      if (editAllButtonRef.current && !editAllButtonRef.current.contains(target)) {
        setEditAllOpen(false);
      }
    };

    // Use click instead of mousedown to allow dropdown items to be clicked
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Handlers
  const handleSearchChange = useCallback(
    (value: string) => {
      updateQueryState({ search: value, page: 1 });
    },
    [updateQueryState]
  );

  const handleStateFilterChange = useCallback(
    (states: string[]) => {
      updateQueryState({ filters: { ...queryState.filters, states }, page: 1 });
    },
    [updateQueryState, queryState.filters]
  );

  const handleDispositionFilterChange = useCallback(
    (dispositions: string[]) => {
      updateQueryState({
        filters: { ...queryState.filters, dispositions },
        page: 1,
      });
    },
    [updateQueryState, queryState.filters]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateQueryState({ page });
      if (leadsContainerRef.current) {
        leadsContainerRef.current.scrollTop = 0;
      }
    },
    [updateQueryState]
  );

  // Add this handler for pipeline filter
  const handlePipelineFilterChange = useCallback(
    (value: string) => {
      console.log('[DEBUG] Pipeline filter change:', value);
      console.log('[DEBUG] Current queryState before update:', queryState);

      // Validate the pipeline source value
      if (!isPipelineSource(value)) {
        console.error('[ERROR] Invalid pipeline source:', value);
        return;
      }

      // Update the query state with the new pipeline filter
      const newFilters: LeadsQueryState['filters'] = {
        ...queryState.filters,
        pipelineSource: value as PipelineSource,
      };

      console.log('[DEBUG] New filters to be applied:', newFilters);

      updateQueryState({
        filters: newFilters,
        page: 1, // Reset to first page when filter changes
      });

      console.log('[DEBUG] Pipeline filter update complete');
    },
    [updateQueryState, queryState.filters]
  );

  // Generic sort handler allowing different fields
  const handleSortChange = useCallback(
    (sortBy: 'createdAt' | 'timeZoneCustom', sortDirection: 'asc' | 'desc') => {
      console.log('[DEBUG] Sort change:', { sortBy, sortDirection });
      if (sortBy === 'timeZoneCustom') {
        // Client-side only sort; activate custom TZ sort
        setUseTimeZoneSort(true);
        setTimeZoneSortDir(sortDirection);
      } else {
        setUseTimeZoneSort(false);
        updateQueryState({ sortBy: 'createdAt', sortDirection, page: 1 });
      }
    },
    [updateQueryState]
  );

  // Add lead handler (placeholder: just reloads for now)
  const handleAddLead = async () => {
    try {
      // TODO: Replace with modal or form for new lead
      await axiosInstance.post('/api/leads', { name: 'New Lead' });
      toast({ title: 'Lead added!', status: 'success' });
      refetch();
    } catch (err) {
      toast({ title: 'Failed to add lead', status: 'error' });
    }
  };

  // Lead Actions Menu handlers
  const handleEditLead = useCallback((lead: Lead) => {
    setSelectedEditLead(lead);
    setEditModalOpen(true);
  }, []);

  const handleDeleteLead = useCallback(
    async (leadId: string) => {
      if (!window.confirm('Are you sure you want to delete this lead?')) {
        return;
      }

      try {
        await axiosInstance.delete(`/api/leads/${leadId}`);
        toast({ title: 'Lead deleted successfully', status: 'success' });
        refetch();
      } catch (err) {
        toast({ title: 'Failed to delete lead', status: 'error' });
      }
    },
    [refetch, toast]
  );

  const handleSendToSpreadsheet = useCallback(
    (lead: Lead) => {
      // Get lead disposition color
      const color = getColorForDisposition(lead.disposition || '');

      // Format the data for the spreadsheet
      const spreadsheetData = {
        status: lead.disposition || '',
        name: lead.name || '',
        email: lead.email || '',
        state: lead.state || '',
        zipcode: lead.zipcode || '',
        dob: lead.dob || '',
        leadType: lead.source || '',
        number: lead.phone || '',
        apptDate: '', // You can add appointment date if available
        notes: lead.notes || '',
        color: color,
      };

      // Check if we're on the spreadsheet page
      if (window.location.pathname === '/spreadsheet' && window.addToSpreadsheet) {
        // If we're on the spreadsheet page and the function exists, call it directly
        window.addToSpreadsheet(spreadsheetData);
      } else {
        // Otherwise, store the data and navigate to the spreadsheet
        sessionStorage.setItem('pendingLeadData', JSON.stringify(spreadsheetData));
        window.location.href = '/spreadsheet';
      }

      toast({
        title: 'Lead sent to spreadsheet!',
        status: 'success',
        duration: 2000,
      });
    },
    [getColorForDisposition, toast]
  );

  const handleBookAppointment = useCallback(
    (lead: Lead) => {
      if (!lead) return;

      const calendlyBaseUrl = 'https://calendly.com/linkpellowinsurance'; // TODO: replace with dynamic slug if stored per-user

      // Build fallback URL with query params (works even without widget.js)
      const params = new URLSearchParams();
      if (lead.name) params.append('name', lead.name);
      if (lead.email) params.append('email', lead.email);
      const cleanedPhone = normalizePhone(lead.phone || '');
      if (cleanedPhone) {
        params.append('phone_number', cleanedPhone);
        params.append('a9', cleanedPhone); // custom Q9: Send text messages to
        params.append('location', cleanedPhone); // if event set to Phone Call
      }
      if (lead.state) params.append('a2', lead.state); // State
      if (lead.zipcode) params.append('a3', lead.zipcode); // Zip

      const bookingUrl = `${calendlyBaseUrl}?${params.toString()}`;

      try {
        const calendly = (window as any).Calendly;

        // If the widget script is available, use the richer prefill options
        if (calendly && typeof calendly.initPopupWidget === 'function') {
          // Disable body scroll while Calendly modal is open
          const originalOverflow = document.body.style.overflow;
          document.body.style.overflow = 'hidden';

          // Listener to restore scroll when Calendly closes or schedules
          const calendlyMessageHandler = (ev: MessageEvent) => {
            if (typeof ev.data === 'object' && ev.data?.event) {
              if (ev.data.event === 'calendly.event_scheduled' || ev.data.event === 'calendly.modal_closed') {
                document.body.style.overflow = originalOverflow;
                window.removeEventListener('message', calendlyMessageHandler);
              }
            }
          };
          window.addEventListener('message', calendlyMessageHandler);

          calendly.initPopupWidget({
            url: calendlyBaseUrl, // base URL without params
            prefill: {
              name: lead.name || undefined,
              email: lead.email || undefined,
              phone_number: cleanedPhone || undefined,
              customAnswers: {
                a9: cleanedPhone || undefined,
                a2: lead.state || undefined,
                a3: lead.zipcode || undefined,
              },
            },
          });
        } else {
          // Fallback to plain link in new tab
          window.open(bookingUrl, '_blank', 'noopener');
        }
      } catch (err) {
        console.error('Failed to open Calendly widget:', err);
        window.open(bookingUrl, '_blank', 'noopener');
      }
    },
    []
  );

  const handleAddToReminders = useCallback(
    (lead: Lead) => {
      // Prefer structured helper if available to avoid regex fragility
      const globalAny = window as any;
      if (typeof globalAny.addFollowUpLead === 'function') {
        globalAny.addFollowUpLead(lead.name, lead.phone, lead.state);
      } else if (typeof globalAny.appendDailyGoal === 'function') {
        // Fallback legacy string path. Ensure single parentheses and clean phone.
        const cleanedPhone = safeStr(lead.phone).replace(/[()]/g, '').trim();
        const phoneFormatted = `(${cleanedPhone})`;
        const reminderText = `Follow up with ${lead.name} ${phoneFormatted}${lead.state ? ` - ${lead.state}` : ''}`;
        globalAny.appendDailyGoal(reminderText);
      } else {
        toast({
          title: 'Unable to add reminder',
          description: 'Reminders component not loaded',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      toast({
        title: 'Added to reminders!',
        description: `Follow up reminder created for ${lead.name}`,
        status: 'success',
        duration: 2000,
      });
    },
    [toast]
  );

  const handlePopoutNotes = useCallback(
    (lead: Lead) => {
      // Open a new window with comprehensive lead details
      const newWindow = window.open(
        '',
        `lead-details-${lead._id}`,
        'width=1200,height=660,top=180,left=100,toolbar=no,menubar=no,location=no,resizable=yes'
      );

      if (newWindow) {
        // Get the color for the disposition
        const dispositionColor = getColorForDisposition(lead.disposition || '');

        // Format the data for display
        const formattedPhone = formatPhoneNumber(lead.phone || '');
        const formattedDOB = formatDate(lead.dob || '');
        const formattedHeight = formatHeight(lead.height || '');

        // Precompute timezone strings for pop-out clock
        const ianaTimeZoneStr = getTimezoneFromZipCode(lead.zipcode || '') || 'America/New_York';
        const tzAbbrevStr = getAbbreviation(ianaTimeZoneStr);

        // Pass necessary data to the popout window
        // Use the same key AuthContext stores JWT under
        const authToken = localStorage.getItem('token') || '';
        const apiBaseUrl = window.location.origin;

        // Set up the window content
        const doc = newWindow.document;
        doc.open();
        
        // --- CRITICAL FIX ---
        // Ensure availableDispositions is not undefined before mapping. If the dispositions
        // query fails or hasn't resolved, this prevents a fatal .map render error.
        if (!availableDispositions) {
            console.error('[Leads.tsx] CRITICAL: availableDispositions is undefined during handlePopoutNotes. Cannot render disposition options.');
        }
        const dispositionOptionsHtml = (availableDispositions || [])
          .map((d) => `<option value="${d}" ${d === lead.disposition ? 'selected' : ''}>${d}</option>`)
          .join('');

        const popupHTML = `<!DOCTYPE html><html><head>
        <meta charset='utf-8' />
        <title>Lead Details: ${lead.name}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Tektur:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
        :root{--card-purple:${dispositionColor};--header-gradient:linear-gradient(135deg,#1a1240,#2c1e6d);}
        *{margin:0;padding:0;box-sizing:border-box}
        /* Hide scrollbars */
        ::-webkit-scrollbar{width:0;height:0}
        body, .content{scrollbar-width:none}
        html,body{height:100%;display:flex;flex-direction:column;background:var(--card-purple);}
        body{font-family:'Tektur','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;min-width:920px;min-height:400px}
        .frame{box-shadow:0 0 0 6px var(--card-purple);flex:1;display:flex;flex-direction:column;background:var(--card-purple)}
        .header{background:#000;padding:6px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #444;border-bottom-left-radius:8px;border-bottom-right-radius:8px;color:#fff}
        .header h1{font-size:18px;font-weight:600;margin:0;letter-spacing:1.2px}
        .history-button{background:#ff9800;color:#fff;border:0;padding:8px 16px;border-radius:4px;font-size:14px;cursor:pointer;font-weight:500}
        .content{flex:1;overflow:visible;display:flex;flex-direction:column;height:100%}
        .details-grid{display:grid;grid-template-columns:2fr 2fr 1.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr;column-gap:8px;row-gap:6px;width:100%;padding:12px 12px 0 12px}
        .header-cell{background:#000;color:#fff;padding:2px 6px;font-size:10px;font-weight:400;text-transform:uppercase;border-radius:2px;display:flex;align-items:center;justify-content:center}
        .value-cell{background:#fff;color:#000;border:1px solid #000;padding:0;font-size:14px;font-weight:600;cursor:pointer;border-radius:6px;transition:background .15s ease,color .15s ease;line-height:1.3;display:flex;align-items:center;justify-content:center}
        .grid-item{height:14px !important}
        .value-cell:hover{background:#f3f3f3;color:#f97316}
        .disposition-bar,.notes-bar{background:var(--card-purple);color:#fff;font-weight:600;padding:6px 10px;font-size:16px}
        .notes-section{grid-column:1/-1;width:100%;display:flex;flex-direction:column;flex:1 1 auto;overflow:visible;padding:0 0 20px 0}
        .save-status{font-size:12px;color:#888;opacity:0;transition:opacity .3s}
        .save-status.visible{opacity:1}.save-status.success{color:#4CAF50}.save-status.error{color:#f44336}
        .notes-textarea{flex:1 1 auto;background:#ffffff;border:1px solid #444;border-radius:4px;padding:15px;color:#000;font-size:14px;line-height:1.6;resize:none;min-height:0;font-family:inherit;margin:0;width:100%;position:relative;z-index:2;height:auto;box-sizing:border-box;overflow:hidden}
        .notes-textarea:focus{outline:none;border-color:#ff9800;box-shadow:0 0 0 2px rgba(255,152,0,.1)}
        .footer{background:var(--card-purple);padding:10px 20px;text-align:center;font-size:12px;color:#fff;position:relative;z-index:3}
   .actions {
     z-index: 1; /* below notes to avoid blocking resize handle */
          pointer-events: none; /* allow clicks to pass through to textarea */
   }
   .actions * {
     pointer-events: auto; /* re-enable clicks on actual action buttons */
        }
        .notes-bar{padding:0 10px}
        .call-btn, .hangup-btn {
          color: white; border: none; padding: 8px 16px; border-radius: 4px; display: flex;
          align-items: center; gap: 8px; font-size: 14px; font-weight: 700; cursor: pointer;
          transition: all 0.2s ease; height: 36px; box-shadow: 0 4px 6px rgba(0,0,0,0.2), inset 0 -4px 4px rgba(0,0,0,0.1);
          border: 2px solid #000; text-shadow: 1px 1px 1px rgba(0,0,0,0.3); white-space: nowrap;
        }
        .call-btn { background-color: #4CAF50; min-width: 100px; }
        .call-btn:hover { background-color: #45a049; transform: translateY(-2px); box-shadow: 0 6px 8px rgba(0,0,0,0.3), inset 0 -4px 4px rgba(0,0,0,0.1); }
        .hangup-btn { background-color: #dc3545; min-width: 120px; }
        .hangup-btn:hover { background-color: #c82333; transform: translateY(-2px); box-shadow: 0 6px 8px rgba(0,0,0,0.3), inset 0 -4px 4px rgba(0,0,0,0.1); }
        /* Quick Drip btn */
        .quick-btn { background:none; border: none; cursor: pointer; display: flex; align-items: center; padding: 4px; border-radius:4px; transition: transform .2s ease; }
        .quick-btn:hover { transform: translateY(-2px); }
        /* Actions Dropdown */
        .actions-menu-container { position: relative; display: inline-block; }
        .actions-dropdown {
            display: none;
            position: absolute;
            right: 0;
            bottom: calc(100% + 5px); /* Position above the button */
            background-color: white;
            min-width: 220px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            border-radius: 8px;
            border: 1px solid rgba(0, 0, 0, 0.1);
            overflow: hidden;
            padding: 8px 0;
            font-family: 'Inter', sans-serif;
            transform-origin: bottom right;
            animation: menu-fade-in .1s ease-out;
        }
        @keyframes menu-fade-in {
            from { opacity: 0; transform: scale(0.95) translateY(5px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .actions-dropdown.visible {
            display: block;
        }
        .actions-dropdown-item {
            color: #4a5568; /* gray-700 */
            padding: 10px 16px;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            border: none;
            background: none;
            width: 100%;
            text-align: left;
        }
        .actions-dropdown-item:hover {
            background-color: rgba(74, 85, 104, 0.08);
            color: #2d3748; /* gray-800 */
        }
        .actions-dropdown-item.danger {
            color: #e53e3e; /* red-500 */
        }
        .actions-dropdown-item.danger:hover {
            background-color: rgba(229, 62, 62, 0.1);
            color: #c53030; /* red-600 */
        }
        .actions-dropdown-item svg {
            width: 16px; height: 16px;
            stroke-width: 2;
        }
        .menu-divider {
            height: 1px;
            background: rgba(0,0,0,0.08);
            margin: 8px 0;
        }
        /* Disposition select styling (no outer cell) */
        .disposition-select{background:#fff;color:#000;width:100%;padding:4px;border:1px solid #000;border-radius:4px;font-size:14px;cursor:pointer;}
        /* Add CSS rule after .disposition-select */
        .disposition-wrapper{background:transparent;border:none;padding:0;}
        </style>
        </head><body><div class='frame'><div class='header'><h1><img id="source-icon" src="" alt="Source" style="height: 20px; margin-right: 8px; vertical-align: middle; display: none;" />${lead.name}</h1><button class='history-button' onclick="alert('History feature not implemented in popup')">History</button></div><div class='content'><div class='details-grid'><div class='header-cell'>Name</div><div class='header-cell'>Email</div><div class='header-cell'>Phone</div><div class='header-cell'>Zipcode</div><div class='header-cell'>DOB</div><div class='header-cell'>Height</div><div class='header-cell'>Weight</div><div class='header-cell'>Gender</div><div class='header-cell'>State</div><div class='header-cell'>Disposition</div>
          <div class='value-cell' onclick="copyToClipboard('${lead.name || ''}','Name')" title='Click to copy'>${lead.name || '-'}</div><div class='value-cell' onclick="copyToClipboard('${lead.email || ''}','Email')" title='Click to copy'>${lead.email || '-'}</div><div class='value-cell' onclick="copyToClipboard('${lead.phone || ''}','Phone')" title='Click to copy'>${formattedPhone || '-'}</div><div class='value-cell' onclick="copyToClipboard('${lead.zipcode || ''}','Zipcode')" title='Click to copy'>${lead.zipcode || '-'}</div><div class='value-cell' onclick="copyToClipboard('${lead.dob || ''}','DOB')" title='Click to copy'>${formattedDOB || '-'}</div><div class='value-cell' onclick="copyToClipboard('${lead.height || ''}','Height')" title='Click to copy'>${formattedHeight || '-'}</div><div class='value-cell' onclick="copyToClipboard('${lead.weight || ''}','Weight')" title='Click to copy'>${lead.weight || '-'}</div><div class='value-cell' onclick="copyToClipboard('${lead.gender || ''}','Gender')" title='Click to copy'>${lead.gender || '-'}</div><div class='value-cell' onclick="copyToClipboard('${lead.state || ''}','State')" title='Click to copy'><img src='/states/${lead.state}.png' alt='${lead.state || ''}' style='height: 24px; max-width: 100%;' onerror='this.style.display="none"'/><span style='display:none'>${lead.state || '-'}</span></div><div class='value-cell disposition-wrapper'><select id='disposition-select' class='disposition-select'>${dispositionOptionsHtml}</select></div></div><div class='notes-bar'>Notes:</div><div class='notes-section'><span id='save-status' class='save-status'></span><textarea id='notes-textarea' class='notes-textarea' placeholder='Add notes...'>${lead.notes || ''}</textarea></div><div class='footer'>
          <div style="position: absolute; left: 12px; bottom: 8px; display: flex; gap: 10px;">
            <button id="call-btn" class="call-btn"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M493.4 24.6l-104-24c-11.3-2.6-22.9 3.3-27.5 13.9l-48 112c-4.2 9.8-1.4 21.3 6.9 28l60.6 49.6c-36 76.7-98.9 140.5-177.2 177.2l-49.6-60.6c-6.8-8.3-18.2-11.1-28-6.9l-112 48C3.9 366.5-2 378.1.6 389.4l24 104C27.1 504.2 36.7 512 48 512c256.1 0 464-207.5 464-464 0-11.2-7.7-20.9-18.6-23.4z"></path></svg> Call</button>
            <button id="hangup-btn" class="hangup-btn"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M493.4 24.6l-104-24c-11.3-2.6-22.9 3.3-27.5 13.9l-48 112c-4.2 9.8-1.4 21.3 6.9 28l60.6 49.6c-36 76.7-98.9 140.5-177.2 177.2l-49.6-60.6c-6.8-8.3-18.2-11.1-28-6.9l-112 48C3.9 366.5-2 378.1.6 389.4l24 104C27.1 504.2 36.7 512 48 512c256.1 0 464-207.5 464-464 0-11.2-7.7-20.9-18.6-23.4z"></path></svg> Hang Up</button>
          </div>
          <div style="position:absolute; right:12px; bottom:8px; display:flex; align-items:center; gap:10px;">
            <div id="local-time-display" style="font-weight:bold; font-size:14px; color:#000;"></div>
            <button id="quick-drip-btn" class="quick-btn" title="Quick Drip"><img src="/images/textdrip.svg" alt="Quick Drip" style="width:20px;height:20px"/></button>
            <div class="actions-menu-container">
                <button id="actions-menu-btn" class="quick-btn" title="More Actions">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                </button>
                <div id="actions-dropdown" class="actions-dropdown">
                    <button id="edit-lead-action" class="actions-dropdown-item">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Edit Lead
                    </button>
                    <button id="send-to-sheet-action" class="actions-dropdown-item">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        Send to Spreadsheet
                    </button>
                    <button id="book-appt-action" class="actions-dropdown-item">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Book Appointment
                    </button>
                    <button id="add-to-reminders-action" class="actions-dropdown-item">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Add to Reminders
                    </button>
                    <button id="add-to-campaign-action" class="actions-dropdown-item">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        Add to Drip Campaign
                    </button>
                    <button id="quick-drip-action" class="actions-dropdown-item">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        Quick Drip Message
                    </button>
                    <button id="referral-partner-action" class="actions-dropdown-item">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="17" y1="11" x2="23" y2="11"></line></svg>
                        Referral Partner
                    </button>
                    <div class="menu-divider"></div>
                    <button id="delete-lead-action" class="actions-dropdown-item danger">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        Delete Lead
                    </button>
                </div>
            </div>
          </div>
          Generated on ${new Date().toLocaleString()}
        </div></div>
        <script>
          const leadData = { _id: '${lead._id}', notes: ${JSON.stringify(lead.notes || '')}, source: '${lead.source}' };
          const authToken = '${authToken}';
          const apiBaseUrl = '${apiBaseUrl}';
          const dispositionColorMap = ${JSON.stringify(DISPOSITION_COLORS)};

          function copyToClipboard(text, field) {
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => {
              const toast = document.createElement('div');
              toast.textContent = field ? (field + ' copied!') : 'Copied!';
              Object.assign(toast.style, {
                position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                background: '#38A169', color: 'white', padding: '10px 20px',
                borderRadius: '5px', zIndex: '9999', transition: 'opacity 0.5s', fontFamily: 'Tektur, Inter, sans-serif'
              });
              document.body.appendChild(toast);
              setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 500);
              }, 1500);
            });
          }

          // Set source icon
          const sourceIcon = document.getElementById('source-icon');
          if (sourceIcon) {
            if (leadData.source === 'NextGen') {
              sourceIcon.src = '/images/nextgen.png';
              sourceIcon.style.display = 'inline-block';
            } else if (leadData.source === 'Marketplace') {
              sourceIcon.src = '/images/marketplace.png';
              sourceIcon.style.display = 'inline-block';
            }
          }

          const dispSel = document.getElementById('disposition-select');
          if (dispSel) {
            dispSel.addEventListener('change', (e) => {
              const newDisp = e.target.value;
              const newColor = dispositionColorMap[newDisp] || dispositionColorMap.default;
              
              // Update popout color in real-time
              document.documentElement.style.setProperty('--card-purple', newColor);
              const isLight = newColor === '#FFFFFF' || newColor === '#E6F0F5';
              const textColor = isLight ? '#000' : '#fff';
              document.querySelectorAll('.disposition-bar, .notes-bar, .footer').forEach(el => el.style.color = textColor);

              // Update database and notify main window
              fetch(\`\${apiBaseUrl}/api/leads/\${leadData._id}\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + authToken },
                body: JSON.stringify({ disposition: newDisp })
              }).then((r) => {
                if (r.ok && window.opener && !window.opener.closed) {
                  window.opener.postMessage({ type: 'LEAD_DISPOSITION_UPDATED', leadId: leadData._id, disposition: newDisp }, '*');
                }
              });
            });
          }

          const notesTa = document.getElementById('notes-textarea');
          const saveStatus = document.getElementById('save-status');
          let originalNotes = leadData.notes;
          let timeoutId;
          const updateStatus = (msg) => { if (saveStatus) saveStatus.textContent = msg; };
          const saveNotes = () => {
            const n = notesTa.value;
            if (n === originalNotes) return;
            updateStatus('Saving…');
            fetch(\`\${apiBaseUrl}/api/leads/\${leadData._id}\`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + authToken },
              body: JSON.stringify({ notes: n })
            }).then((r) => {
              if (!r.ok) throw new Error();
              return r.json();
            }).then(() => {
              originalNotes = n;
              updateStatus('Saved');
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'LEAD_NOTES_UPDATED', leadId: leadData._id, notes: n }, '*');
              }
            }).catch(() => updateStatus('Error'));
          };
          notesTa.addEventListener('input', () => { clearTimeout(timeoutId); timeoutId = setTimeout(saveNotes, 800); });
          notesTa.addEventListener('blur', saveNotes);

          // Removed ResizeObserver-driven window.resizeBy to prevent height snap-back.

          // === Bi-directional window ↔ textarea resize sync ===
          (function() {
            const MIN_W = 920;
            const headerEl = document.querySelector('.header');
            const footerEl = document.querySelector('.footer');
            const EXTRA_PAD = 40; // bars & padding
            if (!headerEl || !footerEl || !notesTa) return;

            let isSyncing = false;

            // Removed syncTextareaToWindow and its listener; flex-box handles resizing.
          })();

          const ianaTimeZone = '${ianaTimeZoneStr}';
          const tzAbbreviation = '${tzAbbrevStr}';
          const timeDisplay = document.getElementById('local-time-display');

          if (ianaTimeZone && timeDisplay) {
            const updateTime = () => {
              const timeString = new Date().toLocaleTimeString('en-us', {
                timeZone: ianaTimeZone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });
              const formattedTime = safeStr(timeString).replace(' AM', 'AM').replace(' PM', 'PM');
              timeDisplay.textContent = formattedTime + ' ' + tzAbbreviation;
            };
            setInterval(updateTime, 1000);
            updateTime(); // Initial call
          }

          document.getElementById('call-btn').addEventListener('click', () => {
            if (window.opener && typeof window.opener.dialPhone === 'function') {
              window.opener.dialPhone('${safeStr(lead.phone)}');
            }
          });
          document.getElementById('hangup-btn').addEventListener('click', () => {
            // Placeholder for hangup functionality
            alert('Hang up feature requires telephony integration.');
          });
          const qdbtn = document.getElementById('quick-drip-btn');
          if (qdbtn) {
            qdbtn.addEventListener('click', () => {
              if (window.opener && typeof window.opener.handleQuickDrip === 'function') {
                const leadObject = { _id: '${lead._id}', name: '${safeStr(lead.name)}', phone: '${safeStr(lead.phone)}', email: '${safeStr(lead.email)}', disposition: '${safeStr(lead.disposition)}' };
                window.opener.handleQuickDrip(leadObject);
              }
            });
          }

          const menuBtn = document.getElementById('actions-menu-btn');
          const dropdown = document.getElementById('actions-dropdown');
          if (menuBtn && dropdown) {
            menuBtn.addEventListener('click', (event) => {
              event.stopPropagation();
              const isOpen = dropdown.classList.toggle('visible');
              document.body.style.overflow = isOpen ? 'hidden' : '';
            });

            document.addEventListener('click', (event) => {
              if (!menuBtn.contains(event.target) && !dropdown.contains(event.target)) {
                dropdown.classList.remove('visible');
                document.body.style.overflow = '';
              }
            });

            const leadObject = { _id: '${lead._id}', name: '${safeStr(lead.name)}', phone: '${safeStr(lead.phone)}', email: '${safeStr(lead.email)}', disposition: '${safeStr(lead.disposition)}', source: '${safeStr(lead.source)}', dob: '${safeStr(lead.dob)}', height: '${safeStr(lead.height)}', weight: '${safeStr(lead.weight)}', gender: '${safeStr(lead.gender)}', state: '${safeStr(lead.state)}', zipcode: '${safeStr(lead.zipcode)}', notes: ${JSON.stringify(safeStr(lead.notes))} };

            const actionHandlers = {
                'edit-lead-action': () => window.opener.handleEditLead(leadObject),
                'delete-lead-action': () => window.opener.handleDeleteLead(leadObject._id),
                'send-to-sheet-action': () => window.opener.handleSendToSpreadsheet(leadObject),
                'book-appt-action': () => { window.opener.handleBookAppointment(leadObject); setTimeout(() => window.close(), 50); },
                'add-to-reminders-action': () => window.opener.handleAddToReminders(leadObject),
                'add-to-campaign-action': () => { window.opener.handleAddToCampaign(leadObject); setTimeout(() => window.close(), 50); },
                'quick-drip-action': () => { window.opener.handleQuickDrip(leadObject); setTimeout(() => window.close(), 50); },
                'referral-partner-action': () => { window.opener.handleReferralPartner(leadObject); setTimeout(() => window.close(), 50); },
            };

            for (const [id, handler] of Object.entries(actionHandlers)) {
                const button = document.getElementById(id);
                if (button && window.opener && typeof handler === 'function') {
                    button.addEventListener('click', () => {
                        handler();
                        dropdown.classList.remove('visible');
                    });
                }
            }
          }
        </script>
        </body></html>`;
        doc.write(popupHTML);
        doc.close();

        // The message listener is now handled globally by the useEffect hook above
        // No need to add/remove listeners here anymore
      }
    },
    [getColorForDisposition, availableDispositions, toast]
  );

  const handleAddToCampaign = useCallback((lead: Lead) => {
    setCampaignLeadId(lead._id);
    setCampaignModalOpen(true);
  }, []);

  const handleQuickDrip = useCallback((lead: Lead) => {
    setQuickDripLead(lead);
  }, []);

  const PIPELINE_OPTIONS = [
    'all',
    'nextgen',
    'marketplace',
    'selfgen',
    'manual',
  ] as const; // removed 'csv' and 'usha'
  type PipelineSource = (typeof PIPELINE_OPTIONS)[number];

  function isPipelineSource(val: any): val is PipelineSource {
    return PIPELINE_OPTIONS.includes(val as PipelineSource);
  }

  function getPipelineValue(queryValue: any): PipelineSource {
    // Handle both undefined and invalid values
    if (!queryValue || !isPipelineSource(queryValue)) {
      return 'all';
    }
    return queryValue;
  }

  /**
   * ====================
   * 📞 Time-Zone Ordering
   * ====================
   * We expose a dedicated "Time-Zone Order" dropdown (East→West or West→East)
   * that sorts the current page of leads client-side using a fixed list of US
   * time-zone abbreviations provided by the user.  We don't rely on backend
   * sorting because MongoDB can't easily sort by custom enum order.  Instead
   * we derive the short abbreviation for each lead's IANA zone using
   * Intl.DateTimeFormat and then compare their index in TZ_ORDER.
   */

  // ===== Dynamic TZ list (hide DST vs Standard duplicates) =====
  const computeTzOrder = () => {
    const pairs: [string, string][] = [
      ['EST', 'EDT'],
      ['CST', 'CDT'],
      ['MST', 'MDT'],
      ['PST', 'PDT'],
      ['AKST', 'AKDT'],
      ['HAST', 'HADT'],
    ];

    // Determine if US Eastern region is currently on DST to infer others
    const isDst = getAbbreviation('America/New_York').endsWith('DT');

    return pairs.map(([std, dst]) => (isDst ? dst : std));
  };

  const TZ_ORDER = React.useMemo(() => computeTzOrder(), []);

  type TzAbbrev = (typeof TZ_ORDER)[number];

  /** Return lead's TZ abbrev using zipcode if explicit zone missing */
  function getLeadAbbrev(lead: Lead): TzAbbrev | 'UNK' {
    const possible = (lead as any).timeZone as string | undefined;
    let abbr = possible ? getTzAbbrev(possible) : getTzAbbrev(getTimezoneFromZipCode(lead.zipcode));
    // Normalise uncommon abbreviations to list values
    if (abbr === 'HST') abbr = 'HAST';
    return (TZ_ORDER.includes(abbr as TzAbbrev) ? (abbr as TzAbbrev) : 'UNK');
  }

  /** Utility: derive short TZ abbreviation (e.g. "EST") from IANA zone */
  const getTzAbbrev = getAbbreviation;

  // Memoised processing: first filter by selected TZ abbrev (if any),
  // then apply custom TZ ordering if active.
  const displayedLeads = React.useMemo(() => {
    let processed = leads;

    // Filter step
    if (selectedTzFilter) {
      processed = processed.filter((lead) => getLeadAbbrev(lead) === selectedTzFilter);
    }

    // Optional client-side order (East→West or West→East)
    if (useTimeZoneSort) {
      const dirMultiplier = timeZoneSortDir === 'asc' ? 1 : -1;
      processed = [...processed].sort((a, b) => {
        const idxA = TZ_ORDER.indexOf(getLeadAbbrev(a) as any);
        const idxB = TZ_ORDER.indexOf(getLeadAbbrev(b) as any);
        return dirMultiplier * (idxA - idxB);
      });
    }

    // Return a fresh array reference so React can detect changes even if ordering/filter unchanged
    return [...processed];
  }, [leads, selectedTzFilter, useTimeZoneSort, timeZoneSortDir, counts]);

  // Expose helper to focus lead by phone digits
  useEffect(() => {
    (window as any).focusLead = (digits: string) => {
      const el = document.querySelector(`[data-phone='${digits}']`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el as HTMLElement).style.boxShadow = '0 0 10px 2px #f97316';
        setTimeout(() => {
          (el as HTMLElement).style.boxShadow = '';
        }, 2000);
      }
    };

    return () => {
      delete (window as any).focusLead;
    };
  }, [displayedLeads]);

  const handleReferralPartner = (lead: Lead) => {
    setReferralLead(lead);
    setReferralOpen(true);
  };

  const referralLinks = [
    {
      name: 'Trusted Consultants',
      url:
        'https://thetrustedconsultants.co/new-referral?referral_partner_full_name:=Link+Pellow&referral_partner_mobile_phone:=+12694621403',
    },
    {
      name: 'Sydnee Alberts',
      url: 'https://calendly.com/healthwithsydnee/30min?back=1',
    },
  ] as const;

  // Detect iframe load timeout
  useEffect(() => {
    if (isReferralOpen) {
      setIframeStatus('loading');
      const timer = setTimeout(() => {
        setIframeStatus((prev) => (prev === 'loading' ? 'blocked' : prev));
      }, 4000); // 4-second grace
      return () => clearTimeout(timer);
    }
  }, [isReferralOpen]);

  // Birthday notification effect
  useEffect(() => {
    if (!leads || leads.length === 0) return;

    const soldBirthdaysToday = leads.filter((l) => {
      if (l.disposition !== 'SOLD' || !l.dob) return false;
      const parts = l.dob.includes('/') ? l.dob.split('/') : l.dob.split('-');
      if (parts.length < 3) return false;
      const [mRaw, dRaw] = l.dob.includes('/') ? parts : [parts[1], parts[2]];
      const m = parseInt(mRaw, 10);
      const d = parseInt(dRaw, 10);
      const today = new Date();
      return today.getMonth() + 1 === m && today.getDate() === d;
    });

    if (soldBirthdaysToday.length === 0) return;

    const hoursToNotify = [9, 14, 17];
    const timers: NodeJS.Timeout[] = [];

    hoursToNotify.forEach((hour) => {
      const now = new Date();
      const trigger = new Date();
      trigger.setHours(hour, 0, 0, 0);
      if (trigger.getTime() < now.getTime()) return; // already passed
      const timeoutMs = trigger.getTime() - now.getTime();
      timers.push(
        setTimeout(() => {
          soldBirthdaysToday.forEach((lead) => {
            toast({
              title: `It's ${lead.name}'s Birthday! 🎂`,
              status: 'info',
              duration: 8000,
              isClosable: true,
              position: 'top-right',
            });
          });
        }, timeoutMs)
      );
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [leads, toast]);

  // CSV download handler
  const handleDownloadCsv = async () => {
    try {
      setIsDownloading(true);
      const blob = await leadsApi.exportLeads({ ...queryState, getAllResults: true } as any, 'csv');
      const url = window.URL.createObjectURL(blob);
      // Attempt to read filename from server header – fallback
      const disposition = 'CrokodialCSV.csv';
      const link = document.createElement('a');
      link.href = url;
      link.download = disposition;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: 'CSV export failed', status: 'error' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDial = (lead: Lead) => {
    if (!lead.phone) {
      toast({
        title: 'No phone number',
        description: 'This lead has no phone number to dial',
        status: 'error',
        duration: 2000,
      });
      return;
    }
    // Increment unique-per-lead daily CRM counter
    increment(lead._id);

    // Increment lifetime dial counter (per-phone)
    incrementCount(lead.phone || ''); // Use original phone for API
    dialPhone(lead.phone || '');
  };

  const renderCardContent = (lead: Lead) => {
    console.log('Lead Source for ' + lead.name + ':', lead.source); // DEBUG
    const c = counts[normalizePhone(lead.phone)] ?? 0;
    return (
      <>
        {/* macOS-style buttons */}
        <div className="mac-buttons">
          <span
            className="btn red"
            title="Delete Lead"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteLead(lead._id);
            }}
          />
          <span
            className="btn green"
            title="Pop-out Notes"
            onClick={(e) => {
              e.stopPropagation();
              handlePopoutNotes(lead);
            }}
          />
          {/* Thumbtack icon to pin lead */}
          <span
            className="btn tack"
            title="Pin Lead (Follow-Up)"
            onClick={(e) => {
              e.stopPropagation();
              handleAddToReminders(lead);
            }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 'auto', height: 'auto' }}
          >
            <FaThumbtack color="#000000" size={12} style={{ transform: 'rotate(20deg)' }} />
          </span>
        </div>

        <div className="grid-container">
          {/* Add headers directly in the grid-container */}
          <div className="grid-header">Name</div>
          <div className="grid-header">Email</div>
          <div className="grid-header">Phone</div>
          <div className="grid-header">Zipcode</div>
          <div className="grid-header">DOB</div>
          <div className="grid-header">Height</div>
          <div className="grid-header">Weight</div>
          <div className="grid-header">Gender</div>
          <div className="grid-header">State</div>
          <div className="grid-header">Disposition</div>

          {/* Then the actual values */}
          <div className="grid-item">
            <div
              className="text-content value name"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(lead.name, toast, 'Name');
              }}
              title="Click to copy"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {/* Add source icon */}
              {lead.source === 'NextGen' && (
                    <img
                      src="/images/nextgen.png"
                      alt="NextGen"
                      style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }}
                      title="NextGen Lead"
                    />
              )}
              {lead.source === 'Marketplace' && (
                    <img
                      src="/images/marketplace.png"
                      alt="Marketplace"
                      style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }}
                      title="Marketplace Lead"
                    />
              )}
              {(() => {
                if (!lead.dob) return null;
                  const dobParts = lead.dob.includes('/') ? lead.dob.split('/') : lead.dob.split('-');
                if (dobParts.length < 3) return null;
                    const [mRaw, dRaw] = lead.dob.includes('/') ? dobParts : [dobParts[1], dobParts[2]];
                    const m = parseInt(mRaw, 10);
                    const d = parseInt(dRaw, 10);
                    const now = new Date();
                    if (now.getMonth() + 1 === m && now.getDate() === d) {
                  return <FaBirthdayCake key="cake" color="#ff69b4" title="Birthday Today" />;
                }
                return null;
              })()}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {lead.name}
              </span>
            </div>
          </div>
          <div className="grid-item">
            <div
              className="text-content value email"
              title="Click to copy"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(safeStr(lead.email), toast, 'Email');
              }}
            >
              {formatEmail(safeStr(lead.email))}
            </div>
          </div>
          <div className="grid-item">
            <div
              className="text-content value phone"
              data-phone={safeStr(lead.phone).replace(/[^\\d]/g, '')}
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(safeStr(lead.phone), toast, 'Phone');
              }}
              title="Click to copy"
            >
              {formatPhoneNumber(safeStr(lead.phone))}
            </div>
          </div>
          <div className="grid-item">
            <div
              className="text-content value"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(safe(lead.zipcode), toast, 'Zipcode');
              }}
              title="Click to copy"
            >
              {safe(lead.zipcode)}
            </div>
          </div>
          <div className="grid-item">
            <div
              className="text-content value"
              onClick={(e) => {
                e.stopPropagation();
                const dobDisplay = formatDate(safe(lead.dob));
                copyToClipboard(dobDisplay, toast, 'DOB');
              }}
              title="Click to copy"
            >
              {formatDate(safe(lead.dob))}
            </div>
          </div>
          <div className="grid-item">
            <div
              className="text-content value"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(safe(lead.height), toast, 'Height');
              }}
              title="Click to copy"
            >
              {formatHeight(safe(lead.height))}
            </div>
          </div>
          <div className="grid-item">
            <div
              className="text-content value"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(safe(lead.weight), toast, 'Weight');
              }}
              title="Click to copy"
            >
              {safe(lead.weight)}
            </div>
          </div>
          <div className="grid-item">
            <div
              className="text-content value"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(safe(lead.gender), toast, 'Gender');
              }}
              title="Click to copy"
            >
              {safe(lead.gender)}
            </div>
          </div>
          <div className="grid-item">
            <div
              className="text-content value"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(safe(lead.state), toast, 'State');
              }}
              title="Click to copy"
            >
              <img src={`/states/${safe(lead.state)}.png`} alt={safe(lead.state)} style={{ height: '24px', maxWidth: '100%' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
              <span style={{ display: 'none' }}>{safe(lead.state)}</span>
            </div>
          </div>
          <div className="grid-item">
            <div className="disposition-section">
              <DispositionSelect
                value={lead.disposition || ''}
                onChange={async (e) => {
                  e.stopPropagation();
                  const newDisposition = e.target.value;
                  try {
                    await axiosInstance.put(`/api/leads/${lead._id}`, {
                      disposition: newDisposition,
                    });
                    toast({ title: 'Disposition updated', status: 'success' });
                    refetch();
                  } catch (err) {
                    toast({ title: 'Failed to update disposition', status: 'error' });
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Disposition</option>
                {(availableDispositions || []).map((disposition: string) => (
                  <option key={disposition} value={disposition}>
                    {disposition}
                  </option>
                ))}
              </DispositionSelect>
            </div>
          </div>
        </div>

        {/* Notes textarea – metadata JSON (purchase_id etc.) is hidden from view but preserved */}
        <div className="notes-section">
          <NotesEditor
            leadId={lead._id}
            initialNotes={safe(lead.notes)}
            className="notes-textarea"
            style={{ resize: 'vertical', minHeight: '140px' }}
            onSaveSuccess={refetch}
          />
        </div>

        <div className="actions">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              position: 'relative',
              height: '80px',
            }}
          >
            {/* Call and Hang Up buttons - Left side */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                position: 'absolute',
                bottom: '10px',
                left: '10px',
              }}
            >
              <CallButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleDial(lead);
                }}
              >
                <FaPhone />
                {` Call (${c})`}
              </CallButton>
              <HangUpButton
                onClick={(e) => {
                  e.stopPropagation();
                  // Hang up functionality will be implemented with telephony integration
                  toast({
                    title: 'Hang up feature',
                    description: 'Telephony integration required',
                    status: 'info',
                    duration: 2000,
                  });
                }}
              >
                <FaPhoneSlash /> Hang Up
              </HangUpButton>
            </div>

            {/* Right side items */}
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
              }}
            >
              <LocalTime
                zipCode={lead.zipcode}
                style={{
                  position: 'static',
                  marginRight: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(0, 0, 0, 0.2)',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  minWidth: '110px',
                  fontWeight: 'bold',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}
              />
              <IconButton
                aria-label="Add to Textdrip Campaign"
                icon={<TextdripIcon boxSize="28px" />}
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCampaign(lead);
                }}
                title="Add to Textdrip Campaign"
              />
              <LeadActionsMenu
                lead={lead}
                onEdit={handleEditLead}
                onSendToSpreadsheet={handleSendToSpreadsheet}
                onBookAppointment={handleBookAppointment}
                onAddToReminders={handleAddToReminders}
                onPopoutNotes={handlePopoutNotes}
                onAddToCampaign={handleAddToCampaign}
                onQuickDrip={handleQuickDrip}
                onReferralPartner={handleReferralPartner}
                style={{ position: 'static' }}
              />
            </div>
          </div>
        </div>

        {bulkEditMode !== 'none' && (
          <input
            type="checkbox"
            checked={selectedLeads.includes(lead._id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedLeads([...selectedLeads, lead._id]);
              } else {
                setSelectedLeads(selectedLeads.filter((id) => id !== lead._id));
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </>
    );
  };

  // === Expose lead action handlers globally for pop-out windows ===
  useEffect(() => {
    const g = window as any;
    g.handleEditLead = (lead: Lead) => handleEditLead(lead);
    g.handleDeleteLead = (id: string) => handleDeleteLead(id);
    g.handleSendToSpreadsheet = (lead: Lead) => handleSendToSpreadsheet(lead);
    g.handleBookAppointment = (lead: Lead) => handleBookAppointment(lead);
    g.handleAddToReminders = (lead: Lead) => handleAddToReminders(lead);
    g.handleAddToCampaign = (lead: Lead) => handleAddToCampaign(lead);
    g.handleQuickDrip = (lead: Lead) => handleQuickDrip(lead);
    g.handleReferralPartner = (lead: Lead) => handleReferralPartner(lead);
    // Expose dialPhone so pop-out Call button works
    g.dialPhone = (phone: string) => dialPhone(phone);

    return () => {
      delete g.handleEditLead;
      delete g.handleDeleteLead;
      delete g.handleSendToSpreadsheet;
      delete g.handleBookAppointment;
      delete g.handleAddToReminders;
      delete g.handleAddToCampaign;
      delete g.handleQuickDrip;
      delete g.handleReferralPartner;
      delete g.dialPhone;
    };
  }, [handleEditLead, handleDeleteLead, handleSendToSpreadsheet, handleBookAppointment, handleAddToReminders, handleAddToCampaign, handleQuickDrip, handleReferralPartner]);

  // Detect touch capability once (memoised)
  const isTouchDevice = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // pull-to-refresh handler with minimum 300ms spin
  const handleRefresh = () => {
    return new Promise<void>((resolve) => {
      const start = Date.now();
      Promise.resolve(refetch()).finally(() => {
        const delta = Date.now() - start;
        const delay = Math.max(0, 500 - delta);
        setTimeout(() => resolve(), delay);
      });
    });
  };

  // Gate: allow pull-to-refresh only if the gesture starts outside a lead card
  const shouldStartPull = (evt: TouchEvent | MouseEvent) => {
    const target = evt.target as HTMLElement | null;
    return !(target && target.closest('.lead-card'));
  };

  // Cast to any to relax prop type checks for react-simple-pull-to-refresh
  const PullToRefreshAny = PullToRefresh as any;

  return (
    <>
      <div className="leads-page-container" style={{ position: 'relative', height: 'calc(100vh - 65px)' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <GlobalStyles />

          {/* Reminders & Follow-Up strips */}
          <RemindersStrip />
          <FollowUpStrip />

          {/* Detached Leads */}
          {detachedLeads.map((detached) => (
            <DetachedLeadWindow key={detached.id}>
              {/* Placeholder for detached lead content */}
            </DetachedLeadWindow>
          ))}

          {/* Filter Bar */}
          <FilterBar>
            {/* Time-Zone Filter Menu (separate) */}
            <div style={{ position: 'relative' }}>
              <FilterButton
                ref={timeZoneButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setTimeZoneOpen((o) => !o);
                }}
              >
                {selectedTzFilter ? selectedTzFilter : 'Time-Zone'} <ChevronIcon />
              </FilterButton>
              <DropdownPortal isOpen={timeZoneOpen} buttonRef={timeZoneButtonRef} onClose={() => setTimeZoneOpen(false)}>
                {/* Clear / All option */}
                <DropdownItem
                  onClick={() => {
                    setTimeZoneOpen(false);
                    setSelectedTzFilter(null);
                  }}
                >
                  All Time-Zones
                </DropdownItem>
                {TZ_ORDER.map((abbr) => (
                  <DropdownItem
                    key={abbr}
                    onClick={() => {
                      setTimeZoneOpen(false);
                      setSelectedTzFilter(abbr);
                    }}
                  >
                    {abbr}
                  </DropdownItem>
                ))}
              </DropdownPortal>
            </div>

            {/* Sort Menu */}
            <div style={{ position: 'relative' }}>
              <FilterButton
                ref={sortButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setSortOpen((o) => !o);
                }}
              >
                {queryState.sortDirection === 'asc' ? 'Aged' : 'New'} <ChevronIcon />
              </FilterButton>
              <DropdownPortal isOpen={sortOpen} buttonRef={sortButtonRef} onClose={() => setSortOpen(false)}>
                <DropdownItem
                  onClick={() => {
                    setSortOpen(false);
                    handleSortChange('createdAt', 'desc'); // New
                  }}
                >
                  New
                </DropdownItem>
                <DropdownItem
                  onClick={() => {
                    setSortOpen(false);
                    handleSortChange('createdAt', 'asc'); // Aged
                  }}
                >
                  Aged
                </DropdownItem>
              </DropdownPortal>
            </div>

            {/* Pipeline Filter */}
            <div style={{ position: 'relative' }}>
              <FilterButton
                ref={pipelineButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setPipelineOpen((o) => !o);
                }}
              >
                {(() => {
                  const currentValue = getPipelineValue(queryState.filters?.pipelineSource);
                  // Properly capitalize the pipeline source
                  if (currentValue === 'all') return 'All Sources';
                  if (currentValue === 'nextgen') return 'NextGen';
                  if (currentValue === 'marketplace') return 'Marketplace';
                  if (currentValue === 'selfgen') return 'Self Generated';
                  if (currentValue === 'manual') return 'Manual Entry';
                  return 'All Sources'; // Fallback
                })()}{' '}
                <ChevronIcon />
              </FilterButton>
              <DropdownPortal isOpen={pipelineOpen} buttonRef={pipelineButtonRef} onClose={() => setPipelineOpen(false)}>
                <DropdownItem
                  key="all"
                  onClick={() => {
                    console.log('[DEBUG] Pipeline option clicked: all');
                    setPipelineOpen(false);
                    handlePipelineFilterChange('all');
                  }}
                >
                  All Sources
                </DropdownItem>
                <DropdownItem
                  key="nextgen"
                  onClick={() => {
                    console.log('[DEBUG] Pipeline option clicked: nextgen');
                    setPipelineOpen(false);
                    handlePipelineFilterChange('nextgen');
                  }}
                >
                  NextGen
                </DropdownItem>
                <DropdownItem
                  key="marketplace"
                  onClick={() => {
                    console.log('[DEBUG] Pipeline option clicked: marketplace');
                    setPipelineOpen(false);
                    handlePipelineFilterChange('marketplace');
                  }}
                >
                  Marketplace
                </DropdownItem>
                <DropdownItem
                  key="selfgen"
                  onClick={() => {
                    console.log('[DEBUG] Pipeline option clicked: selfgen');
                    setPipelineOpen(false);
                    handlePipelineFilterChange('selfgen');
                  }}
                >
                  Self Generated
                </DropdownItem>
                <DropdownItem
                  key="manual"
                  onClick={() => {
                    console.log('[DEBUG] Pipeline option clicked: manual');
                    setPipelineOpen(false);
                    handlePipelineFilterChange('manual');
                  }}
                >
                  Manual Entry
                </DropdownItem>
              </DropdownPortal>
            </div>

            <MultiStateFilter
              selectedStates={queryState.filters?.states || []}
              availableStates={availableStates}
              onChange={handleStateFilterChange}
            />

            <MultiDispositionFilter
              selectedDispositions={queryState.filters?.dispositions || []}
              availableDispositions={availableDispositions}
              getColorForDisposition={getColorForDisposition}
              onChange={handleDispositionFilterChange}
            />

            {/* Edit All Menu */}
            <div style={{ position: 'relative' }}>
              <FilterButton ref={editAllButtonRef} onClick={() => setEditAllOpen((o) => !o)}>
                Edit All <ChevronIcon />
              </FilterButton>
              <DropdownPortal isOpen={editAllOpen} buttonRef={editAllButtonRef} onClose={() => setEditAllOpen(false)}>
                <DropdownItem
                  onClick={() => {
                    setEditAllOpen(false);
                    toast({
                      title: 'Bulk edit coming soon',
                      description: 'This feature will be available in a future update',
                      status: 'info',
                      duration: 3000,
                      isClosable: true,
                    });
                  }}
                >
                  Bulk Edit
                </DropdownItem>
                <DropdownItem
                  onClick={() => {
                    setEditAllOpen(false);
                    toast({
                      title: 'Bulk delete coming soon',
                      description: 'This feature will be available in a future update',
                      status: 'info',
                      duration: 3000,
                      isClosable: true,
                    });
                  }}
                >
                  Delete Selected
                </DropdownItem>
              </DropdownPortal>
            </div>

            <SearchInput
              placeholder="Search leads..."
              value={queryState.search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />

            <AddButton
              onClick={async () => {
                try {
                  const res = await axiosInstance.post('/api/leads', {
                    name: 'Blank Lead',
                    status: 'New',
                  });
                  if (res.data && Array.isArray(leads)) {
                    // Optimistically insert the new lead at the top for immediate feedback
                    leads.unshift(res.data);
                  }
                  toast({ title: 'Lead added!', status: 'success' });
                  refetch();
                } catch (err) {
                  toast({ title: 'Failed to add lead', status: 'error' });
                }
              }}
              aria-label="Add Lead"
            >
              +
            </AddButton>

            {/* Total Leads counter */}
            <div
              style={{
                color: '#EFBF04',
                fontWeight: 700,
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                marginLeft: '8px',
              }}
            >
              Leads: {pagination?.total || leads.length} Total
              <IconButton
                aria-label="Download CSV"
                icon={isDownloading ? <Spinner size="xs" color="white" /> : <FiDownload color="white" />}
                variant="ghost"
                size="sm"
                ml={2}
                p={0}
                bg="transparent"
                _hover={{ opacity: 0.8 }}
                _active={{ opacity: 0.6 }}
                onClick={handleDownloadCsv}
                isDisabled={isDownloading}
                title="Download CSV"
              />
            </div>
          </FilterBar>

          {/* Leads container with pull-to-refresh */}
          {(() => {
            const listElement = (
              <LeadsScrollWrapper>
                <LeadsContainer
                  ref={leadsContainerRef}
                  $pullDistance={1}
                  $isRefreshing={true}
                >
                  {error ? (
                    <div className="error-message" style={{ textAlign: 'center', padding: '2rem' }}>
                      Error loading leads: {error.message}
                    </div>
                  ) : isLoading && leads.length === 0 ? (
                    <LoadingCroc />
                  ) : leads.length === 0 ? (
                    <div className="no-leads" style={{ textAlign: 'center', padding: '2rem' }}>
                      {queryState.search ? 'No leads found matching your search.' : 'No leads available.'}
                    </div>
                  ) : (
                    <div className="leads-list">
                      {displayedLeads.map((lead) => (
                        <LeadCard
                          key={lead._id}
                          $isActive={activeLeadId === lead._id}
                          $isSelected={selectedLeads.includes(lead._id)}
                          $isDeleteMode={bulkEditMode === 'delete'}
                          $isClicked={false}
                          $backgroundColor={getColorForDisposition(lead.disposition || '')}
                          onClick={() => setActiveLeadId(lead._id)}
                          className="lead-card"
                        >
                          {renderCardContent(lead)}
                        </LeadCard>
                      ))}
                    </div>
                  )}
                </LeadsContainer>
              </LeadsScrollWrapper>
            );

            // @ts-ignore – library prop types can be inconsistent, but runtime handles this
            return (
              <PullToRefreshAny
                onRefresh={handleRefresh}
                pullingContent={<CrocLoader size={48} />}
                refreshingContent={<CrocLoader size={48} />}
                pullDownThreshold={150}
              >
                {listElement}
              </PullToRefreshAny>
            );
          })()}

          {/* Top Pagination */}
            <Flex
              justify="center"
              align="center"
            gap={2}
            p={3}
            bg="blackAlpha.900"
            color="white"
            position="sticky"
            top="148px" /* 100px header + ~48px filter bar */
            zIndex={8}
          >
            {/* First page */}
            <IconButton
              aria-label="First page"
              icon={<TripleChevronIcon direction="left" boxSize={4} color="orange.400" />}
              onClick={() => handlePageChange(1)}
              isDisabled={queryState.page <= 1}
              size="sm"
              variant="ghost"
              _hover={{ bg: 'orange.50' }}
              _disabled={{ opacity: 0.3, cursor: 'not-allowed' }}
            />
            {/* Previous */}
              <IconButton
                aria-label="Previous page"
              icon={<FiChevronLeft color="#F97316" />}
              onClick={() => handlePageChange(queryState.page - 1)}
                isDisabled={queryState.page <= 1}
                size="sm"
              variant="ghost"
              _hover={{ bg: 'orange.50' }}
              _disabled={{ opacity: 0.3, cursor: 'not-allowed' }}
            />
            <HStack spacing={3} whiteSpace="nowrap">
              <Text fontWeight="bold" color="orange.400">Page</Text>
              <Text fontWeight="bold" color="white">
                {queryState.page}
                </Text>
              <Text fontWeight="bold" color="orange.400">of</Text>
              <Text fontWeight="bold" color="white">
                {pagination?.pages || 1}
                </Text>
              </HStack>
            {/* Next */}
              <IconButton
                aria-label="Next page"
              icon={<FiChevronRight color="#F97316" />}
              onClick={() => handlePageChange(queryState.page + 1)}
              isDisabled={!pagination || queryState.page >= (pagination?.pages || 1)}
                size="sm"
              variant="ghost"
              _hover={{ bg: 'orange.50' }}
              _disabled={{ opacity: 0.3, cursor: 'not-allowed' }}
            />
            {/* Last page */}
            <IconButton
              aria-label="Last page"
              icon={<TripleChevronIcon direction="right" boxSize={4} color="orange.400" />}
              onClick={() => handlePageChange(pagination?.pages || 1)}
              isDisabled={!pagination || queryState.page >= (pagination?.pages || 1)}
              size="sm"
              variant="ghost"
              _hover={{ bg: 'orange.50' }}
              _disabled={{ opacity: 0.3, cursor: 'not-allowed' }}
              />
            </Flex>

          {/* Edit Lead Modal */}
          <EditLeadModal
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedEditLead(null);
            }}
            lead={selectedEditLead}
            onSuccess={() => {
              refetch();
            }}
          />

          {/* Book Appointment Modal */}
          <BookAppointmentModal lead={selectedAppointmentLead} isOpen={appointmentModalOpen} onClose={() => setAppointmentModalOpen(false)} />

          <AddToCampaignModal
            leadId={campaignLeadId}
            isOpen={campaignModalOpen}
            onClose={() => setCampaignModalOpen(false)}
            onSuccess={refetch}
          />

          {quickDripLead && (
            <QuickDripModal
              lead={quickDripLead}
              onClose={() => setQuickDripLead(null)}
            />
          )}

          {/* Referral Partner Modal */}
          <Modal isOpen={isReferralOpen} onClose={() => setReferralOpen(false)} size="sm" isCentered>
            <ModalOverlay />
            <ModalContent p={6} bg="white">
              <Text fontSize="lg" fontWeight="bold" mb={4} textAlign="center">
                Choose Referral Destination
              </Text>
              {referralLinks.map((link) => (
                <ChakraButton
                  key={link.name}
                  width="100%"
                  mb={3}
                  colorScheme="orange"
                  onClick={() => {
                    window.open(link.url, '_blank', 'noopener');
                    setReferralOpen(false);
                  }}
                >
                  {link.name}
                </ChakraButton>
              ))}
            </ModalContent>
          </Modal>
        </div>
      </div>
    </>
  );
}
