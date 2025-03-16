import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenStorage } from '../utils/tokenStorage';

const LoginSuccess = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');
    
    if (token) {
      // Store token
      tokenStorage.setToken(token);
      // Redirect to dashboard
      navigate('/dashboard');
    } else {
      // No token found, redirect to login with error message
      const errorMessage = error || 'Authentication failed. Please try again.';
      navigate(`/login?error=${encodeURIComponent(errorMessage)}`);
    }
  }, [navigate]);
  
  return (
    <div>
      <p>Logging you in...</p>
    </div>
  );
};

export default LoginSuccess;
