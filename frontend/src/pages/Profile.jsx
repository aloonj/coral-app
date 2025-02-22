import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/auth/profile');
        setProfile(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load profile');
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    // Validate password requirements
    const hasNumber = /\d/.test(passwordData.newPassword);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>_-]/.test(passwordData.newPassword);
    const isLongEnough = passwordData.newPassword.length >= 8;

    if (!isLongEnough || !hasNumber || !hasSymbol) {
      setPasswordError(
        'Password must be at least 8 characters long and contain at least one number and one symbol (!@#$%^&*(),.?":{}|<>_-)'
      );
      return;
    }

    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setSuccessMessage('Password updated successfully');
      setShowPasswordForm(false);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>{error}</div>;
  }

  const containerStyle = {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const headingStyle = {
    color: '#333',
    marginBottom: '1.5rem'
  };

  const sectionStyle = {
    marginBottom: '2rem'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#666'
  };

  const infoStyle = {
    fontSize: '1.1rem',
    color: '#333',
    padding: '0.5rem 0'
  };

  const buttonStyle = {
    backgroundColor: '#20B2AA',
    color: 'white',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'background-color 0.3s'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem'
  };

  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Profile</h1>
      
      <div style={sectionStyle}>
        <label style={labelStyle}>Email</label>
        <div style={infoStyle}>{profile?.email}</div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Name</label>
        <div style={infoStyle}>{profile?.name}</div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Role</label>
        <div style={infoStyle}>{profile?.role}</div>
      </div>

      <div style={sectionStyle}>
        {successMessage && (
          <div style={{ color: 'green', marginBottom: '1rem' }}>{successMessage}</div>
        )}
        {!showPasswordForm ? (
          <button
            style={buttonStyle}
            onClick={() => {
              setShowPasswordForm(true);
              setSuccessMessage('');
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1a9994'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#20B2AA'}
          >
            Change Password
          </button>
        ) : (
          <form onSubmit={handleSubmitPassword}>
            <h3 style={{ ...headingStyle, fontSize: '1.2rem' }}>Change Password</h3>
            
            {passwordError && (
              <div style={{ color: 'red', marginBottom: '1rem' }}>{passwordError}</div>
            )}

            <div>
              <input
                type="password"
                name="currentPassword"
                placeholder="Current Password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <input
                type="password"
                name="newPassword"
                placeholder="New Password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                style={inputStyle}
                required
              />
              <span style={{ 
                display: 'block',
                fontSize: '0.85rem', 
                color: '#666', 
                marginTop: '-0.75rem',
                marginBottom: '1rem' 
              }}>
                Password must be at least 8 characters long and contain at least one number and one symbol (!@#$%^&*(),.?":{}|&lt;&gt;_-)
              </span>
            </div>

            <div>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm New Password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                style={inputStyle}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                style={buttonStyle}
                onMouseOver={(e) => e.target.style.backgroundColor = '#1a9994'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#20B2AA'}
              >
                Update Password
              </button>
              <button
                type="button"
                style={{
                  ...buttonStyle,
                  backgroundColor: '#6c757d'
                }}
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordError('');
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;
