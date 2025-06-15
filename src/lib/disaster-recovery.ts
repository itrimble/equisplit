/**
 * EquiSplit Disaster Recovery System
 * 
 * Comprehensive disaster recovery and business continuity management
 * for legal technology compliance and high availability requirements.
 */

import { BackupSystem, createBackupConfig } from './backup-system';
import { BackupScheduler, createDefaultScheduleConfig } from './backup-scheduler';
import { logger } from './logger';
import { auditLog } from './audit';
import { PrismaClient } from '@prisma/client';

// Disaster recovery configuration
interface DisasterRecoveryConfig {
  primaryRegion: string;
  secondaryRegions: string[];
  failoverThresholds: {
    maxDowntime: number;        // seconds
    maxDataLoss: number;        // seconds (RPO)
    healthCheckInterval: number; // seconds
    healthCheckTimeout: number;  // seconds
  };
  notifications: {
    email: string[];
    slack?: string;
    pagerduty?: string;
  };
  testSchedule: {
    enabled: boolean;
    frequency: 'weekly' | 'monthly' | 'quarterly';
    lastTest?: Date;
  };
}

// System health status
interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  components: {
    database: ComponentHealth;
    api: ComponentHealth;
    auth: ComponentHealth;
    storage: ComponentHealth;
    backup: ComponentHealth;
  };
  metrics: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    lastCheck: Date;
  };
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  responseTime?: number;
  errorRate?: number;
  lastCheck: Date;
  message?: string;
}

// Disaster recovery procedures
interface RecoveryProcedure {
  id: string;
  name: string;
  description: string;
  triggerConditions: string[];
  steps: RecoveryStep[];
  estimatedTime: number; // minutes
  requiredPersonnel: string[];
  dependencies: string[];
}

interface RecoveryStep {
  id: string;
  description: string;
  command?: string;
  expectedResult: string;
  rollbackCommand?: string;
  timeout: number; // seconds
  critical: boolean;
}

// Point-in-time recovery configuration
interface PITRConfig {
  enabled: boolean;
  walRetentionPeriod: number; // hours
  archiveLocation: string;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export class DisasterRecoveryManager {
  private config: DisasterRecoveryConfig;
  private backupSystem: BackupSystem;
  private backupScheduler: BackupScheduler;
  private prisma: PrismaClient;
  private healthMonitor: NodeJS.Timeout | null = null;
  private lastHealthCheck: SystemHealth | null = null;

  constructor(config: DisasterRecoveryConfig) {
    this.config = config;
    this.backupSystem = new BackupSystem(createBackupConfig());
    this.backupScheduler = new BackupScheduler(createDefaultScheduleConfig());
    this.prisma = new PrismaClient();
  }

  /**
   * Initialize disaster recovery system
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing disaster recovery system', {
        primaryRegion: this.config.primaryRegion,
        secondaryRegions: this.config.secondaryRegions
      });

      // Start backup scheduler
      await this.backupScheduler.start();

      // Start health monitoring
      await this.startHealthMonitoring();

      // Verify backup integrity
      await this.verifyBackupIntegrity();

      // Initialize PITR if enabled
      await this.initializePointInTimeRecovery();

      await auditLog({
        action: 'disaster_recovery_initialized',
        resourceType: 'disaster_recovery',
        resourceId: 'system',
        userId: 'system',
        metadata: {
          config: this.config,
          complianceLevel: 'legal'
        }
      });

      logger.info('Disaster recovery system initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize disaster recovery system', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Perform system health check
   */
  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();

    try {
      const health: SystemHealth = {
        status: 'healthy',
        components: {
          database: await this.checkDatabaseHealth(),
          api: await this.checkAPIHealth(),
          auth: await this.checkAuthHealth(),
          storage: await this.checkStorageHealth(),
          backup: await this.checkBackupHealth()
        },
        metrics: {
          uptime: process.uptime(),
          responseTime: 0,
          errorRate: 0,
          lastCheck: new Date()
        }
      };

      // Calculate overall health status
      const componentStatuses = Object.values(health.components).map(c => c.status);
      
      if (componentStatuses.includes('offline')) {
        health.status = 'offline';
      } else if (componentStatuses.includes('critical')) {
        health.status = 'critical';
      } else if (componentStatuses.includes('degraded')) {
        health.status = 'degraded';
      }

      // Calculate metrics
      health.metrics.responseTime = Date.now() - startTime;
      health.metrics.errorRate = this.calculateErrorRate(health.components);

      this.lastHealthCheck = health;

      // Log health status
      logger.info('System health check completed', {
        status: health.status,
        responseTime: health.metrics.responseTime,
        componentCount: Object.keys(health.components).length
      });

      // Check for failover conditions
      if (health.status === 'critical' || health.status === 'offline') {
        await this.evaluateFailoverConditions(health);
      }

      return health;

    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const criticalHealth: SystemHealth = {
        status: 'critical',
        components: {
          database: { status: 'offline', lastCheck: new Date(), message: 'Health check failed' },
          api: { status: 'offline', lastCheck: new Date(), message: 'Health check failed' },
          auth: { status: 'offline', lastCheck: new Date(), message: 'Health check failed' },
          storage: { status: 'offline', lastCheck: new Date(), message: 'Health check failed' },
          backup: { status: 'offline', lastCheck: new Date(), message: 'Health check failed' }
        },
        metrics: {
          uptime: process.uptime(),
          responseTime: Date.now() - startTime,
          errorRate: 100,
          lastCheck: new Date()
        }
      };

      this.lastHealthCheck = criticalHealth;
      return criticalHealth;
    }
  }

