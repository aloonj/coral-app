#!/usr/bin/env node
import cron from 'node-cron';
import BackupService from '../services/backupService.js';
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

console.log(`Backup worker started. Scheduled for ${env.backup.scheduleTime}`);
