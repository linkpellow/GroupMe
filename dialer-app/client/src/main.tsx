import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChakraProvider } from "@chakra-ui/react";
import theme from "./theme";
import { GroupMeProvider } from "./context/GroupMeContext";
import { SidebarToggleProvider } from "./context/SidebarToggleContext";
import CallCountsProvider from "./context/CallCountsContext";
import LifetimeCountsProvider from "./context/LifetimeCountsContext";
import * as scrollLockUtil from "./shared/scrollLock";
import { ZoomProvider, useZoom } from './context/ZoomContext';

console.log("=== APP INITIALIZATION START ===");
console.log("main.tsx - Starting to mount application");

// Add error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Add error handling for uncaught exceptions
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
});

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

// Add error boundary for the root mount
try {
  console.log("Attempting to find root element...");
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error("Root element not found! Cannot mount React app.");
    throw new Error("Root element not found");
  }
  
  console.log("Root element found, creating React root...");
  const root = ReactDOM.createRoot(rootElement);
  
  console.log("Rendering React app...");
  root.render(
    <React.StrictMode>
      <ZoomProvider>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <CallCountsProvider>
            <LifetimeCountsProvider>
              <GroupMeProvider>
                <SidebarToggleProvider>
                    <App />
                    <ZoomControls />
                </SidebarToggleProvider>
              </GroupMeProvider>
            </LifetimeCountsProvider>
          </CallCountsProvider>
        </ChakraProvider>
      </QueryClientProvider>
      </ZoomProvider>
    </React.StrictMode>
  );
  
  console.log("React app rendered successfully!");
} catch (error) {
  console.error("Failed to mount React app:", error);
  
  // Show error message to user
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
        z-index: 9999;
      ">
        <div style="
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 500px;
        ">
          <h2 style="color: #e53e3e; margin-bottom: 1rem;">Application Error</h2>
          <p style="margin-bottom: 1rem;">Failed to load the application. Please refresh the page or try again later.</p>
          <button onclick="window.location.reload()" style="
            background: #3182ce;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
          ">Refresh Page</button>
        </div>
      </div>
    `;
  }
}

console.log("=== APP INITIALIZATION COMPLETE ===");

// Fade out and remove global preloader after minimum 3s
(() => {
  console.log("Setting up preloader removal...");
  const pre = document.getElementById('croc-preloader');
  if (!pre) {
    console.log("Preloader element not found");
    return;
  }
  const MIN_SHOW = 1600; // ms
  console.log(`Preloader will be removed in ${MIN_SHOW}ms`);
  setTimeout(() => {
    console.log("Removing preloader...");
    pre.classList.add('fade-out');
    setTimeout(() => {
      pre.remove();
      console.log("Preloader removed");
    }, 400); // match CSS transition
  }, MIN_SHOW);
})();
