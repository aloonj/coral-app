import { Box, Typography, Paper, Grid, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * TypographyGuide Component
 * 
 * Displays all typography variants defined in the theme
 * and provides examples of how to use them.
 */
const TypographyGuide = () => {
  const theme = useTheme();

  // Typography variants to display
  const typographyVariants = [
    { variant: 'h1', description: 'Main headings, page titles' },
    { variant: 'h2', description: 'Section headings' },
    { variant: 'h3', description: 'Subsection headings' },
    { variant: 'h4', description: 'Card titles, smaller section headings' },
    { variant: 'h5', description: 'Small headings' },
    { variant: 'h6', description: 'Very small headings' },
    { variant: 'subtitle1', description: 'Slightly emphasized text' },
    { variant: 'subtitle2', description: 'Smaller emphasized text' },
    { variant: 'body1', description: 'Default body text' },
    { variant: 'body2', description: 'Smaller body text' },
    { variant: 'button', description: 'Button text' },
    { variant: 'caption', description: 'Very small text, captions' },
    { variant: 'overline', description: 'Small uppercase text, labels' },
  ];

  // Extract typography properties for a variant
  const getTypographyProps = (variant) => {
    const variantProps = theme.typography[variant];
    
    // Filter out only the properties we want to display
    const relevantProps = [
      'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 
      'letterSpacing', 'textTransform', 'color'
    ];
    
    return Object.keys(variantProps || {})
      .filter(key => relevantProps.includes(key))
      .reduce((obj, key) => {
        obj[key] = variantProps[key];
        return obj;
      }, {});
  };

  return (
    <Box>
      <Typography variant="h2" gutterBottom>Typography</Typography>
      <Typography variant="body1" paragraph>
        The application uses a consistent typography system defined in the theme. 
        This guide shows all available typography variants and how to use them.
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>Typography Variants</Typography>
        
        {typographyVariants.map((item) => {
          const props = getTypographyProps(item.variant);
          
          return (
            <Paper 
              key={item.variant} 
              sx={{ 
                p: 2, 
                mb: 2, 
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant={item.variant}>
                      {`Typography variant="${item.variant}"`}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box 
                    sx={{ 
                      p: 1.5, 
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      height: '100%',
                      overflow: 'auto'
                    }}
                  >
                    {Object.entries(props).map(([key, value]) => (
                      <Box key={key} sx={{ mb: 0.5 }}>
                        <Typography variant="caption" component="span" sx={{ color: theme.palette.primary.main }}>
                          {key}:
                        </Typography>{' '}
                        <Typography variant="caption" component="span">
                          {typeof value === 'string' ? `"${value}"` : value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          );
        })}
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h3" gutterBottom>Using Typography in Code</Typography>
        <Paper sx={{ p: 2, borderRadius: 1, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle1" gutterBottom>Basic usage:</Typography>
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
            {`<Typography variant="h1">Page Title</Typography>
<Typography variant="body1">Regular text content</Typography>`}
          </Box>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>With additional props:</Typography>
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
            {`<Typography 
  variant="h2" 
  color="primary.main" 
  gutterBottom 
  align="center"
>
  Centered Heading with Bottom Margin
</Typography>`}
          </Box>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Changing the rendered element:</Typography>
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
            {`// This will render an h1 element with body1 styling
<Typography variant="body1" component="h1">
  Text with body1 styling but rendered as an h1 element
</Typography>`}
          </Box>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>With the sx prop:</Typography>
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
            {`<Typography 
  variant="body1" 
  sx={{ 
    fontWeight: 'bold',
    textDecoration: 'underline',
    '&:hover': {
      color: 'primary.main'
    }
  }}
>
  Custom styled text
</Typography>`}
          </Box>
        </Paper>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h3" gutterBottom>Font Family</Typography>
        <Paper sx={{ p: 2, borderRadius: 1, bgcolor: 'background.paper' }}>
          <Typography variant="body1" paragraph>
            The application uses the following font family:
          </Typography>
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
            {theme.typography.fontFamily}
          </Box>
          
          <Typography variant="body1" sx={{ mt: 2 }} paragraph>
            To use a different font for a specific element:
          </Typography>
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
            {`<Typography sx={{ fontFamily: 'monospace' }}>
  This text uses a monospace font
</Typography>`}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default TypographyGuide;
