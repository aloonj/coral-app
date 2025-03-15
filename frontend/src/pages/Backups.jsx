import { useState, useEffect } from 'react';
import { backupService } from '../services/api';
import { formatDate } from '../utils/dateUtils';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  useTheme
} from '@mui/material';
import {
  Backup as BackupIcon,
  CheckCircle as CheckCircleIcon,
  CloudDownload as DownloadIcon,
  Delete as DeleteIcon,
  Storage as DatabaseIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import ConfirmationDialog from '../components/ConfirmationDialog';
import StatusMessage from '../components/StatusMessage';
import ActionButtonGroup from '../components/ActionButtonGroup';

const formatCronTime = (cronExpression) => {
  if (!cronExpression) return 'Not configured';
  const [minute, hour] = cronExpression.split(' ');
  if (minute === '0') {
    return `${parseInt(hour)}:00 AM`;
  }
  const hour12 = hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minute.padStart(2, '0')} ${ampm}`;
};

const Backups = () => {
  const theme = useTheme();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [config, setConfig] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await backupService.getBackupConfig();
        setConfig(response.data);
      } catch (err) {
        console.error('Failed to load backup configuration:', err);
      }
    };
    loadConfig();
  }, []);

  // Function to start polling
  const startPolling = (isInitial = false) => {
    stopPolling(); // Clear any existing interval
    // Poll every 500ms initially, then every 2 seconds
    const interval = setInterval(loadBackups, isInitial ? 500 : 2000);
    setPollingInterval(interval);
    
    // Switch to slower polling after 5 seconds
    if (isInitial) {
      setTimeout(() => {
        startPolling(false);
      }, 5000);
    }
  };

  // Function to stop polling
  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const loadBackups = async () => {
    try {
      // Only show loading on initial load
      if (!backups.length) {
        setLoading(true);
      }
      const response = await backupService.getAllBackups();
      // Filter to only database backups from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentBackups = response.data.filter(backup => 
        backup.type === 'database' && 
        new Date(backup.createdAt) >= sevenDaysAgo
      );
      
      setBackups(recentBackups);
      setError(null);
    } catch (err) {
      setError('Failed to load backups');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and cleanup
  useEffect(() => {
    loadBackups();
    return () => stopPolling(); // Cleanup on unmount
  }, []);

  // Start/stop polling based on backup status
  useEffect(() => {
    const hasInProgressBackup = backups.some(backup => backup.status === 'in_progress');
    if (hasInProgressBackup && !pollingInterval) {
      startPolling();
    } else if (!hasInProgressBackup && pollingInterval) {
      stopPolling();
    }
  }, [backups, pollingInterval]);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      await backupService.createBackup();
      await loadBackups(); // Load the initial state
      startPolling(true); // Start rapid polling for updates
    } catch (err) {
      setError('Failed to create backup');
      console.error(err);
      await loadBackups(); // Ensure we load the backup even on error
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (backup) => {
    try {
      const response = await backupService.downloadBackup(backup.id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.path.split('/').pop(); // Get filename from path
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download backup');
      console.error(err);
    }
  };

  const handleDelete = async (backup) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Backup',
      message: 'Are you sure you want to delete this backup?',
      onConfirm: async () => {
        try {
          await backupService.deleteBackup(backup.id);
          await loadBackups();
        } catch (err) {
          setError('Failed to delete backup');
          console.error(err);
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
  };

  const handleCloseDialog = () => {
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return theme.palette.warning.main;
      case 'in_progress':
        return theme.palette.info.main;
      case 'success':
        return theme.palette.success.main;
      case 'failed':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center' }}>
          <BackupIcon sx={{ mr: 1 }} /> System Backups
        </Typography>
        
        {config && (
          <Paper 
            elevation={0} 
            sx={{ 
              bgcolor: 'background.paper', 
              borderRadius: 2, 
              p: 3, 
              borderLeft: `4px solid ${theme.palette.success.main}` 
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon sx={{ color: theme.palette.success.main, mr: 1 }} />
                Automatic backups are configured to run daily at {formatCronTime(config.scheduleTime)}
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon sx={{ color: theme.palette.success.main, mr: 1 }} />
                Backup health is monitored daily at {formatCronTime(config.monitorSchedule)}
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon sx={{ color: theme.palette.success.main, mr: 1 }} />
                Backups are retained for {config.retentionDays} days
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon sx={{ color: theme.palette.success.main, mr: 1 }} />
                System alerts if successful backups are older than {config.maxAgeHours} hours
              </Typography>
            </Box>
          </Paper>
        )}
        
        <ActionButtonGroup justifyContent="flex-end">
          <Button
            variant="contained"
            color="primary"
            startIcon={<DatabaseIcon />}
            onClick={() => handleCreateBackup()}
            disabled={creating}
          >
            Create Database Backup
          </Button>
        </ActionButtonGroup>
      </Box>

      <StatusMessage error={error} />

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Completed</TableCell>
              <TableCell>Size</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {backups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No database backups found in the last 7 days
                </TableCell>
              </TableRow>
            ) : (
              backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell>
                    <Chip
                      label={backup.status.toUpperCase()}
                      sx={{
                        bgcolor: getStatusColor(backup.status),
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(backup.createdAt)}</TableCell>
                  <TableCell>{backup.completedAt ? formatDate(backup.completedAt) : 'N/A'}</TableCell>
                  <TableCell>{formatSize(backup.size)}</TableCell>
                  <TableCell align="right">
                    {backup.status === 'success' && (
                      <IconButton 
                        color="primary" 
                        onClick={() => handleDownload(backup)}
                        title="Download backup"
                      >
                        <DownloadIcon />
                      </IconButton>
                    )}
                    <IconButton 
                      color="error" 
                      onClick={() => handleDelete(backup)}
                      title="Delete backup"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={handleCloseDialog}
        confirmText="Delete"
        confirmColor="error"
      />
    </Box>
  );
};

export default Backups;
