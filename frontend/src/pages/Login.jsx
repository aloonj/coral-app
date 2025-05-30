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
  
  // Simplified Google login function with minimal overhead
  const handleGoogleLogin = useCallback(() => {
    if (isLoggingInWithGoogle) return;
    
    setIsLoggingInWithGoogle(true);
    console.log('Starting Google login process...');
    
    // Direct approach - just redirect to Google auth with a timestamp to prevent caching
    console.log('Redirecting to Google auth immediately...');
    
    // Add timestamp to prevent caching
    const authUrl = `${API_URL}/auth/google?t=${Date.now()}`;
    console.log('Redirecting to:', authUrl);
    
    // Use direct window.location for most reliable redirect
    window.location.href = authUrl;
  }, [isLoggingInWithGoogle, API_URL]);
  
  // Cleanup polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, []);

  // Preload/warm up the Google callback endpoint to prevent 404 errors
  useEffect(() => {
    console.log('Warming up Google callback endpoint...');
    // Use HEAD to avoid loading actual response data
    fetch(`${API_URL}/auth/google/callback`, { 
      method: 'HEAD',
      credentials: 'same-origin',
      cache: 'no-store' // Ensure we don't use a cached response
    }).then(() => {
      console.log('Google callback endpoint warmed up successfully');
    }).catch(error => {
      // Ignore errors, even 404s are fine here as we just want the server to load the handler
      console.log('Google callback endpoint preloaded (endpoint may have returned error)');
    });
  }, [API_URL]);

  // Listen for Google callback URL 404 errors and automatically reload the page
  useEffect(() => {
    // Create a function to intercept Google callback navigation events
    // This is needed because the backend might initially return 404 for callback URLs
    function handleCallbackDetection(event) {
      const url = event.target.location?.href || '';
      
      // Check if this is a callback URL returning from Google
      if (url.includes('/api/auth/google/callback') && url.includes('code=')) {
        console.log('Detected Google callback URL:', url);
        
        // We need to give the page a chance to load first to see if it fails
        // If it's a 404, we'll detect it via the next check
        localStorage.setItem('google_callback_detected', url);
      }
    }
    
    // Listen for page load events to detect 404s on callback URLs
    function handlePageLoad() {
      // Check if we recently detected a callback URL
      const callbackUrl = localStorage.getItem('google_callback_detected');
      if (callbackUrl) {
        // Clean up immediately
        localStorage.removeItem('google_callback_detected');
        
        // Check if current page might be a 404 (we're back at login with no token)
        if (window.location.pathname.includes('/login') && !window.location.search.includes('token=')) {
          console.log('Detected 404 on Google callback - reloading callback URL:', callbackUrl);
          // Force reload of the callback URL to retry
          window.location.href = callbackUrl;
        }
      }
    }
    
    // Set up event listeners
    window.addEventListener('hashchange', handleCallbackDetection);
    window.addEventListener('popstate', handleCallbackDetection);
    window.addEventListener('load', handlePageLoad);
    
    // Initial check on component mount
    handlePageLoad();
    
    // Cleanup
    return () => {
      window.removeEventListener('hashchange', handleCallbackDetection);
      window.removeEventListener('popstate', handleCallbackDetection);
      window.removeEventListener('load', handlePageLoad);
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
