import { auditLogger, AuditAction, ComplianceLevel } from './audit';

/**
 * Security Monitoring and Alerting System
 * Provides real-time security monitoring, threat detection, and compliance tracking
 */

export enum ThreatLevel {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum SecurityEventType {
  AUTHENTICATION_FAILURE = 'auth_failure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_REQUEST = 'suspicious_request',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  MALICIOUS_UPLOAD = 'malicious_upload',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  CSRF_ATTEMPT = 'csrf_attempt',
  UNUSUAL_ACTIVITY = 'unusual_activity'
}

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  level: ThreatLevel;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  details: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private events: SecurityEvent[] = [];
  private alertThresholds = {
    [ThreatLevel.LOW]: 10,     // 10 events in 5 minutes
    [ThreatLevel.MEDIUM]: 5,   // 5 events in 5 minutes  
    [ThreatLevel.HIGH]: 3,     // 3 events in 5 minutes
    [ThreatLevel.CRITICAL]: 1, // 1 event triggers immediate alert
  };

  public static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  /**
   * Record a security event
   */
  async recordEvent(
    type: SecurityEventType,
    level: ThreatLevel,
    request: Request,
    details: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      type,
      level,
      timestamp: new Date(),
      userId,
      sessionId: this.extractSessionId(request),
      ipAddress: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      endpoint: new URL(request.url).pathname,
      details,
      resolved: false,
    };

    // Store event
    this.events.push(event);
    
    // Log to audit system
    await auditLogger.logSecurityEvent(
      `${type}: ${level}`,
      level,
      request,
      { eventId: event.id, ...details }
    );

    // Check if we need to trigger alerts
    await this.checkAlertThresholds(event);

    // Clean up old events (keep last 1000)
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  /**
   * Analyze request for security threats
   */
  async analyzeRequest(request: Request, userId?: string): Promise<void> {
    const url = new URL(request.url);
    const body = await this.getRequestBody(request);
    
    // Check for SQL injection attempts
    if (this.detectSQLInjection(url.toString(), body)) {
      await this.recordEvent(
        SecurityEventType.SQL_INJECTION_ATTEMPT,
        ThreatLevel.HIGH,
        request,
        { url: url.toString(), bodyPreview: this.sanitizeForLogging(body) },
        userId
      );
    }

    // Check for XSS attempts
    if (this.detectXSS(url.toString(), body)) {
      await this.recordEvent(
        SecurityEventType.XSS_ATTEMPT,
        ThreatLevel.HIGH,
        request,
        { url: url.toString(), bodyPreview: this.sanitizeForLogging(body) },
        userId
      );
    }

    // Check for unusual patterns
    if (await this.detectUnusualActivity(request, userId)) {
      await this.recordEvent(
        SecurityEventType.UNUSUAL_ACTIVITY,
        ThreatLevel.MEDIUM,
        request,
        { pattern: 'unusual_request_pattern' },
        userId
      );
    }
  }

  /**
   * Track authentication failures
   */
  async trackAuthFailure(request: Request, reason: string): Promise<void> {
    await this.recordEvent(
      SecurityEventType.AUTHENTICATION_FAILURE,
      ThreatLevel.MEDIUM,
      request,
      { reason, timestamp: new Date().toISOString() }
    );
  }

