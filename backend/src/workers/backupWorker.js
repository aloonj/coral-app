#!/usr/bin/env node
import cron from 'node-cron';
import BackupService from '../services/backupService.js';
import NotificationService from '../services/notificationService.js';
import env from '../config/env.js';

// Run database backup at configured time (default: 2 AM)
cron.schedule(env.backup.scheduleTime, async () => {
  console.log('Starting scheduled database backup...');
  
  // Database backup
  try {
    const dbBackup = await BackupService.createBackup('database');
    console.log(`Database backup completed successfully. ID: ${dbBackup.id}`);
  } catch (error) {
    console.error('Database backup failed:', error);
  }
});

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal. Shutting down gracefully...');
  process.exit(0);
});

// Monitor backup status
cron.schedule(env.backup.monitorSchedule, async () => {
  try {
    console.log('Starting backup status check...');
    console.log('Monitor schedule:', env.backup.monitorSchedule);
    console.log('Max age hours:', env.backup.maxAgeHours);

    // Check database backups
    console.log('Checking database backups...');
    const lastDbBackup = await BackupService.getLastSuccessfulBackupByType('database');
    console.log('Last database backup:', lastDbBackup ? {
      id: lastDbBackup.id,
      completedAt: lastDbBackup.completedAt,
      status: lastDbBackup.status
    } : 'None found');

    if (!lastDbBackup) {
      console.log('No database backups found, sending alert...');
      await NotificationService.sendBackupAlert('No successful database backups found');
    } else {
      const hoursDbBackup = (Date.now() - new Date(lastDbBackup.completedAt).getTime()) / (1000 * 60 * 60);
      console.log('Hours since last database backup:', hoursDbBackup);
      
      if (hoursDbBackup > env.backup.maxAgeHours) {
        console.log('Database backup too old, sending alert...');
        await NotificationService.sendBackupAlert(
          `Last successful database backup was ${Math.floor(hoursDbBackup)} hours ago`
        );
      }
    }

    console.log('Backup status check completed');
  } catch (error) {
    console.error('Error during backup status check:', error);
  }
});

console.log(`Database backup worker started. Scheduled for ${env.backup.scheduleTime}`);
console.log(`Backup monitoring scheduled for ${env.backup.monitorSchedule}`);
