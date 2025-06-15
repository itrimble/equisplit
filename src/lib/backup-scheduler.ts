/**
 * EquiSplit Backup Scheduler
 * 
 * Automated backup scheduling system with cron-like functionality
 * for legal compliance and disaster recovery requirements.
 */

import { BackupSystem, createBackupConfig, COMPLIANCE_TARGETS } from './backup-system';
import { logger } from './logger';
import { auditLog } from './audit';

// Backup schedule configuration
interface BackupScheduleConfig {
  full: {
    enabled: boolean;
    cron: string;        // Cron expression for full backups
    retention: 'weekly' | 'monthly' | 'yearly';
  };
  incremental: {
    enabled: boolean;
    cron: string;        // Cron expression for incremental backups
    retention: 'daily';
  };
  verification: {
    enabled: boolean;
    cron: string;        // Cron expression for backup verification
    samplePercentage: number; // Percentage of backups to verify
  };
  cleanup: {
    enabled: boolean;
    cron: string;        // Cron expression for cleanup
  };
  monitoring: {
    enabled: boolean;
    alertThresholds: {
      backupAge: number;     // Hours since last backup
      failureCount: number;  // Consecutive failures
      verificationAge: number; // Hours since last verification
    };
  };
}

// Backup job status tracking
interface BackupJob {
  id: string;
  type: 'full' | 'incremental' | 'verification' | 'cleanup';
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  result?: any;
  error?: string;
  nextRun?: Date;
}

export class BackupScheduler {
  private config: BackupScheduleConfig;
  private backupSystem: BackupSystem;
  private jobs: Map<string, BackupJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private running: boolean = false;

  constructor(config: BackupScheduleConfig) {
    this.config = config;
    this.backupSystem = new BackupSystem(createBackupConfig());
  }