  /**
   * Track rate limit violations
   */
  async trackRateLimitViolation(request: Request, endpoint: string): Promise<void> {
    await this.recordEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      ThreatLevel.MEDIUM,
      request,
      { endpoint, timestamp: new Date().toISOString() }
    );
  }

  /**
   * Get security metrics for monitoring dashboard
   */
  getSecurityMetrics(hours: number = 24): {
    totalEvents: number;
    eventsByType: Record<SecurityEventType, number>;
    eventsByLevel: Record<ThreatLevel, number>;
    topIPs: Array<{ ip: string; count: number }>;
    unresolvedEvents: number;
  } {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp > cutoff);

    const eventsByType = {} as Record<SecurityEventType, number>;
    const eventsByLevel = {} as Record<ThreatLevel, number>;
    const ipCounts = new Map<string, number>();

    recentEvents.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsByLevel[event.level] = (eventsByLevel[event.level] || 0) + 1;
      ipCounts.set(event.ipAddress, (ipCounts.get(event.ipAddress) || 0) + 1);
    });

    const topIPs = Array.from(ipCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsByLevel,
      topIPs,
      unresolvedEvents: recentEvents.filter(e => !e.resolved).length,
    };
  }

  /**
   * Resolve a security event
   */
  async resolveEvent(eventId: string, resolvedBy: string): Promise<boolean> {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return false;

    event.resolved = true;
    event.resolvedAt = new Date();
    event.resolvedBy = resolvedBy;

    return true;
  }

  /**
   * Get unresolved security events
   */
  getUnresolvedEvents(level?: ThreatLevel): SecurityEvent[] {
    return this.events
      .filter(e => !e.resolved)
      .filter(e => !level || e.level === level)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Private helper methods
  private async checkAlertThresholds(event: SecurityEvent): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEvents = this.events
      .filter(e => e.timestamp > fiveMinutesAgo && e.level === event.level)
      .length;

    if (recentEvents >= this.alertThresholds[event.level]) {
      await this.triggerAlert(event, recentEvents);
    }
  }

  private async triggerAlert(event: SecurityEvent, eventCount: number): Promise<void> {
    console.error(`🚨 SECURITY ALERT [${event.level.toUpperCase()}]: ${event.type}`);
    console.error(`${eventCount} events of level ${event.level} in the last 5 minutes`);
    console.error(`Latest event: ${JSON.stringify(event, null, 2)}`);

    // In production, integrate with:
    // - PagerDuty
    // - Slack alerts
    // - Email notifications
    // - SIEM systems
    
    if (event.level === ThreatLevel.CRITICAL) {
      // Critical events require immediate response
      // TODO: Implement emergency response procedures
    }
  }

  private detectSQLInjection(url: string, body?: string): boolean {
    const sqlPatterns = [
      /(\bunion\s+select\b)/i,
      /(\bdrop\s+table\b)/i,
      /(\binsert\s+into\b)/i,
      /(\bdelete\s+from\b)/i,
      /(\bselect\s+.*\s+from\b)/i,
      /(\bor\s+1\s*=\s*1\b)/i,
      /(\band\s+1\s*=\s*1\b)/i,
      /(\b'\s*or\s*'.*'\s*=\s*'\b)/i,
      /(\b--\s*\w+)/,
      /(\b\/\*.*\*\/\b)/,
    ];

    const content = `${url} ${body || ''}`.toLowerCase();
    return sqlPatterns.some(pattern => pattern.test(content));
  }

  private detectXSS(url: string, body?: string): boolean {
    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/i,
      /javascript\s*:/i,
      /vbscript\s*:/i,
      /on\w+\s*=/i,
      /<iframe[\s\S]*?>/i,
      /<object[\s\S]*?>/i,
      /<embed[\s\S]*?>/i,
      /data\s*:\s*text\/html/i,
    ];

    const content = `${url} ${body || ''}`;
    return xssPatterns.some(pattern => pattern.test(content));
  }

  private async detectUnusualActivity(request: Request, userId?: string): Promise<boolean> {
    // Check for unusual request patterns
    const userAgent = request.headers.get('user-agent') || '';
    const ip = this.getClientIP(request);
    
    // Bot detection
    if (this.isSuspiciousUserAgent(userAgent)) {
      return true;
    }

    // Check request frequency from same IP
    const recentRequests = this.events
      .filter(e => e.ipAddress === ip)
      .filter(e => e.timestamp > new Date(Date.now() - 60000)) // Last minute
      .length;

    return recentRequests > 20; // More than 20 requests per minute
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousAgents = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scanner/i,
      /curl/i,
      /wget/i,
      /python/i,
      /sqlmap/i,
      /nikto/i,
      /nessus/i,
    ];

    return suspiciousAgents.some(pattern => pattern.test(userAgent));
  }

  private async getRequestBody(request: Request): Promise<string | undefined> {
    try {
      if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
        const clone = request.clone();
        return await clone.text();
      }
    } catch (error) {
      // Body already consumed or error reading
    }
    return undefined;
  }

  private sanitizeForLogging(data?: string): string {
    if (!data) return '';
    
    // Remove sensitive data patterns
    return data
      .replace(/password\s*[:=]\s*["']?[^"'\s]+["']?/gi, 'password: [REDACTED]')
      .replace(/token\s*[:=]\s*["']?[^"'\s]+["']?/gi, 'token: [REDACTED]')
      .replace(/key\s*[:=]\s*["']?[^"'\s]+["']?/gi, 'key: [REDACTED]')
      .substring(0, 500); // Limit length
  }

  private getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }
    
    return 'unknown';
  }

  private extractSessionId(request: Request): string | undefined {
    const cookie = request.headers.get('cookie');
    if (cookie) {
      const sessionMatch = cookie.match(/next-auth\.session-token=([^;]+)/);
      if (sessionMatch) {
        // Simple hash for session ID (in production use a proper hash function)
        return sessionMatch[1].substring(0, 16);
      }
    }
    return undefined;
  }
}

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance();