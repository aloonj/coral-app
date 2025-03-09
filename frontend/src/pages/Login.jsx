import { Navigate, Link as RouterLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from '../components/Auth/AuthForm';
import { Container, Box, Paper, Typography, useTheme, Divider, Alert, Fade } from '@mui/material';
import { PageTitle, ActionButton } from '../components/StyledComponents';
import { useColorMode } from '../theme/ThemeContext';

const Login = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const { mode } = useColorMode();
  const [successMessage, setSuccessMessage] = useState('');
  
  useEffect(() => {
    // Check for registration success message in localStorage
    const message = localStorage.getItem('registrationSuccess');
    if (message) {
      setSuccessMessage(message);
      // Remove the message from localStorage to prevent it from showing again
      localStorage.removeItem('registrationSuccess');
    }
  }, []);
  
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
            Login to Your Account
          </PageTitle>
          
          {/* Registration success message */}
          <Fade in={!!successMessage} timeout={500}>
            <Box sx={{ mb: successMessage ? 3 : 0 }}>
              {successMessage && (
                <Alert 
                  severity="success" 
                  sx={{ 
                    mb: 2,
                    '& .MuiAlert-message': {
                      fontWeight: 500
                    }
                  }}
                >
                  {successMessage}
                </Alert>
              )}
            </Box>
          </Fade>
          
          <AuthForm mode="login" />
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: theme.spacing(2)
          }}>
            <Typography variant="body1" color="text.secondary">
              Don't have an account yet?
            </Typography>
            <ActionButton
              component={RouterLink}
              to="/register"
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
              Register as a Client
            </ActionButton>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
