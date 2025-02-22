import { useState, useEffect } from 'react';
import { backupService } from '../services/api';
import { formatDate } from '../utils/dateUtils';
import styles from './Backups.module.css';

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
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [config, setConfig] = useState(null);

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
      setBackups(response.data);
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

  const handleCreateBackup = async (type) => {
    try {
      setCreating(true);
      await backupService.createBackup(type);
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
    if (!window.confirm('Are you sure you want to delete this backup?')) return;
    
    try {
      await backupService.deleteBackup(backup.id);
      await loadBackups();
    } catch (err) {
      setError('Failed to delete backup');
      console.error(err);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  if (loading) {
    return <div className={styles.loading}>Loading backups...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerContainer}>
        <h1 className={styles.header}>System Backups</h1>
        {config && (
          <div className={styles.configInfo}>
            <div className={styles.configItem}>✓ Automatic backups are configured to run daily at {formatCronTime(config.scheduleTime)}</div>
            <div className={styles.configItem}>✓ Backup health is monitored daily at {formatCronTime(config.monitorSchedule)}</div>
            <div className={styles.configItem}>✓ Backups are retained for {config.retentionDays} days</div>
            <div className={styles.configItem}>✓ System alerts if successful backups are older than {config.maxAgeHours} hours</div>
          </div>
        )}
        <div className={styles.actions}>
          <button 
            onClick={() => handleCreateBackup('database')}
            disabled={creating}
            className={styles.actionButton}
          >
            Database Backup
          </button>
          <button 
            onClick={() => handleCreateBackup('images')}
            disabled={creating}
            className={styles.actionButton}
          >
            Images Backup
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.backupGrid}>
        {backups.map((backup) => (
          <div key={backup.id} className={styles.backupCard}>
            <div className={styles.cardHeader}>
              <div className={styles.backupType}>{backup.type}</div>
              <div className={`${styles.statusBadge} ${styles[backup.status]}`}>
                {backup.status.toUpperCase()}
              </div>
            </div>
            
            <div className={styles.backupInfo}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Created</span>
                <span className={styles.infoValue}>
                  {formatDate(backup.createdAt)}
                </span>
              </div>
              {backup.completedAt && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Completed</span>
                  <span className={styles.infoValue}>
                    {formatDate(backup.completedAt)}
                  </span>
                </div>
              )}
              {backup.size && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Size</span>
                  <span className={styles.infoValue}>{formatSize(backup.size)}</span>
                </div>
              )}
              {backup.error && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Error</span>
                  <span className={`${styles.infoValue} ${styles.error}`}>
                    {backup.error}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.cardActions}>
              {backup.status === 'success' && (
                <button
                  onClick={() => handleDownload(backup)}
                  className={styles.downloadButton}
                >
                  Download
                </button>
              )}
              <button
                onClick={() => handleDelete(backup)}
                className={styles.deleteButton}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Backups;
