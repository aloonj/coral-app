import { Box, Typography, Paper, Grid, Divider, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

/**
 * ColorPalette Component
 * 
 * Displays all theme colors with their variants (main, light, dark)
 * and provides color values for reference.
 */
const ColorPalette = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Helper function to convert RGB to Hex
  const rgbToHex = (color) => {
    // If color is already in hex format, return it
    if (color.startsWith('#')) {
      return color;
    }
    
    // Extract RGB values from string like 'rgb(32, 178, 170)'
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return color;
    
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  };

  // Helper function to determine if text should be light or dark based on background
  const getContrastText = (hexColor) => {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  // Helper function to copy color value to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert(`Copied: ${text}`);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  // Color categories to display
  const colorCategories = [
    { name: 'Primary', key: 'primary' },
    { name: 'Secondary', key: 'secondary' },
    { name: 'Error', key: 'error' },
    { name: 'Warning', key: 'warning' },
    { name: 'Info', key: 'info' },
    { name: 'Success', key: 'success' },
    { name: 'Text', key: 'text' },
    { name: 'Background', key: 'background' },
  ];

  // Color variants to display for each category
  const colorVariants = [
    { name: 'Main', key: 'main' },
    { name: 'Light', key: 'light' },
    { name: 'Dark', key: 'dark' },
    { name: 'Contrast Text', key: 'contrastText' },
  ];

  // Special cases for text and background which have different keys
  const textVariants = [
    { name: 'Primary', key: 'primary' },
    { name: 'Secondary', key: 'secondary' },
    { name: 'Disabled', key: 'disabled' },
  ];

  const backgroundVariants = [
    { name: 'Default', key: 'default' },
    { name: 'Paper', key: 'paper' },
  ];

  // Color swatch component
  const ColorSwatch = ({ color, name, path }) => {
    const hexColor = rgbToHex(color);
    const textColor = getContrastText(hexColor);
    
    return (
      <Paper 
        elevation={2}
        sx={{ 
          height: '100%',
          overflow: 'hidden',
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Box 
          sx={{ 
            bgcolor: color,
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            '&:hover .copy-icon': {
              opacity: 1,
            }
          }}
          onClick={() => copyToClipboard(hexColor)}
        >
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: textColor,
              fontWeight: 'bold',
              textAlign: 'center',
              px: 1
            }}
          >
            {name}
          </Typography>
          <ContentCopyIcon 
            className="copy-icon"
            sx={{ 
              position: 'absolute',
              top: 8,
              right: 8,
              color: textColor,
              opacity: 0,
              transition: 'opacity 0.2s',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          />
        </Box>
        <Box sx={{ p: 1.5 }}>
          <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
            {hexColor}
          </Typography>
          <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
            {path}
          </Typography>
        </Box>
      </Paper>
    );
  };

  return (
    <Box>
      <Typography variant="h2" gutterBottom>Color Palette</Typography>
      <Typography variant="body1" paragraph>
        The application uses a consistent color palette defined in the theme. Click on any color to copy its hex value.
      </Typography>

      {colorCategories.map((category) => (
        <Box key={category.key} sx={{ mb: 4 }}>
          <Typography variant="h3" gutterBottom>{category.name} Colors</Typography>
          <Grid container spacing={2}>
            {category.key === 'text' ? (
              // Special case for text colors
              textVariants.map((variant) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={variant.key}>
                  <ColorSwatch 
                    color={theme.palette[category.key][variant.key]}
                    name={`${category.name} ${variant.name}`}
                    path={`theme.palette.${category.key}.${variant.key}`}
                  />
                </Grid>
              ))
            ) : category.key === 'background' ? (
              // Special case for background colors
              backgroundVariants.map((variant) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={variant.key}>
                  <ColorSwatch 
                    color={theme.palette[category.key][variant.key]}
                    name={`${category.name} ${variant.name}`}
                    path={`theme.palette.${category.key}.${variant.key}`}
                  />
                </Grid>
              ))
            ) : (
              // Standard color categories with variants
              colorVariants.map((variant) => {
                // Skip if this variant doesn't exist for this category
                if (!theme.palette[category.key][variant.key]) return null;
                
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={variant.key}>
                    <ColorSwatch 
                      color={theme.palette[category.key][variant.key]}
                      name={`${category.name} ${variant.name}`}
                      path={`theme.palette.${category.key}.${variant.key}`}
                    />
                  </Grid>
                );
              })
            )}
          </Grid>
        </Box>
      ))}

      <Box sx={{ mt: 4 }}>
        <Typography variant="h3" gutterBottom>Using Colors in Code</Typography>
        <Paper sx={{ p: 2, borderRadius: 1, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle1" gutterBottom>In the sx prop:</Typography>
          <Box 
            sx={{ 
              p: 1.5, 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              overflow: 'auto'
            }}
          >
            {`<Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }} />`}
          </Box>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>With useTheme hook:</Typography>
          <Box 
            sx={{ 
              p: 1.5, 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              overflow: 'auto'
            }}
          >
            {`import { useTheme } from '@mui/material/styles';

const MyComponent = () => {
  const theme = useTheme();
  
  return (
    <div style={{ backgroundColor: theme.palette.primary.main }}>
      Content
    </div>
  );
};`}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default ColorPalette;
