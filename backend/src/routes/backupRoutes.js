import express from 'express';
import { authenticate } from '../middleware/auth.js';
import BackupService from '../services/backupService.js';

const router = express.Router();

// Get backup configuration
router.get('/config', authenticate, async (req, res) => {
  try {
    const config = BackupService.getBackupConfiguration();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all backups
router.get('/', authenticate, async (req, res) => {
  try {
    const backups = await BackupService.getBackups();
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger a new backup
router.post('/', authenticate, async (req, res) => {
  try {
    const { type = 'full' } = req.body;
    if (!['full', 'database', 'images'].includes(type)) {
      return res.status(400).json({ error: 'Invalid backup type' });
    }
    const backup = await BackupService.createBackup(type);
    res.json(backup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download a backup file
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const backup = await BackupService.getBackup(req.params.id);
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    if (!backup.path || backup.status !== 'success') {
      return res.status(400).json({ error: 'Backup file not available' });
    }
    res.download(backup.path);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a backup
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await BackupService.deleteBackup(req.params.id);
    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    if (error.message === 'Backup not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

export default router;
