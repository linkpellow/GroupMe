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
                  <App />
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

console.log("=== APP INITIALIZATION COMPLETE ===");

// Fade out and remove global preloader after minimum 3s
(() => {
  const pre = document.getElementById('croc-preloader');
  if (!pre) return;
  const MIN_SHOW = 1600; // ms
  setTimeout(() => {
    pre.classList.add('fade-out');
    setTimeout(() => pre.remove(), 400); // match CSS transition
  }, MIN_SHOW);
})();
