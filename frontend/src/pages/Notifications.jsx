import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/api';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useTheme
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Pending as PendingIcon,
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  CleaningServices as CleanupIcon,
  Send as SendIcon
} from '@mui/icons-material';
import ConfirmationDialog from '../components/ConfirmationDialog';
import StatusMessage from '../components/StatusMessage';
import ActionButtonGroup from '../components/ActionButtonGroup';

const Notifications = () => {
  const theme = useTheme();
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cleanupDays, setCleanupDays] = useState(30);
  const [testLoading, setTestLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const fetchQueueStatus = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getQueueStatus();
      setQueueStatus(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch notification queue status');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (ids) => {
    try {
      await notificationService.retryNotifications(Array.isArray(ids) ? ids : [ids]);
      await fetchQueueStatus();
    } catch (err) {
      setError('Failed to retry notifications');
      console.error('Error:', err);
    }
  };

  const handleTestNotification = async () => {
    try {
      setTestLoading(true);
      await notificationService.sendTestNotification();
      setError(null);
    } catch (err) {
      setError('Failed to send test notification');
      console.error('Error:', err);
    } finally {
      setTestLoading(false);
    }
  };

  const handleCleanup = async () => {
    try {
      await notificationService.cleanupNotifications(cleanupDays);
      await fetchQueueStatus();
    } catch (err) {
      setError('Failed to cleanup notifications');
      console.error('Error:', err);
    }
  };

  const handleDeleteAll = async () => {
    setConfirmDialog({
      open: true,
      title: 'Delete All Notifications',
      message: 'Are you sure you want to delete ALL notifications, including pending ones? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await notificationService.deleteAllNotifications();
          // Reset queue status immediately to show empty state
          setQueueStatus({
            status: {
              pending: 0,
              processing: 0,
              completed_24h: 0,
              failed: 0
            },
            recentFailures: []
          });
          // Then fetch latest status
          await fetchQueueStatus();
        } catch (err) {
          setError('Failed to delete all notifications');
          console.error('Error:', err);
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
  };

  const handleCloseDialog = () => {
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  useEffect(() => {
    fetchQueueStatus();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchQueueStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !queueStatus) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <NotificationsIcon sx={{ mr: 1 }} /> Notification Queue
      </Typography>
      
      <StatusMessage error={error} />
      
      {/* Status Overview */}
      <Grid container spacing={2} sx={{ my: 3 }}>
        <Grid item xs={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
            <PendingIcon sx={{ color: theme.palette.warning.main, fontSize: 40 }} />
            <Typography variant="h6" component="h3" color="text.secondary">
              Pending
            </Typography>
            <Typography variant="h4" component="p" fontWeight="bold">
              {queueStatus?.status.pending || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
            <SyncIcon sx={{ color: theme.palette.info.main, fontSize: 40 }} />
            <Typography variant="h6" component="h3" color="text.secondary">
              Processing
            </Typography>
            <Typography variant="h4" component="p" fontWeight="bold">
              {queueStatus?.status.processing || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
            <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 40 }} />
            <Typography variant="h6" component="h3" color="text.secondary">
              Completed (24h)
            </Typography>
            <Typography variant="h4" component="p" fontWeight="bold">
              {queueStatus?.status.completed_24h || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
            <ErrorIcon sx={{ color: theme.palette.error.main, fontSize: 40 }} />
            <Typography variant="h6" component="h3" color="text.secondary">
              Failed
            </Typography>
            <Typography variant="h4" component="p" fontWeight="bold" color="error">
              {queueStatus?.status.failed || 0}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Failures */}
      {queueStatus?.recentFailures?.length > 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Recent Failures
          </Typography>
          <TableContainer>
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Error</TableCell>
                  <TableCell>Attempts</TableCell>
                  <TableCell>Last Attempt</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queueStatus.recentFailures.map((failure) => (
                  <TableRow key={failure.id} hover>
                    <TableCell>{failure.type}</TableCell>
                    <TableCell>{failure.error}</TableCell>
                    <TableCell>{failure.attempts}</TableCell>
                    <TableCell>{new Date(failure.lastAttempt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="info"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={() => handleRetry(failure.id)}
                      >
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <ActionButtonGroup sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<RefreshIcon />}
              onClick={() => handleRetry(queueStatus.recentFailures.map(f => f.id))}
            >
              Retry All Failed
            </Button>
          </ActionButtonGroup>
        </Paper>
      )}

      {/* Cleanup Section */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Cleanup
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
          mb: 2
        }}>
          <TextField
            type="number"
            label="Days"
            variant="outlined"
            size="small"
            inputProps={{ min: 1, max: 365 }}
            value={cleanupDays}
            onChange={(e) => setCleanupDays(Number(e.target.value))}
            sx={{ width: { xs: '100%', md: 100 } }}
          />
          <Button
            variant="contained"
            color="warning"
            startIcon={<CleanupIcon />}
            onClick={handleCleanup}
          >
            Clean Up Completed Notifications
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteAll}
          >
            Delete All Notifications
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<SendIcon />}
            onClick={handleTestNotification}
            disabled={testLoading}
          >
            {testLoading ? 'Sending...' : 'Send Test Notification'}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          This will remove completed notifications older than {cleanupDays} days
        </Typography>
      </Paper>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={handleCloseDialog}
        confirmText="Delete All"
        confirmColor="error"
      />
    </Box>
  );
};

export default Notifications;
