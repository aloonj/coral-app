import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { 
  FormField, 
  FormError, 
  SubmitButton 
} from '../StyledComponents';
import { CircularProgress, Box, Fade, FormHelperText } from '@mui/material';

const AuthForm = ({ mode = 'login' }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

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

    // Check if passwords match for registration
    if (mode === 'register' && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        const response = await authService.login({
          email: formData.email,
          password: formData.password,
        });
        login(response.data.user, response.data.token);
        navigate('/dashboard');
      } else {
        const response = await authService.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          address: formData.address,
        });
        
        // Store registration success message in localStorage
        if (response && response.data && response.data.message) {
          localStorage.setItem('registrationSuccess', response.data.message);
        } else {
          localStorage.setItem('registrationSuccess', 'Registration successful! You can now log in.');
        }
        
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

  return (
    <Box sx={{ width: '100%' }}>
      <Fade in={!!error} timeout={300}>
        <Box sx={{ mb: error ? 2 : 0 }}>
          {error && (
            <FormError severity="error">{error}</FormError>
          )}
        </Box>
      </Fade>
      
      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <>
            <FormField
              id="name"
              name="name"
              label="Name/Shop Name"
              variant="outlined"
              fullWidth
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name or shop name"
              required
              autoComplete="name"
              sx={{ mb: 2.5 }}
            />
            
            <FormField
              id="phone"
              name="phone"
              label="Phone Number"
              variant="outlined"
              fullWidth
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
              required
              autoComplete="tel"
              sx={{ mb: 2.5 }}
            />
            
            <FormField
              id="address"
              name="address"
              label="Address"
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter your address"
              required
              autoComplete="street-address"
              sx={{ mb: 2.5 }}
            />
          </>
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
          sx={{ mb: 2.5 }}
        />

        <Box sx={{ mb: mode === 'register' ? 1 : 3 }}>
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
          
          {mode === 'register' && (
            <FormHelperText sx={{ mt: 1, mb: 2, color: 'text.secondary' }}>
              Password must be at least 8 characters long and include at least one number and one special character (!@#$%^&*(),.?":{}|&lt;&gt;_-).
            </FormHelperText>
          )}
        </Box>

        {mode === 'register' && (
          <Box sx={{ mb: 3 }}>
            <FormField
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="Confirm Password"
              variant="outlined"
              fullWidth
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
            />
          </Box>
        )}

        <SubmitButton
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
          fullWidth
          sx={{
            py: 1.2,
            fontWeight: 600,
            fontSize: '1rem'
          }}
        >
          {loading ? <CircularProgress size={24} /> : mode === 'login' ? 'Login' : 'Register'}
        </SubmitButton>
      </form>
    </Box>
  );
};

export default AuthForm;
