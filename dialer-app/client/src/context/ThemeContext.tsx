import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextProps {
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
}

const defaultBackgroundColor = '#f5f2e9'; // Light offwhite with slight yellow/brown tint

const ThemeContext = createContext<ThemeContextProps>({
  backgroundColor: defaultBackgroundColor,
  setBackgroundColor: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load saved background color from localStorage or use default
  const [backgroundColor, setBackgroundColorState] = useState<string>(() => {
    const savedColor = localStorage.getItem('crokodial_bg_color');
    return savedColor || defaultBackgroundColor;
  });

  // Apply background color immediately when component mounts
  useEffect(() => {
    applyBackgroundColor(backgroundColor);
  }, []);

  // Effect to update the CSS variable and apply to all elements when the background color changes
  useEffect(() => {
    if (backgroundColor) {
      document.documentElement.style.setProperty(
        '--app-background-color',
        backgroundColor,
        'important'
      );
      document.body.style.setProperty('background-color', backgroundColor, 'important');

      // Apply to all major container elements
      const appElements = document.querySelectorAll(
        '.app-container, .settings-container, .main-content, .clients-container'
      );
      appElements.forEach((el) => {
        (el as HTMLElement).style.setProperty('background-color', backgroundColor, 'important');
      });
    }
  }, [backgroundColor]);

  // Function to directly apply background color to DOM elements
  const applyBackgroundColor = (color: string) => {
    if (!color) return;

    // Skip applying background color if on login page
    const isLoginPage = window.location.pathname === '/login';
    if (isLoginPage) return;

    // Apply to CSS variable
    document.documentElement.style.setProperty('--app-background-color', color, 'important');

    // Apply directly to body and html with !important flag
    document.body.style.cssText += `background-color: ${color} !important;`;
    document.documentElement.style.cssText += `background-color: ${color} !important;`;

    // Force all client containers to have the background color
    const allClientContainers = document.querySelectorAll('.clients-container');
    allClientContainers.forEach((el) => {
      (el as HTMLElement).style.cssText += `background-color: ${color} !important;`;
    });

    // Apply to any nested containers that might override the background
    const allContainers = document.querySelectorAll(
      '.main-content, .app-container, .clients-container'
    );
    allContainers.forEach((el) => {
      (el as HTMLElement).style.cssText += `background-color: ${color} !important;`;
    });

    // Save to localStorage
    localStorage.setItem('crokodial_bg_color', color);
  };

  const setBackgroundColor = (color: string) => {
    if (!color) return;

    // Update state
    setBackgroundColorState(color);

    // Apply directly to DOM
    applyBackgroundColor(color);
  };

  return (
    <ThemeContext.Provider value={{ backgroundColor, setBackgroundColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
