import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axiosInstance from '../api/axiosInstance';
import { useToast, Text, Box, Flex, Button as ChakraButton } from '@chakra-ui/react';
import { SketchPicker } from 'react-color';
import ReactCrop, { centerCrop, makeAspectCrop, Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import SuccessToast from '../components/SuccessToast';

// Import icons
import {
  FaPlus,
  FaTimes,
  FaEdit,
  FaTrash,
  FaSave,
  FaArrowUp,
  FaArrowDown,
  FaHome,
  FaBroom,
  FaSmile,
  FaUpload,
  FaUser,
  FaEnvelope,
  FaLock,
  FaCamera,
  FaCheck,
  FaRedo,
  FaCrop,
  FaEye,
  FaEyeSlash,
} from 'react-icons/fa';

// Replace the lightOffwhiteStyle with proper theme usage
// const lightOffwhiteStyle = {
//   backgroundColor: '#f5f2e9', // Light offwhite with slight yellow/brown tint
//   backgroundSize: 'cover',
//   backgroundPosition: 'center',
//   backgroundAttachment: 'fixed'
// };

// Styled components
const SettingsContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: #2d3748;
  min-height: 100vh;
  background-color: transparent;
`;

const SettingsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;

  h1 {
    font-weight: 700;
    font-size: 1.8rem;
    margin: 0;
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  img {
    height: 80px;
    cursor: pointer;
    transition: transform 0.2s ease;

    &:hover {
      transform: scale(1.03);
    }
  }
`;

const SectionContainer = styled.div`
  background-color: transparent;
  border-radius: 8px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.05),
    0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.1);

  &:hover {
    box-shadow:
      0 6px 12px rgba(0, 0, 0, 0.05),
      0 3px 6px rgba(0, 0, 0, 0.08);
  }
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background-color: transparent;
  border-bottom: 2px solid #ff8c00;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
`;

const SectionContent = styled.div`
  padding: 1.5rem;
  background-color: transparent;
`;

const DispositionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  grid-gap: 1rem;
  margin-top: 1.25rem;
`;

const DispositionCard = styled.div<{ color: string; isDefault: boolean }>`
  background-color: rgba(255, 255, 255, 0.5);
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
  height: 90px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  color: #4a5568;

  ${({ isDefault }) =>
    isDefault &&
    `
    border-left: 3px solid #4a5568;
  `}

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 8px;
    height: 100%;
    background-color: ${({ color }) => color};
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
  }
`;

const CardActions = styled.div`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #4a5568;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    color: #e53e3e;
  }
`;

const EditButton = styled.button`
  background: none;
  border: none;
  color: #4a5568;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    color: #ff8c00;
  }
`;

const DispositionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  position: relative;
`;

const DispositionName = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  flex: 1;
  color: #2d3748;
  padding-right: 0.5rem;
  max-width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;

  /* Ensure text wraps nicely */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.3;
`;

const DefaultBadge = styled.span`
  background-color: #ff8c00;
  color: white;
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-weight: 500;
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
`;

const ColorPreview = styled.div<{ color: string }>`
  width: 24px;
  height: 24px;
  min-width: 24px;
  border-radius: 6px;
  background-color: ${({ color }) => color};
  border: 1px solid #e2e8f0;
  margin-right: 0.75rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
`;

const EmojiContainer = styled.span`
  margin-left: 0.5rem;
  font-size: 1.2rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.6rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);

  ${({ variant }) => {
    if (variant === 'primary') {
      return `
        background-color: #FF8C00;
        color: white;
        &:hover {
          background-color: #FF8C00;
          color: white;
          box-shadow: 0 4px 6px rgba(255, 140, 0, 0.4);
        }
        &:active {
          background-color: #CC7000;
        }
      `;
    } else if (variant === 'danger') {
      return `
        background-color: #e53e3e;
        color: white;
        &:hover {
          background-color: #c53030;
          box-shadow: 0 4px 6px rgba(229, 62, 62, 0.2);
        }
        &:active {
          background-color: #9b2c2c;
        }
      `;
    } else {
      return `
        background-color: #FF8C00;
        color: white;
        &:hover {
          background-color: #FF8C00;
          color: white;
          box-shadow: 0 4px 6px rgba(255, 140, 0, 0.4);
        }
        &:active {
          background-color: #CC7000;
        }
      `;
    }
  }}
`;

const TabContainer = styled.div`
  display: flex;
  gap: 0.25rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e2e8f0;
  background-color: transparent;
