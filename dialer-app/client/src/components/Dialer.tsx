import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { normalizePhone } from '../utils/lifetimeCounts';
import { useLifetimeCounts } from '../context/LifetimeCountsContext';
import { dialPhone } from '../utils/dial';

// Create edge-locking utility functions

// Define the original dimensions for proportional scaling
const ORIGINAL_WIDTH = 220;
const ORIGINAL_HEIGHT = 500;
const MAX_SCALE = 4;
const MIN_SCALE = 1; // Set minimum scale to 1.0 (original size)

// Define the snap zone dimensions (bottom right corner)
const SNAP_ZONE_SIZE = 100;

// Add EXACT dimension constants for browsers to account for chrome/borders
const CHROME_HEIGHT_ADJUSTMENT = 28; // Account for browser title bar on macOS
const CHROME_WIDTH_ADJUSTMENT = 0; // No additional width adjustment needed

// Define the fixed margin adjustment for detached windows
const FIXED_RIGHT_MARGIN = -20; // Moderate negative value for small padding

// Define padding for the bottom of the detached window
const BOTTOM_PADDING = 30; // Add 30px of space at the bottom

// Extend Window interface for our global variables
declare global {
  interface Window {
    FIXED_DIALER_WIDTH?: number;
    FIXED_DIALER_HEIGHT?: number;
  }
}

interface Position {
  x: number;
  y: number;
}

interface DialerContainerProps {
  isMinimized: boolean;
  scale: number;
  position: { x: number; y: number };
  isResizing: boolean;
  isDetached: boolean;
  currentWidth: number;
  currentHeight: number;
  isMinimizedToIcon: boolean;
  isExited: boolean;
}

const DialerContainer = styled.div<DialerContainerProps>`
  position: ${(props) => (props.isDetached ? 'static' : 'fixed')};
  bottom: 20px;
  right: 20px;
  width: ${(props) => (props.isMinimizedToIcon ? 'auto' : `${props.currentWidth}px`)};
  height: ${(props) => (props.isMinimizedToIcon ? 'auto' : `${props.currentHeight}px`)};
  background-color: ${(props) => (props.isMinimizedToIcon ? 'transparent' : '#B99865')};
  border: ${(props) => (props.isMinimizedToIcon ? 'none' : '2px solid black')};
  border-radius: 10px;
  box-shadow: ${(props) => (props.isMinimizedToIcon ? 'none' : '0 4px 8px rgba(0, 0, 0, 0.2)')};
  padding: ${(props) => (props.isMinimizedToIcon ? '0' : '10px')};
  z-index: 100;
  display: ${(props) => (props.isExited ? 'none' : 'block')};
  transition:
    width 0.3s,
    height 0.3s,
    background-color 0.3s,
    box-shadow 0.3s;
  overflow: hidden;
  user-select: none;
  touch-action: none;
`;

const HeaderBar = styled.div<{ $scale: number; $isDragging: boolean }>`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: ${(props) => `${30 * props.$scale}px`};
  padding: ${(props) => `0 ${5 * props.$scale}px`};
  background-color: white;
  cursor: move;
  gap: ${(props) => `${5 * props.$scale}px`};
  border-radius: 8px 8px 0 0;
  border-bottom: ${(props) => (props.$isDragging ? '2px solid #4299e1' : 'none')};
`;

const WindowControls = styled.div<{ $scale: number }>`
  display: flex;
  gap: ${(props) => `${5 * props.$scale}px`};
  margin-right: auto;
`;

const WindowButton = styled.button<{ $color: string; $scale: number }>`
  width: ${(props) => `${12 * props.$scale}px`};
  height: ${(props) => `${12 * props.$scale}px`};
  border-radius: 50%;
  background-color: ${(props) => props.$color};
  border: none;
  outline: none;

  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${(props) => `${7 * props.$scale}px`};
  color: rgba(0, 0, 0, 0.5);

  &:hover {
    opacity: 0.8;
  }
`;

