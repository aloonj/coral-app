import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Button, TextField } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

const XeroVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [callbackUrl, setCallbackUrl] = useState('');

  useEffect(() => {
    // Check if this is a callback from Xero
    const fullUrl = window.location.href;
    console.log('Current URL:', fullUrl);
    
    // If the URL contains 'code=' it's likely a Xero callback
    if (fullUrl.includes('code=')) {
      setCallbackUrl(fullUrl);
      handleXeroCallback(fullUrl);
    } else {
      // Check for simple success/error params
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
    }
  }, [location]);

  const handleXeroCallback = async (url) => {
    try {
      setProcessing(true);
      console.log('Processing Xero callback URL:', url);
      
      const response = await api.post('/xero/callback', { url });
      console.log('Callback response:', response.data);
      
      setSuccess(true);
      setError(null);
    } catch (err) {
      console.error('Error processing Xero callback:', err);
      setError(err.response?.data?.message || 'Failed to process Xero callback');
      setSuccess(false);
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!callbackUrl) {
      setError('Please enter the callback URL');
      return;
    }
    
    await handleXeroCallback(callbackUrl);
  };

  const handleReturn = () => {
    navigate('/xero-admin');
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Paper elevation={3} sx={{ width: '100%', maxWidth: 600, p: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Xero Verification
        </Typography>

        {loading || processing ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4, flexDirection: 'column', alignItems: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>
              {processing ? 'Processing Xero authentication...' : 'Loading...'}
            </Typography>
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
              There was a problem connecting to your Xero account. You can try manually entering the callback URL below.
            </Typography>
            
            <TextField
              label="Callback URL"
              fullWidth
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
              placeholder="Paste the full callback URL here"
              sx={{ mb: 2 }}
            />
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleManualSubmit}
              disabled={!callbackUrl || processing}
              sx={{ mb: 2 }}
            >
              Submit Callback URL
            </Button>
          </>
        )}

        <Button
          variant="contained"
          color={success ? 'primary' : 'secondary'}
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