`;

const Tab = styled.button<{ active: boolean }>`
  background: ${({ active }) => (active ? '#FF8C00' : 'none')};
  border: none;
  padding: 0.85rem 1.5rem;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid ${({ active }) => (active ? '#FF8C00' : 'transparent')};
  color: ${({ active }) => (active ? 'white' : '#4a5568')};
  transition: all 0.2s;
  position: relative;

  &:hover {
    color: ${({ active }) => (active ? 'white' : '#4a5568')};
    background-color: ${({ active }) => (active ? '#FF8C00' : 'transparent')};
    outline: ${({ active }) => (active ? 'none' : '2px solid #000000')};
    outline-offset: -2px;
  }

  &:after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: ${({ active }) => (active ? '#FF8C00' : 'transparent')};
    transition: transform 0.3s ease;
    transform: scaleX(${({ active }) => (active ? '1' : '0')});
    transform-origin: left;
  }

  &:hover:after {
    transform: scaleX(1);
    background-color: ${({ active }) => (active ? '#FF8C00' : 'transparent')};
  }
`;

// New styled components for the form
const FormContainer = styled.div`
  margin-bottom: 2rem;
  padding: 1.75rem;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  border: 1px solid #e9ecef;
  border-left: 3px solid #ff8c00;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: #2d3748;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e2e8f0;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  background-color: transparent;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  flex: 1;
  min-width: 200px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #4a5568;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.2);
  }

  &::placeholder {
    color: #a0aec0;
  }
`;

const EmojiDropdown = styled.div`
  position: relative;
  width: 4rem;
`;

const EmojiButton = styled.button`
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1.2rem;
  text-align: center;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus,
  &:hover {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.2);
  }
`;

const EmojiPickerContainer = styled.div<{ isOpen: boolean }>`
  display: ${({ isOpen }) => (isOpen ? 'block' : 'none')};
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.5rem;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
  padding: 0.75rem;
  width: 350px;
  max-height: 320px;
  overflow-y: auto;
`;

const EmojiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-gap: 0.5rem;
  margin-bottom: 1rem;
`;

const EmojiSectionTitle = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  color: #718096;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.25rem;
`;

const EmojiOption = styled.button`
  background: none;
  border: none;
  font-size: 1.2rem;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f0f0f0;
  }
`;

const EmojiPickerCover = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
`;

const ColorPickerContainer = styled.div`
  position: relative;
`;

const ColorSwatch = styled.div<{ color: string }>`
  width: 100%;
  height: 42px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background-color: ${({ color }) => color};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  color: ${({ color }) => (isLightColor(color) ? '#2d3748' : 'white')};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e0;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.2);
  }
`;

// Helper function to determine if a color is light
const isLightColor = (color: string): boolean => {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate perceived brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 125;
};

const ColorPickerPopover = styled.div`
  position: absolute;
  z-index: 100;
  top: 100%;
  margin-top: 0.5rem;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  overflow: hidden;
  left: 0;
`;

const ColorPickerCover = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  /* Allow clicks to pass through so the picker remains interactive */
  pointer-events: none;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const EmptyStateContainer = styled.div`
  text-align: center;
  padding: 3.5rem 1.5rem;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 1px dashed #ff8c00;

  p {
    color: #4a5568;
    margin-bottom: 1.5rem;
    font-size: 1.05rem;
  }
`;

const DispositionControls = styled.div`
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
`;

const Description = styled.p`
  color: #2d3748;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  background-color: rgba(255, 255, 255, 0.5);
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.05);
`;

const HeaderButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

// Types
interface Disposition {
  _id: string;
  name: string;
  color: string;
  isDefault: boolean;
  createdBy: string;
  sortOrder: number;
  emoji?: string;
  createdAt: string;
  updatedAt: string;
}

interface NewDisposition {
  name: string;
  color: string;
  emoji: string;
}

// Add styled components for the account section
const AvatarContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
`;

const Avatar = styled.div<{ src?: string }>`
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background-color: #f1f1f1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: #ccc;
  position: relative;
  background-image: ${({ src }) => (src ? `url(${src})` : 'none')};
  background-size: cover;
  background-position: center;
  border: 3px solid #ff8c00;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
`;

const UploadButton = styled.label`
  position: absolute;
  bottom: 0;
  right: 0;
  background-color: #ff8c00;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;

  &:hover {
    transform: scale(1.1);
    background-color: #ff8c00;
  }

  input {
    display: none;
  }
`;

const ErrorText = styled.div`
  color: #e53e3e;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const ShowPasswordToggle = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #718096;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  z-index: 2;

  &:hover {
    color: #4a5568;
  }
`;

const PasswordInputContainer = styled.div`
  position: relative;
  width: 100%;
`;

// New styled components for image cropping
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #2d3748;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const CropContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin: 0 auto;
`;