const DraggableArea = styled.div<{ $isDragging: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: transparent;
  z-index: 10;
  border: ${(props) => (props.$isDragging ? '2px dashed #4299e1' : 'none')};
`;

const ResizeHandle = styled.div<{ $position: string; $scale: number }>`
  position: absolute;

  ${(props) => {
    const size = `${10 * props.$scale}px`;

    // Position-specific styles
    switch (props.$position) {
      case 'top':
        return `
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 50%;
          height: ${size};
          cursor: ns-resize;
        `;
      case 'right':
        return `
          top: 50%;
          right: 0;
          transform: translateY(-50%);
          width: ${size};
          height: 50%;
          cursor: ew-resize;
        `;
      case 'bottom':
        return `
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 50%;
          height: ${size};
          cursor: ns-resize;
        `;
      case 'left':
        return `
          top: 50%;
          left: 0;
          transform: translateY(-50%);
          width: ${size};
          height: 50%;
          cursor: ew-resize;
        `;
      case 'top-left':
        return `
          top: 0;
          left: 0;
          width: ${size};
          height: ${size};
          cursor: nwse-resize;
        `;
      case 'top-right':
        return `
          top: 0;
          right: 0;
          width: ${size};
          height: ${size};
          cursor: nesw-resize;
        `;
      case 'bottom-right':
        return `
          bottom: 0;
          right: 0;
          width: ${size};
          height: ${size};
          cursor: nwse-resize;
        `;
      case 'bottom-left':
        return `
          bottom: 0;
          left: 0;
          width: ${size};
          height: ${size};
          cursor: nesw-resize;
        `;
      default:
        return '';
    }
  }}

  z-index: 20;
  background: transparent;
`;

// Minimized dock icon that appears when dialer is minimized
const MinimizedIcon = styled.div<{ $position: Position }>`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  background-image: url('/images/HEADER LOGO.png');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
  z-index: 999999;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`;

// Wrap the main component with a wrapper to prevent props from leaking to DOM
const DialerWrapper = () => {
  // Original component logic
  const [isDetached, setIsDetached] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExited, setIsExited] = useState(false);
  const [isMinimizedToIcon, setIsMinimizedToIcon] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Position>({
    x: window.innerWidth - ORIGINAL_WIDTH - 17,
    y: window.innerHeight - ORIGINAL_HEIGHT - 20,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState('');
  const [startMousePosition, setStartMousePosition] = useState<Position>({
    x: 0,
    y: 0,
  });
  const [startSize, setStartSize] = useState({
    width: ORIGINAL_WIDTH,
    height: ORIGINAL_HEIGHT,
  });
  const [startPosition, setStartPosition] = useState<Position>({ x: 0, y: 0 });
  const [dragAreaHeight, setDragAreaHeight] = useState(0);

  // Window opening flag to prevent multiple windows
  const [isOpeningWindow, setIsOpeningWindow] = useState(false);

  const dialerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const numberDisplayRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);

  const { incrementCount } = useLifetimeCounts();

  // Create a unified scaling function that synchronizes the window and dialer
  const syncScaling = (newScale: number) => {
    console.log(`Syncing scale to: ${newScale}`);

    // 1. Update React state scale
    setScale(newScale);

    // 2. Set CSS variable for scaling all elements proportionally
    document.documentElement.style.setProperty('--dialer-scale', newScale.toString());

    // 3. Apply scale to dialer container via transform
    if (dialerRef.current) {
      dialerRef.current.style.transform = `scale(${newScale})`;
      dialerRef.current.style.transformOrigin = 'center';

      // 4. Calculate precise dimensions
      const scaledWidth = ORIGINAL_WIDTH * newScale;
      const scaledHeight = ORIGINAL_HEIGHT * newScale;

      // Update container dimensions directly for perfect scaling
      dialerRef.current.style.width = `${scaledWidth}px`;
      dialerRef.current.style.height = `${scaledHeight}px`;
    }

    // 5. Calculate window dimensions based on the scale
    const windowWidth = ORIGINAL_WIDTH * newScale - FIXED_RIGHT_MARGIN;
    const windowHeight = ORIGINAL_HEIGHT * newScale + CHROME_HEIGHT_ADJUSTMENT + BOTTOM_PADDING;

    // 6. Track current scale and dimensions
    document.body.setAttribute('data-current-scale', newScale.toString());
    document.body.setAttribute('data-expected-width', windowWidth.toString());
    document.body.setAttribute('data-expected-height', windowHeight.toString());

    // 7. Update all button and element sizes to match scale
    const gridButtons = document.querySelectorAll('.grid button');
    gridButtons.forEach((button) => {
      if (button instanceof HTMLElement) {
        button.style.width = `${65 * newScale}px`;
        button.style.height = `${65 * newScale}px`;
        button.style.border = `${4 * newScale}px solid black`;
      }
    });

    const buttonImages = document.querySelectorAll('.grid button img');
    buttonImages.forEach((img) => {
      if (img instanceof HTMLElement) {
        img.style.width = `calc(100% - ${8 * newScale}px)`;
        img.style.height = `calc(100% - ${8 * newScale}px)`;
      }
    });

    // 8. Update input field size
    const inputField = document.querySelector('.bg-white');
    if (inputField && inputField instanceof HTMLElement) {
      inputField.style.width = `${210 * newScale}px`;
      inputField.style.height = `${24 * newScale}px`;
      inputField.style.borderWidth = `${2 * newScale}px`;
      inputField.style.borderRadius = `${8 * newScale}px`;
    }
  };

  // Initialize the detached window - NUCLEAR APPROACH GUARANTEEING NO RIGHT MARGIN
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const detached = params.get('detached') === 'true';

    if (!detached) return;

    try {
      // IMPORTANT: Add an immediate counter for resize operations to prevent loops
      let resizeOperationCount = 0;
      const MAX_RESIZE_OPERATIONS = 3;

      // Add a mutation observer to track body attribute changes
      // This will help us debug any resize loops
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'data-handling-resize') {
            console.log(
              'Resize handling attribute changed:',
              document.body.getAttribute('data-handling-resize')
            );
          }
        });
      });

      observer.observe(document.body, { attributes: true });

      // Override the window.resizeTo function to prevent infinite loops
      const originalResizeTo = window.resizeTo;
      window.resizeTo = function (width, height) {
        resizeOperationCount++;
        console.log(`Resize operation ${resizeOperationCount}: ${width}x${height}`);

        // If we've hit the limit, prevent further automatic resizing
        if (resizeOperationCount > MAX_RESIZE_OPERATIONS) {
          console.warn('Too many resize operations - stopping automatic resizing');
          document.body.setAttribute('data-stop-resize', 'true');
          return;
        }

        // Only call resize if not locked
        if (document.body.getAttribute('data-stop-resize') !== 'true') {
          originalResizeTo.call(window, width, height);
        }
      };

      // Set up basic state
      setIsDetached(true);
      setPosition({
        x: window.innerWidth / 2 - ORIGINAL_WIDTH / 2,
        y: window.innerHeight / 2 - ORIGINAL_HEIGHT / 2,
      });

      // Get exact dimensions from URL parameters
      const urlScale = params.get('scale');
      const exactWidth = params.get('width');
      const exactHeight = params.get('height');

      // CRITICAL: Set a global fixed width value for the entire app
      window.FIXED_DIALER_WIDTH = parseInt(exactWidth || '0', 10);
      window.FIXED_DIALER_HEIGHT = parseInt(exactHeight || '0', 10);

      // Apply scale from originating window
      if (urlScale) {
        const newScale = parseFloat(urlScale);
        if (!isNaN(newScale)) {
          setScale(newScale);
        }
      }

      // Handle auth token
      const authToken = params.get('authToken');
      if (authToken) {
        // Don't overwrite existing token if there is one
        if (!localStorage.getItem('token')) {
          localStorage.setItem('token', authToken);
        } else {
          console.log('Using existing token instead of passed token');
        }
      }

      // Set visibility
      setIsExited(false);
      setIsMinimizedToIcon(false);

      // Set window title
      document.title = 'Crokodialer';

      // Create corner elements for resizing
      const createCornerElements = () => {
        const corners = [
          { className: 'corner-nw', position: 'top-left' },
          { className: 'corner-ne', position: 'top-right' },
          { className: 'corner-sw', position: 'bottom-left' },
          { className: 'corner-se', position: 'bottom-right' },
        ];

        corners.forEach((corner) => {
          const element = document.createElement('div');
          element.className = corner.className;
          document.body.appendChild(element);

          // Add event listeners for native resizing
          element.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            // Let the browser handle native corner resizing
          });
        });
      };

      // Apply corners after a short delay
      setTimeout(createCornerElements, 100);

      // NUCLEAR SOLUTION: Apply extreme styling
      // Create a style element with ultra-high-specificity rules
      const nuclearStyleElement = document.createElement('style');
      nuclearStyleElement.id = 'nuclear-detached-dialer-styles';
      nuclearStyleElement.innerHTML = `
        /* EDGE BLOCKERS with maximum z-index */
        .edge-blocker {
          position: fixed !important;
          z-index: 2147483647 !important;
          background: transparent !important;
          cursor: default !important;
          pointer-events: auto !important;
        }
        
        #top-edge-blocker {
          top: 0 !important;
          left: 14px !important;
          right: 14px !important;
          height: 10px !important;
        }
        
        #right-edge-blocker {
          top: 14px !important;
          right: 0 !important;
          bottom: 14px !important;
          width: 10px !important;
        }
        
        #bottom-edge-blocker {
          bottom: 0 !important;
          left: 14px !important;
          right: 14px !important;
          height: 10px !important;
        }
        
        #left-edge-blocker {
          top: 14px !important;
          left: 0 !important;
          bottom: 14px !important;
          width: 10px !important;
        }
        
        /* LEVEL 1: Reset absolutely everything */
        body.detached-dialer *, body.detached-dialer *::before, body.detached-dialer *::after {
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
        }
        
        /* LEVEL 2: Core elements with maximum specificity */
        html.detached-dialer, html.detached-dialer:not(#fake), html.detached-dialer[lang] {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          background-color: black !important;
          width: 100% !important;
          margin-right: 0 !important;
          padding-right: 0 !important;
        }
        
        /* LEVEL 3: Body with nuclear specificity */
        body.detached-dialer, body.detached-dialer:not(#fake), body.detached-dialer[class], html body.detached-dialer {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          background-color: black !important;
          width: 100% !important;
          margin-right: 0 !important;
          padding-right: 0 !important;
          max-width: none !important;
          right: 0 !important;
          position: absolute !important;
          left: 0 !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          top: 0 !important;
          bottom: 0 !important;
          height: 100% !important;
        }
        
        /* LEVEL 4: Root element with nuclear specificity */
        body.detached-dialer #root, html.detached-dialer body.detached-dialer #root, body.detached-dialer div#root {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          position: absolute !important;
          left: 0 !important;
          right: 0 !important;
          top: 0 !important;
          bottom: 0 !important;
          height: 100% !important;
        }
        
        /* LEVEL 5: Dialer container with maximum possible specificity */
        body.detached-dialer .dialer-container, 
        body.detached-dialer div.dialer-container, 
        body.detached-dialer #root .dialer-container,
        html.detached-dialer body.detached-dialer .dialer-container,
        body.detached-dialer [class*="dialer-container"], 
        body.detached-dialer [class^="dialer-container"] {
          position: relative !important;
          right: auto !important;
          left: auto !important;
          top: -5% !important; /* Move dialer down from -10% to -5% */
          bottom: auto !important;
          margin: auto !important;
          box-sizing: border-box !important;
          transform: none !important;
          transform-origin: center !important;
        }
        
        /* Button images consistency */
        body.detached-dialer button img {
          object-fit: contain !important;
          max-width: 100% !important;
          max-height: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        
        /* Grid layout consistency */
        body.detached-dialer .grid {
          display: grid !important;
        }
        
        /* Numpad button specific styling */
        body.detached-dialer .grid button {
          box-sizing: border-box !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          margin: 0 !important;
          width: calc(65px * var(--dialer-scale, 1)) !important;
          height: calc(65px * var(--dialer-scale, 1)) !important;
          background-color: #D4B88C !important;
          border: calc(4px * var(--dialer-scale, 1)) solid black !important;
        }
        
        /* Button image sizing exact match */
        body.detached-dialer .grid button img {
          width: calc((100% - 8px) * var(--dialer-scale, 1)) !important;
          height: calc((100% - 8px) * var(--dialer-scale, 1)) !important;
          object-fit: contain !important;
          max-width: calc((100% - 8px) * var(--dialer-scale, 1)) !important;
          max-height: calc((100% - 8px) * var(--dialer-scale, 1)) !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        
        /* Flex layout consistency */
        body.detached-dialer .flex {
          display: flex !important;
        }
        
        /* Center alignment */
        body.detached-dialer .justify-center {
          justify-content: center !important;
        }
        
        body.detached-dialer .items-center {
          align-items: center !important;
        }
        
        /* Navigation arrows specific styling */
        body.detached-dialer .navigation-arrow {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          background: none !important;
          position: relative !important;
        }
        
        body.detached-dialer .navigation-arrow img {
          display: block !important;
          margin: auto !important;
          width: 50% !important;
          height: 50% !important;
          object-fit: contain !important;
          object-position: center !important;
        }
        
        /* Consistent spacing between display and numpad */
        body.detached-dialer .bg-white + .grid {
          margin-top: calc(4px * var(--dialer-scale, 1)) !important;
        }
        
        /* Number display styling */
        body.detached-dialer .bg-white {
          background-color: white !important;
          border: calc(2px * var(--dialer-scale, 1)) solid black !important;
          border-radius: calc(8px * var(--dialer-scale, 1)) !important;
          margin-bottom: calc(4px * var(--dialer-scale, 1)) !important;
          padding: calc(2px * var(--dialer-scale, 1)) calc(4px * var(--dialer-scale, 1)) !important;
          height: calc(24px * var(--dialer-scale, 1)) !important;
          width: calc(210px * var(--dialer-scale, 1)) !important;
          box-sizing: border-box !important;
          margin: 0 auto !important;
          margin-bottom: calc(4px * var(--dialer-scale, 1)) !important;
          text-align: center !important;
          cursor: text !important;
          pointer-events: auto !important;
          z-index: 100 !important;
        }
        
        /* Input field styling */
        body.detached-dialer .bg-white input {
          width: 100% !important;
          text-align: center !important;
          font-family: monospace !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          background: transparent !important;
          border: none !important;
          outline: none !important;
          padding: 0 !important;
          margin: 0 !important;
          cursor: text !important;
          pointer-events: auto !important;
          color: black !important;
          font-size: calc(12px * var(--dialer-scale, 1)) !important;
        }
        
        /* Ensure proper cursor on number field */
        body.detached-dialer .bg-white, body.detached-dialer .bg-white * {
          cursor: text !important;
          pointer-events: auto !important;
        }
        
        /* Block edge resizing - NEW VERSION with overlay elements */
        html.detached-dialer #edge-block-top, 
        html.detached-dialer #edge-block-right, 
        html.detached-dialer #edge-block-bottom, 
        html.detached-dialer #edge-block-left {
          position: fixed !important;
          z-index: 2147483647 !important;
          background: transparent !important;
          pointer-events: auto !important;
        }
        
        html.detached-dialer #edge-block-top {
          top: 0 !important;
          left: 14px !important;
          right: 14px !important;
          height: 6px !important;
          cursor: default !important;
        }
        
        html.detached-dialer #edge-block-right {
          top: 14px !important;
          right: 0 !important;
          bottom: 14px !important;
          width: 6px !important;
          cursor: default !important;
        }
        
        html.detached-dialer #edge-block-bottom {
          bottom: 0 !important;
          left: 14px !important;
          right: 14px !important;
          height: 6px !important;
          cursor: default !important;
        }
        
        html.detached-dialer #edge-block-left {
          top: 14px !important;
          left: 0 !important;
          bottom: 14px !important;
          width: 6px !important;
          cursor: default !important;
        }
        
        /* Enable corner resizing with proper cursors */
        html.detached-dialer #corner-resize-nw, 
        html.detached-dialer #corner-resize-ne, 
        html.detached-dialer #corner-resize-sw, 
        html.detached-dialer #corner-resize-se {
          position: fixed !important;
          z-index: 2147483647 !important;
          background: transparent !important;
          width: 14px !important;
          height: 14px !important;
          pointer-events: auto !important;
        }
        
        html.detached-dialer #corner-resize-nw {
          top: 0 !important;
          left: 0 !important;
          cursor: nwse-resize !important;
        }
        
        html.detached-dialer #corner-resize-ne {
          top: 0 !important;
          right: 0 !important;
          cursor: nesw-resize !important;
        }
        
        html.detached-dialer #corner-resize-sw {
          bottom: 0 !important;
          left: 0 !important;
          cursor: nesw-resize !important;
        }
        
        html.detached-dialer #corner-resize-se {
          bottom: 0 !important;
          right: 0 !important;
          cursor: nwse-resize !important;
        }
      `;
      document.head.appendChild(nuclearStyleElement);

      // NUCLEAR SOLUTION: Apply inline styles directly to critical elements
      document.documentElement.setAttribute(
        'style',
        'margin: 0 !important; padding: 0 !important; overflow: hidden !important; ' +
          'background-color: black !important; width: 100% !important; ' +
          'margin-right: 0 !important; padding-right: 0 !important;'
      );

      document.body.setAttribute(
        'style',
        'margin: 0 !important; padding: 0 !important; overflow: hidden !important; ' +
          'background-color: black !important; width: 100% !important; ' +
          'margin-right: 0 !important; padding-right: 0 !important; ' +
          'display: flex !important; justify-content: center !important; ' +
          'align-items: center !important; position: absolute !important; ' +
          'left: 0 !important; right: 0 !important; top: 0 !important; bottom: 0 !important; height: 100% !important;'
      );

      // Add special classes for targeted styling
      document.documentElement.classList.add('detached-dialer');
      document.body.classList.add('detached-dialer');

      // Add edge blocker elements
      const createEdgeBlockers = () => {
        const edges = [
          { id: 'top-edge-blocker' },
          { id: 'right-edge-blocker' },
          { id: 'bottom-edge-blocker' },
          { id: 'left-edge-blocker' },
        ];

        edges.forEach((edge) => {
          const blocker = document.createElement('div');
          blocker.id = edge.id;
          blocker.className = 'edge-blocker';
          document.body.appendChild(blocker);
        });
      };

      // Create the edge blockers
      createEdgeBlockers();

      // NUCLEAR SOLUTION: Apply inline styles directly to critical elements
      document.documentElement.setAttribute(
        'style',
        'margin: 0 !important; padding: 0 !important; overflow: hidden !important; ' +
          'background-color: black !important; width: 100% !important; ' +
          'margin-right: 0 !important; padding-right: 0 !important;'
      );

      document.body.setAttribute(
        'style',
        'margin: 0 !important; padding: 0 !important; overflow: hidden !important; ' +
          'background-color: black !important; width: 100% !important; ' +
          'margin-right: 0 !important; padding-right: 0 !important; ' +
          'display: flex !important; justify-content: center !important; ' +
          'align-items: center !important; position: absolute !important; ' +
          'left: 0 !important; right: 0 !important; top: 0 !important; bottom: 0 !important; height: 100% !important;'
      );

      // Add special classes for targeted styling
      document.documentElement.classList.add('detached-dialer');
      document.body.classList.add('detached-dialer');

      // Add a right edge blocker element
      const rightEdgeBlocker = document.createElement('div');
      rightEdgeBlocker.id = 'right-edge-blocker';
      document.body.appendChild(rightEdgeBlocker);

      // Create and inject an additional CSS stylesheet specifically for locking edges
      const edgeLockStyleElement = document.createElement('style');
      edgeLockStyleElement.id = 'edge-lock-styles';
      edgeLockStyleElement.innerHTML = `
        /* Lock window resizing except from corners */
        @media (pointer: fine) {
          /* Disable resizing from all sides */
          html.detached-dialer {
            resize: none !important;
            cursor: default !important;
          }
          
          body.detached-dialer {
            resize: none !important;
            cursor: default !important;
          }
          
          /* Edge overlay with maximum z-index and width to block browser resize handles */
          .edge-resize-blocker {
            position: fixed;
            background: transparent;
            z-index: 2147483647 !important;
            pointer-events: auto !important;
          }
          
          #edge-resize-blocker-top {
            top: 0;
            left: 14px;
            right: 14px;
            height: 10px;
            cursor: default !important;
          }
          
          #edge-resize-blocker-right {
            top: 14px;
            right: 0;
            bottom: 14px;
            width: 10px;
            cursor: default !important;
          }
          
          #edge-resize-blocker-bottom {
            bottom: 0;
            left: 14px;
            right: 14px;
            height: 10px;
            cursor: default !important;
          }
          
          #edge-resize-blocker-left {
            top: 14px;
            left: 0;
            bottom: 14px;
            width: 10px;
            cursor: default !important;
          }
        }
      `;
      document.head.appendChild(edgeLockStyleElement);

      // Disable ALL automatic resizing by setting this attribute
      document.body.setAttribute('data-disable-auto-resize', 'true');

      // CRITICAL: Wait for dialer to render before adjusting window
      const macOsTitleBarHeight = 28;

      // NUCLEAR window size adjustment - ONE TIME ONLY and PERMANENT
      const adjustWindowPrecisely = () => {
        if (!exactWidth || !exactHeight) return;

        try {
          const width = parseInt(exactWidth, 10);
          const height = parseInt(exactHeight, 10);

          // Always use the extreme negative margin
          const marginValue = FIXED_RIGHT_MARGIN;

          console.log(
            `INITIAL SIZING: ${width + marginValue}x${height + macOsTitleBarHeight + BOTTOM_PADDING}`
          );

          // NUCLEAR: Lock in window size with fixed compensation
          window.resizeTo(width + marginValue, height + macOsTitleBarHeight + BOTTOM_PADDING);

          // Explicitly set the window size attributes to prevent changes
          document.documentElement.style.setProperty('--app-width', `${width}px`);
          document.documentElement.style.setProperty('--app-height', `${height}px`);

          // Initialize the dialer scale CSS variable
          const initialScale = parseFloat(urlScale || '1');
          document.documentElement.style.setProperty('--dialer-scale', initialScale.toString());

          // Use the unified scaling function for the initial setup
          syncScaling(initialScale);

          // Compensate for title bar and center vertically
          document.body.style.marginTop = `-${macOsTitleBarHeight}px`;
          document.body.style.height = `${height + macOsTitleBarHeight}px`;

          // Override any future width changes with !important styles
          const lockSizeStyles = document.createElement('style');
          lockSizeStyles.id = 'lock-window-size';
          lockSizeStyles.innerHTML = `
            :root {
              --app-width: ${width}px;
              --app-height: ${height}px;
              --dialer-scale: ${initialScale};
            }
            
            html, body {
              width: var(--app-width) !important;
              max-width: var(--app-width) !important;
              min-width: var(--app-width) !important;
            }
            
            .dialer-container {
              transform-origin: center !important;
              width: ${width}px !important;
              height: ${height}px !important;
            }
          `;
          document.head.appendChild(lockSizeStyles);

          // Mark as sized to prevent any other effects from changing it
          document.body.setAttribute('data-window-sized', 'true');
        } catch (error) {
          console.error('Error in adjustWindowPrecisely:', error);
        }
      };

      // Apply adjustment ONCE with a small delay
      const initialTimer = setTimeout(adjustWindowPrecisely, 100);

      // Create resize blocking elements
      const createResizeElements = () => {
        // Create edge blocking elements with even higher z-index
        const edgeBlockers = [
          {
            id: 'edge-resize-blocker-top',
            style: 'top: 0; left: 14px; right: 14px; height: 10px;',
          },
          {
            id: 'edge-resize-blocker-right',
            style: 'top: 14px; right: 0; bottom: 14px; width: 10px;',
          },
          {
            id: 'edge-resize-blocker-bottom',
            style: 'bottom: 0; left: 14px; right: 14px; height: 10px;',
          },
          {
            id: 'edge-resize-blocker-left',
            style: 'top: 14px; left: 0; bottom: 14px; width: 10px;',
          },
        ];

        edgeBlockers.forEach((blocker) => {
          const element = document.createElement('div');
          element.id = blocker.id;
          element.className = 'edge-resize-blocker';
          element.setAttribute(
            'style',
            `${blocker.style} position: fixed; z-index: 2147483647; background: transparent; cursor: default !important;`
          );
          document.body.appendChild(element);
        });

        // Create edge blocking elements
        const edges = ['top', 'right', 'bottom', 'left'];
        edges.forEach((edge) => {
          const element = document.createElement('div');
          element.id = `edge-block-${edge}`;
          document.body.appendChild(element);
        });

        // Create corner resize elements
        const corners = ['nw', 'ne', 'sw', 'se'];
        corners.forEach((corner) => {
          const element = document.createElement('div');
          element.id = `corner-resize-${corner}`;

          // Add event listeners for corner resizing
          element.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startCornerResize(e, corner);
          });

          document.body.appendChild(element);
        });
      };

      // Add functions for corner resizing
      let resizing = false;
      let resizeCorner = '';
      let resizeStartX = 0;
      let resizeStartY = 0;
      let originalWidth = 0;
      let originalHeight = 0;

      // Store interval ID with correct type
      let aspectRatioInterval: NodeJS.Timeout | null = null;

      const startCornerResize = (e: MouseEvent, corner: string) => {
        resizing = true;
        resizeCorner = corner;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        originalWidth = window.innerWidth;
        originalHeight = window.innerHeight;

        document.addEventListener('mousemove', handleCornerResize);
        document.addEventListener('mouseup', stopCornerResize);
      };

      const handleCornerResize = (e: MouseEvent) => {
        if (!resizing) return;

        // Skip if another resize operation is happening
        if (document.body.getAttribute('data-handling-resize') === 'true') {
          return;
        }

        document.body.setAttribute('data-handling-resize', 'true');

        const deltaX = e.clientX - resizeStartX;
        const deltaY = e.clientY - resizeStartY;

        // Calculate aspect ratio based on original dialer dimensions
        const aspectRatio = ORIGINAL_WIDTH / ORIGINAL_HEIGHT;

        // Calculate new dimensions while respecting aspect ratio
        let newWidth = originalWidth;
        let newHeight = originalHeight;

        if (resizeCorner === 'se') {
          // South East - positive deltaX and deltaY
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Width-driven resize
            newWidth = originalWidth + deltaX;
            newHeight = newWidth / aspectRatio + CHROME_HEIGHT_ADJUSTMENT + BOTTOM_PADDING;
          } else {
            // Height-driven resize
            newHeight = originalHeight + deltaY;
            newWidth = (newHeight - CHROME_HEIGHT_ADJUSTMENT - BOTTOM_PADDING) * aspectRatio;
          }
        } else if (resizeCorner === 'sw') {
          // South West - negative deltaX and positive deltaY
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Width-driven resize
            newWidth = originalWidth - deltaX;
            newHeight = newWidth / aspectRatio + CHROME_HEIGHT_ADJUSTMENT + BOTTOM_PADDING;
          } else {
            // Height-driven resize
            newHeight = originalHeight + deltaY;
            newWidth = (newHeight - CHROME_HEIGHT_ADJUSTMENT - BOTTOM_PADDING) * aspectRatio;
          }
          window.moveTo(window.screenX + deltaX, window.screenY);
        } else if (resizeCorner === 'ne') {
          // North East - positive deltaX and negative deltaY
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Width-driven resize
            newWidth = originalWidth + deltaX;
            newHeight = newWidth / aspectRatio + CHROME_HEIGHT_ADJUSTMENT + BOTTOM_PADDING;
          } else {
            // Height-driven resize
            newHeight = originalHeight - deltaY;
            newWidth = (newHeight - CHROME_HEIGHT_ADJUSTMENT - BOTTOM_PADDING) * aspectRatio;
          }
          window.moveTo(window.screenX, window.screenY + deltaY);
        } else if (resizeCorner === 'nw') {
          // North West - negative deltaX and negative deltaY
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Width-driven resize
            newWidth = originalWidth - deltaX;
            newHeight = newWidth / aspectRatio + CHROME_HEIGHT_ADJUSTMENT + BOTTOM_PADDING;
          } else {
            // Height-driven resize
            newHeight = originalHeight - deltaY;
            newWidth = (newHeight - CHROME_HEIGHT_ADJUSTMENT - BOTTOM_PADDING) * aspectRatio;
          }
          window.moveTo(window.screenX + deltaX, window.screenY + deltaY);
        }

        // Enforce minimum size
        const minWidth = ORIGINAL_WIDTH - FIXED_RIGHT_MARGIN;
        const minHeight = ORIGINAL_HEIGHT + CHROME_HEIGHT_ADJUSTMENT + BOTTOM_PADDING;

        if (newWidth < minWidth) {
          newWidth = minWidth;
          newHeight = newWidth / aspectRatio + CHROME_HEIGHT_ADJUSTMENT + BOTTOM_PADDING;
        }

        if (newHeight < minHeight) {
          newHeight = minHeight;
          newWidth = (newHeight - CHROME_HEIGHT_ADJUSTMENT - BOTTOM_PADDING) * aspectRatio;
        }

        // Calculate scale for the dialer
        const dialerScale = (newWidth + FIXED_RIGHT_MARGIN) / ORIGINAL_WIDTH;

        // Enforce maximum scale
        if (dialerScale > MAX_SCALE) {
          // Clear handling flag and return
          document.body.removeAttribute('data-handling-resize');
          return;
        }

        // Temporarily pause the aspect ratio interval during manual resize
        if (aspectRatioInterval) {
          clearInterval(aspectRatioInterval);
          aspectRatioInterval = null;
        }

        // Update window size
        window.resizeTo(newWidth, newHeight);

        // Use the unified scaling function
        syncScaling(dialerScale);

        // Clear the handling flag after a delay to prevent race conditions
        setTimeout(() => {
          document.body.removeAttribute('data-handling-resize');

          // Restart the aspect ratio interval after manual resize if needed
          if (!aspectRatioInterval) {
            aspectRatioInterval = setInterval(enforceAspectRatio, 200);
          }
        }, 300);
      };

      const stopCornerResize = () => {
        resizing = false;
        document.removeEventListener('mousemove', handleCornerResize);
        document.removeEventListener('mouseup', stopCornerResize);

        // Ensure handling flag is cleared
        document.body.removeAttribute('data-handling-resize');

        // Restart the aspect ratio interval if needed
        if (!aspectRatioInterval) {
          aspectRatioInterval = setInterval(enforceAspectRatio, 200);
        }
      };

      // Create resize elements with delay
      setTimeout(createResizeElements, 200);

      // Ensure CSS variables are applied correctly
      const ensureCorrectScaling = () => {
        const currentScale = scale;
        document.documentElement.style.setProperty('--dialer-scale', currentScale.toString());

        if (dialerRef.current) {
          dialerRef.current.style.transform = `scale(${currentScale})`;
          dialerRef.current.style.transformOrigin = 'center';
        }
      };

      // Apply scaling fix after all DOM changes
      setTimeout(ensureCorrectScaling, 300);

      // Add a MutationObserver to detect and fix any improper window sizes
      const enforceAspectRatio = () => {
        // Skip if we're handling another resize operation
        if (resizing || document.body.getAttribute('data-handling-resize') === 'true') {
          return;
        }

        // Calculate original aspect ratio
        const aspectRatio = ORIGINAL_WIDTH / ORIGINAL_HEIGHT;

        // Get current window dimensions
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Calculate expected dimensions based on aspect ratio
        const widthBasedHeight =
          windowWidth / aspectRatio + CHROME_HEIGHT_ADJUSTMENT + BOTTOM_PADDING;
        const heightBasedWidth =
          (windowHeight - CHROME_HEIGHT_ADJUSTMENT - BOTTOM_PADDING) * aspectRatio;

        // Check if dimensions are out of sync with aspect ratio
        const tolerance = 15; // Increase tolerance to prevent resize loops
        const isHeightOff = Math.abs(windowHeight - widthBasedHeight) > tolerance;
        const isWidthOff = Math.abs(windowWidth - heightBasedWidth) > tolerance;

        if (isHeightOff || isWidthOff) {
          // Set flag to prevent other resize operations
          document.body.setAttribute('data-handling-resize', 'true');

          console.log('Enforcing aspect ratio - dimensions out of sync');

          // Determine which dimension is more out of sync
          if (
            Math.abs(windowHeight - widthBasedHeight) > Math.abs(windowWidth - heightBasedWidth)
          ) {
            // Height is more off, adjust based on width
            window.resizeTo(windowWidth, widthBasedHeight);
          } else {
            // Width is more off, adjust based on height
            window.resizeTo(heightBasedWidth, windowHeight);
          }

          // Update scale based on the new window size
          const newScale = Math.max(
            1,
            Math.min(
              heightBasedWidth / ORIGINAL_WIDTH,
              windowHeight / (ORIGINAL_HEIGHT + CHROME_HEIGHT_ADJUSTMENT + BOTTOM_PADDING),
              MAX_SCALE
            )
          );

          // Use the unified scaling function
          syncScaling(newScale);

          // Clear the handling flag after a delay
          setTimeout(() => {
            document.body.removeAttribute('data-handling-resize');
          }, 300);
        }
      };

      // Start observing window size changes with a less aggressive interval
      aspectRatioInterval = setInterval(() => {
        // Only run if we're not already handling a resize or resizing manually
        if (!resizing && !isResizing && !document.body.getAttribute('data-handling-resize')) {
          // Check if aspect ratio is significantly off before enforcing
          const aspectRatio = ORIGINAL_WIDTH / ORIGINAL_HEIGHT;
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;
          const currentAspectRatio =
            windowWidth / (windowHeight - CHROME_HEIGHT_ADJUSTMENT - BOTTOM_PADDING);

          // Only enforce if more than 15% off correct ratio
          if (Math.abs(currentAspectRatio - aspectRatio) > 0.15) {
            enforceAspectRatio();
          }
        }
      }, 500); // Less frequent checks to prevent loops

      // Simplified window resize handler to enforce minimum size
      const handleWindowResize = () => {
        // Only run if we're not currently handling a resize
        if (resizing || document.body.getAttribute('data-handling-resize') === 'true') {
          return;
        }

        // Mark as handling resize
        document.body.setAttribute('data-handling-resize', 'true');

        // Calculate scale based on window size compared to original dimensions
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Calculate scale factors - account for the margins and title bar
        const widthScale = (windowWidth + FIXED_RIGHT_MARGIN) / ORIGINAL_WIDTH;
        const heightScale =
          (windowHeight - CHROME_HEIGHT_ADJUSTMENT - BOTTOM_PADDING) / ORIGINAL_HEIGHT;

        // Use the smaller scale to maintain aspect ratio
        const newScale = Math.max(1, Math.min(widthScale, heightScale, MAX_SCALE));

        console.log(`Window resized: ${windowWidth}x${windowHeight}, new scale: ${newScale}`);

        // Use the unified scaling function
        syncScaling(newScale);

        // Force window to maintain aspect ratio if needed, but be less aggressive
        const aspectRatio = ORIGINAL_WIDTH / ORIGINAL_HEIGHT;
        const currentAspectRatio =
          windowWidth / (windowHeight - CHROME_HEIGHT_ADJUSTMENT - BOTTOM_PADDING);
        const isAspectRatioWrong = Math.abs(currentAspectRatio - aspectRatio) > 0.1; // Less sensitive

        if (isAspectRatioWrong) {
          // Calculate the target dimensions while maintaining aspect ratio
          const targetWidth = ORIGINAL_WIDTH * newScale - FIXED_RIGHT_MARGIN;
          const targetHeight =
            ORIGINAL_HEIGHT * newScale + CHROME_HEIGHT_ADJUSTMENT + BOTTOM_PADDING;

          // Only resize if dimensions are significantly different
          const tolerance = 20; // Larger tolerance to prevent resize loops
          if (
            Math.abs(windowWidth - targetWidth) > tolerance ||
            Math.abs(windowHeight - targetHeight) > tolerance
          ) {
            console.log(`Correcting aspect ratio: ${targetWidth}x${targetHeight}`);
            window.resizeTo(targetWidth, targetHeight);
          }
        }

        // Clear the handling flag after a delay
        setTimeout(() => {
          document.body.removeAttribute('data-handling-resize');
        }, 300);
      };

      // Add event listener for window resize
      window.addEventListener('resize', handleWindowResize);

      // Clean up event listener
      return () => {
        clearTimeout(initialTimer);
        if (nuclearStyleElement.parentNode) {
          nuclearStyleElement.parentNode.removeChild(nuclearStyleElement);
        }
        if (edgeLockStyleElement.parentNode) {
          edgeLockStyleElement.parentNode.removeChild(edgeLockStyleElement);
        }
        window.removeEventListener('resize', handleWindowResize);

        // Remove resize elements
        const elements = [
          'edge-block-top',
          'edge-block-right',
          'edge-block-bottom',
          'edge-block-left',
          'corner-resize-nw',
          'corner-resize-ne',
          'corner-resize-sw',
          'corner-resize-se',
        ];
        elements.forEach((id) => {
          const el = document.getElementById(id);
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });

        // Remove corner elements
        document
          .querySelectorAll('.corner-nw, .corner-ne, .corner-sw, .corner-se')
          .forEach((el) => {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });

        // Clean up detached-dialer classes
        document.documentElement.classList.remove('detached-dialer');
        document.body.classList.remove('detached-dialer');

        // Reset any inline styles
        document.documentElement.removeAttribute('style');
        document.body.removeAttribute('style');

        // Clean up CSS variables
        document.documentElement.style.removeProperty('--dialer-scale');
        document.documentElement.style.removeProperty('--app-width');
        document.documentElement.style.removeProperty('--app-height');
      };
    } catch (error) {
      console.error('Error in adjustWindowPrecisely:', error);
    }
  }, []);

  // Disable ResizeObserver completely for detached windows
  useEffect(() => {
    if (!isDetached) return;

    // Disable any resize observations for detached windows to prevent loops
    const disableAutoResize = () => {
      document.body.setAttribute('data-disable-auto-resize', 'true');
    };

    // Function to scale content based on window size
    const scaleContentToWindow = () => {
      // Only run if we're not currently handling a resize
      if (isResizing || document.body.getAttribute('data-handling-resize') === 'true') {
        return;
      }

      // Mark as handling resize
      document.body.setAttribute('data-handling-resize', 'true');

      // Calculate scale based on window size compared to original dimensions
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Calculate scale factors - account for the margins and title bar
      const widthScale = (windowWidth + FIXED_RIGHT_MARGIN) / ORIGINAL_WIDTH;
      const heightScale =
        (windowHeight - CHROME_HEIGHT_ADJUSTMENT - BOTTOM_PADDING) / ORIGINAL_HEIGHT;

      // Use the smaller scale to maintain aspect ratio
      const newScale = Math.max(1, Math.min(widthScale, heightScale, MAX_SCALE));

      console.log(`Window resized: ${windowWidth}x${windowHeight}, new scale: ${newScale}`);

      // Use the unified scaling function
      syncScaling(newScale);

      // Force window to maintain aspect ratio if needed, but be less aggressive
      const aspectRatio = ORIGINAL_WIDTH / ORIGINAL_HEIGHT;
      const currentAspectRatio =
        windowWidth / (windowHeight - CHROME_HEIGHT_ADJUSTMENT - BOTTOM_PADDING);
      const isAspectRatioWrong = Math.abs(currentAspectRatio - aspectRatio) > 0.1; // Less sensitive

      if (isAspectRatioWrong) {
        // Calculate the target dimensions while maintaining aspect ratio
        const targetWidth = ORIGINAL_WIDTH * newScale - FIXED_RIGHT_MARGIN;
        const targetHeight = ORIGINAL_HEIGHT * newScale + CHROME_HEIGHT_ADJUSTMENT + BOTTOM_PADDING;

        // Only resize if dimensions are significantly different
        const tolerance = 20; // Larger tolerance to prevent resize loops
        if (
          Math.abs(windowWidth - targetWidth) > tolerance ||
          Math.abs(windowHeight - targetHeight) > tolerance
        ) {
          console.log(`Correcting aspect ratio: ${targetWidth}x${targetHeight}`);
          window.resizeTo(targetWidth, targetHeight);
        }
      }

      // Clear the handling flag after a delay
      setTimeout(() => {
        document.body.removeAttribute('data-handling-resize');
      }, 300);
    };

    // Handle resize with debouncing to avoid loops
    let resizeTimeout: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }

      resizeTimeout = setTimeout(() => {
        scaleContentToWindow();
        resizeTimeout = null;
      }, 200);
    };

    // Apply initial scaling after a delay to ensure the window is fully loaded
    const initialTimer = setTimeout(scaleContentToWindow, 300);

    // Listen for resize events
    window.addEventListener('resize', handleResize);

    // Apply immediately and also after a delay
    disableAutoResize();
    const timer = setTimeout(disableAutoResize, 200);

    return () => {
      clearTimeout(timer);
      clearTimeout(initialTimer);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isDetached, scale, isResizing]);

  // Return to default position and size when reopened after exiting
  const handleReopen = () => {
    setIsExited(false);
    setScale(1);
    setPosition({
      x: window.innerWidth - ORIGINAL_WIDTH - 17,
      y: window.innerHeight - ORIGINAL_HEIGHT - 20,
    });
  };

  // Minimize to icon
  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimizedToIcon(true);
  };

  // Restore from minimized state
  const handleRestore = () => {
    setIsMinimizedToIcon(false);
  };

  // Maximize to full size (4x)
  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Center in the viewport when maximizing
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;

    const newWidth = ORIGINAL_WIDTH * MAX_SCALE;
    const newHeight = ORIGINAL_HEIGHT * MAX_SCALE;

    setScale(MAX_SCALE);
    setPosition({
      x: screenCenterX - newWidth / 2,
      y: screenCenterY - newHeight / 2,
    });
  };

  // Exit/close the dialer
  const handleExit = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isDetached) {
      // Close the window if in detached mode
      window.close();
    } else {
      // Normal behavior for in-app dialer
      setIsExited(true);
    }
  };

  // Calculate the draggable area height
  useEffect(() => {
    if (numberDisplayRef.current && headerRef.current && navigationRef.current) {
      const headerBottom = headerRef.current.getBoundingClientRect().bottom;
      const displayTop = numberDisplayRef.current.getBoundingClientRect().top;
      const navigationHeight = navigationRef.current.getBoundingClientRect().height;

      // Set the draggable area height to include all space from header to number display
      // plus the navigation area, excluding the arrow buttons
      setDragAreaHeight(displayTop - headerBottom + navigationHeight);
    }
  }, [scale, isMinimized]);

  const handleNumberClick = (num: string) => {
    setPhoneNumber((prev) => prev + num);
    setActiveButton(num);
    setTimeout(() => setActiveButton(null), 150);
  };

  const handleCall = () => {
    if (phoneNumber.length >= 10) {
      console.log('Calling:', phoneNumber);
      setActiveButton('call');

      // Clean the phone number to remove any non-numeric characters
      const cleanPhone = normalizePhone(phoneNumber);

      // Increment lifetime counter (persistent across app)
      incrementCount(cleanPhone);

      // Make the actual call using the tel: protocol
      dialPhone(cleanPhone);

      setTimeout(() => setActiveButton(null), 150);
    }
  };

  const handleEndCall = () => {
    console.log('Ending call');
    setPhoneNumber('');
    setActiveButton('end');
    setTimeout(() => setActiveButton(null), 150);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Check if dialer is in bottom-right snap zone
  const isInSnapZone = (pos: Position): boolean => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Define bottom-right corner snap zone
    return (
      pos.x + ORIGINAL_WIDTH * scale > windowWidth - SNAP_ZONE_SIZE &&
      pos.y + ORIGINAL_HEIGHT * scale > windowHeight - SNAP_ZONE_SIZE
    );
  };

  // Drag handlers
  const startDrag = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on navigation arrows or window control buttons
    if (
      (e.target as HTMLElement).closest('.navigation-arrow') ||
      (e.target as HTMLElement).closest('.window-button')
    ) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);
    setStartMousePosition({ x: e.clientX, y: e.clientY });
    setStartPosition({ ...position });
  };

  // Resize handlers
  // Note: The dialer can only be expanded (scaled up), never shrunk below its original size
  const startResize = (e: React.MouseEvent, direction: string) => {
    // Don't allow resizing in detached mode
    if (isDetached) return;

    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setStartMousePosition({ x: e.clientX, y: e.clientY });

    if (dialerRef.current) {
      const rect = dialerRef.current.getBoundingClientRect();
      setStartSize({ width: rect.width, height: rect.height });
      setStartPosition({ x: position.x, y: position.y });
    }
  };

  // Handle mouse move for both dragging and resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - startMousePosition.x;
        const deltaY = e.clientY - startMousePosition.y;

        const newPosition = {
          x: startPosition.x + deltaX,
          y: startPosition.y + deltaY,
        };

        // Check if dialer is being dragged to the bottom right corner
        if (!isDetached && isInSnapZone(newPosition)) {
          // Snap to original size and position it in the bottom right
          setScale(1);
          setPosition({
            x: window.innerWidth - ORIGINAL_WIDTH - 17,
            y: window.innerHeight - ORIGINAL_HEIGHT - 20,
          });
        } else if (isDetached) {
          // In detached mode, move the actual window instead of just the dialer
          window.moveTo(window.screenX + deltaX, window.screenY + deltaY);

          // Also update position state to keep track of relative position within window
          setPosition(newPosition);
        } else {
          // Normal case: update the position of the in-app dialer
          setPosition(newPosition);
        }
      } else if (isResizing) {
        let newWidth = startSize.width;
        let newHeight = startSize.height;
        let newX = startPosition.x;
        let newY = startPosition.y;

        const aspectRatio = ORIGINAL_WIDTH / ORIGINAL_HEIGHT;
        const deltaX = e.clientX - startMousePosition.x;
        const deltaY = e.clientY - startMousePosition.y;

        // Calculate new size based on resize direction
        if (resizeDirection.includes('right')) {
          newWidth = startSize.width + deltaX;
          newHeight = newWidth / aspectRatio;
        } else if (resizeDirection.includes('left')) {
          // For left resizing, only allow if resulting size is larger than original
          const potentialNewWidth = startSize.width - deltaX;
          if (potentialNewWidth >= ORIGINAL_WIDTH) {
            newWidth = potentialNewWidth;
            newHeight = newWidth / aspectRatio;
            newX = startPosition.x + startSize.width - newWidth;
          }
        }

        if (resizeDirection.includes('bottom')) {
          newHeight = startSize.height + deltaY;
          newWidth = newHeight * aspectRatio;
        } else if (resizeDirection.includes('top')) {
          // For top resizing, only allow if resulting size is larger than original
          const potentialNewHeight = startSize.height - deltaY;
          if (potentialNewHeight >= ORIGINAL_HEIGHT) {
            newHeight = potentialNewHeight;
            newWidth = newHeight * aspectRatio;
            newY = startPosition.y + startSize.height - newHeight;
          }
        }

        // Calculate and limit the new scale
        const newScale = newWidth / ORIGINAL_WIDTH;

        // Apply changes only if scale is within limits (1.0 to 4.0)
        if (newScale >= MIN_SCALE && newScale <= MAX_SCALE) {
          setScale(newScale);

          // Only update position if not in detached mode
          if (!isDetached) {
            setPosition({ x: newX, y: newY });
          } else {
            // In detached mode, resize the window instead
            window.resizeTo(newWidth, newHeight);
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDragging,
    isResizing,
    startMousePosition,
    startPosition,
    startSize,
    resizeDirection,
    position,
    scale,
    isDetached,
  ]);

  // Update the useEffect that adjusts window size in detached mode
  useEffect(() => {
    // Always call this hook, but only apply logic when conditions are met
    const shouldApplyResizing = isDetached && !isResizing && !!dialerRef.current;

    if (shouldApplyResizing) {
      // Get dimensions
      const dialerRect = dialerRef.current.getBoundingClientRect();
      const exactWidth = dialerRect.width;
      const exactHeight = dialerRect.height;

      // Measure chrome height
      const actualChromeHeight = window.outerHeight - window.innerHeight;

      // Function to eliminate white space - uses EXACT same values
      const eliminateWhiteSpace = () => {
        if (document.body.getAttribute('data-window-sized') === 'true') {
          console.log('Window already sized, skipping eliminateWhiteSpace');
          return; // Skip if already sized
        }

        try {
          // Set black background
          document.body.style.backgroundColor = 'black';
          document.documentElement.style.backgroundColor = 'black';

          // Use the SAME extreme negative margin
          const fixedMarginValue = FIXED_RIGHT_MARGIN;

          // Get the fixed dimensions we established - handle all type cases explicitly
          const safeExactWidth =
            typeof exactWidth === 'number' ? exactWidth : exactWidth ? parseInt(exactWidth, 10) : 0;
          const safeExactHeight =
            typeof exactHeight === 'number'
              ? exactHeight
              : exactHeight
                ? parseInt(exactHeight, 10)
                : 0;
          const width = window.FIXED_DIALER_WIDTH || safeExactWidth;
          const height = window.FIXED_DIALER_HEIGHT || safeExactHeight;

          console.log(
            `ELIMINATE WHITESPACE: ${width + fixedMarginValue}x${height + actualChromeHeight}`
          );

          // Resize window precisely with fixed margin - convert to numbers explicitly
          const finalWidth = Math.round(width + fixedMarginValue);
          const finalHeight = Math.round(height + actualChromeHeight + BOTTOM_PADDING);
          window.resizeTo(finalWidth, finalHeight);

          // Mark as sized to prevent double application
          document.body.setAttribute('data-window-sized', 'true');
        } catch (error) {
          console.error('Error adjusting window:', error);
        }
      };

      // Disable this effect if the other resizing has handled it
      if (document.body.getAttribute('data-window-sized') !== 'true') {
        // Apply once
        eliminateWhiteSpace();

        // Mark as sized to prevent double resizing
        document.body.setAttribute('data-window-sized', 'true');
      }

      return () => {};
    }

    // Empty return for when conditions aren't met
    return () => {};
  }, [isDetached, isResizing, scale]);

  // No longer enforce keeping the dialer in the viewport, allowing it to be positioned anywhere

  // If exited, don't render anything
  if (isExited) {
    return (
      <MinimizedIcon
        onClick={handleReopen}
        $position={{ x: window.innerWidth - 70, y: window.innerHeight - 70 }}
      />
    );
  }

  // If minimized to icon, show only the icon
  if (isMinimizedToIcon) {
    return (
      <MinimizedIcon
        onClick={handleRestore}
        $position={{ x: window.innerWidth - 70, y: window.innerHeight - 70 }}
      />
    );
  }

  // Create a detached window with exact dimensions to match the dialer
  const handleDetach = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Prevent multiple windows from opening
    if (isOpeningWindow) {
      console.log('Already opening a window, please wait...');
      return;
    }

    setIsOpeningWindow(true);

    try {
      const token = localStorage.getItem('token') || '';

      // Get reference to the current dialer
      if (!dialerRef.current) {
        console.error('Dialer reference is null, cannot detach');
        setIsOpeningWindow(false);
        return;
      }

      // NUCLEAR ANALYSIS: Get the actual computed styles
      const computedWidth = dialerRef.current.offsetWidth;
      const computedHeight = dialerRef.current.offsetHeight;

      // Get precise dimensions including all visual elements using getBoundingClientRect
      const rect = dialerRef.current.getBoundingClientRect();
      const exactWidth = Math.ceil(rect.width);
      const exactHeight = Math.ceil(rect.height);

      // For macOS Chrome/Safari, account for title bar height
      const macOsTitleBarHeight = 28;

      // NUCLEAR FIX: Use the global extreme negative margin value
      const localFixedRightMargin = FIXED_RIGHT_MARGIN; // Use the global constant

      // Store current scale for new window
      const currentScale = scale;

      // IMPORTANT: Create a static size parameter in URL to avoid resize loops
      const urlParams = new URLSearchParams();
      urlParams.set('detached', 'true');
      urlParams.set('scale', currentScale.toString());
      urlParams.set('width', exactWidth.toString());
      urlParams.set('height', exactHeight.toString());
      urlParams.set('computedWidth', computedWidth.toString());
      urlParams.set('computedHeight', computedHeight.toString());
      urlParams.set('marginCompensation', localFixedRightMargin.toString());
      urlParams.set('rightMarginReduction', localFixedRightMargin.toString());
      urlParams.set('disableAutoResize', 'true'); // Prevent resize loops
      urlParams.set('authToken', token);

      // SIMPLE APPROACH: Allow window to be resized but keep dialer fixed
      // Store current size in URL parameters for use by handlers
      urlParams.set('button_size', (65 * currentScale).toString());
      urlParams.set('scale', currentScale.toString());
      urlParams.set('center_dialer', 'true');

      // Create URL with just the essential parameters
      const url = `${window.location.origin}/dialer?${urlParams.toString()}`;

      // Open a normal window with exact starting dimensions but allow it to be resized
      // We'll handle the dialer sizing with CSS and JavaScript
      const windowFeatures = [
        `width=${exactWidth + localFixedRightMargin}`,
        `height=${exactHeight + macOsTitleBarHeight + BOTTOM_PADDING}`,
        'scrollbars=no',
        'status=no',
        'toolbar=no',
        'menubar=no',
        'location=no',
        'left=200',
        'top=200',
      ].join(',');

      console.log('Opening dialer window with button size:', 65 * currentScale);

      // Open the window - we'll handle resize properly with CSS and JS
      const newWindow = window.open(url, '_blank', windowFeatures);

      if (newWindow) {
        try {
          newWindow.focus();
          // Reset the flag after a delay
          setTimeout(() => {
            setIsOpeningWindow(false);
          }, 1000);
        } catch (focusError) {
          console.error('Error focusing new window:', focusError);
          setIsOpeningWindow(false);
        }
      } else {
        console.error('Failed to open new window. Popup might be blocked.');
        setIsOpeningWindow(false);
      }
    } catch (error) {
      console.error('Error opening detached dialer:', error);
      setIsOpeningWindow(false);
    }
  };

  // Use a separate effect to handle the state change safely within React's lifecycle
  useEffect(() => {
    // Check if we need to hide the dialer (it was detached)
    const isDetaching = document.body.getAttribute('data-dialer-detaching') === 'true';

    if (isDetaching) {
      // Clear the attribute immediately to prevent double-processing
      document.body.removeAttribute('data-dialer-detaching');

      // Now it's safe to update the React state
      setIsExited(true);
    }
  }, []); // Empty deps array means this runs once on mount, which is what we want

  // Bulletproof solution that completely replaces the browser's native resizing
  const createBulletproofEdgeHandlers = () => {
    console.log('🛡️ Creating bulletproof edge movement solution');

    // Create an absolutely positioned overlay that covers the entire window
    // with specific cutouts for the corners only
    const overlayStyles = document.createElement('style');
    overlayStyles.id = 'bulletproof-edge-styles';
    overlayStyles.innerHTML = `
      /* Reset all corner indicators */
      .corner-indicator, .corner-handler, .edge-movement-handler, 
      .ultra-edge-blocker, .edge-shield, .ultra-corner,
      .edge-block, .corner-block {
        display: none !important;
      }
      
      /* Completely disable default resize behavior */
      html.detached-dialer {
        resize: none !important;
        overflow: hidden !important;
      }
      
      /* Full window overlay with corner cutouts */
      .edge-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 2147483647 !important;
        pointer-events: auto !important;
        background: transparent !important;
        /* Complex clip-path that ONLY allows corners through */
        clip-path: polygon(
          /* Show only corner areas (20x20px squares at corners) */
          0 0, 20px 0, 20px 20px, 0 20px, /* Top-left corner */
          calc(100% - 20px) 0, 100% 0, 100% 20px, calc(100% - 20px) 20px, /* Top-right corner */
          0 calc(100% - 20px), 20px calc(100% - 20px), 20px 100%, 0 100%, /* Bottom-left corner */
          calc(100% - 20px) calc(100% - 20px), 100% calc(100% - 20px), 100% 100%, calc(100% - 20px) 100%, /* Bottom-right corner */
          
          /* The rest is a cutout */
          calc(100% - 20px) 100%,
          20px 100%,
          20px calc(100% - 20px),
          calc(100% - 20px) calc(100% - 20px),
          calc(100% - 20px) 20px,
          20px 20px,
          20px calc(100% - 20px),
          calc(100% - 20px) calc(100% - 20px)
        );
        cursor: move !important;
      }
      
      /* Expose corner styles while preserving clip-path */
      .corner {
        position: fixed !important;
        width: 20px !important;
        height: 20px !important;
        z-index: 2147483647 !important;
        background: transparent !important;
        pointer-events: auto !important;
      }
      
      #corner-nw {
        top: 0 !important;
        left: 0 !important;
        cursor: nwse-resize !important;
      }
      
      #corner-ne {
        top: 0 !important;
        right: 0 !important;
        cursor: nesw-resize !important;
      }
      
      #corner-sw {
        bottom: 0 !important;
        left: 0 !important;
        cursor: nesw-resize !important;
      }
      
      #corner-se {
        bottom: 0 !important;
        right: 0 !important;
        cursor: nwse-resize !important;
      }
    `;
    document.head.appendChild(overlayStyles);

    // Create elements
    const overlay = document.createElement('div');
    overlay.className = 'edge-overlay';
    document.body.appendChild(overlay);

    // Track drag state
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startWindowX = 0;
    let startWindowY = 0;

    // Add event listeners to overlay for dragging
    overlay.addEventListener('mousedown', function (e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startWindowX = window.screenX;
      startWindowY = window.screenY;

      overlay.style.cursor = 'grabbing';

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });

    // Handler for mouse movement - moves window instead of resizing
    const handleMouseMove = function (e: MouseEvent) {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // Move the window instead of resizing
      window.moveTo(startWindowX + deltaX, startWindowY + deltaY);
    };

    // Handler for mouseup - stop tracking drag
    const handleMouseUp = function () {
      isDragging = false;
      overlay.style.cursor = 'move';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    // Create corner elements for proportion-preserving resize
    const corners = [
      { id: 'corner-nw', style: 'top:0;left:0;' },
      { id: 'corner-ne', style: 'top:0;right:0;' },
      { id: 'corner-sw', style: 'bottom:0;left:0;' },
      { id: 'corner-se', style: 'bottom:0;right:0;' },
    ];

    corners.forEach((corner) => {
      const element = document.createElement('div');
      element.id = corner.id;
      element.className = 'corner';
      element.style.cssText = `position:fixed;${corner.style}`;
      document.body.appendChild(element);
    });

    // Original width/height ratio to maintain during resizing

    // Save initial window dimensions to use for proportional resize

    return {
      removeHandlers: () => {
        // Remove the overlay
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }

        // Remove the style element
        if (overlayStyles.parentNode) {
          overlayStyles.parentNode.removeChild(overlayStyles);
        }

        // Remove corner elements
        document.querySelectorAll('.corner').forEach((el) => {
          if (el.parentNode) el.parentNode.removeChild(el);
        });

        // Remove event listeners if somehow they're still there
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      },
    };
  };

  // Replace all previous edge handling techniques with the bulletproof solution
  useEffect(() => {
    if (!isDetached) return;

    // Clean up any existing elements first
    document
      .querySelectorAll(
        '.ultra-edge-blocker, .edge-shield, .ultra-corner, .corner-indicator, .edge-movement-handler, .corner-handler'
      )
      .forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });

    // Remove existing style elements
    [
      'ultra-edge-lock-styles',
      'shadow-edge-style',
      'edge-lock-styles',
      'edge-lock-absolute',
      'snap-back-edge-style',
      'edge-movement-style',
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });

    console.log('🛡️ Setting up bulletproof edge handling');
    const handlers = createBulletproofEdgeHandlers();

    // Add base classes
    document.documentElement.classList.add('detached-dialer');
    document.body.classList.add('detached-dialer');

    // Apply additional defensive CSS directly to the document
    const defensiveStyle = document.createElement('style');
    defensiveStyle.id = 'defensive-edge-style';
    defensiveStyle.innerHTML = `
      /* Apply to ALL edges to make sure nothing can be resized except corners */
      html.detached-dialer::before,
      html.detached-dialer::after,
      body.detached-dialer::before,
      body.detached-dialer::after {
        content: '' !important;
        position: fixed !important;
        z-index: 2147483646 !important;
        background: transparent !important;
        cursor: move !important;
        pointer-events: auto !important;
      }
      
      html.detached-dialer::before {
        top: 0 !important;
        left: 20px !important;
        right: 20px !important;
        height: 20px !important;
      }
      
      html.detached-dialer::after {
        bottom: 0 !important;
        left: 20px !important;
        right: 20px !important;
        height: 20px !important;
      }
      
      body.detached-dialer::before {
        left: 0 !important;
        top: 20px !important;
        bottom: 20px !important;
        width: 20px !important;
      }
      
      body.detached-dialer::after {
        right: 0 !important;
        top: 20px !important;
        bottom: 20px !important;
        width: 20px !important;
      }
    `;
    document.head.appendChild(defensiveStyle);

    return () => {
      // Clean up
      handlers.removeHandlers();

      // Remove classes
      document.documentElement.classList.remove('detached-dialer');
      document.body.classList.remove('detached-dialer');

      // Remove defensive style
      if (defensiveStyle.parentNode) {
        defensiveStyle.parentNode.removeChild(defensiveStyle);
      }
    };
  }, [isDetached]);

  // Multi-layered absolute edge locking technique
  const createTotalEdgeLock = () => {
    console.log('🔒🔒🔒 Creating ABSOLUTE edge lock');

    // LAYER 1: Edge lock styles with maximum specificity
    const edgeLockStyles = document.createElement('style');
    edgeLockStyles.id = 'total-edge-lock-styles';
    edgeLockStyles.innerHTML = `
      /* Ultimate specificity selectors */
      html.detached-dialer, 
      html.detached-dialer:not(#_):not(#_):not(#_):not(#_), 
      html.detached-dialer[lang]:not([data-x]),
      body.detached-dialer,
      body.detached-dialer:not(#_):not(#_):not(#_):not(#_) {
        resize: none !important;
        overflow: hidden !important;
      }

      /* Extra thick edge blockers */
      .total-edge-blocker {
        position: fixed !important;
        z-index: 2147483647 !important;
        background-color: transparent !important;
        pointer-events: auto !important;
        cursor: not-allowed !important;
      }

      /* Extremely wide edge blockers */
      #total-edge-top {
        top: 0 !important;
        left: 25px !important;
        right: 25px !important;
        height: 25px !important;
      }

      #total-edge-right {
        top: 25px !important;
        right: 0 !important;
        bottom: 25px !important;
        width: 25px !important;
      }

      #total-edge-bottom {
        bottom: 0 !important;
        left: 25px !important;
        right: 25px !important;
        height: 25px !important;
      }

      #total-edge-left {
        top: 25px !important;
        left: 0 !important;
        bottom: 25px !important;
        width: 25px !important;
      }

      /* Corner resize cursors */
      .total-corner {
        position: fixed !important;
        width: 25px !important;
        height: 25px !important;
        background: transparent !important;
        z-index: 2147483646 !important;
        pointer-events: auto !important;
      }

      #total-corner-nw {
        top: 0 !important;
        left: 0 !important;
        cursor: nwse-resize !important;
      }

      #total-corner-ne {
        top: 0 !important;
        right: 0 !important;
        cursor: nesw-resize !important;
      }

      #total-corner-sw {
        bottom: 0 !important;
        left: 0 !important;
        cursor: nesw-resize !important;
      }

      #total-corner-se {
        bottom: 0 !important;
        right: 0 !important;
        cursor: nwse-resize !important;
      }

      /* LAYER 2: Pseudo-elements for edges */
      html.detached-dialer::before,
      html.detached-dialer::after,
      body.detached-dialer::before,
      body.detached-dialer::after {
        content: '' !important;
        position: fixed !important;
        z-index: 2147483646 !important;
        background: transparent !important;
        cursor: not-allowed !important;
        pointer-events: auto !important;
        display: block !important;
      }

      html.detached-dialer::before {
        top: 0 !important;
        left: 25px !important;
        right: 25px !important;
        height: 25px !important;
      }

      html.detached-dialer::after {
        bottom: 0 !important;
        left: 25px !important;
        right: 25px !important;
        height: 25px !important;
      }

      body.detached-dialer::before {
        left: 0 !important;
        top: 25px !important;
        bottom: 25px !important;
        width: 25px !important;
      }

      body.detached-dialer::after {
        right: 0 !important;
        top: 25px !important;
        bottom: 25px !important;
        width: 25px !important;
      }

      /* LAYER 3: Full screen overlay with corner cutouts */
      .edge-overlay-screen {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 2147483645 !important;
        pointer-events: auto !important;
        background: transparent !important;
        /* Complex clip-path with extra margin for safety */
        clip-path: polygon(
          /* Show only corner areas (25px squares at corners) */
          0 0, 25px 0, 25px 25px, 0 25px, /* Top-left corner */
          calc(100% - 25px) 0, 100% 0, 100% 25px, calc(100% - 25px) 25px, /* Top-right corner */
          0 calc(100% - 25px), 25px calc(100% - 25px), 25px 100%, 0 100%, /* Bottom-left corner */
          calc(100% - 25px) calc(100% - 25px), 100% calc(100% - 25px), 100% 100%, calc(100% - 25px) 100%, /* Bottom-right corner */
          
          /* The rest is a cutout */
          calc(100% - 25px) 100%,
          25px 100%,
          25px calc(100% - 25px),
          calc(100% - 25px) calc(100% - 25px),
          calc(100% - 25px) 25px,
          25px 25px,
          25px calc(100% - 25px),
          calc(100% - 25px) calc(100% - 25px)
        ) !important;
      }
    `;
    document.head.appendChild(edgeLockStyles);

    // LAYER 1: Create physical blocker elements
    const edges = [
      {
        id: 'total-edge-top',
        style: 'top:0;left:25px;right:25px;height:25px;',
      },
      {
        id: 'total-edge-right',
        style: 'top:25px;right:0;bottom:25px;width:25px;',
      },
      {
        id: 'total-edge-bottom',
        style: 'bottom:0;left:25px;right:25px;height:25px;',
      },
      {
        id: 'total-edge-left',
        style: 'top:25px;left:0;bottom:25px;width:25px;',
      },
    ];

    edges.forEach((edge) => {
      // Create the edge blocker on body
      const bodyBlocker = document.createElement('div');
      bodyBlocker.id = edge.id;
      bodyBlocker.className = 'total-edge-blocker';
      bodyBlocker.style.cssText = `position:fixed !important;z-index:2147483647 !important;pointer-events:auto !important;cursor:not-allowed !important;${edge.style}`;

      // Add event listeners to cancel any resize attempts
      bodyBlocker.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      });

      document.body.appendChild(bodyBlocker);

      // Create a duplicate on html for redundancy
      const htmlBlocker = bodyBlocker.cloneNode(true) as HTMLElement;
      htmlBlocker.id = `${edge.id}-html`;
      document.documentElement.appendChild(htmlBlocker);
    });

    // LAYER 2: Create corners with proper resize cursors
    const corners = [
      { id: 'total-corner-nw', style: 'top:0;left:0;', cursor: 'nwse-resize' },
      { id: 'total-corner-ne', style: 'top:0;right:0;', cursor: 'nesw-resize' },
      {
        id: 'total-corner-sw',
        style: 'bottom:0;left:0;',
        cursor: 'nesw-resize',
      },
      {
        id: 'total-corner-se',
        style: 'bottom:0;right:0;',
        cursor: 'nwse-resize',
      },
    ];

    corners.forEach((corner) => {
      const cornerEl = document.createElement('div');
      cornerEl.id = corner.id;
      cornerEl.className = 'total-corner';
      cornerEl.style.cssText = `position:fixed !important;z-index:2147483646 !important;width:25px !important;height:25px !important;background:transparent !important;pointer-events:auto !important;cursor:${corner.cursor} !important;${corner.style}`;
      document.body.appendChild(cornerEl);
    });

    // LAYER 3: Create full-screen overlay with corner cutouts
    const overlay = document.createElement('div');
    overlay.className = 'edge-overlay-screen';
    document.body.appendChild(overlay);

    // LAYER 4: Apply direct resize:none to html and body
    document.documentElement.style.resize = 'none';
    document.body.style.resize = 'none';

    // LAYER 5: Listen for and override any native resize events
    const preventEdgeResize = (e: MouseEvent) => {
      // Detect if the mouse is near an edge but not a corner
      const isNearEdge =
        (e.clientX < 25 && e.clientY >= 25 && e.clientY <= window.innerHeight - 25) || // Left edge
        (e.clientX >= window.innerWidth - 25 &&
          e.clientY >= 25 &&
          e.clientY <= window.innerHeight - 25) || // Right edge
        (e.clientY < 25 && e.clientX >= 25 && e.clientX <= window.innerWidth - 25) || // Top edge
        (e.clientY >= window.innerHeight - 25 &&
          e.clientX >= 25 &&
          e.clientX <= window.innerWidth - 25); // Bottom edge

      if (isNearEdge) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener('mousedown', preventEdgeResize, true);
    document.addEventListener('mousemove', (e: MouseEvent) => {
      // Change cursor to not-allowed when near edges
      const isNearEdge =
        (e.clientX < 25 && e.clientY >= 25 && e.clientY <= window.innerHeight - 25) || // Left edge
        (e.clientX >= window.innerWidth - 25 &&
          e.clientY >= 25 &&
          e.clientY <= window.innerHeight - 25) || // Right edge
        (e.clientY < 25 && e.clientX >= 25 && e.clientX <= window.innerWidth - 25) || // Top edge
        (e.clientY >= window.innerHeight - 25 &&
          e.clientX >= 25 &&
          e.clientX <= window.innerWidth - 25); // Bottom edge

      if (isNearEdge) {
        document.body.style.cursor = 'not-allowed';
      } else {
        document.body.style.cursor = 'default';
      }
    });

    return {
      cleanup: () => {
        // Remove all created elements
        document
          .querySelectorAll('.total-edge-blocker, .total-corner, .edge-overlay-screen')
          .forEach((el) => {
            if (el.parentNode) el.parentNode.removeChild(el);
          });

        // Remove style elements
        if (edgeLockStyles.parentNode) {
          edgeLockStyles.parentNode.removeChild(edgeLockStyles);
        }

        // Remove event listeners
        document.removeEventListener('mousedown', preventEdgeResize, true);

        // Reset styles
        document.documentElement.style.removeProperty('resize');
        document.body.style.removeProperty('resize');
      },
    };
  };

  // Replace all previous edge handling with the absolute edge lock
  useEffect(() => {
    if (!isDetached) return;

    // Clean up any existing elements first
    document
      .querySelectorAll(
        '.ultra-edge-blocker, .edge-shield, .ultra-corner, .corner-indicator, .edge-movement-handler, .corner-handler, .edge-overlay, .corner, .total-edge-blocker, .total-corner, .edge-overlay-screen'
      )
      .forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });

    // Remove existing style elements
    [
      'ultra-edge-lock-styles',
      'shadow-edge-style',
      'edge-lock-styles',
      'edge-lock-absolute',
      'snap-back-edge-style',
      'edge-movement-style',
      'bulletproof-edge-styles',
      'defensive-edge-style',
      'total-edge-lock-styles',
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });

    console.log('🔒🔒🔒 Setting up ABSOLUTE edge lock');
    const edgeLock = createTotalEdgeLock();

    // Add classes to html and body
    document.documentElement.classList.add('detached-dialer');
    document.body.classList.add('detached-dialer');

    // Force black background
    document.documentElement.style.backgroundColor = 'black';
    document.body.style.backgroundColor = 'black';

    return () => {
      // Clean up
      edgeLock.cleanup();

      // Remove classes
      document.documentElement.classList.remove('detached-dialer');
      document.body.classList.remove('detached-dialer');

      // Reset background
      document.documentElement.style.removeProperty('backgroundColor');
      document.body.style.removeProperty('backgroundColor');
    };
  }, [isDetached]);

  // Simple but effective edge locking implementation
  const lockEdges = () => {
    console.log('🔒 Locking window edges - simple and direct approach');

    // Create style element with edge-locking CSS
    const edgeLockStyle = document.createElement('style');
    edgeLockStyle.id = 'edge-lock-style';
    edgeLockStyle.innerHTML = `
      /* Disable resizing on html and body */
      html, body {
        resize: none !important;
      }
      
      /* Blockade style for edge elements */
      .edge-block {
        position: fixed !important;
        z-index: 2147483647 !important; 
        background: transparent !important;
        pointer-events: auto !important;
        cursor: default !important;
      }
      
      /* Corner elements style */
      .corner-block {
        position: fixed !important;
        background: transparent !important;
        width: 20px !important;
        height: 20px !important;
        z-index: 2147483647 !important;
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(edgeLockStyle);

    // Create physical edge blocker elements
    const edges = [
      { id: 'edge-top', style: 'top:0;left:20px;right:20px;height:10px;' },
      { id: 'edge-right', style: 'right:0;top:20px;bottom:20px;width:10px;' },
      {
        id: 'edge-bottom',
        style: 'bottom:0;left:20px;right:20px;height:10px;',
      },
      { id: 'edge-left', style: 'left:0;top:20px;bottom:20px;width:10px;' },
    ];

    const edgeElements: HTMLElement[] = [];

    edges.forEach((edge) => {
      const element = document.createElement('div');
      element.id = edge.id;
      element.className = 'edge-block';
      element.style.cssText = element.style.cssText + edge.style;
      document.body.appendChild(element);
      edgeElements.push(element);
    });

    // Create the corner indicators
    const corners = [
      { id: 'corner-tl', style: 'top:0;left:0;', cursor: 'nwse-resize' },
      { id: 'corner-tr', style: 'top:0;right:0;', cursor: 'nesw-resize' },
      { id: 'corner-bl', style: 'bottom:0;left:0;', cursor: 'nesw-resize' },
      { id: 'corner-br', style: 'bottom:0;right:0;', cursor: 'nwse-resize' },
    ];

    const cornerElements: HTMLElement[] = [];

    corners.forEach((corner) => {
      const element = document.createElement('div');
      element.id = corner.id;
      element.className = 'corner-block';
      element.style.cssText = corner.style;
      document.body.appendChild(element);
      cornerElements.push(element);
    });

    // Apply basic classes
    document.documentElement.classList.add('detached-dialer');
    document.body.classList.add('detached-dialer');

    return {
      cleanup: () => {
        // Remove all edge blocking elements
        document.querySelectorAll('.edge-block, .corner-block').forEach((el) => {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });

        // Remove style element
        if (edgeLockStyle.parentNode) {
          edgeLockStyle.parentNode.removeChild(edgeLockStyle);
        }

        // Remove classes
        document.documentElement.classList.remove('detached-dialer');
        document.body.classList.remove('detached-dialer');
      },
    };
  };

  // Add the edge locking effect when in detached mode
  useEffect(() => {
    if (!isDetached) return;

    // First remove any existing elements
    document
      .querySelectorAll(
        '.edge-block, .corner-block, .total-edge-blocker, .total-corner, .edge-overlay-screen'
      )
      .forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });

    // Apply the simple edge locking
    console.log('🔒 Setting up edge locking');
    const edgeLock = lockEdges();

    // Apply multiple times to ensure it works across all browsers
    setTimeout(() => lockEdges(), 100);
    setTimeout(() => lockEdges(), 500);

    return () => {
      // Clean up on unmount
      edgeLock.cleanup();
    };
  }, [isDetached]);

  // Simple function to lock window edges using CSS - clean and focused
  const lockWindowEdges = () => {
    // Create a style element with focused edge-locking CSS
    const lockStyle = document.createElement('style');
    lockStyle.id = 'window-edge-lock';
    lockStyle.innerHTML = `
      /* Disable resize for the entire document */
      html, body {
        resize: none !important;
        overflow: hidden !important;
      }
      
      /* Edge blockers - each edge gets its own blocker */
      .edge-blocker {
        position: fixed !important;
        background: transparent !important;
        z-index: 2147483647 !important; /* Maximum z-index */
        pointer-events: auto !important;
        cursor: default !important;
      }
      
      /* Top edge */
      #edge-top {
        top: 0;
        left: 20px;
        right: 20px;
        height: 10px;
      }
      
      /* Right edge */
      #edge-right {
        right: 0;
        top: 20px;
        bottom: 20px;
        width: 10px;
      }
      
      /* Bottom edge */
      #edge-bottom {
        bottom: 0;
        left: 20px;
        right: 20px;
        height: 10px;
      }
      
      /* Left edge */
      #edge-left {
        left: 0;
        top: 20px;
        bottom: 20px;
        width: 10px;
      }
      
      /* Corner indicators */
      .corner {
        position: fixed !important;
        width: 20px !important;
        height: 20px !important;
        background: transparent !important;
        z-index: 2147483646 !important;
        pointer-events: auto !important;
      }
      
      /* Top-left corner */
      #corner-tl {
        top: 0;
        left: 0;
        cursor: nwse-resize !important;
      }
      
      /* Top-right corner */
      #corner-tr {
        top: 0;
        right: 0;
        cursor: nesw-resize !important;
      }
      
      /* Bottom-left corner */
      #corner-bl {
        bottom: 0;
        left: 0;
        cursor: nesw-resize !important;
      }
      
      /* Bottom-right corner */
      #corner-br {
        bottom: 0;
        right: 0;
        cursor: nwse-resize !important;
      }
    `;
    document.head.appendChild(lockStyle);

    // Create the physical edge blockers
    const edges = [
      { id: 'edge-top', style: 'top:0;left:20px;right:20px;height:10px;' },
      { id: 'edge-right', style: 'right:0;top:20px;bottom:20px;width:10px;' },
      {
        id: 'edge-bottom',
        style: 'bottom:0;left:20px;right:20px;height:10px;',
      },
      { id: 'edge-left', style: 'left:0;top:20px;bottom:20px;width:10px;' },
    ];

    // Store elements for later cleanup
    const edgeElements: HTMLDivElement[] = [];

    edges.forEach((edge) => {
      const element = document.createElement('div');
      element.id = edge.id;
      element.className = 'edge-blocker';
      element.style.cssText = element.style.cssText + edge.style;
      document.body.appendChild(element);
      edgeElements.push(element);
    });

    // Create the corner indicators
    const corners = [
      { id: 'corner-tl', style: 'top:0;left:0;', cursor: 'nwse-resize' },
      { id: 'corner-tr', style: 'top:0;right:0;', cursor: 'nesw-resize' },
      { id: 'corner-bl', style: 'bottom:0;left:0;', cursor: 'nesw-resize' },
      { id: 'corner-br', style: 'bottom:0;right:0;', cursor: 'nwse-resize' },
    ];

    // Store elements for later cleanup
    const cornerElements: HTMLDivElement[] = [];

    corners.forEach((corner) => {
      const element = document.createElement('div');
      element.id = corner.id;
      element.className = 'corner';
      element.style.cssText = element.style.cssText + corner.style;
      element.style.cursor = corner.cursor;
      document.body.appendChild(element);
      cornerElements.push(element);
    });

    // Return cleanup function
    return {
      cleanup: () => {
        // Remove the style element
        if (lockStyle.parentNode) {
          lockStyle.parentNode.removeChild(lockStyle);
        }

        // Remove all edge blockers
        edgeElements.forEach((element) => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        });

        // Remove all corner indicators
        cornerElements.forEach((element) => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        });
      },
    };
  };

  // Add the edge locking effect in a focused useEffect hook
  useEffect(() => {
    if (isDetached) {
      console.log('🔒 Locking window edges');

      // Apply the edge locking
      const edgeLock = lockWindowEdges();

      return () => {
        // Clean up
        edgeLock.cleanup();
      };
    }
  }, [isDetached]);

  // Native macOS window edge locking - focused solution
  const lockNativeWindowEdges = () => {
    console.log('🔒🔒🔒 LOCKING NATIVE WINDOW EDGES');

    // Create extra-wide physical edge blockers to prevent native resizing
    const nativeEdges = [
      {
        id: 'native-edge-top',
        style: 'top:0;left:30px;right:30px;height:30px;',
      },
      {
        id: 'native-edge-right',
        style: 'top:30px;right:0;bottom:30px;width:30px;',
      },
      {
        id: 'native-edge-bottom',
        style: 'bottom:0;left:30px;right:30px;height:30px;',
      },
      {
        id: 'native-edge-left',
        style: 'top:30px;left:0;bottom:30px;width:30px;',
      },
    ];

    // Create elements array
    const edgeElements: HTMLDivElement[] = [];

    // Create DOM elements with maximum z-index to intercept all resize attempts
    nativeEdges.forEach((edge) => {
      const element = document.createElement('div');
      element.id = edge.id;
      element.className = 'native-edge-blocker';
      element.style.cssText = `
        position: fixed !important;
        z-index: 2147483647 !important;
        background: transparent !important;
        pointer-events: auto !important;
        cursor: default !important;
        ${edge.style}
      `;

      // Prevent any mouse interactions
      element.addEventListener(
        'mousedown',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        },
        true
      );

      document.body.appendChild(element);
      edgeElements.push(element);
    });

    // Create corner elements that DO allow resizing
    const corners = [
      {
        id: 'native-corner-tl',
        style: 'top:0;left:0;width:30px;height:30px;',
        cursor: 'nwse-resize',
      },
      {
        id: 'native-corner-tr',
        style: 'top:0;right:0;width:30px;height:30px;',
        cursor: 'nesw-resize',
      },
      {
        id: 'native-corner-bl',
        style: 'bottom:0;left:0;width:30px;height:30px;',
        cursor: 'nesw-resize',
      },
      {
        id: 'native-corner-br',
        style: 'bottom:0;right:0;width:30px;height:30px;',
        cursor: 'nwse-resize',
      },
    ];

    // Create corner elements array
    const cornerElements: HTMLDivElement[] = [];

    // Create corner elements with explicit resize cursors
    corners.forEach((corner) => {
      const element = document.createElement('div');
      element.id = corner.id;
      element.className = 'native-corner';
      element.style.cssText = `
        position: fixed !important;
        z-index: 2147483646 !important;
        background: transparent !important;
        pointer-events: auto !important;
        cursor: ${corner.cursor} !important;
        ${corner.style}
      `;

      document.body.appendChild(element);
      cornerElements.push(element);
    });

    // Ensure resize:none is applied directly
    document.documentElement.style.setProperty('resize', 'none', 'important');
    document.body.style.setProperty('resize', 'none', 'important');

    // Add classes to ensure CSS selectors in index.html work
    document.documentElement.classList.add('detached-dialer');
    document.body.classList.add('detached-dialer');

    // Move window slightly to ensure styles apply
    setTimeout(() => {
      const currentX = window.screenX;
      const currentY = window.screenY;
      window.moveTo(currentX + 1, currentY);
      window.moveTo(currentX, currentY);
    }, 100);

    return {
      cleanup: () => {
        // Remove all elements
        [...edgeElements, ...cornerElements].forEach((element) => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        });

        // Remove inline styles
        document.documentElement.style.removeProperty('resize');
        document.body.style.removeProperty('resize');
      },
    };
  };

  // Replace previous edge locking with the new focused approach in a clean useEffect
  useEffect(() => {
    if (isDetached) {
      // Apply the native edge locking
      console.log('🔒 Applying native window edge lock');
      const nativeLock = lockNativeWindowEdges();

      return () => {
        // Clean up
        nativeLock.cleanup();
      };
    }
  }, [isDetached]);

  // Use a specific useEffect for setting up the detached window communication
  useEffect(() => {
    // The URL params reveal if we're in a detached window
    const urlParams = new URLSearchParams(window.location.search);
    const detachedParam = urlParams.get('detached');
    const currentDetached = detachedParam === 'true';

    if (currentDetached) {
      console.log('📱 This is a detached dialer window');
      setIsDetached(true);

      // Add classes that CSS uses for styling detached window
      document.documentElement.classList.add('detached-dialer');
      document.body.classList.add('detached-dialer');

      // Create corner controls that communicate with opener
      const corners = [
        { id: 'corner-tl', style: 'top:0;left:0;', cursor: 'nwse-resize' },
        { id: 'corner-tr', style: 'top:0;right:0;', cursor: 'nesw-resize' },
        { id: 'corner-bl', style: 'bottom:0;left:0;', cursor: 'nesw-resize' },
        { id: 'corner-br', style: 'bottom:0;right:0;', cursor: 'nwse-resize' },
      ];

      // Store elements for cleanup
      const cornerElements: HTMLDivElement[] = [];

      if (window.opener) {
        // Create simulated resize corners
        corners.forEach((corner) => {
          const element = document.createElement('div');
          element.id = corner.id;
          element.className = 'resize-corner';
          element.style.cssText = `
            position: fixed !important;
            width: 20px !important;
            height: 20px !important;
            background: transparent !important;
            z-index: 2147483647 !important;
            pointer-events: auto !important;
            cursor: ${corner.cursor} !important;
            ${corner.style}
          `;

          let isResizing = false;
          let startX = 0;
          let startY = 0;
          let startWidth = window.innerWidth;
          let startHeight = window.innerHeight;

          // Add resize functionality through dragging corners
          element.addEventListener('mousedown', (e: MouseEvent) => {
            e.preventDefault();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = window.innerWidth;
            startHeight = window.innerHeight;

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          });

          // Handle mouse movement during resize
          const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // Calculate new size based on which corner is being dragged
            let newWidth = startWidth;
            let newHeight = startHeight;

            switch (corner.id) {
              case 'corner-br':
                newWidth = startWidth + deltaX;
                newHeight = startHeight + deltaY;
                break;
              case 'corner-bl':
                newWidth = startWidth - deltaX;
                newHeight = startHeight + deltaY;
                break;
              case 'corner-tr':
                newWidth = startWidth + deltaX;
                newHeight = startHeight - deltaY;
                break;
              case 'corner-tl':
                newWidth = startWidth - deltaX;
                newHeight = startHeight - deltaY;
                break;
            }

            // Ensure minimum size
            newWidth = Math.max(newWidth, ORIGINAL_WIDTH);
            newHeight = Math.max(newHeight, ORIGINAL_HEIGHT);

            // Maintain aspect ratio
            const aspectRatio = ORIGINAL_WIDTH / ORIGINAL_HEIGHT;
            const currentRatio = newWidth / newHeight;

            if (Math.abs(currentRatio - aspectRatio) > 0.01) {
              // Adjust width based on height to maintain ratio
              newWidth = Math.round(newHeight * aspectRatio);
            }

            // Update scale based on new width
            const newScale = newWidth / ORIGINAL_WIDTH;

            // Update the UI scale
            setScale(newScale);

            // Option: send message to opener to resize the window
            if (window.opener) {
              try {
                window.opener.postMessage(
                  {
                    type: 'resize-dialer',
                    width: newWidth,
                    height: newHeight,
                  },
                  '*'
                );
              } catch (err) {
                console.error('Error sending resize message to opener:', err);
              }
            }
          };

          // Handle mouse up to end resizing
          const handleMouseUp = () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.body.appendChild(element);
          cornerElements.push(element);
        });
      }

      // Listen for messages from the opener
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'resize-applied') {
          console.log('Resize applied by opener:', event.data);
        }
      };

      window.addEventListener('message', handleMessage);

      return () => {
        // Clean up
        cornerElements.forEach((element) => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        });

        window.removeEventListener('message', handleMessage);

        document.documentElement.classList.remove('detached-dialer');
        document.body.classList.remove('detached-dialer');
      };
    }
  }, []);

  // Listen for resize messages from detached window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'resize-dialer') {
        const { width, height } = event.data;

        // Get the opened window if available
        // Need to check if we have a reference to an opened child window
        if (event.source && event.source instanceof Window) {
          try {
            // Cast to Window to access window methods
            const sourceWindow = event.source as Window;

            // Resize the detached window
            sourceWindow.resizeTo(
              width + CHROME_WIDTH_ADJUSTMENT,
              height + CHROME_HEIGHT_ADJUSTMENT
            );

            // Acknowledge back to the detached window
            sourceWindow.postMessage(
              {
                type: 'resize-applied',
                width,
                height,
              },
              '*'
            );
          } catch (err) {
            console.error('Error resizing detached window:', err);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // The render function
  return (
    <DialerContainer
      ref={dialerRef}
      isMinimized={isMinimized}
      scale={scale}
      position={position}
      isResizing={isResizing}
      isDetached={isDetached}
      currentWidth={ORIGINAL_WIDTH * scale}
      currentHeight={ORIGINAL_HEIGHT * scale}
      isMinimizedToIcon={isMinimizedToIcon}
      isExited={isExited}
      className="dialer-container"
    >
      {/* Resize handles */}
      {!isMinimized && !isDetached && (
        <>
          <ResizeHandle $position="top" $scale={scale} onMouseDown={(e) => startResize(e, 'top')} />
          <ResizeHandle
            $position="right"
            $scale={scale}
            onMouseDown={(e) => startResize(e, 'right')}
          />
          <ResizeHandle
            $position="bottom"
            $scale={scale}
            onMouseDown={(e) => startResize(e, 'bottom')}
          />
          <ResizeHandle
            $position="left"
            $scale={scale}
            onMouseDown={(e) => startResize(e, 'left')}
          />
          <ResizeHandle
            $position="top-left"
            $scale={scale}
            onMouseDown={(e) => startResize(e, 'top-left')}
          />
          <ResizeHandle
            $position="top-right"
            $scale={scale}
            onMouseDown={(e) => startResize(e, 'top-right')}
          />
          <ResizeHandle
            $position="bottom-right"
            $scale={scale}
            onMouseDown={(e) => startResize(e, 'bottom-right')}
          />
          <ResizeHandle
            $position="bottom-left"
            $scale={scale}
            onMouseDown={(e) => startResize(e, 'bottom-left')}
          />
        </>
      )}

      {/* Header with window controls and minimize button */}
      <HeaderBar
        ref={headerRef}
        $scale={scale}
        $isDragging={isDragging}
        onMouseDown={startDrag}
        style={{
          marginTop: isDetached ? '-10px' : '0', // Reduced from -30px
        }}
      >
        <div className="flex-1 flex items-center">
          <img
            src="/images/CROKODIAL HEADER:TITLE.png"
            alt="Crokodial"
            className="w-auto"
            style={{ height: `${4 * scale}px` }}
          />
        </div>

        {/* Window Control Buttons */}
        <WindowControls $scale={scale}>
          {!isDetached && (
            <>
              <WindowButton
                className="window-button"
                $color="#58A9FF"
                $scale={scale}
                onClick={handleDetach}
                title="Detach to new window"
              >
                <svg viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 1H9V7M9 1L5 5" stroke="black" strokeWidth="1" />
                </svg>
              </WindowButton>

              {/* Minimize Button */}
              <WindowButton
                className="window-button"
                $color="#FFBD44"
                $scale={scale}
                onClick={handleMinimize}
                title="Minimize"
              >
                <svg viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="4.5" width="6" height="1" fill="black" />
                </svg>
              </WindowButton>

              {/* Maximize Button */}
              <WindowButton
                className="window-button"
                $color="#00CA4E"
                $scale={scale}
                onClick={handleMaximize}
                title="Maximize"
              >
                <svg viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    x="2"
                    y="2"
                    width="6"
                    height="6"
                    stroke="black"
                    strokeWidth="1"
                    fill="none"
                  />
                </svg>
              </WindowButton>

              {/* Exit Button */}
              <WindowButton
                className="window-button"
                $color="#FF605C"
                $scale={scale}
                onClick={handleExit}
                title="Close"
              >
                <svg viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 3L7 7M7 3L3 7" stroke="black" strokeWidth="1" />
                </svg>
              </WindowButton>
            </>
          )}
        </WindowControls>

        <button
          onClick={toggleMinimize}
          className="text-black text-xs ml-2 hover:opacity-80 flex items-center justify-center rounded"
          style={{
            backgroundColor: '#D4B88C',
            border: '1px solid #000000',
            width: `${4 * scale}px`,
            height: `${4 * scale}px`,
            fontSize: `${10 * scale}px`,
            cursor: 'pointer',
          }}
        >
          {isMinimized ? '▲' : '▼'}
        </button>
      </HeaderBar>

      {!isMinimized && (
        <div
          className="relative flex flex-col h-[calc(100%-2rem)] p-3"
          style={{
            backgroundImage: `url('/images/DIALER/DIALER SPECKLES BACKGROUND .png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            padding: `${3 * scale}px`,
            height: `calc(100% - ${2 * scale}rem)`,
            marginTop: isDetached ? '-40px' : '0', // Reduced from -80px
          }}
        >
          {/* Draggable Area (extends to cover navigation area except arrows) */}
          <DraggableArea
            $isDragging={isDragging}
            onMouseDown={startDrag}
            style={{
              height: `${dragAreaHeight}px`,
              pointerEvents: 'auto',
            }}
          />

          {/* Navigation Arrows and Logo */}
          <div
            ref={navigationRef}
            className="flex justify-between items-center mb-4"
            style={{
              marginBottom: `${4 * scale}px`,
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <button
              className="navigation-arrow transform hover:scale-105 transition-transform bg-transparent"
              onClick={() => console.log('Previous caller')}
              style={{
                background: 'none',
                borderRadius: `${8 * scale}px`,
                width: `${50 * scale}px`,
                height: `${50 * scale}px`,
                cursor: 'pointer',
                position: 'relative',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/images/DIALER/BACKWARDS.png"
                alt="Previous"
                className="rotate-180"
                style={{
                  filter: 'none',
                  width: '50%',
                  height: '50%',
                  margin: 'auto',
                  display: 'block',
                  objectFit: 'contain',
                  objectPosition: 'center',
                }}
              />
            </button>
            <button
              className="navigation-arrow transform hover:scale-105 transition-transform bg-transparent"
              onClick={() => console.log('Next caller')}
              style={{
                background: 'none',
                borderRadius: `${8 * scale}px`,
                width: `${50 * scale}px`,
                height: `${50 * scale}px`,
                cursor: 'pointer',
                position: 'relative',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/images/DIALER/FORWARD.png"
                alt="Next"
                style={{
                  filter: 'none',
                  width: '50%',
                  height: '50%',
                  margin: 'auto',
                  display: 'block',
                  objectFit: 'contain',
                  objectPosition: 'center',
                }}
              />
            </button>
          </div>

          {/* Phone Number Display with Backspace */}
          <div
            ref={numberDisplayRef}
            className="bg-white rounded-lg py-0.5 px-1 flex items-center border-2 border-black mb-4"
            style={{
              padding: `${0.5 * scale}px ${1 * scale}px`,
              borderWidth: `${2 * scale}px`,
              borderColor: 'black',
              borderStyle: 'solid',
              borderRadius: `${8 * scale}px`,
              height: `${24 * scale}px`,
              width: `210px`, // Fixed width to match
              backgroundColor: '#F7EAD7', // Changed from white to a warmer tone that matches the dialer
              position: 'relative',
              zIndex: 100, // Higher z-index to ensure clickability
              boxSizing: 'border-box',
              margin: '0 auto',
              marginBottom: `${4 * scale}px`,
              cursor: 'text', // Set cursor to text
              pointerEvents: 'auto', // Ensure click events work
            }}
            onClick={(e) => {
              // Stop propagation to prevent dragging when clicking on the number field
              e.stopPropagation();
            }}
          >
            <input
              type="tel"
              inputMode="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter number"
              className="flex-1 text-center text-black font-mono bg-transparent"
              style={{
                fontSize: `${16 * scale}px`, // Increased font size
                fontWeight: 'bold', // Added bold
                width: '100%',
                border: 'none',
                outline: 'none',
                padding: '0',
                margin: '0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'text', // Set cursor to text
                pointerEvents: 'auto', // Ensure click events work
                backgroundColor: 'transparent', // Ensure bg is transparent
                letterSpacing: `${1 * scale}px`, // Added letter spacing for better readability
                color: '#333', // Slightly darker text for better contrast
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onKeyDown={(e) => {
                // Stop propagation to prevent dragging when typing
                e.stopPropagation();
              }}
            />
          </div>

          {/* Number Pad */}
          <div
            className="grid grid-cols-3 gap-1 px-1 mb-2"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 65px)', // Fixed size without scale
              gap: '1px',
              padding: '0 1px',
              marginBottom: '2px',
              position: 'relative',
              zIndex: 5,
              maxWidth: `${ORIGINAL_WIDTH}px`, // Original width without scale
              margin: '0 0 2px 0', // Consistent margin
              justifyContent: 'center', // Center the grid
              marginTop: '4px', // Consistent spacing from number display
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '#', 0, '*'].map((num) => (
              <button
                key={num}
                onClick={(e) => {
                  e.preventDefault();
                  handleNumberClick(num.toString());
                }}
                className={`flex items-center justify-center ${
                  activeButton === num.toString() ? 'scale-95' : ''
                }`}
                style={{
                  width: '65px',
                  height: '65px',
                  padding: '0',
                  backgroundColor: '#D4B88C',
                  border: '4px solid black',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  WebkitAppearance: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  margin: '0',
                }}
              >
                <img
                  src={`/images/DIALER/${num === '*' ? 'left of 0' : num === '#' ? 'right of 0' : num}.png`}
                  alt={num.toString()}
                  style={{
                    width: 'calc(100% - 8px)',
                    height: 'calc(100% - 8px)',
                    objectFit: 'contain',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    padding: '0',
                    margin: '0',
                  }}
                />
              </button>
            ))}
          </div>

          {/* Control Buttons */}
          <div
            className="flex justify-center gap-8 absolute left-0 right-0"
            style={{
              bottom: `${3 * scale}px`,
              gap: `${8 * scale}px`,
              zIndex: 5,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <button
              onClick={handleEndCall}
              className="transform hover:scale-105 transition-transform bg-[#FF3B30] rounded-full flex items-center justify-center"
              style={{
                width: `${50 * scale}px`,
                height: `${50 * scale}px`,
                borderRadius: '50%',
                boxShadow: `0 ${2 * scale}px ${4 * scale}px rgba(0,0,0,0.2)`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FF3B30',
              }}
            >
              <img
                src="/images/DIALER/END CALL.png"
                alt="End Call"
                className="object-contain"
                style={{
                  width: `${25 * scale}px`,
                  height: `${25 * scale}px`,
                  objectFit: 'contain',
                }}
              />
            </button>

            <button
              onClick={handleCall}
              disabled={phoneNumber.length < 10}
              className={`transform hover:scale-105 transition-transform rounded-full flex items-center justify-center ${
                phoneNumber.length < 10 ? 'bg-opacity-50' : ''
              }`}
              style={{
                width: `${50 * scale}px`,
                height: `${50 * scale}px`,
                borderRadius: '50%',
                backgroundColor: '#34C759',
                boxShadow: `0 ${2 * scale}px ${4 * scale}px rgba(0,0,0,0.2)`,
                cursor: phoneNumber.length < 10 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/images/DIALER/CALL.png"
                alt="Call"
                className="object-contain"
                style={{
                  width: `${25 * scale}px`,
                  height: `${25 * scale}px`,
                  objectFit: 'contain',
                }}
              />
            </button>
          </div>
        </div>
      )}
    </DialerContainer>
  );
};

// Export the wrapper instead of the original component
export default DialerWrapper;
