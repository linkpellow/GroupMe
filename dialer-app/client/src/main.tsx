import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChakraProvider } from "@chakra-ui/react";
import theme from "./theme";
import { GroupMeProvider } from "./context/GroupMeContext";
import { SidebarToggleProvider } from "./context/SidebarToggleContext";
import CallCountsProvider from "./context/CallCountsContext";
import LifetimeCountsProvider from "./context/LifetimeCountsContext";
import * as scrollLockUtil from "./shared/scrollLock";
import { ZoomProvider, useZoom } from './context/ZoomContext';
import { webSocketService } from './services/websocketService';

// Prevent touch scrolling when dropdown lock is active
window.addEventListener(
  'touchmove',
  (e) => {
    if (scrollLockUtil.isScrollLocked()) {
      e.preventDefault();
    }
  },
  { passive: false }
);

// Keyboard shortcuts Ctrl++ Ctrl+- Ctrl+0
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && !e.shiftKey) {
    const { zoomIn, zoomOut, resetZoom } = require('./context/ZoomContext');
  }
});

const queryClient = new QueryClient();

const ZoomControls: React.FC = () => {
  const { zoomIn, zoomOut, resetZoom } = useZoom();
  return (
    <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 10000, display: 'flex', gap: '6px' }}>
      <button onClick={zoomOut} style={{ padding: '4px 8px' }}>-</button>
      <button onClick={zoomIn} style={{ padding: '4px 8px' }}>+</button>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <GroupMeProvider>
          <SidebarToggleProvider>
            <CallCountsProvider>
              <LifetimeCountsProvider>
                <ZoomProvider>
                  <ErrorBoundary>
                    <App />
                  </ErrorBoundary>
                  <ZoomControls />
                </ZoomProvider>
              </LifetimeCountsProvider>
            </CallCountsProvider>
          </SidebarToggleProvider>
        </GroupMeProvider>
      </QueryClientProvider>
    </ChakraProvider>
  </React.StrictMode>
);

// Fade out and remove global preloader after GIF loads or minimum time
(() => {
  const pre = document.getElementById('croc-preloader');
  if (!pre) return;
  
  const MIN_SHOW = 1000; // 1 second minimum display
  const HARD_STOP = 4000; // absolute max 4 seconds
  // Grab the first GIF inside the preloader (no dependency on exact filename)
  const gif = pre.querySelector('img') as HTMLImageElement | null;

  let hasFadedOut = false;
  const fadeOut = () => {
    if (hasFadedOut) return;
    hasFadedOut = true;
    pre.classList.add('fade-out');
    setTimeout(() => pre.remove(), 400); // match CSS transition
  };

  // Always fade out after MIN_SHOW
  setTimeout(fadeOut, MIN_SHOW);

  // Fade out as soon as GIF finishes loading (or errors)
  if (gif && !gif.complete) {
    gif.onload = fadeOut;
    gif.onerror = fadeOut;
  }

  // Hard-stop to prevent being stuck even if everything else fails
  setTimeout(fadeOut, HARD_STOP);
})();

// Ensure the import is used to prevent tree-shaking
console.log('Initializing WebSocket service...');
// This will execute the constructor
webSocketService;

// Add global error listeners to catch anything that slips past React's boundaries
window.addEventListener('error', (event) => {
  console.error('GLOBAL UNCAUGHT ERROR:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('GLOBAL UNHANDLED REJECTION:', event.reason);
});

// Dev-only: trace accidental .replace on undefined/null
{
  const _origReplace = String.prototype.replace as any;
  // @ts-ignore
  String.prototype.replace = function (...args: any[]) {
    if (this == null) {
      // eslint-disable-next-line no-console
      console.error('[NULL-REPLACE] String.replace called on', this, '\nStack:', new Error().stack?.split('\n').slice(2, 8).join('\n'));
      return '';
    }
    // @ts-ignore
    return _origReplace.apply(this, args);
  };
}
