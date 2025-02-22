import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import Backup from '../models/Backup.js';

const execAsync = promisify(exec);
const BACKUP_PATH = process.env.BACKUPS;
if (!BACKUP_PATH) {
  throw new Error('BACKUPS environment variable must be set');
}
const RETENTION_DAYS = process.env.BACKUP_RETENTION_DAYS || 30;

class BackupService {
  static async createBackup(type = 'database') {
    const backup = await Backup.create({ type });
    
    try {
      await backup.update({ status: 'in_progress' });
      
      switch (type) {
        case 'database':
          await this.createDatabaseBackup(backup);
          break;
        case 'images':
          await this.createImagesBackup(backup);
          break;
        default:
          throw new Error(`Invalid backup type: ${type}`);
      }
      
      const stats = await fs.stat(backup.path);
      await backup.update({
        status: 'success',
        size: stats.size,
        completedAt: new Date()
      });
      
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
    const filename = `database_${timestamp}.sql`;
    const filepath = path.join(BACKUP_PATH, filename);

    // Ensure backup directory exists
    await fs.mkdir(BACKUP_PATH, { recursive: true });

    const { MYSQL_USER, MYSQL_PASSWORD, DB_HOST, DB_PORT, MYSQL_DATABASE } = process.env;
    
    // Validate database credentials
    if (!MYSQL_USER || !MYSQL_PASSWORD || !DB_HOST || !DB_PORT || !MYSQL_DATABASE) {
      throw new Error('Database credentials are not properly configured. Please check environment variables.');
    }

    const dumpCommand = `mysqldump -u ${MYSQL_USER} -p${MYSQL_PASSWORD} -h ${DB_HOST} -P ${DB_PORT} ${MYSQL_DATABASE} > ${filepath}`;
    
    try {
      await execAsync(dumpCommand);
    } catch (error) {
      throw new Error(`Database backup failed: ${error.message}`);
    }
    await backup.update({ path: filepath });
  }

  static async createImagesBackup(backup) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '');
    const filename = `images_${timestamp}.zip`;
    const filepath = path.join(BACKUP_PATH, filename);
    
    // Ensure backup directory exists
    await fs.mkdir(BACKUP_PATH, { recursive: true });
    
    const output = createWriteStream(filepath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.pipe(output);
    archive.directory('uploads/', 'uploads');
    
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.finalize();
    });

    await backup.update({ path: filepath });
  }

  static async cleanupOldBackups() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    const oldBackups = await Backup.findAll({
      where: {
        createdAt: { $lt: cutoffDate },
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
