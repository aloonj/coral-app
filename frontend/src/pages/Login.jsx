import { Navigate, Link as RouterLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from '../components/Auth/AuthForm';
import { Container, Box, Typography, Divider, Fade } from '@mui/material';
import { PageTitle, ActionButton, FormContainer, FormError } from '../components/StyledComponents';

const Login = () => {
  const { user } = useAuth();
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
    <Container 
      maxWidth="sm"
      sx={{
        display: 'flex',
        justifyContent: 'center',
        px: { xs: 2, sm: 3 }
      }}
    >
      <Box
        sx={{
          py: 2,
          mt: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <FormContainer sx={{ width: '100%', maxWidth: '100%' }}>
          <Typography 
            variant="h4" 
            component="h1" 
            align="center" 
            gutterBottom
          >
            Login to Your Account
          </Typography>
          
          {/* Registration success message */}
          <Fade in={!!successMessage} timeout={500}>
            <Box sx={{ mb: successMessage ? 3 : 0 }}>
              {successMessage && (
                <FormError severity="success">
                  {successMessage}
                </FormError>
              )}
            </Box>
          </Fade>
          
          <AuthForm mode="login" />
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: 2
          }}>
            <Typography variant="body1" color="text.secondary">
              Don't have an account yet?
            </Typography>
            <ActionButton
              component={RouterLink}
              to="/register"
              variant="outlined"
              color="primary"
              sx={{ width: '100%' }}
            >
              Register as a Client
            </ActionButton>
          </Box>
        </FormContainer>
      </Box>
    </Container>
  );
};

export default Login;
