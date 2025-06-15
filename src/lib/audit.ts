import { prisma } from './prisma';
import crypto from 'crypto';

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  CALCULATE = 'calculate',
  DOWNLOAD = 'download',
  PAYMENT = 'payment',
  EXPORT = 'export'
}

export enum ComplianceLevel {
  STANDARD = 'standard',
  FINANCIAL = 'financial',
  LEGAL = 'legal'
}

export interface AuditLogEntry {
  userId?: string;
  sessionId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  complianceLevel: ComplianceLevel;
  timestamp?: Date;
}

export class AuditLogger {
  private static instance: AuditLogger;
  
  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Create a hash of sensitive details for integrity verification
      const detailsHash = entry.details 
        ? crypto.createHash('sha256').update(JSON.stringify(entry.details)).digest('hex')
        : null;

      await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          userId: entry.userId,
          sessionId: entry.sessionId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          details: entry.details ? JSON.stringify(entry.details) : null,
          detailsHash,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          complianceLevel: entry.complianceLevel,
          timestamp: entry.timestamp || new Date(),
        },
      });
    } catch (error) {
      // Log to external monitoring service in production
      console.error('Failed to write audit log:', error);
      
      // In production, this should alert monitoring systems
      if (process.env.NODE_ENV === 'production') {
        // TODO: Integrate with monitoring service (DataDog, New Relic, etc.)
      }
    }
  }

  async logUserAction(
    userId: string,
    action: AuditAction,
    resource: string,
    request?: Request,
    details?: Record<string, any>,
    complianceLevel: ComplianceLevel = ComplianceLevel.STANDARD
  ): Promise<void> {
    const ipAddress = this.getClientIP(request);
    const userAgent = request?.headers.get('user-agent') || undefined;
    const sessionId = this.extractSessionId(request);

    await this.log({
      userId,
      sessionId,
      action,
      resource,
      details,
      ipAddress,
      userAgent,
      complianceLevel,
    });
  }

  async logAnonymousAction(
    action: AuditAction,
    resource: string,
    request?: Request,
    details?: Record<string, any>,
    complianceLevel: ComplianceLevel = ComplianceLevel.STANDARD
  ): Promise<void> {
    const ipAddress = this.getClientIP(request);
    const userAgent = request?.headers.get('user-agent') || undefined;

    await this.log({
      action,
      resource,
      details,
      ipAddress,
      userAgent,
      complianceLevel,
    });
  }

  async logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    request?: Request,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action: AuditAction.READ,
      resource: 'security_event',
      details: {
        event,
        severity,
        ...details,
      },
      ipAddress: this.getClientIP(request),
      userAgent: request?.headers.get('user-agent') || undefined,
      complianceLevel: ComplianceLevel.LEGAL,
    });

    // Alert for high/critical security events
    if (severity === 'high' || severity === 'critical') {
      console.error(`SECURITY ALERT [${severity.toUpperCase()}]: ${event}`, details);
      // TODO: Integrate with alerting system
    }
  }

  private getClientIP(request?: Request): string | undefined {
    if (!request) return undefined;

    // Check various headers for client IP
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    return undefined;
  }

  private extractSessionId(request?: Request): string | undefined {
    if (!request) return undefined;

    // Extract session ID from cookies or headers
    const cookie = request.headers.get('cookie');
    if (cookie) {
      const sessionMatch = cookie.match(/next-auth\.session-token=([^;]+)/);
      if (sessionMatch) {
        return crypto.createHash('sha256').update(sessionMatch[1]).digest('hex').substring(0, 16);
      }
    }

    return undefined;
  }

  async getAuditTrail(
    userId?: string,
    resource?: string,
    action?: AuditAction,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<any[]> {
    const where: any = {};

    if (userId) where.userId = userId;
    if (resource) where.resource = resource;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    return await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        userId: true,
        action: true,
        resource: true,
        resourceId: true,
        ipAddress: true,
        complianceLevel: true,
        timestamp: true,
        // Don't include sensitive details in standard queries
      },
    });
  }
}

// Convenience export
export const auditLogger = AuditLogger.getInstance();