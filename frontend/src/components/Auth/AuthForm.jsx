import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';

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
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '0 20px' }}>
      {error && (
        <div style={{ color: 'red', marginBottom: '20px', textAlign: 'center' }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {mode === 'register' && (
          <div>
            <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>Name</label>
            <input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>
        )}

        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#319795',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Loading...' : mode === 'login' ? 'Login' : 'Register'}
        </button>

      </form>
    </div>
  );
};

export default AuthForm;
