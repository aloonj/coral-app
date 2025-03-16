import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenStorage } from '../utils/tokenStorage';

const LoginSuccess = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      // Store token
      tokenStorage.setToken(token);
      // Redirect to dashboard
      navigate('/dashboard');
    } else {
      // No token found, redirect to login
      navigate('/login');
    }
  }, [navigate]);
  
  return (
    <div>
      <p>Logging you in...</p>
    </div>
  );
};

export default LoginSuccess;
