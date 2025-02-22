import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/api';
import styles from './Notifications.module.css';

const Notifications = () => {
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cleanupDays, setCleanupDays] = useState(30);
  const [testLoading, setTestLoading] = useState(false);

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
    if (window.confirm('Are you sure you want to delete ALL notifications, including pending ones? This action cannot be undone.')) {
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
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchQueueStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !queueStatus) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <h1>Notification Queue</h1>
      
      {/* Status Overview */}
      <div className={styles.statusGrid}>
        <div className={styles.statusCard}>
          <h3>Pending</h3>
          <p className={styles.count}>{queueStatus?.status.pending || 0}</p>
        </div>
        <div className={styles.statusCard}>
          <h3>Processing</h3>
          <p className={styles.count}>{queueStatus?.status.processing || 0}</p>
        </div>
        <div className={styles.statusCard}>
          <h3>Completed (24h)</h3>
          <p className={styles.count}>{queueStatus?.status.completed_24h || 0}</p>
        </div>
        <div className={styles.statusCard}>
          <h3>Failed</h3>
          <p className={`${styles.count} ${styles.failed}`}>
            {queueStatus?.status.failed || 0}
          </p>
        </div>
      </div>

      {/* Recent Failures */}
      {queueStatus?.recentFailures?.length > 0 && (
        <div className={styles.section}>
          <h2>Recent Failures</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Error</th>
                  <th>Attempts</th>
                  <th>Last Attempt</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queueStatus.recentFailures.map((failure) => (
                  <tr key={failure.id}>
                    <td>{failure.type}</td>
                    <td>{failure.error}</td>
                    <td>{failure.attempts}</td>
                    <td>{new Date(failure.lastAttempt).toLocaleString()}</td>
                    <td>
                      <button
                        onClick={() => handleRetry(failure.id)}
                        className={styles.retryButton}
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => handleRetry(queueStatus.recentFailures.map(f => f.id))}
            className={styles.retryAllButton}
          >
            Retry All Failed
          </button>
        </div>
      )}

      {/* Cleanup Section */}
      <div className={styles.section}>
        <h2>Cleanup</h2>
        <div className={styles.cleanupControls}>
          <input
            type="number"
            min="1"
            max="365"
            value={cleanupDays}
            onChange={(e) => setCleanupDays(Number(e.target.value))}
            className={styles.daysInput}
          />
          <button onClick={handleCleanup} className={styles.cleanupButton}>
            Clean Up Completed Notifications
          </button>
          <button 
            onClick={handleDeleteAll} 
            className={`${styles.cleanupButton} ${styles.deleteAllButton}`}
            style={{ backgroundColor: '#dc3545', marginLeft: '10px' }}
          >
            Delete All Notifications
          </button>
          <button
            onClick={handleTestNotification}
            className={styles.cleanupButton}
            style={{ backgroundColor: '#28a745', marginLeft: '10px' }}
            disabled={testLoading}
          >
            {testLoading ? 'Sending...' : 'Send Test Notification'}
          </button>
        </div>
        <p className={styles.cleanupNote}>
          This will remove completed notifications older than {cleanupDays} days
        </p>
      </div>
    </div>
  );
};

export default Notifications;
