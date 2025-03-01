import { Box, Typography, Paper, Grid, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * SpacingGuide Component
 * 
 * Demonstrates the theme spacing system with visual examples
 * and code snippets for reference.
 */
const SpacingGuide = () => {
  const theme = useTheme();
  
  // Generate spacing values to display
  const spacingValues = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <Box>
      <Typography variant="h2" gutterBottom>Spacing</Typography>
      <Typography variant="body1" paragraph>
        Material UI provides a consistent spacing system that helps maintain visual harmony
        throughout the application. The base unit is 8px, and spacing values are multipliers of this unit.
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>Spacing Scale</Typography>
        <Typography variant="body1" paragraph>
          The following examples show the different spacing values available in the theme.
          Each box represents a spacing value from 1 to 10 (8px to 80px).
        </Typography>
        
        <Grid container spacing={2}>
          {spacingValues.map((value) => (
            <Grid item xs={12} sm={6} md={4} key={value}>
              <Paper 
                sx={{ 
                  p: 2, 
                  mb: 2, 
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`
                }}
              >
                <Typography variant="subtitle1" gutterBottom>
                  Spacing: {value} ({theme.spacing(value)})
                </Typography>
                <Box 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2
                  }}
                >
                  <Box 
                    sx={{ 
                      width: theme.spacing(value),
                      height: 20,
                      bgcolor: theme.palette.primary.main,
                      borderRadius: 0.5
                    }}
                  />
                  <Box 
                    sx={{ 
                      ml: 2,
                      flex: 1,
                      height: 20,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                      borderRadius: 0.5
                    }}
                  />
                </Box>
                <Box 
                  sx={{ 
                    p: 1.5, 
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem'
                  }}
                >
                  {`sx={{ m: ${value} }}`}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>Spacing Properties</Typography>
        <Typography variant="body1" paragraph>
          Spacing can be applied to different sides of an element using these shorthand properties:
        </Typography>
        
        <Grid container spacing={2}>
          {[
            { prop: 'm', desc: 'margin', example: 'm: 2' },
            { prop: 'mt', desc: 'margin-top', example: 'mt: 2' },
            { prop: 'mr', desc: 'margin-right', example: 'mr: 2' },
            { prop: 'mb', desc: 'margin-bottom', example: 'mb: 2' },
            { prop: 'ml', desc: 'margin-left', example: 'ml: 2' },
            { prop: 'mx', desc: 'margin-left and margin-right', example: 'mx: 2' },
            { prop: 'my', desc: 'margin-top and margin-bottom', example: 'my: 2' },
            { prop: 'p', desc: 'padding', example: 'p: 2' },
            { prop: 'pt', desc: 'padding-top', example: 'pt: 2' },
            { prop: 'pr', desc: 'padding-right', example: 'pr: 2' },
            { prop: 'pb', desc: 'padding-bottom', example: 'pb: 2' },
            { prop: 'pl', desc: 'padding-left', example: 'pl: 2' },
            { prop: 'px', desc: 'padding-left and padding-right', example: 'px: 2' },
            { prop: 'py', desc: 'padding-top and padding-bottom', example: 'py: 2' },
          ].map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.prop}>
              <Paper 
                sx={{ 
                  p: 2, 
                  height: '100%',
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`
                }}
              >
                <Typography variant="subtitle1" gutterBottom>
                  <code>{item.prop}</code>: {item.desc}
                </Typography>
                <Box 
                  sx={{ 
                    p: 1.5, 
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    mb: 1
                  }}
                >
                  {`sx={{ ${item.example} }}`}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Equivalent to: {item.desc}: {theme.spacing(2)}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h3" gutterBottom>Using Spacing in Code</Typography>
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
            {`<Box 
  sx={{ 
    mt: 2,          // margin-top: 16px
    p: 3,           // padding: 24px
    gap: 1,         // gap: 8px (for flex and grid containers)
    borderRadius: 2 // border-radius: 16px
  }}
>
  Content
</Box>`}
          </Box>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>With the useTheme hook:</Typography>
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
    <div style={{ 
      marginTop: theme.spacing(2),
      padding: theme.spacing(3)
    }}>
      Content
    </div>
  );
};`}
          </Box>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Responsive spacing:</Typography>
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
            {`<Box
  sx={{
    p: {
      xs: 1, // padding: 8px on extra-small screens and up
      sm: 2, // padding: 16px on small screens and up
      md: 3, // padding: 24px on medium screens and up
      lg: 4, // padding: 32px on large screens and up
      xl: 5, // padding: 40px on extra-large screens and up
    }
  }}
>
  Content with responsive padding
</Box>`}
          </Box>
        </Paper>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h3" gutterBottom>Spacing in Grid Components</Typography>
        <Paper sx={{ p: 2, borderRadius: 1, bgcolor: 'background.paper' }}>
          <Typography variant="body1" paragraph>
            The Grid component uses the spacing prop which is also based on the theme spacing system:
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
            {`<Grid container spacing={2}>
  <Grid item xs={12} sm={6} md={4}>
    {/* This grid item will have a margin of 8px (spacing/2) on all sides */}
    <Paper>Content</Paper>
  </Grid>
  <Grid item xs={12} sm={6} md={4}>
    <Paper>Content</Paper>
  </Grid>
</Grid>`}
          </Box>
          
          <Typography variant="body1" sx={{ mt: 2 }} paragraph>
            You can also use responsive spacing:
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
            {`<Grid 
  container 
  spacing={{ xs: 1, sm: 2, md: 3 }}
>
  {/* Grid items */}
</Grid>`}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default SpacingGuide;
