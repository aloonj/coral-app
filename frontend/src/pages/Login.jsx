import { Navigate, Link as RouterLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from '../components/Auth/AuthForm';
import GoogleButton from 'react-google-button';
import { Container, Box, Typography, Divider, Fade } from '@mui/material';
import { PageTitle, ActionButton, FormContainer, FormError } from '../components/StyledComponents';
import api, { API_URL } from '../services/api';

const Login = () => {
  const { user } = useAuth();
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  
  useEffect(() => {
    // Check for registration success message in localStorage
    const message = localStorage.getItem('registrationSuccess');
    if (message) {
      setSuccessMessage(message);
      // Remove the message from localStorage to prevent it from showing again
      localStorage.removeItem('registrationSuccess');
    }
    
    // Check for error parameter in URL
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    
    if (errorParam) {
      if (errorParam === 'google_auth_failed') {
        setError('Google login failed. No account found with this email.');
      } else if (errorParam.includes('pending approval')) {
        setError('Your account is pending approval. Please contact an administrator.');
      } else {
        // Use the error message directly from the URL if available
        setError(decodeURIComponent(errorParam));
      }
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
          
          {/* Error message */}
          <Fade in={!!error} timeout={500}>
            <Box sx={{ mb: error ? 3 : 0 }}>
              {error && (
                <FormError severity="error">
                  {error}
                </FormError>
              )}
            </Box>
          </Fade>
          
          <AuthForm mode="login" />
          
          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
              OR
            </Typography>
          </Divider>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <GoogleButton 
              onClick={() => {
                // Use the google-login route which redirects to the OAuth flow
                console.log('Initiating Google login, redirecting to:', `${API_URL}/auth/google-login`);
                window.location.href = `${API_URL}/auth/google-login`;
              }}
              label="Sign in with Google"
            />
          </Box>
          
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
