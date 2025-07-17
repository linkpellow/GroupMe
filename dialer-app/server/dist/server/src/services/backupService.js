"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const cron_1 = require("cron");
const logger_1 = __importDefault(require("../utils/logger"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class BackupService {
    constructor() {
        this.backupJob = null;
        this.backupDir = path.join(process.cwd(), '../../backups');
        this.maxBackups = 30; // Keep 30 days of backups
        this.ensureBackupDirectory();
    }
    async ensureBackupDirectory() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            logger_1.default.info(`Backup directory ensured at: ${this.backupDir}`);
        }
        catch (error) {
            logger_1.default.error('Failed to create backup directory:', error);
        }
    }
    /**
     * Start automated daily backups at 2 AM
     */
    startAutomatedBackups() {
        // Run backup every day at 2 AM
        this.backupJob = new cron_1.CronJob('0 2 * * *', async () => {
            logger_1.default.info('Starting automated backup...');
            await this.performBackup('automated');
        });
        this.backupJob.start();
        logger_1.default.info('Automated backup service started - will run daily at 2 AM');
    }
    /**
     * Perform a manual backup
     */
    async performBackup(type = 'manual') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup-${type}-${timestamp}`;
        const backupPath = path.join(this.backupDir, backupName);
        try {
            // Create backup using mongodump
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer';
            const command = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;
            logger_1.default.info(`Creating backup: ${backupName}`);
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
            logger_1.default.info(`Backup completed successfully: ${backupName}.tar.gz`);
            // Clean up old backups
            await this.cleanupOldBackups();
            return `${backupName}.tar.gz`;
        }
        catch (error) {
            logger_1.default.error('Backup failed:', error);
            throw new Error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get statistics about collections
     */
    async getCollectionStats() {
        try {
            const mongoose = require('mongoose');
            const db = mongoose.connection.db;
            if (!db) {
                return {};
            }
            const collections = await db.listCollections().toArray();
            const stats = {};
            for (const collection of collections) {
                const count = await db.collection(collection.name).countDocuments();
                stats[collection.name] = count;
            }
            return stats;
        }
        catch (error) {
            logger_1.default.error('Failed to get collection stats:', error);
            return {};
        }
    }
    /**
     * Clean up old backups (keep only the most recent N backups)
     */
    async cleanupOldBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backupFiles = files
                .filter((f) => f.startsWith('backup-') && f.endsWith('.tar.gz'))
                .map((f) => ({
                name: f,
                path: path.join(this.backupDir, f),
            }));
            // Sort by creation time (newest first)
            const sortedBackups = await Promise.all(backupFiles.map(async (file) => {
                const stats = await fs.stat(file.path);
                return { ...file, mtime: stats.mtime };
            }));
            sortedBackups.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
            // Remove old backups
            const toDelete = sortedBackups.slice(this.maxBackups);
            for (const backup of toDelete) {
                await fs.unlink(backup.path);
                logger_1.default.info(`Deleted old backup: ${backup.name}`);
            }
        }
        catch (error) {
            logger_1.default.error('Failed to cleanup old backups:', error);
        }
    }
    /**
     * Restore from a backup
     */
    async restoreBackup(backupName) {
        const backupPath = path.join(this.backupDir, backupName);
        const extractPath = backupPath.replace('.tar.gz', '');
        try {
            // Extract the backup
            await execAsync(`tar -xzf "${backupPath}" -C "${this.backupDir}"`);
            // Restore using mongorestore
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer';
            const command = `mongorestore --uri="${mongoUri}" --drop "${extractPath}"`;
            logger_1.default.info(`Restoring from backup: ${backupName}`);
            await execAsync(command);
            // Clean up extracted files
            await execAsync(`rm -rf "${extractPath}"`);
            logger_1.default.info(`Restore completed successfully from: ${backupName}`);
        }
        catch (error) {
            logger_1.default.error('Restore failed:', error);
            throw new Error(`Restore failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * List available backups
     */
    async listBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backupFiles = files.filter((f) => f.startsWith('backup-') && f.endsWith('.tar.gz'));
            const backups = await Promise.all(backupFiles.map(async (file) => {
                const filePath = path.join(this.backupDir, file);
                const stats = await fs.stat(filePath);
                const type = file.includes('-automated-') ? 'automated' : 'manual';
                return {
                    name: file,
                    size: this.formatBytes(stats.size),
                    created: stats.mtime,
                    type,
                };
            }));
            return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
        }
        catch (error) {
            logger_1.default.error('Failed to list backups:', error);
            return [];
        }
    }
    formatBytes(bytes) {
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
            logger_1.default.info('Automated backup service stopped');
        }
    }
}
exports.BackupService = BackupService;
exports.default = new BackupService();
