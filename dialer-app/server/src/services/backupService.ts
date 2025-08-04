import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CronJob } from 'cron';
import logger from '../utils/logger';

const execAsync = promisify(exec);

export class BackupService {
  private backupJob: CronJob | null = null;
  private readonly backupDir = path.join(process.cwd(), '../../backups');
  private readonly maxBackups = 30; // Keep 30 days of backups

  constructor() {
    this.ensureBackupDirectory();
  }

  private async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      logger.info(`Backup directory ensured at: ${this.backupDir}`);
    } catch (error) {
      logger.error('Failed to create backup directory:', error);
    }
  }

  /**
   * Start automated daily backups at 2 AM
   */
  startAutomatedBackups() {
    // Run backup every day at 2 AM
    this.backupJob = new CronJob('0 2 * * *', async () => {
      logger.info('Starting automated backup...');
      await this.performBackup('automated');
    });

    this.backupJob.start();
    logger.info('Automated backup service started - will run daily at 2 AM');
  }

  /**
   * Perform a manual backup
   */
  async performBackup(type: 'manual' | 'automated' = 'manual'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${type}-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      // Create backup using mongodump
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer';
      const command = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;

      logger.info(`Creating backup: ${backupName}`);
      await execAsync(command);

      // Create metadata file
      const metadata = {
        timestamp: new Date().toISOString(),
        type,
        collections: await this.getCollectionStats(),
        mongoUri: mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'), // Hide credentials
      };

      await fs.writeFile(path.join(backupPath, 'metadata.json'), JSON.stringify(metadata, null, 2));

      // Compress the backup
      const tarPath = `${backupPath}.tar.gz`;
      await execAsync(`tar -czf "${tarPath}" -C "${this.backupDir}" "${backupName}"`);

      // Remove uncompressed backup
      await execAsync(`rm -rf "${backupPath}"`);

      logger.info(`Backup completed successfully: ${backupName}.tar.gz`);

      // Clean up old backups
      await this.cleanupOldBackups();

      return `${backupName}.tar.gz`;
    } catch (error) {
      logger.error('Backup failed:', error);
      throw new Error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get statistics about collections
   */
  private async getCollectionStats() {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;

      if (!db) {
        return {};
      }

      const collections = await db.listCollections().toArray();
      const stats: Record<string, number> = {};

      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        stats[collection.name] = count;
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get collection stats:', error);
      return {};
    }
  }

  /**
   * Clean up old backups (keep only the most recent N backups)
   */
  private async cleanupOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter((f) => f.startsWith('backup-') && f.endsWith('.tar.gz'))
        .map((f) => ({
          name: f,
          path: path.join(this.backupDir, f),
        }));

      // Sort by creation time (newest first)
      const sortedBackups = await Promise.all(
        backupFiles.map(async (file) => {
          const stats = await fs.stat(file.path);
          return { ...file, mtime: stats.mtime };
        })
      );

      sortedBackups.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Remove old backups
      const toDelete = sortedBackups.slice(this.maxBackups);
      for (const backup of toDelete) {
        await fs.unlink(backup.path);
        logger.info(`Deleted old backup: ${backup.name}`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Restore from a backup
   */
  async restoreBackup(backupName: string): Promise<void> {
    const backupPath = path.join(this.backupDir, backupName);
    const extractPath = backupPath.replace('.tar.gz', '');

    try {
      // Extract the backup
      await execAsync(`tar -xzf "${backupPath}" -C "${this.backupDir}"`);

      // Restore using mongorestore
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer';
      const command = `mongorestore --uri="${mongoUri}" --drop "${extractPath}"`;

      logger.info(`Restoring from backup: ${backupName}`);
      await execAsync(command);

      // Clean up extracted files
      await execAsync(`rm -rf "${extractPath}"`);

      logger.info(`Restore completed successfully from: ${backupName}`);
    } catch (error) {
      logger.error('Restore failed:', error);
      throw new Error(`Restore failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<
    Array<{
      name: string;
      size: string;
      created: Date;
      type: string;
    }>
  > {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter((f) => f.startsWith('backup-') && f.endsWith('.tar.gz'));

      const backups = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          const type = file.includes('-automated-') ? 'automated' : 'manual';

          return {
            name: file,
            size: this.formatBytes(stats.size),
            created: stats.mtime,
            type,
          };
        })
      );

      return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      logger.error('Failed to list backups:', error);
      return [];
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Stop automated backups
   */
  stopAutomatedBackups() {
    if (this.backupJob) {
      this.backupJob.stop();
      logger.info('Automated backup service stopped');
    }
  }
}

export default new BackupService();
