import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { useTheme } from '@mui/material/styles';
import { 
  FormField, 
  FormError, 
  SubmitButton 
} from '../StyledComponents';
import { CircularProgress, Box, Fade } from '@mui/material';
import { useColorMode } from '../../theme/ThemeContext';

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
  const { mode: themeMode } = useColorMode();

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
            sx={{
              mb: 2.5,
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                  borderWidth: 2,
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: theme.palette.primary.main,
              },
            }}
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
          sx={{
            mb: 2.5,
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: theme.palette.primary.main,
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                borderWidth: 2,
              },
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: theme.palette.primary.main,
            },
          }}
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
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: theme.palette.primary.main,
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                borderWidth: 2,
              },
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: theme.palette.primary.main,
            },
          }}
        />

        <SubmitButton
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
          fullWidth
          sx={{
            py: 1.2,
            fontWeight: 600,
            fontSize: '1rem',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: theme.shadows[4],
            },
            '&:active': {
              transform: 'translateY(0)',
              boxShadow: theme.shadows[2],
            },
            ...(themeMode === 'dark' && {
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
            }),
          }}
        >
          {loading ? <CircularProgress size={24} /> : mode === 'login' ? 'Login' : 'Register'}
        </SubmitButton>
      </form>
    </Box>
  );
};

export default AuthForm;
