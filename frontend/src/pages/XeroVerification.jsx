import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Button } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

const XeroVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const success = queryParams.get('success');
    const error = queryParams.get('error');

    if (success === 'true') {
      setSuccess(true);
      setLoading(false);
    } else if (error) {
      setError(decodeURIComponent(error));
      setLoading(false);
    } else {
      setLoading(false);
      setError('No verification status found in URL');
    }
  }, [location]);

  const handleReturn = () => {
    navigate('/xero-admin');
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Paper elevation={3} sx={{ width: '100%', maxWidth: 600, p: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Xero Verification
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : success ? (
          <>
            <Alert severity="success" sx={{ my: 2 }}>
              Successfully connected to Xero!
            </Alert>
            <Typography paragraph>
              Your Xero account has been successfully connected. You can now use Xero integration features.
            </Typography>
          </>
        ) : (
          <>
            <Alert severity="error" sx={{ my: 2 }}>
              {error || 'Failed to connect to Xero'}
            </Alert>
            <Typography paragraph>
              There was a problem connecting to your Xero account. Please try again or contact support.
            </Typography>
          </>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={handleReturn}
          sx={{ mt: 2 }}
        >
          Return to Xero Admin
        </Button>
      </Paper>
    </Box>
  );
};

export default XeroVerification;