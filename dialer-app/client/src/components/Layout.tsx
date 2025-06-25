import { ReactNode, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Navigation from './Navigation';
// No longer import FollowUpStrip or useFollowUpUI here

export default function Layout({ children }: { children: ReactNode }) {
  useAuth();
  const { backgroundColor } = useTheme();

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--app-background-color',
      backgroundColor,
      'important'
    );
    document.body.style.cssText += `background-color: ${backgroundColor} !important`;
  }, [backgroundColor]);

  const layoutStyle = {
    minHeight: '100vh',
    backgroundColor: backgroundColor,
    position: 'relative' as const,
    zIndex: 0,
    display: 'flex',
    flexDirection: 'column' as const,
  };

  return (
    <div style={layoutStyle} className="app-container">
      <Navigation />
      {/* Scaled content area */}
      <div
        style={{
          flex: 1,
          overflow: 'visible',
          paddingTop: '100px',
          backgroundColor: backgroundColor,
        }}
        className="main-content"
      >
        {children}
      </div>
    </div>
  );
}
