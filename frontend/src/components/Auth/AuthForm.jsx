import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { useTheme } from '@mui/material/styles';
import { 
  FormContainer, 
  FormField, 
  FormError, 
  SubmitButton 
} from '../StyledComponents';
import { CircularProgress, Typography, Link } from '@mui/material';

const AuthForm = ({ mode = 'login' }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const theme = useTheme();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const response = await authService.login({
          email: formData.email,
          password: formData.password,
        });
        login(response.data.user, response.data.token);
        navigate('/dashboard');
      } else {
        await authService.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });
        navigate('/login');
      }
    } catch (error) {
      // Log only non-sensitive information about the error
      if (error.response) {
        console.error('Auth request failed:', {
          status: error.response.status,
          statusText: error.response.statusText,
          message: error.response.data?.message
        });
      } else if (error.request) {
        console.error('No response received from server');
      } else {
        console.error('Error setting up auth request');
      }
      
      setError(
        error.response?.data?.message || 
        (error.request ? 'Unable to reach the server. Please try again later.' : 'Unable to complete request. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  // Registration toggle removed as per requirements

  return (
    <FormContainer>
      {error && (
        <FormError severity="error">{error}</FormError>
      )}
      
      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <FormField
            id="name"
            name="name"
            label="Name"
            variant="outlined"
            fullWidth
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your name"
            required
            autoComplete="name"
          />
        )}

        <FormField
          id="email"
          name="email"
          type="email"
          label="Email"
          variant="outlined"
          fullWidth
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email"
          required
          autoComplete="email"
        />

        <FormField
          id="password"
          name="password"
          type="password"
          label="Password"
          variant="outlined"
          fullWidth
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your password"
          required
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        <SubmitButton
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
          fullWidth
          disableElevation
        >
          {loading ? <CircularProgress size={24} /> : mode === 'login' ? 'Login' : 'Register'}
        </SubmitButton>
        
        {/* Registration link removed as per requirements */}
      </form>
    </FormContainer>
  );
};

export default AuthForm;
