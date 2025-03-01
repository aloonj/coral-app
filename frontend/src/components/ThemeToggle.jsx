import { useColorMode } from '../theme/ThemeContext';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

/**
 * A component that renders a button to toggle between light and dark mode.
 * Uses the ColorModeContext to access and update the current theme mode.
 */
const ThemeToggle = () => {
  const { mode, toggleColorMode } = useColorMode();
  const theme = useTheme();

  return (
    <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        onClick={toggleColorMode}
        color="inherit"
        aria-label="toggle theme"
        sx={{
          ml: 1,
          color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.6)',
          '&:hover': {
            color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 0.8)',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
          },
          transition: 'color 0.2s, background-color 0.2s',
        }}
      >
        {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