// Helper function to create a centered crop with aspect ratio
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

// Function to get a canvas with the cropped image
function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): Promise<string> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Set the canvas dimensions to the crop dimensions
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return Promise.reject(new Error('No canvas context'));
  }

  // Use better quality settings for image rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw the cropped portion of the image onto the canvas
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  // Return a Promise that resolves with the data URL
  return new Promise((resolve) => {
    // Use a higher quality setting (0.92) for better image quality
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          console.error('Canvas is empty');
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      0.92
    ); // Higher quality setting (0.92 instead of default 0.7)
  });
}

const Settings: React.FC = () => {
  const { user, updateProfile, refreshUserData } = useAuth();
  const { backgroundColor, setBackgroundColor } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const modalRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Get tab from URL parameters
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');

  const [activeTab, setActiveTab] = useState<'general' | 'dispositions' | 'account'>(
    tabParam === 'account' ? 'account' : tabParam === 'general' ? 'general' : 'dispositions'
  );
  const [showForm, setShowForm] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBackgroundColorPicker, setShowBackgroundColorPicker] = useState(false);
  const [editingDispositionId, setEditingDispositionId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Form state for new/edited disposition
  const [formData, setFormData] = useState<NewDisposition>({
    name: '',
    color: '#4299e1',
    emoji: '',
  });

  // Common emojis for dispositions
  const commonEmojis = [
    // Dental related
    '🦷',
    '🪥',
    '😁',
    '😬',
    '🩺',
    '💊',
    '🏥',
    '⚕️',
    '🧑‍⚕️',
    '👩‍⚕️',
    '👨‍⚕️',

    // Status indicators
    '🔥',
    '✅',
    '❌',
    '📞',
    '💰',
    '⏰',
    '🤝',
    '👋',
    '📊',
    '✨',
    '🚫',
    '💯',
    '🆕',
    '🔄',
    '🔔',
    '🔕',
    '📌',
    '📍',
    '📝',
    '📋',

    // Emotions
    '😊',
    '😐',
    '😡',
    '🙁',
    '🤔',
    '👍',
    '👎',
    '🙂',
    '😢',
    '😴',
    '😃',
    '🤗',
    '😎',
    '😱',
    '😇',
    '🤑',
    '🤩',
    '😍',
    '🥺',
    '😤',

    // Objects and symbols
    '⭐',
    '🔴',
    '🟢',
    '🔵',
    '⚠️',
    '❓',
    '❗',
    '💼',
    '📅',
    '🏆',
    '🎯',
    '📱',
    '💻',
    '📨',
    '🔒',
    '🔓',
    '🔑',
    '🔍',
    '💡',
    '⚡',

    // Business related
    '📈',
    '📉',
    '💲',
    '💵',
    '💳',
    '🧾',
    '📑',
    '📃',
    '🗂️',
    '📁',
    '📂',
    '📊',
    '📆',
    '🗓️',
    '⏳',
    '⌛',
    '🔄',
    '🔃',
    '🔁',
    '🔂',
  ];

  // Account settings state
  const [accountFormData, setAccountFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
  });

  const [profilePicture, setProfilePicture] = useState<string | null>(user?.profilePicture || null);

  const [showPassword, setShowPassword] = useState(false);
  const [accountFormErrors, setAccountFormErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  // Image cropping states
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Add isSubmitting state for the account form
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to reset form
  const resetForm = () => {
    setFormData({
      name: '',
      color: '#4299e1',
      emoji: '',
    });
    setEditingDispositionId(null);
    setShowForm(false);
    setShowColorPicker(false);
    setShowEmojiPicker(false);
  };

  // Fetch dispositions from API
  const {
    data: dispositions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dispositions'],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get('dispositions');
        // If no dispositions found, seed the defaults automatically
        if (response.data.length === 0) {
          const seedResponse = await axiosInstance.post('dispositions/seed-defaults');
          return seedResponse.data.dispositions;
        }
        return response.data;
      } catch (error) {
        console.error('Error fetching dispositions:', error);
        return [];
      }
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Seed default dispositions mutation
  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post('dispositions/seed-defaults');
      return response.data;
    },
    onSuccess: () => {
      toast({
        duration: 3000,
        isClosable: true,
        position: 'top',
        render: ({ onClose }) => (
          <SuccessToast message="Default dispositions created successfully" onClose={onClose} />
        ),
      });
      queryClient.invalidateQueries({ queryKey: ['dispositions'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create default dispositions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    },
  });

  // Create new disposition mutation
  const createDispositionMutation = useMutation({
    mutationFn: async (data: NewDisposition) => {
      const response = await axiosInstance.post('dispositions', data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        duration: 3000,
        isClosable: true,
        position: 'top',
        render: ({ onClose }) => (
          <SuccessToast message="Disposition created successfully" onClose={onClose} />
        ),
      });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['dispositions'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create disposition',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    },
  });

  // Update disposition mutation
  const updateDispositionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NewDisposition> }) => {
      const response = await axiosInstance.put(`/api/dispositions/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        duration: 3000,
        isClosable: true,
        position: 'top',
        render: ({ onClose }) => (
          <SuccessToast message="Disposition updated successfully" onClose={onClose} />
        ),
      });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['dispositions'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update disposition',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    },
  });

  // Delete disposition mutation
  const deleteDispositionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`/api/dispositions/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast({
        duration: 3000,
        isClosable: true,
        position: 'top',
        render: ({ onClose }) => (
          <SuccessToast message="Disposition deleted successfully" onClose={onClose} />
        ),
      });
      queryClient.invalidateQueries({ queryKey: ['dispositions'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete disposition',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    },
  });

  // Function to handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        title: 'Error',
        description: 'Disposition name is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Ensure name is no more than 20 characters
    const trimmedData = {
      ...formData,
      name: formData.name.substring(0, 20),
    };

    if (editingDispositionId) {
      updateDispositionMutation.mutate({
        id: editingDispositionId,
        data: trimmedData,
      });
    } else {
      createDispositionMutation.mutate(trimmedData);
    }
  };

  // Function to handle editing a disposition
  const handleEdit = (disposition: Disposition) => {
    setFormData({
      name: disposition.name,
      color: disposition.color,
      emoji: disposition.emoji || '',
    });
    setEditingDispositionId(disposition._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Function to handle deleting a disposition
  const handleDelete = (id: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this disposition? This action cannot be undone.'
      )
    ) {
      deleteDispositionMutation.mutate(id);
    }
  };

  // Function to handle clicking outside background color picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowBackgroundColorPicker(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [colorPickerRef]);

  // Close disposition color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Function to handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, 'Type:', file.type, 'Size:', file.size / 1024, 'KB');

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      console.log('File too large:', file.size / 1024, 'KB');
      toast({
        title: 'Error',
        description: 'Image size should be less than 2MB',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      console.log('Invalid file type:', file.type);
      toast({
        title: 'Error',
        description: 'Only image files are allowed',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Load image for cropping
    const reader = new FileReader();
    reader.onload = () => {
      console.log('File read successfully, opening crop modal');
      setImageSrc(reader.result as string);
      setShowCropModal(true);
    };
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to read image file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    };
    reader.readAsDataURL(file);
  };

  // Function to handle image loaded for cropping
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1)); // 1:1 aspect ratio for profile picture
  };

  // Function to handle crop cancellation
  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageSrc('');
    setCrop(undefined);
    setCompletedCrop(null);
  };

  // Function to handle crop confirmation
  const handleCropConfirm = async () => {
    if (completedCrop && imgRef.current) {
      try {
        const croppedImageUrl = await getCroppedImg(imgRef.current, completedCrop);
        console.log('Cropped image generated:', croppedImageUrl ? 'Success' : 'Failed');
        setProfilePicture(croppedImageUrl);
        setShowCropModal(false);
        setImageSrc('');
        setCrop(undefined);
        setCompletedCrop(null);
      } catch (e) {
        console.error('Error cropping image:', e);
        toast({
          title: 'Error',
          description: 'Failed to crop image',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  // Function to handle account form submission
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Set submitting state
    setIsSubmitting(true);

    // Validate form
    const errors: any = {};

    if (!accountFormData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!accountFormData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountFormData.email)) {
      errors.email = 'Invalid email format';
    }

    if (accountFormData.password && accountFormData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (accountFormData.password !== accountFormData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setAccountFormErrors(errors);
      setIsSubmitting(false);
      return;
    }

    // Prepare data for submission
    const updateData: any = {
      name: accountFormData.name,
      email: accountFormData.email,
    };

    if (accountFormData.password) {
      updateData.password = accountFormData.password;
    }

    // Always include the profile picture in the update data if it exists
    if (profilePicture) {
      updateData.profilePicture = profilePicture;
      console.log('Sending profile picture in update:', profilePicture.substring(0, 50) + '...');
    }

    try {
      // Update profile directly using the auth context
      await updateProfile(updateData);

      // Force refresh user data to ensure all components get updated
      await refreshUserData();

      // Show success animation using our new component
      toast({
        duration: 3000,
        isClosable: true,
        position: 'top',
        render: ({ onClose }) => (
          <SuccessToast message="Profile updated successfully" onClose={onClose} />
        ),
      });

      // Reset password fields
      setAccountFormData((prev) => ({
        ...prev,
        password: '',
        confirmPassword: '',
      }));

      setAccountFormErrors({});
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update profile';

      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });

      setAccountFormErrors({
        general: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update account form fields when user data changes
  useEffect(() => {
    if (user) {
      setAccountFormData((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));

      if (user.profilePicture) {
        setProfilePicture(user.profilePicture);
      }
    }
  }, [user]);

  // Function to handle tab changes
  const handleTabChange = (tab: 'general' | 'dispositions' | 'account') => {
    setActiveTab(tab);
    navigate(`/settings?tab=${tab}`);
  };

  // Update tab when URL parameters change
  useEffect(() => {
    const tab = queryParams.get('tab');
    if (tab === 'account') {
      setActiveTab('account');
    } else if (tab === 'general') {
      setActiveTab('general');
    } else if (tab === 'dispositions') {
      setActiveTab('dispositions');
    }
  }, [location.search]);

  // Render
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading settings</div>;
  }

  const handleEmojiSelect = (emoji: string) => {
    setFormData({ ...formData, emoji });
    setShowEmojiPicker(false);
  };

  return (
    <SettingsContainer className="settings-container">
      <SettingsHeader>
        <LogoContainer>
          <img
            src="/images/HEADER LOGO.png"
            alt="Crokodial Logo"
            style={{ height: '60px', width: 'auto' }}
            onClick={() => navigate('/')}
          />
          <h1>Settings</h1>
        </LogoContainer>
        <Button variant="secondary" onClick={() => navigate('/')} style={{ width: '160px' }}>
          <img
            src="/images/FORWARD.png"
            alt="Back"
            style={{
              width: '24px',
              height: '24px',
              marginRight: '6px',
              transform: 'scaleX(-1)',
            }}
          />
          Back to Dashboard
        </Button>
      </SettingsHeader>

      <TabContainer className="tab-container">
        <Tab active={activeTab === 'general'} onClick={() => handleTabChange('general')}>
          General
        </Tab>
        <Tab active={activeTab === 'dispositions'} onClick={() => handleTabChange('dispositions')}>
          Dispositions
        </Tab>
        <Tab active={activeTab === 'account'} onClick={() => handleTabChange('account')}>
          Account
        </Tab>
      </TabContainer>

      {activeTab === 'general' && (
        <SectionContainer className="section-container">
          <SectionHeader className="section-header">
            <SectionTitle>Appearance Settings</SectionTitle>
          </SectionHeader>

          <SectionContent className="section-content">
            <Description>Customize the look and feel of your Crokodial application.</Description>

            <FormContainer className="form-container">
              <h3>Theme Options</h3>
              <FormRow>
                <FormGroup>
                  <Label htmlFor="colorPicker">Background Color</Label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px',
                    }}
                  >
                    <input
                      type="color"
                      id="colorPicker"
                      value={backgroundColor}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        // Direct DOM manipulation for immediate effect
                        document.body.style.backgroundColor = newColor;
                        document.documentElement.style.setProperty(
                          '--app-background-color',
                          newColor
                        );
                        // Update context state
                        setBackgroundColor(newColor);
                        // Store in localStorage
                        localStorage.setItem('crokodial_bg_color', newColor);
                      }}
                      style={{
                        width: '60px',
                        height: '60px',
                        border: 'none',
                        boxShadow: '0 0 5px rgba(0,0,0,0.2)',
                        cursor: 'pointer',
                      }}
                    />
                    <div
                      style={{
                        padding: '0.5rem 1rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        minWidth: '100px',
                      }}
                    >
                      {backgroundColor}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        const defaultColor = '#f5f2e9';
                        // Direct DOM manipulation for immediate effect
                        document.body.style.backgroundColor = defaultColor;
                        document.documentElement.style.setProperty(
                          '--app-background-color',
                          defaultColor
                        );
                        // Update context state
                        setBackgroundColor(defaultColor);
                        // Store in localStorage
                        localStorage.setItem('crokodial_bg_color', defaultColor);
                      }}
                      style={{ marginLeft: 'auto' }}
                    >
                      Reset to Default
                    </Button>
                  </div>
                  <Text fontSize="sm" color="gray.600" mt={2}>
                    Pick a color to change the background of the entire application.
                  </Text>
                </FormGroup>
              </FormRow>
            </FormContainer>
          </SectionContent>
        </SectionContainer>
      )}

      {activeTab === 'dispositions' && (
        <SectionContainer className="section-container">
          <SectionHeader className="section-header">
            <SectionTitle>Manage Dispositions</SectionTitle>
            <HeaderButtonGroup>
              {!showForm ? (
                <Button variant="primary" onClick={() => setShowForm(true)}>
                  <FaPlus /> Create New
                </Button>
              ) : (
                <Button variant="secondary" onClick={resetForm}>
                  <FaTimes /> Cancel
                </Button>
              )}
              <Button variant="secondary" onClick={() => seedDefaultsMutation.mutate()}>
                <FaBroom /> Restore Defaults
              </Button>
            </HeaderButtonGroup>
          </SectionHeader>

          <SectionContent>
            {showForm && (
              <FormContainer>
                <h3>{editingDispositionId ? 'Edit Disposition' : 'Create New Disposition'}</h3>
                <form onSubmit={handleSubmit}>
                  <FormRow>
                    <FormGroup>
                      <Label htmlFor="name">Disposition Name</Label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Hot Lead, Call Back"
                        maxLength={20}
                        required
                      />
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#718096',
                          marginTop: '0.25rem',
                        }}
                      >
                        {formData.name.length}/20 characters
                      </div>
                    </FormGroup>

                    <FormGroup>
                      <Label htmlFor="emoji">Emoji (Optional)</Label>
                      <EmojiDropdown>
                        <EmojiButton
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        >
                          {formData.emoji || <FaSmile />}
                        </EmojiButton>

                        {showEmojiPicker && (
                          <>
                            <EmojiPickerCover onClick={() => setShowEmojiPicker(false)} />
                            <EmojiPickerContainer isOpen={showEmojiPicker} ref={emojiPickerRef}>
                              <EmojiSectionTitle>Dental</EmojiSectionTitle>
                              <EmojiGrid>
                                {commonEmojis.slice(0, 11).map((emoji) => (
                                  <EmojiOption key={emoji} onClick={() => handleEmojiSelect(emoji)}>
                                    {emoji}
                                  </EmojiOption>
                                ))}
                              </EmojiGrid>

                              <EmojiSectionTitle>Status</EmojiSectionTitle>
                              <EmojiGrid>
                                {commonEmojis.slice(11, 31).map((emoji) => (
                                  <EmojiOption key={emoji} onClick={() => handleEmojiSelect(emoji)}>
                                    {emoji}
                                  </EmojiOption>
                                ))}
                              </EmojiGrid>

                              <EmojiSectionTitle>Emotions</EmojiSectionTitle>
                              <EmojiGrid>
                                {commonEmojis.slice(31, 51).map((emoji) => (
                                  <EmojiOption key={emoji} onClick={() => handleEmojiSelect(emoji)}>
                                    {emoji}
                                  </EmojiOption>
                                ))}
                              </EmojiGrid>

                              <EmojiSectionTitle>Symbols</EmojiSectionTitle>
                              <EmojiGrid>
                                {commonEmojis.slice(51, 71).map((emoji) => (
                                  <EmojiOption key={emoji} onClick={() => handleEmojiSelect(emoji)}>
                                    {emoji}
                                  </EmojiOption>
                                ))}
                              </EmojiGrid>

                              <EmojiSectionTitle>Business</EmojiSectionTitle>
                              <EmojiGrid>
                                {commonEmojis.slice(71).map((emoji) => (
                                  <EmojiOption key={emoji} onClick={() => handleEmojiSelect(emoji)}>
                                    {emoji}
                                  </EmojiOption>
                                ))}
                              </EmojiGrid>
                            </EmojiPickerContainer>
                          </>
                        )}
                      </EmojiDropdown>
                    </FormGroup>

                    <FormGroup>
                      <Label htmlFor="color">Color</Label>
                      <ColorPickerContainer>
                        <ColorSwatch
                          color={formData.color}
                          onClick={() => setShowColorPicker(!showColorPicker)}
                        >
                          {formData.color}
                        </ColorSwatch>

                        {showColorPicker && (
                          <ColorPickerPopover ref={modalRef}>
                            <ColorPickerCover onClick={() => setShowColorPicker(false)} />
                            <SketchPicker
                              color={formData.color}
                              onChangeComplete={(c) =>
                                setFormData((prev) => ({ ...prev, color: c.hex }))
                              }
                              disableAlpha
                              presetColors={[
                                '#FF8C00', // Orange (Theme)
                                '#D53F8C', // Pink
                                '#E53E3E', // Red
                                '#DD6B20', // Orange
                                '#D69E2E', // Yellow
                                '#38A169', // Green
                                '#319795', // Teal
                                '#3182CE', // Blue
                                '#4299E1', // Light Blue
                                '#805AD5', // Purple
                                '#6B46C1', // Dark Purple
                                '#718096', // Gray
                                '#2D3748', // Dark Gray
                              ]}
                            />
                          </ColorPickerPopover>
                        )}
                      </ColorPickerContainer>
                    </FormGroup>
                  </FormRow>

                  <ButtonContainer>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetForm}
                      disabled={
                        isLoading ||
                        createDispositionMutation.isPending ||
                        updateDispositionMutation.isPending ||
                        deleteDispositionMutation.isPending
                      }
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        isLoading ||
                        createDispositionMutation.isPending ||
                        updateDispositionMutation.isPending ||
                        deleteDispositionMutation.isPending
                      }
                    >
                      {editingDispositionId ? 'Update' : 'Create'}
                    </Button>
                  </ButtonContainer>
                </form>
              </FormContainer>
            )}

            <Description>
              Customize your lead dispositions to fit your workflow. Each disposition has a unique
              color that will be used throughout the app. You can modify or delete any disposition,
              including the default ones.
            </Description>

            {dispositions && dispositions.length > 0 ? (
              <DispositionsGrid>
                {dispositions.map((disposition: Disposition) => (
                  <DispositionCard
                    key={disposition._id}
                    color={disposition.color}
                    isDefault={disposition.isDefault}
                  >
                    <CardActions>
                      <EditButton onClick={() => handleEdit(disposition)} title="Edit">
                        <FaEdit />
                      </EditButton>
                      <CloseButton onClick={() => handleDelete(disposition._id)} title="Delete">
                        <FaTimes />
                      </CloseButton>
                    </CardActions>

                    <DispositionHeader>
                      <DispositionName>
                        <ColorPreview color={disposition.color} />
                        {disposition.name.length > 20
                          ? `${disposition.name.substring(0, 20)}...`
                          : disposition.name}
                        {disposition.emoji && <EmojiContainer>{disposition.emoji}</EmojiContainer>}
                      </DispositionName>
                    </DispositionHeader>

                    {disposition.isDefault && <DefaultBadge>Default</DefaultBadge>}
                  </DispositionCard>
                ))}
              </DispositionsGrid>
            ) : (
              <EmptyStateContainer>
                <p>
                  No dispositions found. Click "Restore Defaults" to create the default set or
                  "Create New" to add your own.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setShowForm(true)}
                  style={{ marginTop: '1rem' }}
                >
                  <FaPlus /> Create New Disposition
                </Button>
              </EmptyStateContainer>
            )}
          </SectionContent>
        </SectionContainer>
      )}

      {activeTab === 'account' && (
        <SectionContainer className="section-container">
          <SectionHeader className="section-header">
            <SectionTitle>Account Settings</SectionTitle>
          </SectionHeader>

          <SectionContent className="section-content">
            <Description>
              Update your personal information and manage your account settings.
            </Description>

            <FormContainer className="form-container">
              <h3>Personal Information</h3>
              <form onSubmit={handleAccountSubmit}>
                <AvatarContainer>
                  <Avatar src={profilePicture || undefined}>
                    {!profilePicture && (user?.name?.[0] || user?.email?.[0] || <FaUser />)}

                    <UploadButton htmlFor="profile-picture">
                      <FaCamera />
                      <input
                        type="file"
                        id="profile-picture"
                        accept="image/*"
                        onChange={handleFileUpload}
                      />
                    </UploadButton>
                  </Avatar>
                  <Text fontSize="sm" color="gray.500">
                    {profilePicture ? 'Profile picture selected' : 'No profile picture set'}
                  </Text>
                  {/* Debug info */}
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    Current user profile: {user?.profilePicture ? 'Exists' : 'None'}
                  </Text>
                  <Text fontSize="xs" color="gray.400">
                    Selected profile: {profilePicture ? 'Selected' : 'None'}
                  </Text>
                </AvatarContainer>

                {/* Debug buttons - only shown in development mode */}
                {process.env.NODE_ENV !== 'production' && (
                  <div
                    style={{
                      marginBottom: '1rem',
                      border: '1px dashed #ccc',
                      padding: '1rem',
                      borderRadius: '5px',
                    }}
                  >
                    <Text fontSize="sm" fontWeight="bold" mb={2}>
                      Debug Tools
                    </Text>
                    <Flex gap={2} wrap="wrap">
                      <ChakraButton
                        size="xs"
                        colorScheme="blue"
                        onClick={async () => {
                          try {
                            const response = await axiosInstance.get('auth/debug-profile');
                            console.log('Debug profile:', response.data);
                            toast({
                              title: 'Debug Info',
                              description: `Profile picture: ${response.data.hasProfilePicture ? 'YES' : 'NO'} (${response.data.profilePictureLength} bytes)`,
                              status: 'info',
                              duration: 5000,
                              isClosable: true,
                            });
                          } catch (error) {
                            console.error('Error fetching debug info:', error);
                          }
                        }}
                      >
                        Get Server Profile
                      </ChakraButton>
                      <ChakraButton
                        size="xs"
                        colorScheme="green"
                        onClick={() => {
                          refreshUserData();
                          toast({
                            title: 'User Data Refreshed',
                            status: 'success',
                            duration: 3000,
                            isClosable: true,
                          });
                        }}
                      >
                        Refresh User Data
                      </ChakraButton>
                      <ChakraButton
                        size="xs"
                        colorScheme="red"
                        onClick={() => {
                          localStorage.removeItem('profilePicture');
                          window.location.reload();
                        }}
                      >
                        Clear Cache
                      </ChakraButton>
                    </Flex>
                  </div>
                )}

                <FormRow>
                  <FormGroup>
                    <Label htmlFor="name">
                      <FaUser style={{ marginRight: '0.5rem' }} /> Full Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={accountFormData.name}
                      onChange={(e) =>
                        setAccountFormData({
                          ...accountFormData,
                          name: e.target.value,
                        })
                      }
                      placeholder="Enter your full name"
                      autoComplete="name"
                    />
                    {accountFormErrors.name && <ErrorText>{accountFormErrors.name}</ErrorText>}
                  </FormGroup>

                  <FormGroup>
                    <Label htmlFor="email">
                      <FaEnvelope style={{ marginRight: '0.5rem' }} /> Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={accountFormData.email}
                      onChange={(e) =>
                        setAccountFormData({
                          ...accountFormData,
                          email: e.target.value,
                        })
                      }
                      placeholder="Enter your email address"
                      autoComplete="email"
                    />
                    {accountFormErrors.email && <ErrorText>{accountFormErrors.email}</ErrorText>}
                  </FormGroup>
                </FormRow>

                <FormRow>
                  <FormGroup>
                    <Label htmlFor="password">
                      <FaLock style={{ marginRight: '0.5rem' }} /> New Password
                    </Label>
                    <PasswordInputContainer>
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={accountFormData.password}
                        onChange={(e) =>
                          setAccountFormData({
                            ...accountFormData,
                            password: e.target.value,
                          })
                        }
                        placeholder="Leave blank to keep current password"
                        autoComplete="new-password"
                      />
                      <ShowPasswordToggle
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </ShowPasswordToggle>
                    </PasswordInputContainer>
                    {accountFormErrors.password && (
                      <ErrorText>{accountFormErrors.password}</ErrorText>
                    )}
                  </FormGroup>

                  <FormGroup>
                    <Label htmlFor="confirmPassword">
                      <FaLock style={{ marginRight: '0.5rem' }} /> Confirm New Password
                    </Label>
                    <PasswordInputContainer>
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={accountFormData.confirmPassword}
                        onChange={(e) =>
                          setAccountFormData({
                            ...accountFormData,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="Confirm your new password"
                        disabled={!accountFormData.password}
                        autoComplete="new-password"
                      />
                      <ShowPasswordToggle
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </ShowPasswordToggle>
                    </PasswordInputContainer>
                    {accountFormErrors.confirmPassword && (
                      <ErrorText>{accountFormErrors.confirmPassword}</ErrorText>
                    )}
                  </FormGroup>
                </FormRow>

                {accountFormErrors.general && (
                  <div style={{ marginBottom: '1rem' }}>
                    <ErrorText>{accountFormErrors.general}</ErrorText>
                  </div>
                )}

                <ButtonContainer>
                  <Button type="submit" variant="primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </ButtonContainer>
              </form>
            </FormContainer>
          </SectionContent>
        </SectionContainer>
      )}

      {/* Image cropping modal */}
      {showCropModal && (
        <ModalOverlay>
          <ModalContent>
            <ModalHeader>
              <h2>Adjust Profile Picture</h2>
              <button onClick={handleCropCancel}>
                <FaTimes />
              </button>
            </ModalHeader>

            <CropContainer>
              <p
                style={{
                  marginBottom: '1rem',
                  color: '#4a5568',
                  fontSize: '0.9rem',
                }}
              >
                Drag the crop area to adjust how your profile picture appears.
              </p>

              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  style={{ maxHeight: '50vh', maxWidth: '100%' }}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </CropContainer>

            <ModalFooter>
              <Button onClick={handleCropCancel}>
                <FaTimes /> Cancel
              </Button>
              <Button variant="primary" onClick={handleCropConfirm} disabled={!completedCrop}>
                <FaCheck /> Apply Crop
              </Button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </SettingsContainer>
  );
};

export default Settings;
