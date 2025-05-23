import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { sequelize } from '../config/database.js';
import Backup from '../models/Backup.js';
import User from '../models/User.js';
import NotificationService from './notificationService.js';

const execAsync = promisify(exec);
const BACKUP_PATH = process.env.BACKUPS;
if (!BACKUP_PATH) {
  throw new Error('BACKUPS environment variable must be set');
}
const RETENTION_DAYS = process.env.BACKUP_RETENTION_DAYS || 30;

class BackupService {
  static getBackupConfiguration() {
    return {
      scheduleTime: process.env.BACKUP_SCHEDULE_TIME,
      monitorSchedule: process.env.BACKUP_MONITOR_SCHEDULE,
      retentionDays: process.env.BACKUP_RETENTION_DAYS,
      maxAgeHours: process.env.BACKUP_MAX_AGE_HOURS
    };
  }

  static async createBackup(type = 'database') {
    // Only database backups are supported now
    if (type !== 'database') {
      throw new Error('Only database backups are supported');
    }
    
    const backup = await Backup.create({ type });
    
    try {
      await backup.update({ status: 'in_progress' });
      await this.createDatabaseBackup(backup);
      
      const stats = await fs.stat(backup.path);
      await backup.update({
        status: 'success',
        size: stats.size,
        completedAt: new Date()
      });

      // Success notification disabled as files are backed up externally
      // await NotificationService.sendBackupSuccessNotification(backup);
      
      await this.cleanupOldBackups();
      return backup;
    } catch (error) {
      await backup.update({
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });
      throw error;
    }
  }

  static async createDatabaseBackup(backup) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '');
    const sqlFilename = `database_${timestamp}.sql`;
    const zipFilename = `database_${timestamp}.zip`;
    const sqlFilepath = path.join(BACKUP_PATH, sqlFilename);
    const zipFilepath = path.join(BACKUP_PATH, zipFilename);

    // Ensure backup directory exists
    await fs.mkdir(BACKUP_PATH, { recursive: true });

    const { MYSQL_USER, MYSQL_PASSWORD, DB_HOST, DB_PORT, MYSQL_DATABASE } = process.env;
    
    // Validate database credentials
    if (!MYSQL_USER || !MYSQL_PASSWORD || !DB_HOST || !DB_PORT || !MYSQL_DATABASE) {
      throw new Error('Database credentials are not properly configured. Please check environment variables.');
    }

    const dumpCommand = `mysqldump -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -h ${DB_HOST} -P ${DB_PORT} ${MYSQL_DATABASE} > ${sqlFilepath}`;
    
    try {
      await execAsync(dumpCommand);
      
      // Create zip archive
      const output = createWriteStream(zipFilepath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.pipe(output);
      archive.file(sqlFilepath, { name: sqlFilename });
      
      await new Promise((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
        archive.finalize();
      });

      // Delete the temporary SQL file
      await fs.unlink(sqlFilepath);
      
      await backup.update({ path: zipFilepath });
    } catch (error) {
      // Clean up any temporary files
      try {
        await fs.unlink(sqlFilepath);
        await fs.unlink(zipFilepath);
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
      throw new Error(`Database backup failed: ${error.message}`);
    }
  }


  static async cleanupOldBackups() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    const oldBackups = await Backup.findAll({
      where: {
        createdAt: { [sequelize.Sequelize.Op.lt]: cutoffDate },
        status: 'success'
      }
    });

    for (const backup of oldBackups) {
      try {
        await fs.unlink(backup.path);
        await backup.destroy();
      } catch (error) {
        console.error(`Failed to cleanup backup ${backup.id}:`, error);
      }
    }
  }

  static async getBackups() {
    return Backup.findAll({
      order: [['createdAt', 'DESC']]
    });
  }

  static async getBackup(id) {
    return Backup.findByPk(id);
  }

  static async getLastSuccessfulBackupByType(type) {
    return Backup.findOne({
      where: { 
        status: 'success',
        type: type
      },
      order: [['completedAt', 'DESC']]
    });
  }

  static async getAdminUsers() {
    return User.findAll({
      where: {
        role: { [sequelize.Sequelize.Op.in]: ['SUPERADMIN', 'ADMIN'] },
        status: 'ACTIVE'
      },
      attributes: ['email', 'name', 'role']
    });
  }

  static async deleteBackup(id) {
    const backup = await Backup.findByPk(id);
    if (!backup) throw new Error('Backup not found');

    try {
      await fs.unlink(backup.path);
    } catch (error) {
      console.error(`Failed to delete backup file ${backup.path}:`, error);
    }

    await backup.destroy();
  }
}

export default BackupService;
