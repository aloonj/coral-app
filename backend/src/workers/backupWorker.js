#!/usr/bin/env node
import cron from 'node-cron';
import BackupService from '../services/backupService.js';
import NotificationService from '../services/notificationService.js';
import env from '../config/env.js';

// Run database and images backups sequentially at configured time (default: 2 AM)
cron.schedule(env.backup.scheduleTime, async () => {
  console.log('Starting scheduled backups...');
  
  // Database backup
  try {
    const dbBackup = await BackupService.createBackup('database');
    console.log(`Database backup completed successfully. ID: ${dbBackup.id}`);
  } catch (error) {
    console.error('Database backup failed:', error);
  }

  // Images backup
  try {
    const imgBackup = await BackupService.createBackup('images');
    console.log(`Images backup completed successfully. ID: ${imgBackup.id}`);
  } catch (error) {
    console.error('Images backup failed:', error);
  }
});

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal. Shutting down gracefully...');
  process.exit(0);
});

// Monitor backup status
cron.schedule(env.backup.monitorSchedule, async () => {
  console.log('Checking backup status...');

  // Check database backups
  const lastDbBackup = await BackupService.getLastSuccessfulBackupByType('database');
  if (!lastDbBackup) {
    await NotificationService.sendBackupAlert('No successful database backups found');
  } else {
    const hoursDbBackup = (Date.now() - lastDbBackup.completedAt) / (1000 * 60 * 60);
    if (hoursDbBackup > env.backup.maxAgeHours) {
      await NotificationService.sendBackupAlert(
        `Last successful database backup was ${Math.floor(hoursDbBackup)} hours ago`
      );
    }
  }

  // Check image backups
  const lastImgBackup = await BackupService.getLastSuccessfulBackupByType('images');
  if (!lastImgBackup) {
    await NotificationService.sendBackupAlert('No successful image backups found');
  } else {
    const hoursImgBackup = (Date.now() - lastImgBackup.completedAt) / (1000 * 60 * 60);
    if (hoursImgBackup > env.backup.maxAgeHours) {
      await NotificationService.sendBackupAlert(
        `Last successful image backup was ${Math.floor(hoursImgBackup)} hours ago`
      );
    }
  }
});

console.log(`Backup worker started. Scheduled for ${env.backup.scheduleTime}`);
console.log(`Backup monitoring scheduled for ${env.backup.monitorSchedule}`);