  /**
   * Start the backup scheduler
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('Backup scheduler is already running');
      return;
    }

    this.running = true;
    
    await auditLog({
      action: 'backup_scheduler_started',
      resourceType: 'backup_system',
      resourceId: 'scheduler',
      userId: 'system',
      metadata: {
        config: this.config,
        complianceLevel: 'legal'
      }
    });

    logger.info('Starting backup scheduler', { config: this.config });

    // Schedule full backups
    if (this.config.full.enabled) {
      this.scheduleJob('full-backup', this.config.full.cron, () => this.executeFullBackup());
    }

    // Schedule incremental backups
    if (this.config.incremental.enabled) {
      this.scheduleJob('incremental-backup', this.config.incremental.cron, () => this.executeIncrementalBackup());
    }

    // Schedule backup verification
    if (this.config.verification.enabled) {
      this.scheduleJob('verification', this.config.verification.cron, () => this.executeVerification());
    }

    // Schedule cleanup
    if (this.config.cleanup.enabled) {
      this.scheduleJob('cleanup', this.config.cleanup.cron, () => this.executeCleanup());
    }

    // Start monitoring
    if (this.config.monitoring.enabled) {
      this.scheduleJob('monitoring', '*/15 * * * *', () => this.executeMonitoring()); // Every 15 minutes
    }

    logger.info('Backup scheduler started successfully');
  }

  /**
   * Stop the backup scheduler
   */
  async stop(): Promise<void> {
    if (!this.running) {
      logger.warn('Backup scheduler is not running');
      return;
    }

    this.running = false;

    // Clear all timers
    for (const [jobId, timer] of this.timers) {
      clearTimeout(timer);
      logger.info('Cancelled scheduled job', { jobId });
    }
    
    this.timers.clear();

    await auditLog({
      action: 'backup_scheduler_stopped',
      resourceType: 'backup_system',
      resourceId: 'scheduler',
      userId: 'system',
      metadata: {
        jobCount: this.jobs.size,
        complianceLevel: 'standard'
      }
    });

    logger.info('Backup scheduler stopped');
  }

  /**
   * Get status of all backup jobs
   */
  getJobStatus(): BackupJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get backup system health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    lastBackup?: Date;
    lastVerification?: Date;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Check last backup age
      const { backups } = await this.backupSystem.listBackups({ 
        status: 'completed',
        limit: 1 
      });

      const lastBackup = backups[0]?.timestamp;
      const lastBackupAge = lastBackup ? Date.now() - lastBackup.getTime() : Infinity;
      
      // Check against compliance targets
      const maxAge = COMPLIANCE_TARGETS.rpo.legal * 60 * 1000; // Convert hours to milliseconds
      
      if (lastBackupAge > maxAge) {
        issues.push(`Last backup is ${Math.round(lastBackupAge / (60 * 60 * 1000))} hours old (exceeds ${COMPLIANCE_TARGETS.rpo.legal}h RPO)`);
      }

      // Check verification status
      const verifiedBackups = await this.backupSystem.listBackups({ 
        status: 'verified',
        limit: 1 
      });

      const lastVerification = verifiedBackups.backups[0]?.verification.verifiedAt;
      const lastVerificationAge = lastVerification ? Date.now() - lastVerification.getTime() : Infinity;
      
      if (lastVerificationAge > (24 * 60 * 60 * 1000)) { // 24 hours
        issues.push('No backup verification in last 24 hours');
        recommendations.push('Run backup verification to ensure recoverability');
      }

      // Check for failed jobs
      const failedJobs = Array.from(this.jobs.values()).filter(job => 
        job.status === 'failed' && 
        Date.now() - job.scheduledAt.getTime() < (24 * 60 * 60 * 1000)
      );

      if (failedJobs.length > 0) {
        issues.push(`${failedJobs.length} backup jobs failed in last 24 hours`);
        recommendations.push('Review failed job logs and address underlying issues');
      }

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
      
      if (issues.length > 0) {
        status = lastBackupAge > (maxAge * 2) ? 'critical' : 'degraded';
      }

      return {
        status,
        lastBackup,
        lastVerification,
        issues,
        recommendations
      };

    } catch (error) {
      logger.error('Failed to get backup health status', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        status: 'critical',
        issues: ['Unable to determine backup health status'],
        recommendations: ['Check backup system configuration and database connectivity']
      };
    }
  }

  /**
   * Manually trigger a backup job
   */
  async triggerJob(type: 'full' | 'incremental' | 'verification' | 'cleanup'): Promise<BackupJob> {
    const jobId = `manual-${type}-${Date.now()}`;
    
    const job: BackupJob = {
      id: jobId,
      type,
      status: 'scheduled',
      scheduledAt: new Date()
    };

    this.jobs.set(jobId, job);

    logger.info('Manually triggering backup job', { jobId, type });

    try {
      job.status = 'running';
      job.startedAt = new Date();

      let result: any;
      switch (type) {
        case 'full':
          result = await this.executeFullBackup();
          break;
        case 'incremental':
          result = await this.executeIncrementalBackup();
          break;
        case 'verification':
          result = await this.executeVerification();
          break;
        case 'cleanup':
          result = await this.executeCleanup();
          break;
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.duration = job.completedAt.getTime() - job.startedAt.getTime();
      job.result = result;

      logger.info('Manual backup job completed', { 
        jobId, 
        type, 
        duration: job.duration 
      });

      return job;

    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.duration = job.startedAt ? job.completedAt.getTime() - job.startedAt.getTime() : 0;
      job.error = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Manual backup job failed', {
        jobId,
        type,
        error: job.error,
        duration: job.duration
      });

      throw error;
    }
  }

  // Private methods

  private scheduleJob(jobId: string, cronExpression: string, handler: () => Promise<any>): void {
    // Parse cron expression and calculate next run time
    const nextRun = this.parseCronExpression(cronExpression);
    const delay = nextRun.getTime() - Date.now();

    const timer = setTimeout(async () => {
      await this.executeScheduledJob(jobId, cronExpression, handler);
    }, delay);

    this.timers.set(jobId, timer);

    const job: BackupJob = {
      id: jobId,
      type: this.getJobTypeFromId(jobId),
      status: 'scheduled',
      scheduledAt: new Date(),
      nextRun
    };

    this.jobs.set(jobId, job);

    logger.info('Scheduled backup job', { 
      jobId, 
      cronExpression, 
      nextRun,
      delay: Math.round(delay / 1000) 
    });
  }

  private async executeScheduledJob(jobId: string, cronExpression: string, handler: () => Promise<any>): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      logger.info('Executing scheduled backup job', { jobId });

      job.status = 'running';
      job.startedAt = new Date();

      const result = await handler();

      job.status = 'completed';
      job.completedAt = new Date();
      job.duration = job.completedAt.getTime() - job.startedAt.getTime();
      job.result = result;

      logger.info('Scheduled backup job completed', { 
        jobId, 
        duration: job.duration 
      });

    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.duration = job.startedAt ? job.completedAt.getTime() - job.startedAt.getTime() : 0;
      job.error = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Scheduled backup job failed', {
        jobId,
        error: job.error,
        duration: job.duration
      });

      // Send alert for failed job
      await this.sendFailureAlert(job);
    }

    // Schedule next run if scheduler is still running
    if (this.running) {
      this.scheduleJob(jobId, cronExpression, handler);
    }
  }

  private async executeFullBackup(): Promise<any> {
    logger.info('Starting scheduled full backup');
    const result = await this.backupSystem.createFullBackup();
    
    await auditLog({
      action: 'scheduled_full_backup',
      resourceType: 'backup',
      resourceId: result.id,
      userId: 'system',
      metadata: {
        size: result.size,
        checksum: result.checksum,
        complianceLevel: 'legal'
      }
    });

    return result;
  }

  private async executeIncrementalBackup(): Promise<any> {
    logger.info('Starting scheduled incremental backup');
    
    // Get the latest full backup as base
    const { backups } = await this.backupSystem.listBackups({ 
      type: 'full',
      status: 'completed',
      limit: 1 
    });

    if (backups.length === 0) {
      logger.warn('No full backup found for incremental backup, creating full backup instead');
      return await this.executeFullBackup();
    }

    const baseBackup = backups[0];
    const result = await this.backupSystem.createIncrementalBackup(baseBackup.id);

    await auditLog({
      action: 'scheduled_incremental_backup',
      resourceType: 'backup',
      resourceId: result.id,
      userId: 'system',
      metadata: {
        baseBackupId: baseBackup.id,
        size: result.size,
        complianceLevel: 'legal'
      }
    });

    return result;
  }

  private async executeVerification(): Promise<any> {
    logger.info('Starting scheduled backup verification');
    
    const { backups } = await this.backupSystem.listBackups({ 
      status: 'completed',
      limit: Math.ceil(100 / this.config.verification.samplePercentage) // Sample based on percentage
    });

    const verificationResults = [];
    
    for (const backup of backups) {
      if (!backup.verification.verified || Math.random() * 100 < this.config.verification.samplePercentage) {
        const result = await this.backupSystem.verifyBackup(backup);
        verificationResults.push({
          backupId: backup.id,
          ...result
        });
      }
    }

    await auditLog({
      action: 'scheduled_backup_verification',
      resourceType: 'backup_system',
      resourceId: 'verification_job',
      userId: 'system',
      metadata: {
        verifiedCount: verificationResults.length,
        failedCount: verificationResults.filter(r => !r.valid).length,
        complianceLevel: 'standard'
      }
    });

    return verificationResults;
  }

  private async executeCleanup(): Promise<any> {
    logger.info('Starting scheduled backup cleanup');
    const result = await this.backupSystem.cleanupExpiredBackups();

    await auditLog({
      action: 'scheduled_backup_cleanup',
      resourceType: 'backup_system',
      resourceId: 'cleanup_job',
      userId: 'system',
      metadata: {
        deletedCount: result.deleted,
        errorCount: result.errors.length,
        complianceLevel: 'standard'
      }
    });

    return result;
  }

  private async executeMonitoring(): Promise<any> {
    const healthStatus = await this.getHealthStatus();
    
    // Check alert thresholds
    if (healthStatus.status === 'critical' || healthStatus.status === 'degraded') {
      await this.sendHealthAlert(healthStatus);
    }

    return healthStatus;
  }

  private async sendFailureAlert(job: BackupJob): Promise<void> {
    logger.error('Backup job failure alert', {
      jobId: job.id,
      type: job.type,
      error: job.error,
      scheduledAt: job.scheduledAt,
      duration: job.duration
    });

    // In production, this would send alerts via email, Slack, PagerDuty, etc.
    await auditLog({
      action: 'backup_failure_alert',
      resourceType: 'backup_system',
      resourceId: job.id,
      userId: 'system',
      metadata: {
        jobType: job.type,
        error: job.error,
        alertType: 'failure',
        complianceLevel: 'standard'
      }
    });
  }

  private async sendHealthAlert(healthStatus: any): Promise<void> {
    logger.warn('Backup system health alert', {
      status: healthStatus.status,
      issues: healthStatus.issues,
      lastBackup: healthStatus.lastBackup,
      lastVerification: healthStatus.lastVerification
    });

    // In production, this would send health alerts
    await auditLog({
      action: 'backup_health_alert',
      resourceType: 'backup_system',
      resourceId: 'health_monitor',
      userId: 'system',
      metadata: {
        status: healthStatus.status,
        issueCount: healthStatus.issues.length,
        alertType: 'health',
        complianceLevel: 'standard'
      }
    });
  }

  private parseCronExpression(cronExpression: string): Date {
    // Simple cron parser - in production would use a proper cron library
    const now = new Date();
    
    // Handle common cron patterns
    if (cronExpression === '0 2 * * *') { // Daily at 2 AM
      const next = new Date(now);
      next.setHours(2, 0, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }
    
    if (cronExpression === '0 */6 * * *') { // Every 6 hours
      const next = new Date(now);
      next.setMinutes(0, 0, 0);
      next.setHours(Math.ceil(next.getHours() / 6) * 6);
      return next;
    }

    if (cronExpression === '*/15 * * * *') { // Every 15 minutes
      const next = new Date(now);
      next.setSeconds(0, 0);
      next.setMinutes(Math.ceil(next.getMinutes() / 15) * 15);
      return next;
    }

    if (cronExpression === '0 3 * * 0') { // Weekly on Sunday at 3 AM
      const next = new Date(now);
      next.setHours(3, 0, 0, 0);
      const daysUntilSunday = (7 - next.getDay()) % 7;
      if (daysUntilSunday === 0 && next <= now) {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + daysUntilSunday);
      }
      return next;
    }

    // Default to 1 hour from now for unknown patterns
    const next = new Date(now.getTime() + 60 * 60 * 1000);
    return next;
  }

  private getJobTypeFromId(jobId: string): BackupJob['type'] {
    if (jobId.includes('full')) return 'full';
    if (jobId.includes('incremental')) return 'incremental';
    if (jobId.includes('verification')) return 'verification';
    if (jobId.includes('cleanup')) return 'cleanup';
    return 'full';
  }
}

// Export default schedule configuration for legal compliance
export function createDefaultScheduleConfig(): BackupScheduleConfig {
  return {
    full: {
      enabled: true,
      cron: '0 2 * * *',        // Daily at 2 AM
      retention: 'weekly'
    },
    incremental: {
      enabled: true,
      cron: '0 */6 * * *',      // Every 6 hours
      retention: 'daily'
    },
    verification: {
      enabled: true,
      cron: '0 3 * * 0',        // Weekly on Sunday at 3 AM
      samplePercentage: 25      // Verify 25% of backups
    },
    cleanup: {
      enabled: true,
      cron: '0 4 * * *'         // Daily at 4 AM
    },
    monitoring: {
      enabled: true,
      alertThresholds: {
        backupAge: 8,           // Alert if no backup in 8 hours
        failureCount: 3,        // Alert after 3 consecutive failures
        verificationAge: 72     // Alert if no verification in 72 hours
      }
    }
  };
}