import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenStorage } from '../utils/tokenStorage';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, CircularProgress } from '@mui/material';

const LoginSuccess = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('Processing login...');
  
  useEffect(() => {
    const processLogin = async () => {
      try {
        // Get URL parameters
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const error = params.get('error');
        
        console.log('LoginSuccess: URL parameters', { 
          hasToken: !!token, 
          hasError: !!error,
          error: error || 'none'
        });
        
        if (token) {
          setStatus('Token received, storing...');
          console.log('LoginSuccess: Storing token');
          
          // Store token
          tokenStorage.setToken(token);
          
          try {
            // Decode token to get user data (JWT is base64 encoded)
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const userData = JSON.parse(jsonPayload);
            console.log('LoginSuccess: Decoded token payload', userData);
            
            // Use the login function from AuthContext to set user state
            if (userData) {
              setStatus('Setting up user session...');
              login(userData, token);
            }
          } catch (decodeError) {
            console.error('LoginSuccess: Error decoding token', decodeError);
          }
          
          // Redirect to dashboard
          setStatus('Redirecting to dashboard...');
          setTimeout(() => navigate('/dashboard'), 500);
        } else {
          // No token found, redirect to login with error message
          setStatus('Authentication failed, redirecting...');
          const errorMessage = error || 'Authentication failed. Please try again.';
          console.log('LoginSuccess: No token, redirecting with error', errorMessage);
          setTimeout(() => navigate(`/login?error=${encodeURIComponent(errorMessage)}`), 500);
        }
      } catch (e) {
        console.error('LoginSuccess: Unexpected error', e);
        setStatus('An error occurred. Redirecting to login...');
        setTimeout(() => navigate('/login?error=Unexpected+error+during+login'), 500);
      }
    };
    
    processLogin();
  }, [navigate, login]);
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 3,
        textAlign: 'center'
      }}
    >
      <CircularProgress size={60} sx={{ mb: 3 }} />
      <Typography variant="h5" gutterBottom>
        {status}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Please wait while we complete your authentication...
      </Typography>
    </Box>
  );
};

export default LoginSuccess;
