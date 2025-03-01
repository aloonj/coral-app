import { createTheme } from '@mui/material/styles';

// Define your brand colors based on existing app styling
const colors = {
  primary: {
    main: '#20B2AA', // Current teal color from Layout.jsx
    light: '#4ECDC4',
    dark: '#008B8B',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#FF8C00', // Orange accent from Layout.jsx
    light: '#FFA940',
    dark: '#D97706',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#F56565', // From existing delete buttons
    light: '#FC8181',
    dark: '#C53030',
  },
  warning: {
    main: '#ED8936', // From Dashboard.jsx status colors
    light: '#F6AD55',
    dark: '#C05621',
  },
  info: {
    main: '#4299E1', // From existing edit buttons
    light: '#63B3ED',
    dark: '#2B6CB0',
  },
  success: {
    main: '#48BB78', // From existing status indicators
    light: '#68D391',
    dark: '#2F855A',
  },
  background: {
    default: 'linear-gradient(135deg, rgba(32, 178, 170, 0.1) 0%, rgba(0, 139, 139, 0.05) 100%)',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#2D3748', // From existing headers
    secondary: '#4A5568', // From existing secondary text
    disabled: '#A0AEC0',
  },
};

// Create a theme instance
const theme = createTheme({
  palette: colors,
  typography: {
    fontFamily: '"Raleway", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      marginBottom: '1.5rem',
      color: colors.text.primary,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
      marginBottom: '1rem',
      color: colors.text.primary,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 600,
      marginBottom: '0.75rem',
      color: colors.text.primary,
    },
    body1: {
      fontSize: '1rem',
      color: colors.text.secondary,
    },
    button: {
      textTransform: 'none', // Avoid all-caps buttons
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    // Customize default component styles
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '0.5rem 1.2rem',
          transition: 'all 0.3s ease',
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 6px rgba(0,0,0,0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
      defaultProps: {
        disableElevation: true, // Flatter design
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          borderRadius: 8,
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: '1rem',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #20B2AA 0%, #008B8B 50%, #006666 100%)',
          boxShadow: '0 8px 15px rgba(0,0,0,0.15)',
        },
      },
    },
  },
});

export default theme;
