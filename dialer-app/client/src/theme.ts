import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

// Brand highlight color – gold variant
const brandGold = "#EFBF04";

// Dark theme configuration
const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

// Custom color palette for dark theme
const colors = {
  brand: {
    50: '#FFF9E6',
    100: '#FFEECC',
    200: '#FFE299',
    300: '#FFD566',
    400: '#FFC933',
    500: brandGold, // Main brand color
    600: '#CC9900',
    700: '#997300',
    800: '#664D00',
    900: '#332600',
  },
  dark: {
    50: '#F7FAFC',
    100: '#EDF2F7',
    200: '#E2E8F0',
    300: '#CBD5E0',
    400: '#A0AEC0',
    500: '#718096',
    600: '#4A5568',
    700: '#2D3748',
    800: '#1A202C',
    900: '#171923',
  },
  background: {
    primary: '#0F0F0F',
    secondary: '#1A1A1A',
    tertiary: '#2D2D2D',
  }
};

// Enhanced theme with dark mode support
const theme = extendTheme({
  config,
  colors,
  fonts: {
    heading: 'Tektur, monospace',
    body: 'system-ui, sans-serif',
  },
  styles: {
    global: (props: any) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'background.primary' : 'white',
        color: props.colorMode === 'dark' ? 'whiteAlpha.900' : 'gray.800',
      },
      '*': {
        scrollbarWidth: 'thin',
        scrollbarColor: `${brandGold} transparent`,
      },
      '*::-webkit-scrollbar': {
        width: '8px',
      },
      '*::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '*::-webkit-scrollbar-thumb': {
        background: brandGold,
        borderRadius: '4px',
      },
      '*::-webkit-scrollbar-thumb:hover': {
        background: '#CC9900',
      },
    }),
  },
  components: {
    Menu: {
      baseStyle: {
        item: {
          _hover: { bg: brandGold, color: 'black' },
          _focus: { bg: brandGold, color: 'black' },
          _active: { bg: brandGold, color: 'black' },
        },
        list: {
          bg: 'rgba(26, 26, 26, 0.95)',
          backdropFilter: 'blur(20px)',
          border: `1px solid rgba(239, 191, 4, 0.2)`,
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        },
      },
    },
    Button: {
      baseStyle: {
        fontWeight: '600',
        borderRadius: '8px',
      },
      variants: {
        solid: {
          bg: brandGold,
          color: 'black',
          _hover: {
            bg: '#CC9900',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(239, 191, 4, 0.3)',
          },
          _active: {
            transform: 'translateY(0)',
          },
        },
        ghost: {
          _hover: {
            bg: 'rgba(239, 191, 4, 0.1)',
            color: brandGold,
          },
        },
        outline: {
          borderColor: brandGold,
          color: brandGold,
          _hover: {
            bg: 'rgba(239, 191, 4, 0.1)',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'rgba(26, 26, 26, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        },
      },
    },
    Badge: {
      baseStyle: {
        fontWeight: '600',
        borderRadius: 'full',
      },
      variants: {
        solid: {
          bg: brandGold,
          color: 'black',
        },
      },
    },
    Tabs: {
      variants: {
        modern: {
          tab: {
            fontWeight: '500',
            color: 'whiteAlpha.700',
            _selected: {
              color: brandGold,
              borderBottomColor: brandGold,
              borderBottomWidth: '3px',
            },
            _hover: {
              color: brandGold,
            },
          },
          tabpanel: {
            p: 0,
          },
        },
      },
    },
  },
});

export default theme; 