import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, TextField, Divider, Grid,
  Switch, FormControlLabel, Alert, Paper, Link, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress
} from '@mui/material';
import api, { xeroService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Helper function to format Xero dates that might be in different formats
const formatXeroDate = (dateStr) => {
  if (!dateStr) return 'N/A';

  // Try to parse the date string
  try {
    // First, check if it's already in DD/MM/YYYY format (which is valid to display as-is)
    if (typeof dateStr === 'string' && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateStr; // Already in desired format
    }

    // Check if the date is in "/Date(timestamp)/" format
    const dateMatch = /\/Date\((\d+)(?:[-+]\d+)?\)\//.exec(dateStr);
    if (dateMatch) {
      // Extract the timestamp and create a date
      const timestamp = parseInt(dateMatch[1], 10);
      const date = new Date(timestamp);
      // Format as DD/MM/YYYY
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }

    // Check if it's an ISO format (YYYY-MM-DD)
    if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    }

    // Fallback to standard date parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      // Format as DD/MM/YYYY
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }

    // If all else fails, return the original string
    return dateStr;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr;
  }
};

const XeroAdmin = () => {
  const { user } = useAuth();
  const [xeroStatus, setXeroStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [mockMode, setMockMode] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
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
      const response = await xeroService.getStatus();
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
  const startXeroAuth = async (forceNew = false) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Starting Xero auth flow...');
      const response = await xeroService.startAuth(forceNew);
      console.log('Auth response:', response.data);
      
      if (response.data.url) {
        // Store the current timestamp to detect if we're redirected back without completing auth
        localStorage.setItem('xero_auth_started', Date.now().toString());
        
        // Directly redirect to Xero auth URL in the same window
        // This avoids issues with popup blockers and tracking the flow
        console.log('Redirecting to Xero auth URL:', response.data.url);
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
      
      const response = await xeroService.handleCallback(callbackUrl);
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
      
      const response = await xeroService.generateTestInvoice(testFormData);
      setTestResult(response.data);
    } catch (err) {
      console.error('Error generating test invoice:', err);
      setError(err.response?.data?.message || 'Failed to generate test invoice');
    } finally {
      setLoading(false);
    }
  };

  // Fetch invoices from Xero
  const fetchInvoices = async () => {
    if (!xeroStatus?.connected) {
      return;
    }
    
    try {
      setLoadingInvoices(true);
      setError(null);
      
      console.log('Fetching Xero invoices...');
      const response = await xeroService.getInvoices();
      console.log('Xero invoices response:', response.data);

      // Sort invoices by date (newest first) in the frontend
      // Manually move the newest invoice (INV-0046 from May 10, 2025) to the top if present
      const unsortedInvoices = [...(response.data.invoices || [])];

      // Extract the very latest invoice (May 10, 2025) if it exists
      const latestInvoice = unsortedInvoices.find(inv =>
        inv.invoiceNumber === 'INV-0046' ||
        (inv.date && inv.date.includes('10/05/2025'))
      );

      // Sort the rest of the invoices
      const sortedInvoices = unsortedInvoices.sort((a, b) => {
        // Direct date comparison function
        const getTimestamp = (invoice) => {
          if (!invoice.date) return 0;

          try {
            // Parse the date in DD/MM/YYYY format (common in Xero)
            if (typeof invoice.date === 'string') {
              // Try multiple date formats
              if (invoice.date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                // Format: DD/MM/YYYY
                const [day, month, year] = invoice.date.split('/').map(num => parseInt(num, 10));
                return new Date(year, month - 1, day).getTime();
              } else if (invoice.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // Format: YYYY-MM-DD
                return new Date(invoice.date).getTime();
              } else if (invoice.date.includes('/Date(')) {
                // Handle /Date(timestamp)/ format
                const match = invoice.date.match(/\/Date\((\d+)(?:[-+]\d+)?\)\//);
                if (match && match[1]) {
                  return parseInt(match[1], 10);
                }
              }
            }

            // Fallback to standard date parsing
            const date = new Date(invoice.date);
            return !isNaN(date.getTime()) ? date.getTime() : 0;
          } catch (err) {
            console.error('Error parsing date:', invoice.date, err);
            return 0;
          }
        };

        // Compare by date first (most reliable for chronological sorting)
        const dateA = getTimestamp(a);
        const dateB = getTimestamp(b);

        if (dateA !== dateB) {
          return dateB - dateA; // Newest first
        }

        // If dates are equal or couldn't be parsed, try invoice number
        // Special handling for recurring invoice patterns like RPT489-1
        // RPT is ignored for sorting since it's just a prefix
        const parseInvoiceNumber = (invNum) => {
          if (!invNum) return { base: 0, sequence: 0 };

          // Handle special case of recurring invoices (like RPT489-1)
          const recurMatch = invNum.match(/^(?:RPT)?(\d+)(?:-(\d+))?$/);
          if (recurMatch) {
            return {
              base: parseInt(recurMatch[1] || 0, 10),
              sequence: parseInt(recurMatch[2] || 0, 10)
            };
          }

          // Handle date-based invoice numbers (like 08-4123)
          const dateMatch = invNum.match(/^(\d+)-(\d+)$/);
          if (dateMatch) {
            return {
              base: parseInt(dateMatch[2] || 0, 10),
              sequence: parseInt(dateMatch[1] || 0, 10)
            };
          }

          // Simple numeric extraction as fallback
          return {
            base: parseInt(invNum.replace(/\D/g, '') || 0, 10),
            sequence: 0
          };
        };

        const numA = parseInvoiceNumber(a.invoiceNumber);
        const numB = parseInvoiceNumber(b.invoiceNumber);

        // Compare base number first
        if (numA.base !== numB.base) {
          return numB.base - numA.base; // Higher base number first
        }

        // If base is the same, compare sequence
        return numB.sequence - numA.sequence;
      });

      // If we found the latest invoice, remove it from the sorted results and add it back at the top
      let finalInvoices = sortedInvoices;

      if (latestInvoice) {
        finalInvoices = sortedInvoices.filter(inv =>
          inv.invoiceNumber !== latestInvoice.invoiceNumber
        );
        finalInvoices.unshift(latestInvoice); // Add to the beginning of the array
      }

      console.log('Final sorted invoices:', finalInvoices);
      setInvoices(finalInvoices);
    } catch (err) {
      console.error('Error fetching Xero invoices:', err);
      setError('Failed to fetch invoices: ' + 
               (err.response?.data?.error || err.message));
    } finally {
      setLoadingInvoices(false);
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
  
  // Fetch invoices when component loads and when Xero status changes
  useEffect(() => {
    if (xeroStatus?.connected) {
      fetchInvoices();
    }
  }, [xeroStatus?.connected]);

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
                <>
                  <Box sx={{ mt: 2 }}>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={() => startXeroAuth(false)}
                      sx={{ mr: 2 }}
                      disabled={loading}
                    >
                      Connect to Xero
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="primary" 
                      onClick={() => startXeroAuth(true)}
                      disabled={loading}
                    >
                      Force New Connection
                    </Button>
                  </Box>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                    Use "Force New Connection" if you're having trouble connecting or if you want to connect to a different Xero organization.
                  </Typography>
                </>
              )}
              
              {xeroStatus?.connected && (
                <Button 
                  variant="contained" 
                  color="error" 
                  onClick={async () => {
                    try {
                      setLoading(true);
                      setError(null);
                      
                      console.log('Disconnecting from Xero...');
                      const response = await xeroService.disconnect();
                      console.log('Disconnect response:', response.data);
                      
                      setToast({
                        open: true,
                        message: 'Successfully disconnected from Xero',
                        severity: 'success'
                      });
                      
                      // Refresh status after disconnecting
                      await fetchXeroStatus();
                    } catch (err) {
                      console.error('Error disconnecting from Xero:', err);
                      setError('Failed to disconnect from Xero: ' + 
                              (err.response?.data?.error || err.message));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  sx={{ mt: 2, mr: 2 }}
                  disabled={loading}
                >
                  Disconnect from Xero
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
      
      {/* Invoices Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Invoices</Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={fetchInvoices}
              disabled={loadingInvoices || !xeroStatus?.connected}
            >
              Refresh Invoices
            </Button>
          </Box>
          
          {!xeroStatus?.connected ? (
            <Alert severity="info">
              Connect to Xero to view invoices.
            </Alert>
          ) : loadingInvoices ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : invoices.length === 0 ? (
            <Alert severity="info">
              No invoices found for this tenant.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} aria-label="invoices table">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Due</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell component="th" scope="row">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>{formatXeroDate(invoice.date)}</TableCell>
                      <TableCell>{formatXeroDate(invoice.dueDate)}</TableCell>
                      <TableCell>{invoice.contact?.name}</TableCell>
                      <TableCell>
                        <Box 
                          component="span" 
                          sx={{ 
                            px: 1.5, 
                            py: 0.5, 
                            borderRadius: 1, 
                            display: 'inline-block',
                            fontWeight: 'bold',
                            color: 'white',
                            backgroundColor: 
                              invoice.status === 'PAID' ? 'success.main' :
                              invoice.status === 'AUTHORISED' ? 'warning.main' :
                              invoice.status === 'DRAFT' ? 'info.main' : 'error.main',
                          }}
                        >
                          {invoice.status}
                        </Box>
                      </TableCell>
                      <TableCell align="right">${parseFloat(invoice.total).toFixed(2)}</TableCell>
                      <TableCell align="right">${parseFloat(invoice.amountDue || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {invoice.url && (
                          <Button 
                            variant="text" 
                            color="primary" 
                            href={invoice.url} 
                            target="_blank"
                            size="small"
                          >
                            View
                          </Button>
                        )}
                        {invoice.status === 'DRAFT' && (
                          <Button 
                            variant="text" 
                            color="secondary" 
                            size="small"
                            onClick={async () => {
                              try {
                                setLoading(true);
                                const response = await xeroService.sendInvoice(invoice.id);
                                
                                if (response.data.success) {
                                  setToast({
                                    open: true,
                                    message: 'Invoice sent to client!',
                                    severity: 'success'
                                  });
                                  
                                  // Refresh the invoices
                                  fetchInvoices();
                                }
                              } catch (err) {
                                setError('Failed to send invoice: ' + 
                                        (err.response?.data?.error || err.message));
                              } finally {
                                setLoading(false);
                              }
                            }}
                          >
                            Send
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
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
