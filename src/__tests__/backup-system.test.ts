/**
 * Comprehensive test suite for EquiSplit Backup & Disaster Recovery System
 * 
 * Tests backup creation, restoration, verification, and disaster recovery procedures
 * to ensure legal compliance and data protection requirements are met.
 */

import { BackupSystem, createBackupConfig, COMPLIANCE_TARGETS } from '../lib/backup-system';
import { BackupScheduler, createDefaultScheduleConfig } from '../lib/backup-scheduler';
import { DisasterRecoveryManager, createDefaultDRConfig } from '../lib/disaster-recovery';
import { logger } from '../lib/logger';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../lib/logger');
jest.mock('../lib/audit');
jest.mock('@prisma/client');

describe('Backup System', () => {
  let backupSystem: BackupSystem;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      databaseUrl: 'postgresql://test:test@localhost:5432/test',
      encryptionKey: '12345678901234567890123456789012',
      storageLocation: 'local' as const,
      retentionPeriod: {
        daily: 30,
        weekly: 12,
        monthly: 12,
        yearly: 7
      },
      compression: true,
      crossRegionReplication: false,
      pointInTimeRecovery: true
    };

    backupSystem = new BackupSystem(mockConfig);
    
    // Mock private methods for testing
    (backupSystem as any).executeDatabaseDump = jest.fn().mockResolvedValue({
      data: Buffer.from('mock database dump'),
      metadata: { tables: 10, size: 1024 }
    });
    
    (backupSystem as any).storeBackup = jest.fn().mockResolvedValue('/backup/path/backup-123');
    (backupSystem as any).retrieveBackup = jest.fn().mockResolvedValue(Buffer.from('encrypted data'));
    (backupSystem as any).storeBackupMetadata = jest.fn().mockResolvedValue(undefined);
    (backupSystem as any).getBackupMetadata = jest.fn().mockResolvedValue({
      id: 'backup-123',
      timestamp: new Date(),
      type: 'full',
      status: 'completed',
      checksum: 'abc123'
    });
    (backupSystem as any).backupExists = jest.fn().mockResolvedValue(true);
    (backupSystem as any).updateBackupVerification = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Backup Creation', () => {
    it('should create a full backup with encryption and compression', async () => {
      const metadata = await backupSystem.createFullBackup();

      expect(metadata).toMatchObject({
        type: 'full',
        encrypted: true,
        compressed: true,
        status: 'completed'
      });

      expect(metadata.id).toMatch(/^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{8}$/);
      expect(metadata.checksum).toBeTruthy();
      expect(metadata.size).toBeGreaterThan(0);
      expect(metadata.retention.category).toBe('daily');
      expect(metadata.retention.expiresAt).toBeInstanceOf(Date);
    });

    it('should generate unique backup IDs', async () => {
      const backup1 = await backupSystem.createFullBackup();
      const backup2 = await backupSystem.createFullBackup();

      expect(backup1.id).not.toBe(backup2.id);
    });

    it('should handle backup creation failures gracefully', async () => {
      (backupSystem as any).executeDatabaseDump = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(backupSystem.createFullBackup()).rejects.toThrow(
        'Backup failed: Database connection failed'
      );
    });

    it('should calculate retention periods correctly', async () => {
      const metadata = await backupSystem.createFullBackup();
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + (mockConfig.retentionPeriod.daily * 24 * 60 * 60 * 1000));
      
      // Allow for small time differences due to test execution time
      const timeDiff = Math.abs(metadata.retention.expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(5000); // Less than 5 seconds difference
    });
  });

  describe('Incremental Backup Creation', () => {
    it('should create incremental backup with base reference', async () => {
      const baseBackupId = 'base-backup-123';
      
      (backupSystem as any).getBackupMetadata = jest.fn().mockResolvedValue({
        id: baseBackupId,
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        type: 'full',
        status: 'completed'
      });

      (backupSystem as any).createWALBackup = jest.fn().mockResolvedValue(
        Buffer.from('incremental data')
      );

      const metadata = await backupSystem.createIncrementalBackup(baseBackupId);

      expect(metadata.type).toBe('incremental');
      expect(metadata.status).toBe('completed');
      expect((backupSystem as any).createWALBackup).toHaveBeenCalled();
    });

    it('should fail when base backup is not found', async () => {
      (backupSystem as any).getBackupMetadata = jest.fn().mockResolvedValue(null);

      await expect(backupSystem.createIncrementalBackup('invalid-backup')).rejects.toThrow(
        'Base backup invalid-backup not found'
      );
    });

    it('should handle WAL backup creation failures', async () => {
      const baseBackupId = 'base-backup-123';
      
      (backupSystem as any).getBackupMetadata = jest.fn().mockResolvedValue({
        id: baseBackupId,
        timestamp: new Date(),
        type: 'full',
        status: 'completed'
      });

      (backupSystem as any).createWALBackup = jest.fn().mockRejectedValue(
        new Error('WAL file access denied')
      );

      await expect(backupSystem.createIncrementalBackup(baseBackupId)).rejects.toThrow(
        'Incremental backup failed: WAL file access denied'
      );
    });
  });

  describe('Backup Verification', () => {
    let mockMetadata: any;

    beforeEach(() => {
      mockMetadata = {
        id: 'backup-123',
        timestamp: new Date(),
        type: 'full',
        size: 1024,
        checksum: 'valid-checksum',
        encrypted: true,
        compressed: true,
        status: 'completed',
        location: {
          primary: '/backup/path/backup-123'
        },
        verification: {
          verified: false
        }
      };
    });

    it('should verify backup integrity successfully', async () => {
      // Mock successful checksum verification
      (backupSystem as any).calculateChecksum = jest.fn().mockReturnValue('valid-checksum');
      (backupSystem as any).decryptBackupData = jest.fn().mockResolvedValue(Buffer.from('decrypted'));
      (backupSystem as any).restoreFromBackup = jest.fn().mockResolvedValue({ success: true, restoredTimestamp: new Date(), warnings: [] });

      const result = await backupSystem.verifyBackup(mockMetadata);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect((backupSystem as any).updateBackupVerification).toHaveBeenCalledWith('backup-123', true);
    });

    it('should detect corrupted backups', async () => {
      // Mock checksum mismatch
      (backupSystem as any).calculateChecksum = jest.fn().mockReturnValue('invalid-checksum');

      const result = await backupSystem.verifyBackup(mockMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Checksum verification failed - backup may be corrupted');
      expect((backupSystem as any).updateBackupVerification).toHaveBeenCalledWith('backup-123', false);
    });

    it('should detect missing backup files', async () => {
      (backupSystem as any).backupExists = jest.fn().mockResolvedValue(false);

      const result = await backupSystem.verifyBackup(mockMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Backup file not found at primary location');
    });

    it('should detect encryption issues', async () => {
      (backupSystem as any).calculateChecksum = jest.fn().mockReturnValue('valid-checksum');
      (backupSystem as any).decryptBackupData = jest.fn().mockRejectedValue(
        new Error('Invalid encryption key')
      );

      const result = await backupSystem.verifyBackup(mockMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Backup decryption failed - encryption key may be invalid');
    });

    it('should detect restore capability issues', async () => {
      (backupSystem as any).calculateChecksum = jest.fn().mockReturnValue('valid-checksum');
      (backupSystem as any).decryptBackupData = jest.fn().mockResolvedValue(Buffer.from('decrypted'));
      (backupSystem as any).restoreFromBackup = jest.fn().mockResolvedValue({ success: false });

      const result = await backupSystem.verifyBackup(mockMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Backup restore test failed');
    });
  });

  describe('Backup Restoration', () => {
    it('should restore from backup successfully', async () => {
      const backupId = 'backup-123';
      const mockBackup = {
        id: backupId,
        timestamp: new Date(),
        status: 'completed',
        location: { primary: '/backup/path' },
        compressed: true
      };

      (backupSystem as any).getBackupMetadata = jest.fn().mockResolvedValue(mockBackup);
      (backupSystem as any).verifyBackup = jest.fn().mockResolvedValue({ valid: true, errors: [] });
      (backupSystem as any).decryptBackupData = jest.fn().mockResolvedValue(Buffer.from('decrypted'));
      (backupSystem as any).decompressData = jest.fn().mockResolvedValue(Buffer.from('decompressed'));
      (backupSystem as any).validateRestoreData = jest.fn().mockResolvedValue({ valid: true, warnings: [] });
      (backupSystem as any).executeRestore = jest.fn().mockResolvedValue(undefined);

      const result = await backupSystem.restoreFromBackup(backupId, undefined, false);

      expect(result.success).toBe(true);
      expect(result.restoredTimestamp).toEqual(mockBackup.timestamp);
      expect(result.warnings).toHaveLength(0);
    });

    it('should perform dry run restoration', async () => {
      const backupId = 'backup-123';
      const mockBackup = {
        id: backupId,
        timestamp: new Date(),
        status: 'completed',
        location: { primary: '/backup/path' },
        compressed: false
      };

      (backupSystem as any).getBackupMetadata = jest.fn().mockResolvedValue(mockBackup);
      (backupSystem as any).verifyBackup = jest.fn().mockResolvedValue({ valid: true, errors: [] });
      (backupSystem as any).decryptBackupData = jest.fn().mockResolvedValue(Buffer.from('decrypted'));
      (backupSystem as any).validateRestoreData = jest.fn().mockResolvedValue({ valid: true, warnings: ['Test warning'] });

      const result = await backupSystem.restoreFromBackup(backupId, undefined, true);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Test warning');
      expect((backupSystem as any).executeRestore).not.toHaveBeenCalled();
    });

    it('should handle point-in-time recovery', async () => {
      const backupId = 'backup-123';
      const targetTimestamp = new Date();
      const mockBackup = {
        id: backupId,
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        status: 'completed',
        location: { primary: '/backup/path' },
        compressed: false
      };

      (backupSystem as any).getBackupMetadata = jest.fn().mockResolvedValue(mockBackup);
      (backupSystem as any).verifyBackup = jest.fn().mockResolvedValue({ valid: true, errors: [] });
      (backupSystem as any).decryptBackupData = jest.fn().mockResolvedValue(Buffer.from('decrypted'));
      (backupSystem as any).validateRestoreData = jest.fn().mockResolvedValue({ valid: true, warnings: [] });
      (backupSystem as any).performPointInTimeRecovery = jest.fn().mockResolvedValue({
        timestamp: targetTimestamp,
        warnings: ['PITR applied']
      });
      (backupSystem as any).executeRestore = jest.fn().mockResolvedValue(undefined);

      const result = await backupSystem.restoreFromBackup(backupId, targetTimestamp, false);

      expect(result.success).toBe(true);
      expect(result.restoredTimestamp).toEqual(targetTimestamp);
      expect(result.warnings).toContain('PITR applied');
      expect((backupSystem as any).performPointInTimeRecovery).toHaveBeenCalledWith(mockBackup, targetTimestamp);
    });

    it('should fail for non-existent backups', async () => {
      (backupSystem as any).getBackupMetadata = jest.fn().mockResolvedValue(null);

      await expect(backupSystem.restoreFromBackup('invalid-backup')).rejects.toThrow(
        'Backup invalid-backup not found or not completed'
      );
    });

    it('should fail for failed backup verification', async () => {
      const backupId = 'backup-123';
      const mockBackup = {
        id: backupId,
        status: 'completed',
        location: { primary: '/backup/path' }
      };

      (backupSystem as any).getBackupMetadata = jest.fn().mockResolvedValue(mockBackup);
      (backupSystem as any).verifyBackup = jest.fn().mockResolvedValue({
        valid: false,
        errors: ['Backup is corrupted']
      });

      await expect(backupSystem.restoreFromBackup(backupId)).rejects.toThrow(
        'Backup verification failed: Backup is corrupted'
      );
    });
  });

  describe('Backup Cleanup', () => {
    it('should clean up expired backups', async () => {
      const expiredBackup = {
        id: 'expired-backup',
        retention: {
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      };

      const validBackup = {
        id: 'valid-backup',
        retention: {
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now
        }
      };

      (backupSystem as any).listBackups = jest.fn().mockResolvedValue({
        backups: [expiredBackup, validBackup]
      });
      (backupSystem as any).deleteBackup = jest.fn().mockResolvedValue(undefined);

      const result = await backupSystem.cleanupExpiredBackups();

      expect(result.deleted).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect((backupSystem as any).deleteBackup).toHaveBeenCalledWith('expired-backup');
      expect((backupSystem as any).deleteBackup).not.toHaveBeenCalledWith('valid-backup');
    });

    it('should handle deletion errors gracefully', async () => {
      const expiredBackup = {
        id: 'expired-backup',
        retention: {
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      };

      (backupSystem as any).listBackups = jest.fn().mockResolvedValue({
        backups: [expiredBackup]
      });
      (backupSystem as any).deleteBackup = jest.fn().mockRejectedValue(
        new Error('Delete permission denied')
      );

      const result = await backupSystem.cleanupExpiredBackups();

      expect(result.deleted).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to delete backup expired-backup');
    });
  });
});

describe('Backup Scheduler', () => {
  let scheduler: BackupScheduler;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = createDefaultScheduleConfig();
    scheduler = new BackupScheduler(mockConfig);

    // Mock BackupSystem methods
    jest.spyOn(scheduler['backupSystem'], 'createFullBackup').mockResolvedValue({
      id: 'backup-123',
      timestamp: new Date(),
      type: 'full',
      size: 1024,
      checksum: 'abc123',
      encrypted: true,
      compressed: true,
      status: 'completed',
      retention: { category: 'weekly', expiresAt: new Date() },
      location: { primary: '/backup/path' },
      verification: { verified: false }
    });

    jest.spyOn(scheduler['backupSystem'], 'createIncrementalBackup').mockResolvedValue({
      id: 'inc-backup-123',
      timestamp: new Date(),
      type: 'incremental',
      size: 512,
      checksum: 'def456',
      encrypted: true,
      compressed: true,
      status: 'completed',
      retention: { category: 'daily', expiresAt: new Date() },
      location: { primary: '/backup/path' },
      verification: { verified: false }
    });

    jest.spyOn(scheduler['backupSystem'], 'listBackups').mockResolvedValue({
      backups: [{
        id: 'backup-123',
        timestamp: new Date(),
        type: 'full',
        size: 1024,
        checksum: 'abc123',
        encrypted: true,
        compressed: true,
        status: 'completed',
        retention: { category: 'weekly', expiresAt: new Date() },
        location: { primary: '/backup/path' },
        verification: { verified: true, verifiedAt: new Date() }
      }],
      total: 1
    });
  });

  afterEach(async () => {
    await scheduler.stop();
    jest.clearAllMocks();
  });

  describe('Job Scheduling', () => {
    it('should start scheduler and schedule jobs', async () => {
      await scheduler.start();

      const jobs = scheduler.getJobStatus();
      expect(jobs.length).toBeGreaterThan(0);
      
      const jobTypes = jobs.map(job => job.type);
      expect(jobTypes).toContain('full');
      expect(jobTypes).toContain('incremental');
      expect(jobTypes).toContain('verification');
      expect(jobTypes).toContain('cleanup');
    });

    it('should prevent multiple scheduler instances', async () => {
      await scheduler.start();
      
      // Starting again should not throw but should log warning
      await scheduler.start();
      
      const jobs = scheduler.getJobStatus();
      // Should not duplicate jobs
      expect(jobs.filter(job => job.type === 'full')).toHaveLength(1);
    });

    it('should stop scheduler and clear jobs', async () => {
      await scheduler.start();
      expect(scheduler.getJobStatus()).not.toHaveLength(0);

      await scheduler.stop();
      // Jobs remain in history but timers are cleared
      expect(scheduler['timers'].size).toBe(0);
    });
  });

  describe('Manual Job Triggering', () => {
    it('should trigger full backup manually', async () => {
      const job = await scheduler.triggerJob('full');

      expect(job.type).toBe('full');
      expect(job.status).toBe('completed');
      expect(job.result).toBeDefined();
      expect(job.duration).toBeGreaterThan(0);
    });

    it('should trigger incremental backup manually', async () => {
      const job = await scheduler.triggerJob('incremental');

      expect(job.type).toBe('incremental');
      expect(job.status).toBe('completed');
      expect(job.result).toBeDefined();
    });

    it('should handle manual job failures', async () => {
      jest.spyOn(scheduler['backupSystem'], 'createFullBackup').mockRejectedValue(
        new Error('Backup failed')
      );

      await expect(scheduler.triggerJob('full')).rejects.toThrow('Backup failed');

      const jobs = scheduler.getJobStatus();
      const failedJob = jobs.find(job => job.status === 'failed');
      expect(failedJob).toBeDefined();
      expect(failedJob?.error).toBe('Backup failed');
    });
  });

  describe('Health Status Monitoring', () => {
    it('should assess healthy backup system', async () => {
      const health = await scheduler.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.lastBackup).toBeInstanceOf(Date);
      expect(health.issues).toHaveLength(0);
    });

    it('should detect stale backups', async () => {
      // Mock old backup
      jest.spyOn(scheduler['backupSystem'], 'listBackups').mockResolvedValue({
        backups: [{
          id: 'old-backup',
          timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
          type: 'full',
          size: 1024,
          checksum: 'abc123',
          encrypted: true,
          compressed: true,
          status: 'completed',
          retention: { category: 'weekly', expiresAt: new Date() },
          location: { primary: '/backup/path' },
          verification: { verified: true, verifiedAt: new Date() }
        }],
        total: 1
      });

      const health = await scheduler.getHealthStatus();

      expect(health.status).toBe('degraded');
      expect(health.issues).toContain(expect.stringContaining('hours old'));
    });

    it('should detect verification issues', async () => {
      jest.spyOn(scheduler['backupSystem'], 'listBackups')
        .mockResolvedValueOnce({
          backups: [{
            id: 'recent-backup',
            timestamp: new Date(),
            type: 'full',
            size: 1024,
            checksum: 'abc123',
            encrypted: true,
            compressed: true,
            status: 'completed',
            retention: { category: 'weekly', expiresAt: new Date() },
            location: { primary: '/backup/path' },
            verification: { verified: true, verifiedAt: new Date() }
          }],
          total: 1
        })
        .mockResolvedValueOnce({
          backups: [{
            id: 'old-verified-backup',
            timestamp: new Date(),
            type: 'full',
            size: 1024,
            checksum: 'abc123',
            encrypted: true,
            compressed: true,
            status: 'verified',
            retention: { category: 'weekly', expiresAt: new Date() },
            location: { primary: '/backup/path' },
            verification: { 
              verified: true, 
              verifiedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) // 48 hours ago
            }
          }],
          total: 1
        });

      const health = await scheduler.getHealthStatus();

      expect(health.issues).toContain('No backup verification in last 24 hours');
      expect(health.recommendations).toContain(expect.stringContaining('verification'));
    });
  });
});

