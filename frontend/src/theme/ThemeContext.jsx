import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import baseTheme from './index';

// Create a context for color mode
export const ColorModeContext = createContext({
  mode: 'light',
  toggleColorMode: () => {},
});

// Custom hook to use the color mode context
export const useColorMode = () => {
  return useContext(ColorModeContext);
};

// ThemeProvider component that includes color mode toggling
export const ThemeProvider = ({ children }) => {
  // Try to get the saved mode from localStorage, default to 'light'
  const [mode, setMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('themeMode');
      return savedMode ? savedMode : 'light';
    } catch (error) {
      return 'light';
    }
  });

  // Save mode to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('themeMode', mode);
    } catch (error) {
      console.error('Failed to save theme mode to localStorage:', error);
    }
  }, [mode]);

  // Color mode context value
  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [mode]
  );

  // Create a theme with the current mode
  const theme = useMemo(() => {
    // Start with the base theme
    const baseColors = baseTheme.palette;
    
    // Create dark mode palette overrides
    const darkPalette = {
      mode: 'dark',
      primary: {
        ...baseColors.primary,
        main: '#4ECDC4', // Lighter shade for dark mode
      },
      secondary: {
        ...baseColors.secondary,
        main: '#FFA940', // Lighter shade for dark mode
      },
      background: {
        default: '#121212',
        paper: '#1E1E1E',
      },
      text: {
        primary: '#E0E0E0',
        secondary: '#AAAAAA',
      },
    };

    // Create the theme with the appropriate palette
    return createTheme({
      ...baseTheme,
      palette: mode === 'light' ? baseColors : darkPalette,
      components: {
        ...baseTheme.components,
        // Additional dark mode component overrides
        ...(mode === 'dark' && {
          MuiAppBar: {
            styleOverrides: {
              root: {
                background: 'linear-gradient(135deg, #1A3C3B 0%, #0F2C2B 50%, #071A1A 100%)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
        }),
      },
    });
  }, [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default ThemeProvider;
