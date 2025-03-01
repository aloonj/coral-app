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
        main: '#3DBDB5', // Slightly desaturated teal for dark mode
      },
      secondary: {
        ...baseColors.secondary,
        main: '#F5A855', // Slightly desaturated orange for dark mode
      },
      background: {
        default: '#1A1A1A', // Slightly lighter than default dark mode
        paper: '#2A2A2A', // Better contrast with background
      },
      text: {
        primary: '#FFFFFF', // Brighter for better readability
        secondary: '#CCCCCC', // Increased contrast for secondary text
      },
      // Ensure status colors have proper contrast in dark mode
      error: {
        ...baseColors.error,
        main: '#FF6B6B', // Brighter for dark mode
      },
      warning: {
        ...baseColors.warning,
        main: '#FFC078', // Brighter for dark mode
      },
      info: {
        ...baseColors.info,
        main: '#63B3ED', // Brighter for dark mode
      },
      success: {
        ...baseColors.success,
        main: '#68D391', // Brighter for dark mode
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
                background: 'linear-gradient(135deg, #2A5C5B 0%, #1A4C4B 50%, #0A3A3A 100%)', // Lighter gradient for better contrast
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                '& img': {
                  // Add a light border around the logo for better visibility in dark mode
                  filter: 'drop-shadow(0px 0px 5px rgba(255,255,255,0.3))'
                }
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                borderRadius: 8,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.05)', // Subtle border for better definition
                '&:hover': {
                  transform: 'translateY(-2px)', // Reduced hover effect
                  boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                },
              },
            },
          },
          MuiListItem: {
            styleOverrides: {
              root: {
                '&.Mui-selected': {
                  backgroundColor: 'rgba(255,255,255,0.08)' // More visible selected state
                },
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.05)' // Subtle hover effect
                }
              }
            }
          },
          MuiListItemIcon: {
            styleOverrides: {
              root: {
                color: 'rgba(255,255,255,0.9)' // Brighter icons for better visibility
              }
            }
          },
          MuiListItemText: {
            styleOverrides: {
              primary: {
                color: '#FFFFFF', // Ensure menu text is bright enough
                fontWeight: 500
              },
              secondary: {
                color: '#BBBBBB' // Better contrast for secondary text
              }
            }
          },
          MuiTypography: {
            styleOverrides: {
              h1: {
                color: '#FFFFFF',
                fontWeight: 700
              },
              h2: {
                color: '#FFFFFF',
                fontWeight: 600
              },
              h3: {
                color: '#FFFFFF',
                fontWeight: 600
              },
              h4: {
                color: '#FFFFFF',
                fontWeight: 600
              },
              h5: {
                color: '#FFFFFF',
                fontWeight: 600
              },
              h6: {
                color: '#FFFFFF',
                fontWeight: 600
              }
            }
          }
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