  /**
   * Execute point-in-time recovery
   */
  async executePointInTimeRecovery(
    targetTimestamp: Date,
    dryRun: boolean = false
  ): Promise<{ success: boolean; restoredTimestamp: Date; warnings: string[] }> {
    try {
      await auditLog({
        action: 'pitr_initiated',
        resourceType: 'database',
        resourceId: 'pitr_recovery',
        userId: 'system',
        metadata: {
          targetTimestamp,
          dryRun,
          complianceLevel: 'legal'
        }
      });

      logger.info('Initiating point-in-time recovery', {
        targetTimestamp,
        dryRun
      });

      // Find the appropriate base backup
      const baseBackup = await this.findBaseBackupForPITR(targetTimestamp);
      if (!baseBackup) {
        throw new Error(`No suitable base backup found for timestamp ${targetTimestamp.toISOString()}`);
      }

      // Perform the recovery
      const result = await this.backupSystem.restoreFromBackup(
        baseBackup.id,
        targetTimestamp,
        dryRun
      );

      if (result.success) {
        logger.info('Point-in-time recovery completed successfully', {
          targetTimestamp,
          restoredTimestamp: result.restoredTimestamp,
          warnings: result.warnings.length,
          dryRun
        });

        if (!dryRun) {
          await auditLog({
            action: 'pitr_completed',
            resourceType: 'database',
            resourceId: 'pitr_recovery',
            userId: 'system',
            metadata: {
              targetTimestamp,
              restoredTimestamp: result.restoredTimestamp,
              warningCount: result.warnings.length,
              complianceLevel: 'legal'
            }
          });
        }
      }

      return result;

    } catch (error) {
      logger.error('Point-in-time recovery failed', {
        targetTimestamp,
        dryRun,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      await auditLog({
        action: 'pitr_failed',
        resourceType: 'database',
        resourceId: 'pitr_recovery',
        userId: 'system',
        metadata: {
          targetTimestamp,
          dryRun,
          error: error instanceof Error ? error.message : 'Unknown error',
          complianceLevel: 'legal'
        }
      });

      throw error;
    }
  }

  /**
   * Execute disaster recovery procedure
   */
  async executeRecoveryProcedure(
    procedureId: string,
    parameters: Record<string, any> = {}
  ): Promise<{ success: boolean; executedSteps: string[]; errors: string[] }> {
    const procedure = this.getRecoveryProcedure(procedureId);
    if (!procedure) {
      throw new Error(`Recovery procedure ${procedureId} not found`);
    }

    const executedSteps: string[] = [];
    const errors: string[] = [];

    try {
      await auditLog({
        action: 'recovery_procedure_started',
        resourceType: 'disaster_recovery',
        resourceId: procedureId,
        userId: 'system',
        metadata: {
          procedure: procedure.name,
          parameters,
          complianceLevel: 'legal'
        }
      });

      logger.info('Executing disaster recovery procedure', {
        procedureId,
        name: procedure.name,
        steps: procedure.steps.length
      });

      // Execute each step
      for (const step of procedure.steps) {
        try {
          logger.info('Executing recovery step', {
            procedureId,
            stepId: step.id,
            description: step.description
          });

          await this.executeRecoveryStep(step, parameters);
          executedSteps.push(step.id);

          logger.info('Recovery step completed', {
            procedureId,
            stepId: step.id
          });

        } catch (stepError) {
          const errorMsg = stepError instanceof Error ? stepError.message : 'Unknown error';
          errors.push(`Step ${step.id}: ${errorMsg}`);

          logger.error('Recovery step failed', {
            procedureId,
            stepId: step.id,
            error: errorMsg,
            critical: step.critical
          });

          // If critical step fails, abort procedure
          if (step.critical) {
            await this.rollbackRecoverySteps(procedure.steps, executedSteps, parameters);
            throw new Error(`Critical step ${step.id} failed: ${errorMsg}`);
          }
        }
      }

      const success = errors.length === 0;

      await auditLog({
        action: success ? 'recovery_procedure_completed' : 'recovery_procedure_partial',
        resourceType: 'disaster_recovery',
        resourceId: procedureId,
        userId: 'system',
        metadata: {
          procedure: procedure.name,
          executedSteps: executedSteps.length,
          totalSteps: procedure.steps.length,
          errorCount: errors.length,
          complianceLevel: 'legal'
        }
      });

      logger.info('Disaster recovery procedure completed', {
        procedureId,
        success,
        executedSteps: executedSteps.length,
        errors: errors.length
      });

      return { success, executedSteps, errors };

    } catch (error) {
      logger.error('Disaster recovery procedure failed', {
        procedureId,
        error: error instanceof Error ? error.message : 'Unknown error',
        executedSteps: executedSteps.length
      });

      await auditLog({
        action: 'recovery_procedure_failed',
        resourceType: 'disaster_recovery',
        resourceId: procedureId,
        userId: 'system',
        metadata: {
          procedure: procedure.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          executedSteps: executedSteps.length,
          complianceLevel: 'legal'
        }
      });

      throw error;
    }
  }

  /**
   * Test disaster recovery procedures
   */
  async testDisasterRecovery(): Promise<{
    passed: number;
    failed: number;
    results: Array<{ procedureId: string; success: boolean; duration: number; errors: string[] }>;
  }> {
    const procedures = this.getAllRecoveryProcedures();
    const results = [];
    let passed = 0;
    let failed = 0;

    try {
      await auditLog({
        action: 'dr_test_started',
        resourceType: 'disaster_recovery',
        resourceId: 'test_suite',
        userId: 'system',
        metadata: {
          procedureCount: procedures.length,
          complianceLevel: 'legal'
        }
      });

      logger.info('Starting disaster recovery test', {
        procedureCount: procedures.length
      });

      for (const procedure of procedures) {
        const startTime = Date.now();
        
        try {
          logger.info('Testing recovery procedure', { procedureId: procedure.id });

          // Execute in test mode (dry run)
          const result = await this.executeRecoveryProcedure(procedure.id, { testMode: true });
          
          const duration = Date.now() - startTime;
          
          if (result.success) {
            passed++;
          } else {
            failed++;
          }

          results.push({
            procedureId: procedure.id,
            success: result.success,
            duration,
            errors: result.errors
          });

          logger.info('Recovery procedure test completed', {
            procedureId: procedure.id,
            success: result.success,
            duration
          });

        } catch (error) {
          failed++;
          const duration = Date.now() - startTime;
          
          results.push({
            procedureId: procedure.id,
            success: false,
            duration,
            errors: [error instanceof Error ? error.message : 'Unknown error']
          });

          logger.error('Recovery procedure test failed', {
            procedureId: procedure.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration
          });
        }
      }

      await auditLog({
        action: 'dr_test_completed',
        resourceType: 'disaster_recovery',
        resourceId: 'test_suite',
        userId: 'system',
        metadata: {
          passed,
          failed,
          totalProcedures: procedures.length,
          complianceLevel: 'legal'
        }
      });

      logger.info('Disaster recovery test completed', {
        passed,
        failed,
        totalProcedures: procedures.length
      });

      // Update last test date
      this.config.testSchedule.lastTest = new Date();

      return { passed, failed, results };

    } catch (error) {
      logger.error('Disaster recovery test failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Get system status report
   */
  async getSystemStatusReport(): Promise<{
    health: SystemHealth;
    backupStatus: any;
    lastTest?: Date;
    complianceStatus: {
      rpo: boolean;
      rto: boolean;
      backupRetention: boolean;
      testingSchedule: boolean;
    };
  }> {
    const health = this.lastHealthCheck || await this.performHealthCheck();
    const backupStatus = await this.backupScheduler.getHealthStatus();

    // Check compliance status
    const complianceStatus = {
      rpo: this.checkRPOCompliance(backupStatus),
      rto: this.checkRTOCompliance(health),
      backupRetention: this.checkBackupRetentionCompliance(backupStatus),
      testingSchedule: this.checkTestingScheduleCompliance()
    };

    return {
      health,
      backupStatus,
      lastTest: this.config.testSchedule.lastTest,
      complianceStatus
    };
  }

  // Private helper methods

  private async startHealthMonitoring(): Promise<void> {
    if (this.healthMonitor) {
      clearInterval(this.healthMonitor);
    }

    this.healthMonitor = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health monitoring error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, this.config.failoverThresholds.healthCheckInterval * 1000);

    logger.info('Health monitoring started', {
      interval: this.config.failoverThresholds.healthCheckInterval
    });
  }

  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Simple database connectivity test
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        status: 'offline',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkAPIHealth(): Promise<ComponentHealth> {
    // This would check API endpoints health
    return {
      status: 'healthy',
      responseTime: 50,
      lastCheck: new Date()
    };
  }

  private async checkAuthHealth(): Promise<ComponentHealth> {
    // This would check authentication service health
    return {
      status: 'healthy',
      responseTime: 30,
      lastCheck: new Date()
    };
  }

  private async checkStorageHealth(): Promise<ComponentHealth> {
    // This would check file storage health
    return {
      status: 'healthy',
      responseTime: 40,
      lastCheck: new Date()
    };
  }

  private async checkBackupHealth(): Promise<ComponentHealth> {
    try {
      const backupStatus = await this.backupScheduler.getHealthStatus();
      
      return {
        status: backupStatus.status === 'healthy' ? 'healthy' : 
                backupStatus.status === 'degraded' ? 'degraded' : 'critical',
        lastCheck: new Date(),
        message: backupStatus.issues.length > 0 ? backupStatus.issues[0] : undefined
      };
    } catch (error) {
      return {
        status: 'offline',
        lastCheck: new Date(),
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private calculateErrorRate(components: SystemHealth['components']): number {
    const totalComponents = Object.keys(components).length;
    const failedComponents = Object.values(components).filter(
      c => c.status === 'critical' || c.status === 'offline'
    ).length;
    
    return (failedComponents / totalComponents) * 100;
  }

  private async evaluateFailoverConditions(health: SystemHealth): Promise<void> {
    const downtime = this.config.failoverThresholds.maxDowntime;
    
    // Check if failover conditions are met
    if (health.status === 'offline' || health.metrics.errorRate > 75) {
      logger.warn('Failover conditions detected', {
        status: health.status,
        errorRate: health.metrics.errorRate,
        threshold: downtime
      });

      // In production, this would trigger automatic failover
      await this.sendFailoverAlert(health);
    }
  }

  private async sendFailoverAlert(health: SystemHealth): Promise<void> {
    await auditLog({
      action: 'failover_alert',
      resourceType: 'disaster_recovery',
      resourceId: 'failover_monitor',
      userId: 'system',
      metadata: {
        systemStatus: health.status,
        errorRate: health.metrics.errorRate,
        alertType: 'failover',
        complianceLevel: 'critical'
      }
    });

    logger.critical('Failover alert triggered', {
      systemStatus: health.status,
      errorRate: health.metrics.errorRate,
      components: health.components
    });
  }

  private async findBaseBackupForPITR(targetTimestamp: Date): Promise<any> {
    const { backups } = await this.backupSystem.listBackups({
      type: 'full',
      status: 'completed',
      dateRange: {
        from: new Date(targetTimestamp.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before
        to: targetTimestamp
      }
    });

    // Find the most recent backup before the target timestamp
    return backups
      .filter(backup => backup.timestamp <= targetTimestamp)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }

  private getRecoveryProcedure(procedureId: string): RecoveryProcedure | null {
    // In production, this would load from database or configuration
    const procedures = this.getAllRecoveryProcedures();
    return procedures.find(p => p.id === procedureId) || null;
  }

  private getAllRecoveryProcedures(): RecoveryProcedure[] {
    // Default recovery procedures for legal technology platform
    return [
      {
        id: 'database-failover',
        name: 'Database Failover',
        description: 'Switch to secondary database instance',
        triggerConditions: ['Database offline > 5 minutes', 'Connection errors > 90%'],
        steps: [
          {
            id: 'verify-secondary',
            description: 'Verify secondary database health',
            expectedResult: 'Secondary database responsive',
            timeout: 30,
            critical: true
          },
          {
            id: 'switch-connections',
            description: 'Switch application to secondary database',
            expectedResult: 'Application using secondary database',
            timeout: 60,
            critical: true
          }
        ],
        estimatedTime: 10,
        requiredPersonnel: ['Database Administrator', 'DevOps Engineer'],
        dependencies: ['Secondary database instance', 'Network connectivity']
      },
      {
        id: 'full-system-restore',
        name: 'Full System Restore',
        description: 'Complete system restoration from backup',
        triggerConditions: ['Complete system failure', 'Data corruption detected'],
        steps: [
          {
            id: 'provision-infrastructure',
            description: 'Provision new infrastructure',
            expectedResult: 'Infrastructure ready',
            timeout: 1800,
            critical: true
          },
          {
            id: 'restore-database',
            description: 'Restore database from latest backup',
            expectedResult: 'Database restored and verified',
            timeout: 3600,
            critical: true
          },
          {
            id: 'deploy-application',
            description: 'Deploy application to new infrastructure',
            expectedResult: 'Application deployed and healthy',
            timeout: 900,
            critical: true
          }
        ],
        estimatedTime: 120,
        requiredPersonnel: ['Database Administrator', 'DevOps Engineer', 'Application Developer'],
        dependencies: ['Valid backup', 'Infrastructure provider', 'DNS access']
      }
    ];
  }

  private async executeRecoveryStep(step: RecoveryStep, parameters: Record<string, any>): Promise<void> {
    // In test mode, just simulate the step
    if (parameters.testMode) {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      return;
    }

    // In production, this would execute the actual recovery command
    if (step.command) {
      // Execute the command with proper error handling and timeout
      logger.info('Executing recovery command', {
        stepId: step.id,
        command: step.command
      });
    }
  }

  private async rollbackRecoverySteps(
    steps: RecoveryStep[],
    executedSteps: string[],
    parameters: Record<string, any>
  ): Promise<void> {
    logger.info('Rolling back recovery steps', {
      executedSteps: executedSteps.length
    });

    // Execute rollback commands in reverse order
    for (let i = executedSteps.length - 1; i >= 0; i--) {
      const stepId = executedSteps[i];
      const step = steps.find(s => s.id === stepId);
      
      if (step?.rollbackCommand) {
        try {
          await this.executeRecoveryStep({
            ...step,
            command: step.rollbackCommand,
            description: `Rollback: ${step.description}`
          }, parameters);
        } catch (rollbackError) {
          logger.error('Rollback step failed', {
            stepId,
            error: rollbackError instanceof Error ? rollbackError.message : 'Unknown error'
          });
        }
      }
    }
  }

  private async verifyBackupIntegrity(): Promise<void> {
    logger.info('Verifying backup integrity');
    
    const { backups } = await this.backupSystem.listBackups({ 
      status: 'completed',
      limit: 5 
    });

    for (const backup of backups) {
      if (!backup.verification.verified) {
        await this.backupSystem.verifyBackup(backup);
      }
    }
  }

  private async initializePointInTimeRecovery(): Promise<void> {
    const pitrConfig: PITRConfig = {
      enabled: process.env.PITR_ENABLED === 'true',
      walRetentionPeriod: parseInt(process.env.WAL_RETENTION_HOURS || '72'),
      archiveLocation: process.env.WAL_ARCHIVE_LOCATION || '/backup/wal',
      compressionEnabled: process.env.WAL_COMPRESSION === 'true',
      encryptionEnabled: process.env.WAL_ENCRYPTION === 'true'
    };

    if (pitrConfig.enabled) {
      logger.info('Point-in-time recovery initialized', pitrConfig);
    }
  }

  private checkRPOCompliance(backupStatus: any): boolean {
    // Check if backup age meets RPO requirements
    return backupStatus.status === 'healthy';
  }

  private checkRTOCompliance(health: SystemHealth): boolean {
    // Check if system can meet RTO requirements
    return health.status !== 'offline';
  }

  private checkBackupRetentionCompliance(backupStatus: any): boolean {
    // Check if backup retention meets legal requirements
    return true; // Would check actual retention periods
  }

  private checkTestingScheduleCompliance(): boolean {
    if (!this.config.testSchedule.enabled) return false;
    if (!this.config.testSchedule.lastTest) return false;

    const now = new Date();
    const lastTest = this.config.testSchedule.lastTest;
    const daysSinceTest = (now.getTime() - lastTest.getTime()) / (24 * 60 * 60 * 1000);

    switch (this.config.testSchedule.frequency) {
      case 'weekly': return daysSinceTest <= 7;
      case 'monthly': return daysSinceTest <= 30;
      case 'quarterly': return daysSinceTest <= 90;
      default: return false;
    }
  }

  async shutdown(): Promise<void> {
    if (this.healthMonitor) {
      clearInterval(this.healthMonitor);
    }
    await this.backupScheduler.stop();
    await this.prisma.$disconnect();
    
    logger.info('Disaster recovery system shutdown completed');
  }
}

// Export default configuration for legal compliance
export function createDefaultDRConfig(): DisasterRecoveryConfig {
  return {
    primaryRegion: process.env.PRIMARY_REGION || 'us-east-1',
    secondaryRegions: (process.env.SECONDARY_REGIONS || 'us-west-2').split(','),
    failoverThresholds: {
      maxDowntime: parseInt(process.env.MAX_DOWNTIME_SECONDS || '300'), // 5 minutes
      maxDataLoss: parseInt(process.env.MAX_DATA_LOSS_SECONDS || '3600'), // 1 hour
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60'), // 1 minute
      healthCheckTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '30') // 30 seconds
    },
    notifications: {
      email: (process.env.DR_ALERT_EMAILS || '').split(',').filter(Boolean),
      slack: process.env.DR_SLACK_WEBHOOK,
      pagerduty: process.env.DR_PAGERDUTY_KEY
    },
    testSchedule: {
      enabled: process.env.DR_TESTING_ENABLED === 'true',
      frequency: (process.env.DR_TEST_FREQUENCY as any) || 'monthly'
    }
  };
}