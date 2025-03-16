import { Navigate, Link as RouterLink } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
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
  const [googleLoginAttempt, setGoogleLoginAttempt] = useState(0);
  const googleLoginTimerRef = useRef(null);
  
  // Effect to handle Google auth retry logic
  useEffect(() => {
    if (googleLoginAttempt > 0) {
      // Clear any existing timer
      if (googleLoginTimerRef.current) {
        clearTimeout(googleLoginTimerRef.current);
      }
      
      // Set a timer to check if we're still on the login page (which would indicate failure)
      googleLoginTimerRef.current = setTimeout(() => {
        // If we're still on the login page, retry the Google login
        if (window.location.pathname.includes('/login')) {
          console.log(`Google login attempt ${googleLoginAttempt} failed or timed out, retrying...`);
          // Retry the login with a forced reload parameter to bypass any caching
          window.location.href = `${API_URL}/auth/google?retry=${Date.now()}`;
        }
      }, 800); // 800ms is enough time to detect a failed request but not so long that it feels slow
    }

    // Cleanup function to clear the timer if component unmounts
    return () => {
      if (googleLoginTimerRef.current) {
        clearTimeout(googleLoginTimerRef.current);
      }
    };
  }, [googleLoginAttempt]);

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
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, flexDirection: 'column', alignItems: 'center' }}>
            <GoogleButton 
              onClick={() => {
                // Increment the attempt counter to trigger the retry effect
                setGoogleLoginAttempt(prev => prev + 1);
                
                // Use the google route directly to start the OAuth flow
                // Add a unique timestamp to prevent caching
                console.log('Initiating Google login, redirecting to:', `${API_URL}/auth/google?t=${Date.now()}`);
                window.location.href = `${API_URL}/auth/google?t=${Date.now()}`;
              }}
              label="Sign in with Google"
              disabled={googleLoginAttempt > 0}
            />
            {googleLoginAttempt > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Connecting to Google...
              </Typography>
            )}
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