describe('Disaster Recovery Manager', () => {
  let drManager: DisasterRecoveryManager;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = createDefaultDRConfig();
    drManager = new DisasterRecoveryManager(mockConfig);

    // Mock health check methods
    (drManager as any).checkDatabaseHealth = jest.fn().mockResolvedValue({
      status: 'healthy',
      responseTime: 50,
      lastCheck: new Date()
    });

    (drManager as any).checkAPIHealth = jest.fn().mockResolvedValue({
      status: 'healthy',
      responseTime: 30,
      lastCheck: new Date()
    });

    (drManager as any).checkAuthHealth = jest.fn().mockResolvedValue({
      status: 'healthy',
      responseTime: 40,
      lastCheck: new Date()
    });

    (drManager as any).checkStorageHealth = jest.fn().mockResolvedValue({
      status: 'healthy',
      responseTime: 35,
      lastCheck: new Date()
    });

    (drManager as any).checkBackupHealth = jest.fn().mockResolvedValue({
      status: 'healthy',
      lastCheck: new Date()
    });
  });

  afterEach(async () => {
    await drManager.shutdown();
    jest.clearAllMocks();
  });

  describe('System Health Monitoring', () => {
    it('should perform comprehensive health check', async () => {
      const health = await drManager.performHealthCheck();

      expect(health.status).toBe('healthy');
      expect(health.components).toHaveProperty('database');
      expect(health.components).toHaveProperty('api');
      expect(health.components).toHaveProperty('auth');
      expect(health.components).toHaveProperty('storage');
      expect(health.components).toHaveProperty('backup');
      expect(health.metrics.lastCheck).toBeInstanceOf(Date);
      expect(health.metrics.responseTime).toBeGreaterThan(0);
    });

    it('should detect critical system failures', async () => {
      (drManager as any).checkDatabaseHealth = jest.fn().mockResolvedValue({
        status: 'offline',
        responseTime: 5000,
        lastCheck: new Date(),
        message: 'Connection timeout'
      });

      const health = await drManager.performHealthCheck();

      expect(health.status).toBe('offline');
      expect(health.components.database.status).toBe('offline');
      expect(health.components.database.message).toBe('Connection timeout');
    });

    it('should calculate error rates correctly', async () => {
      (drManager as any).checkDatabaseHealth = jest.fn().mockResolvedValue({
        status: 'critical',
        lastCheck: new Date()
      });

      (drManager as any).checkAPIHealth = jest.fn().mockResolvedValue({
        status: 'offline',
        lastCheck: new Date()
      });

      const health = await drManager.performHealthCheck();

      expect(health.status).toBe('offline');
      expect(health.metrics.errorRate).toBe(40); // 2 out of 5 components failed
    });

    it('should handle health check failures gracefully', async () => {
      (drManager as any).checkDatabaseHealth = jest.fn().mockRejectedValue(
        new Error('Health check failed')
      );

      const health = await drManager.performHealthCheck();

      expect(health.status).toBe('critical');
      expect(health.components.database.status).toBe('offline');
    });
  });

  describe('Point-in-Time Recovery', () => {
    it('should execute PITR successfully', async () => {
      const targetTimestamp = new Date();
      
      (drManager as any).findBaseBackupForPITR = jest.fn().mockResolvedValue({
        id: 'base-backup-123',
        timestamp: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      });

      jest.spyOn(drManager['backupSystem'], 'restoreFromBackup').mockResolvedValue({
        success: true,
        restoredTimestamp: targetTimestamp,
        warnings: []
      });

      const result = await drManager.executePointInTimeRecovery(targetTimestamp, false);

      expect(result.success).toBe(true);
      expect(result.restoredTimestamp).toEqual(targetTimestamp);
      expect(result.warnings).toHaveLength(0);
    });

    it('should perform PITR dry run', async () => {
      const targetTimestamp = new Date();
      
      (drManager as any).findBaseBackupForPITR = jest.fn().mockResolvedValue({
        id: 'base-backup-123',
        timestamp: new Date(Date.now() - 60 * 60 * 1000)
      });

      jest.spyOn(drManager['backupSystem'], 'restoreFromBackup').mockResolvedValue({
        success: true,
        restoredTimestamp: targetTimestamp,
        warnings: ['Dry run completed']
      });

      const result = await drManager.executePointInTimeRecovery(targetTimestamp, true);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Dry run completed');
    });

    it('should fail when no suitable backup is found', async () => {
      const targetTimestamp = new Date();
      
      (drManager as any).findBaseBackupForPITR = jest.fn().mockResolvedValue(null);

      await expect(drManager.executePointInTimeRecovery(targetTimestamp)).rejects.toThrow(
        `No suitable base backup found for timestamp ${targetTimestamp.toISOString()}`
      );
    });
  });

  describe('Recovery Procedures', () => {
    it('should execute recovery procedure successfully', async () => {
      (drManager as any).executeRecoveryStep = jest.fn().mockResolvedValue(undefined);

      const result = await drManager.executeRecoveryProcedure('database-failover');

      expect(result.success).toBe(true);
      expect(result.executedSteps.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle critical step failures with rollback', async () => {
      (drManager as any).executeRecoveryStep = jest.fn()
        .mockResolvedValueOnce(undefined) // First step succeeds
        .mockRejectedValueOnce(new Error('Critical step failed')); // Second step fails

      (drManager as any).rollbackRecoverySteps = jest.fn().mockResolvedValue(undefined);

      await expect(drManager.executeRecoveryProcedure('database-failover')).rejects.toThrow(
        'Critical step verify-secondary failed: Critical step failed'
      );

      expect((drManager as any).rollbackRecoverySteps).toHaveBeenCalled();
    });

    it('should continue on non-critical step failures', async () => {
      // Mock a procedure with non-critical steps
      const mockProcedure = {
        id: 'test-procedure',
        name: 'Test Procedure',
        description: 'Test procedure with non-critical steps',
        triggerConditions: [],
        steps: [
          {
            id: 'step1',
            description: 'Non-critical step',
            expectedResult: 'Success',
            timeout: 30,
            critical: false
          },
          {
            id: 'step2',
            description: 'Another step',
            expectedResult: 'Success',
            timeout: 30,
            critical: false
          }
        ],
        estimatedTime: 5,
        requiredPersonnel: [],
        dependencies: []
      };

      (drManager as any).getRecoveryProcedure = jest.fn().mockReturnValue(mockProcedure);
      (drManager as any).executeRecoveryStep = jest.fn()
        .mockRejectedValueOnce(new Error('Non-critical failure'))
        .mockResolvedValueOnce(undefined);

      const result = await drManager.executeRecoveryProcedure('test-procedure');

      expect(result.success).toBe(false); // Failed due to error
      expect(result.executedSteps).toContain('step2');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Non-critical failure');
    });
  });

  describe('Disaster Recovery Testing', () => {
    it('should run DR test suite successfully', async () => {
      (drManager as any).executeRecoveryProcedure = jest.fn().mockResolvedValue({
        success: true,
        executedSteps: ['step1', 'step2'],
        errors: []
      });

      const result = await drManager.testDisasterRecovery();

      expect(result.passed).toBeGreaterThan(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(result.passed + result.failed);
      expect(result.results.every(r => r.success)).toBe(true);
    });

    it('should handle test failures gracefully', async () => {
      (drManager as any).executeRecoveryProcedure = jest.fn()
        .mockResolvedValueOnce({ success: true, executedSteps: [], errors: [] })
        .mockRejectedValueOnce(new Error('Test procedure failed'));

      const result = await drManager.testDisasterRecovery();

      expect(result.passed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results.some(r => !r.success)).toBe(true);
    });

    it('should update last test date', async () => {
      const initialLastTest = drManager['config'].testSchedule.lastTest;
      
      (drManager as any).executeRecoveryProcedure = jest.fn().mockResolvedValue({
        success: true,
        executedSteps: [],
        errors: []
      });

      await drManager.testDisasterRecovery();

      expect(drManager['config'].testSchedule.lastTest).not.toBe(initialLastTest);
      expect(drManager['config'].testSchedule.lastTest).toBeInstanceOf(Date);
    });
  });

  describe('Compliance Monitoring', () => {
    it('should generate comprehensive status report', async () => {
      const report = await drManager.getSystemStatusReport();

      expect(report).toHaveProperty('health');
      expect(report).toHaveProperty('backupStatus');
      expect(report).toHaveProperty('complianceStatus');
      expect(report.complianceStatus).toHaveProperty('rpo');
      expect(report.complianceStatus).toHaveProperty('rto');
      expect(report.complianceStatus).toHaveProperty('backupRetention');
      expect(report.complianceStatus).toHaveProperty('testingSchedule');
    });

    it('should check compliance requirements', async () => {
      // Mock compliant state
      (drManager as any).checkRPOCompliance = jest.fn().mockReturnValue(true);
      (drManager as any).checkRTOCompliance = jest.fn().mockReturnValue(true);
      (drManager as any).checkBackupRetentionCompliance = jest.fn().mockReturnValue(true);
      (drManager as any).checkTestingScheduleCompliance = jest.fn().mockReturnValue(true);

      const report = await drManager.getSystemStatusReport();

      expect(report.complianceStatus.rpo).toBe(true);
      expect(report.complianceStatus.rto).toBe(true);
      expect(report.complianceStatus.backupRetention).toBe(true);
      expect(report.complianceStatus.testingSchedule).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should create default DR configuration', () => {
      const config = createDefaultDRConfig();

      expect(config).toHaveProperty('primaryRegion');
      expect(config).toHaveProperty('secondaryRegions');
      expect(config).toHaveProperty('failoverThresholds');
      expect(config).toHaveProperty('notifications');
      expect(config).toHaveProperty('testSchedule');
      expect(config.failoverThresholds.maxDowntime).toBeGreaterThan(0);
      expect(config.failoverThresholds.maxDataLoss).toBeGreaterThan(0);
    });

    it('should validate compliance targets', () => {
      expect(COMPLIANCE_TARGETS.rpo.legal).toBe(60);
      expect(COMPLIANCE_TARGETS.rpo.financial).toBe(30);
      expect(COMPLIANCE_TARGETS.rto.critical).toBe(240);
      expect(COMPLIANCE_TARGETS.rto.standard).toBe(480);
    });
  });
});

