import { Navigate, Link as RouterLink } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from '../components/Auth/AuthForm';
import GoogleButton from 'react-google-button';
import { Container, Box, Typography, Divider, Fade, CircularProgress } from '@mui/material';
import { PageTitle, ActionButton, FormContainer, FormError } from '../components/StyledComponents';
import api, { API_URL } from '../services/api';

const Login = () => {
  const { user } = useAuth();
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoggingInWithGoogle, setIsLoggingInWithGoogle] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const pollingTimerRef = useRef(null);
  
  // Function to handle Google login with pre-flight check and auto-retry
  const handleGoogleLogin = useCallback(async () => {
    if (isLoggingInWithGoogle) return;
    
    setIsLoggingInWithGoogle(true);
    console.log('Starting Google login process...');
    
    // Generate a unique session ID to track this login attempt
    const sessionId = Date.now().toString();
    
    // Function to attempt the redirect to Google auth
    const attemptGoogleRedirect = () => {
      console.log(`Redirecting to Google auth (Attempt ${retryCount + 1}/${maxRetries})...`);
      // Add both a timestamp and retry counter to prevent caching
      window.location.href = `${API_URL}/auth/google?t=${Date.now()}&session=${sessionId}&retry=${retryCount}`;
    };
    
    try {
      // Make a HEAD request to check if the endpoint is actually available
      console.log('Pre-flight checking Google auth endpoint...');
      await axios.head(`${API_URL}/auth/google?preflight=true`, { 
        timeout: 2000,
        validateStatus: function (status) {
          // Consider any response (even 404) as "available" since we're just checking reachability
          return status >= 200 && status < 500;
        }
      });
      
      console.log('Pre-flight check succeeded, proceeding with redirect');
      attemptGoogleRedirect();
    } catch (error) {
      console.error('Pre-flight check failed, starting polling retries:', error);
      
      // If we can't reach the endpoint at all, start polling
      setRetryCount(prev => prev + 1);
      
      // Set up polling to retry automatically
      pollingTimerRef.current = setTimeout(() => {
        if (retryCount < maxRetries) {
          console.log(`Auto-retrying Google login (${retryCount + 1}/${maxRetries})...`);
          attemptGoogleRedirect();
        } else {
          console.log('Maximum retry attempts reached');
          setError('Unable to connect to Google login. Please try again later.');
          setIsLoggingInWithGoogle(false);
          setRetryCount(0);
        }
      }, 1000); // Retry after 1 second
    }
  }, [isLoggingInWithGoogle, retryCount, API_URL]);
  
  // Cleanup polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, []);

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
              onClick={handleGoogleLogin}
              label="Sign in with Google"
              disabled={isLoggingInWithGoogle}
            />
            {isLoggingInWithGoogle && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  {retryCount > 0 
                    ? `Connecting to Google (attempt ${retryCount}/${maxRetries})...` 
                    : 'Connecting to Google...'}
                </Typography>
              </Box>
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
