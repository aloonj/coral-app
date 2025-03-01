import { useState } from 'react';
import { Box, Container, Typography, Paper, Tabs, Tab, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '../../theme/ThemeContext';
import ThemeToggle from '../ThemeToggle';
import ColorPalette from './ColorPalette';
import TypographyGuide from './TypographyGuide';
import SpacingGuide from './SpacingGuide';
import ComponentsGuide from './ComponentsGuide';

/**
 * ThemeGuide Component
 * 
 * A comprehensive guide that demonstrates all theme elements including
 * colors, typography, spacing, and component styling. This serves as a
 * reference for developers working with the MUI theme in this application.
 */
const ThemeGuide = () => {
  const [activeTab, setActiveTab] = useState(0);
  const theme = useTheme();
  const { mode } = useColorMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 2 : 0
      }}>
        <Typography variant="h1">Theme Usage Guide</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Current mode: {mode}
          </Typography>
          <ThemeToggle />
        </Box>
      </Box>
      
      <Paper sx={{ mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
          allowScrollButtonsMobile
          centered={!isMobile}
        >
          <Tab label="Colors" />
          <Tab label="Typography" />
          <Tab label="Spacing" />
          <Tab label="Components" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 4 }}>
        {activeTab === 0 && <ColorPalette />}
        {activeTab === 1 && <TypographyGuide />}
        {activeTab === 2 && <SpacingGuide />}
        {activeTab === 3 && <ComponentsGuide />}
      </Box>
    </Container>
  );
};

export default ThemeGuide;