describe('Integration Tests', () => {
  let backupSystem: BackupSystem;
  let scheduler: BackupScheduler;
  let drManager: DisasterRecoveryManager;

  beforeEach(() => {
    backupSystem = new BackupSystem(createBackupConfig());
    scheduler = new BackupScheduler(createDefaultScheduleConfig());
    drManager = new DisasterRecoveryManager(createDefaultDRConfig());

    // Mock all external dependencies
    jest.spyOn(backupSystem, 'createFullBackup').mockResolvedValue({
      id: 'integration-backup',
      timestamp: new Date(),
      type: 'full',
      size: 2048,
      checksum: 'integration-checksum',
      encrypted: true,
      compressed: true,
      status: 'completed',
      retention: { category: 'weekly', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      location: { primary: '/backup/integration' },
      verification: { verified: false }
    });
  });

  afterEach(async () => {
    await scheduler.stop();
    await drManager.shutdown();
    jest.clearAllMocks();
  });

  it('should integrate backup system with scheduler', async () => {
    await scheduler.start();
    
    // Trigger a manual backup through scheduler
    const job = await scheduler.triggerJob('full');
    
    expect(job.status).toBe('completed');
    expect(job.result).toHaveProperty('id');
    expect(job.result.id).toBe('integration-backup');
  });

  it('should integrate DR manager with backup system', async () => {
    await drManager.initialize();
    
    const health = await drManager.performHealthCheck();
    expect(health.status).toBe('healthy');
    
    const report = await drManager.getSystemStatusReport();
    expect(report.health).toBeDefined();
    expect(report.backupStatus).toBeDefined();
  });

  it('should handle end-to-end disaster recovery scenario', async () => {
    // Initialize all systems
    await scheduler.start();
    await drManager.initialize();
    
    // Perform health check
    const health = await drManager.performHealthCheck();
    expect(health.status).toBe('healthy');
    
    // Trigger backup
    const backupJob = await scheduler.triggerJob('full');
    expect(backupJob.status).toBe('completed');
    
    // Run DR tests
    const drTest = await drManager.testDisasterRecovery();
    expect(drTest.passed + drTest.failed).toBeGreaterThan(0);
    
    // Get final status report
    const report = await drManager.getSystemStatusReport();
    expect(report.health.status).toBe('healthy');
  });
});