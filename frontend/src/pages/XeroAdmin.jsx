import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, TextField, Divider, Grid, Switch, FormControlLabel, Alert, Paper, Link, Snackbar } from '@mui/material';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const XeroAdmin = () => {
  const { user } = useAuth();
  const [xeroStatus, setXeroStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [mockMode, setMockMode] = useState(true);
  const [testFormData, setTestFormData] = useState({
    clientName: 'Test Client',
    clientEmail: 'test@example.com',
    clientPhone: '555-123-4567',
    item1Name: 'Test Coral 1',
    item1Quantity: 2,
    item1Price: 29.99,
    includeSecondItem: true,
    item2Name: 'Test Coral 2',
    item2Quantity: 1,
    item2Price: 49.99,
    sendToClient: false
  });
  const [testResult, setTestResult] = useState(null);

  // Fetch Xero status
  const fetchXeroStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching Xero status...');
      const response = await api.get('/xero/status');
      console.log('Xero status response:', response.data);
      
      // If there was a token refresh, show notification
      if (response.data.refreshed) {
        setToast({
          open: true,
          message: 'Xero connection refreshed successfully',
          severity: 'success'
        });
      }
      
      setXeroStatus(response.data);
    } catch (err) {
      console.error('Error fetching Xero status:', err);
      setError('Failed to fetch Xero connection status: ' + 
               (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Start Xero auth flow
  const startXeroAuth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Starting Xero auth flow...');
      const response = await api.get('/xero/auth');
      console.log('Auth response:', response.data);
      
      if (response.data.url) {
        // Directly redirect to Xero auth URL in the same window
        // This avoids issues with popup blockers and tracking the flow
        window.location.href = response.data.url;
      } else if (response.data.error) {
        console.error('Error response from server:', response.data);
        setError(response.data.error || response.data.message || 'Unknown error');
      } else {
        setError('No authorization URL returned from server');
      }
    } catch (err) {
      console.error('Error starting Xero auth:', err);
      
      // Extract error message from response if available
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Failed to start Xero authorization';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Submit Xero callback URL
  const submitCallbackUrl = async (callbackUrl) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Submitting callback URL:', callbackUrl);
      
      const response = await api.post('/xero/callback', { url: callbackUrl });
      console.log('Callback response:', response.data);
      
      // Show success message
      if (response.data.success) {
        setToast({
          open: true,
          message: response.data.message || 'Successfully connected to Xero!',
          severity: 'success'
        });
      }
      
      // Refresh status after callback
      await fetchXeroStatus();
      
      return response.data;
    } catch (err) {
      console.error('Error submitting callback URL:', err);
      
      // Extract detailed error information
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Failed to process Xero callback';
                          
      const errorDetails = err.response?.data?.details || '';
      
      setError(`${errorMessage}${errorDetails ? ': ' + errorDetails : ''}`);
      
      return { 
        error: errorMessage,
        details: errorDetails
      };
    } finally {
      setLoading(false);
    }
  };

  // Generate test invoice
  const generateTestInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      setTestResult(null);
      
      const response = await api.post('/xero/test/invoice', testFormData);
      setTestResult(response.data);
    } catch (err) {
      console.error('Error generating test invoice:', err);
      setError(err.response?.data?.message || 'Failed to generate test invoice');
    } finally {
      setLoading(false);
    }
  };

  // Handle test form input changes
  const handleTestFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTestFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Check for URL parameters that might indicate a Xero redirect
  useEffect(() => {
    // Parse URL params to check for Xero redirect results
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const errorMsg = urlParams.get('error');
    
    if (success === 'true') {
      setToast({
        open: true,
        message: 'Successfully connected to Xero!',
        severity: 'success'
      });
      // Remove the query parameters to avoid showing the message again on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
      // Remove the query parameters to avoid showing the message again on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Load Xero status on component mount
    fetchXeroStatus();
  }, []);

  if (!user || !['ADMIN', 'SUPERADMIN'].includes(user.role)) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">Access Denied</Typography>
        <Typography>You do not have permission to access this page.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Xero Integration Admin</Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      {/* Connection Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Connection Status</Typography>
          {loading ? (
            <Typography>Loading status...</Typography>
          ) : (
            <>
              <Typography color={xeroStatus?.connected ? 'success.main' : 'error.main'} sx={{ fontWeight: 'bold', mb: 1 }}>
                {xeroStatus?.connected ? 'Connected' : 'Not Connected'}
              </Typography>
              
              {xeroStatus?.message && (
                <Typography sx={{ mb: 1 }}>{xeroStatus.message}</Typography>
              )}
              
              {xeroStatus?.organization && (
                <Typography sx={{ mb: 1 }}>Organization: {xeroStatus.organization}</Typography>
              )}
              
              {xeroStatus?.tenantId && (
                <Typography sx={{ mb: 1 }}>Tenant ID: {xeroStatus.tenantId}</Typography>
              )}
              
              {!xeroStatus?.connected && (
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={startXeroAuth}
                  sx={{ mt: 2 }}
                  disabled={loading}
                >
                  Connect to Xero
                </Button>
              )}
              
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={fetchXeroStatus}
                sx={{ mt: 2, ml: xeroStatus?.connected ? 0 : 2 }}
                disabled={loading}
              >
                Refresh Status
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Callback URL Submission (for authentication flow) */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Authentication Callback</Typography>
          <Typography sx={{ mb: 2 }}>
            After connecting to Xero, you will be redirected to a page with a URL. 
            Copy that entire URL and paste it here to complete the connection.
          </Typography>
          
          <TextField
            label="Callback URL"
            fullWidth
            placeholder="Paste the callback URL here"
            id="callbackUrl"
            sx={{ mb: 2 }}
          />
          
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              const url = document.getElementById('callbackUrl').value;
              if (url) {
                submitCallbackUrl(url);
              } else {
                setError('Please enter a callback URL');
              }
            }}
            disabled={loading}
          >
            Submit Callback
          </Button>
        </CardContent>
      </Card>
      
      {/* Test Invoice Generator */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Test Invoice Generator</Typography>
          
          <Divider sx={{ mb: 3 }} />
          
          {/* Client Information */}
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Client Information</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Client Name"
                fullWidth
                name="clientName"
                value={testFormData.clientName}
                onChange={handleTestFormChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Client Email"
                fullWidth
                name="clientEmail"
                value={testFormData.clientEmail}
                onChange={handleTestFormChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Client Phone"
                fullWidth
                name="clientPhone"
                value={testFormData.clientPhone}
                onChange={handleTestFormChange}
              />
            </Grid>
          </Grid>
          
          <Divider sx={{ mb: 3 }} />
          
          {/* Item 1 */}
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Item 1</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Item Name"
                fullWidth
                name="item1Name"
                value={testFormData.item1Name}
                onChange={handleTestFormChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Quantity"
                fullWidth
                name="item1Quantity"
                type="number"
                value={testFormData.item1Quantity}
                onChange={handleTestFormChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Price"
                fullWidth
                name="item1Price"
                type="number"
                step="0.01"
                value={testFormData.item1Price}
                onChange={handleTestFormChange}
              />
            </Grid>
          </Grid>
          
          {/* Include Second Item Switch */}
          <FormControlLabel
            control={
              <Switch
                checked={testFormData.includeSecondItem}
                onChange={handleTestFormChange}
                name="includeSecondItem"
              />
            }
            label="Include Second Item"
            sx={{ mb: 2 }}
          />
          
          {/* Item 2 (conditional) */}
          {testFormData.includeSecondItem && (
            <>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>Item 2</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Item Name"
                    fullWidth
                    name="item2Name"
                    value={testFormData.item2Name}
                    onChange={handleTestFormChange}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Quantity"
                    fullWidth
                    name="item2Quantity"
                    type="number"
                    value={testFormData.item2Quantity}
                    onChange={handleTestFormChange}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Price"
                    fullWidth
                    name="item2Price"
                    type="number"
                    step="0.01"
                    value={testFormData.item2Price}
                    onChange={handleTestFormChange}
                  />
                </Grid>
              </Grid>
            </>
          )}
          
          <Divider sx={{ mb: 3 }} />
          
          {/* Invoice Options */}
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Invoice Options</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={testFormData.sendToClient}
                onChange={handleTestFormChange}
                name="sendToClient"
              />
            }
            label="Send Invoice to Client"
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained" 
              color="primary"
              onClick={generateTestInvoice}
              disabled={loading || !xeroStatus?.connected}
            >
              Generate Test Invoice
            </Button>
          </Box>
        </CardContent>
      </Card>
      
      {/* Test Results */}
      {testResult && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Test Results</Typography>
            
            <Alert severity="success" sx={{ mb: 3 }}>
              {testResult.message}
            </Alert>
            
            {testResult.invoice && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Invoice Details</Typography>
                <Typography sx={{ mb: 1 }}>Invoice ID: {testResult.invoice.id}</Typography>
                <Typography sx={{ mb: 1 }}>Invoice Number: {testResult.invoice.invoiceNumber}</Typography>
                <Typography sx={{ mb: 1 }}>Reference: {testResult.invoice.reference}</Typography>
                <Typography sx={{ mb: 1 }}>Total: ${testResult.invoice.total}</Typography>
                
                {testResult.invoice.url && (
                  <Link href={testResult.invoice.url} target="_blank" rel="noreferrer">
                    View Invoice Online
                  </Link>
                )}
              </Paper>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setToast({ ...toast, open: false })} 
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default XeroAdmin;