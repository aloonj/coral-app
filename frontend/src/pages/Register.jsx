import { Navigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from '../components/Auth/AuthForm';
import { Container, Box, Paper, Typography, useTheme, Divider } from '@mui/material';
import { PageTitle, ActionButton } from '../components/StyledComponents';
import { useColorMode } from '../theme/ThemeContext';

const Register = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const { mode } = useColorMode();
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          py: 2, // Reduced from 6 to 2
          mt: 4, // Add a top margin to push it down just enough from the top
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          // minHeight: 'calc(100vh - 64px)', // Removed to prevent full-height centering
          justifyContent: 'flex-start', // Align to top instead of center
        }}
      >
        <Paper
          elevation={6}
          sx={{
            width: '100%',
            p: 4,
            borderRadius: theme.shape.borderRadius,
            backgroundColor: theme.palette.background.paper,
            transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: theme.shadows[10],
            },
            ...(mode === 'dark' && {
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }),
          }}
        >
          <PageTitle 
            variant="h1" 
            align="center" 
            gutterBottom
            sx={{
              fontSize: { xs: '1.75rem', sm: '2rem' },
              mb: 3,
              color: theme.palette.mode === 'dark' ? '#FFFFFF' : theme.palette.text.primary,
              fontWeight: 700,
            }}
          >
            Create a Client Account
          </PageTitle>
          
          <Typography 
            variant="body1" 
            align="center" 
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            Register as a client to place orders and track your purchases
          </Typography>
          
          <AuthForm mode="register" />
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: theme.spacing(2)
          }}>
            <Typography variant="body1" color="text.secondary">
              Already have an account?
            </Typography>
            <ActionButton
              component={RouterLink}
              to="/login"
              variant="outlined"
              color="primary"
              sx={{
                width: '100%',
                py: 1,
                fontWeight: 500,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[2],
                },
              }}
            >
              Login to Your Account
            </ActionButton>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
