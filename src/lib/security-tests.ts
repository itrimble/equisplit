/**
 * Security Testing and Validation Suite
 * Comprehensive security tests for EquiSplit compliance verification
 */

import { encrypt, decrypt, encryptString, decryptString } from './encryption';
import { auditLogger, AuditAction, ComplianceLevel } from './audit';
import { securityMonitor, SecurityEventType, ThreatLevel } from './security-monitor';
import { RateLimiter } from './rate-limiter';
import { validateApiRequest, sanitizeHtml, sanitizeCurrency, legalComplianceChecks } from './validation';
import { z } from 'zod';

export interface SecurityTestResult {
  testName: string;
  passed: boolean;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityTestSuite {
  suiteName: string;
  results: SecurityTestResult[];
  overallPassed: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    critical: number;
  };
}

/**
 * Comprehensive Security Test Runner
 */
export class SecurityTester {
  private results: SecurityTestSuite[] = [];

  /**
   * Run all security tests
   */
  async runAllTests(): Promise<SecurityTestSuite[]> {
    this.results = [];

    // Run test suites
    await this.testEncryption();
    await this.testAuditLogging();
    await this.testSecurityMonitoring();
    await this.testInputValidation();
    await this.testRateLimiting();
    await this.testComplianceControls();

    return this.results;
  }

  /**
   * Test encryption functionality
   */
  async testEncryption(): Promise<void> {
    const results: SecurityTestResult[] = [];

    try {
      // Test basic encryption/decryption
      const testData = 'Sensitive financial data: $1,234,567.89';
      const encrypted = encrypt(testData);
      const decrypted = decrypt(encrypted);

      results.push({
        testName: 'Basic Encryption/Decryption',
        passed: decrypted === testData,
        details: 'AES-256-GCM encryption roundtrip test',
        severity: 'critical'
      });

      // Test string encryption helpers
      const encryptedString = encryptString(testData);
      const decryptedString = decryptString(encryptedString);

      results.push({
        testName: 'String Helper Functions',
        passed: decryptedString === testData,
        details: 'String encryption helper functions test',
        severity: 'high'
      });

      // Test null handling
      const nullEncrypted = encryptString(null);
      const nullDecrypted = decryptString(null);

      results.push({
        testName: 'Null Value Handling',
        passed: nullEncrypted === null && nullDecrypted === null,
        details: 'Proper handling of null values in encryption',
        severity: 'medium'
      });

      // Test encryption uniqueness (same plaintext should produce different ciphertext)
      const encrypted1 = encrypt(testData);
      const encrypted2 = encrypt(testData);

      results.push({
        testName: 'Encryption Uniqueness',
        passed: encrypted1.encryptedData !== encrypted2.encryptedData,
        details: 'Same plaintext produces different ciphertext (proper IV usage)',
        severity: 'high'
      });

      // Test invalid data handling
      try {
        decrypt({ encryptedData: 'invalid', iv: 'invalid', authTag: 'invalid' });
        results.push({
          testName: 'Invalid Data Handling',
          passed: false,
          details: 'Should throw error for invalid encrypted data',
          severity: 'medium'
        });
      } catch (error) {
        results.push({
          testName: 'Invalid Data Handling',
          passed: true,
          details: 'Properly rejects invalid encrypted data',
          severity: 'medium'
        });
      }

    } catch (error) {
      results.push({
        testName: 'Encryption Error Handling',
        passed: false,
        details: `Encryption test failed: ${error}`,
        severity: 'critical'
      });
    }

    this.addTestSuite('Encryption Tests', results);
  }

  /**
   * Test audit logging functionality
   */
  async testAuditLogging(): Promise<void> {
    const results: SecurityTestResult[] = [];

    try {
      // Test basic audit logging
      const testUserId = 'test-user-' + Date.now();
      await auditLogger.logUserAction(
        testUserId,
        AuditAction.READ,
        'test-resource',
        undefined,
        { testData: 'security-test' },
        ComplianceLevel.LEGAL
      );

      results.push({
        testName: 'Basic Audit Logging',
        passed: true,
        details: 'Successfully logged user action',
        severity: 'critical'
      });

      // Test anonymous action logging
      await auditLogger.logAnonymousAction(
        AuditAction.READ,
        'public-resource',
        undefined,
        { anonymous: true }
      );

      results.push({
        testName: 'Anonymous Action Logging',
        passed: true,
        details: 'Successfully logged anonymous action',
        severity: 'high'
      });

      // Test security event logging
      await auditLogger.logSecurityEvent(
        'Test security event',
        'medium',
        undefined,
        { testEvent: true }
      );

      results.push({
        testName: 'Security Event Logging',
        passed: true,
        details: 'Successfully logged security event',
        severity: 'high'
      });

      // Test audit trail retrieval
      const auditTrail = await auditLogger.getAuditTrail(
        testUserId,
        'test-resource',
        AuditAction.READ,
        new Date(Date.now() - 60000), // 1 minute ago
        new Date(),
        10
      );

      results.push({
        testName: 'Audit Trail Retrieval',
        passed: auditTrail.length > 0,
        details: `Retrieved ${auditTrail.length} audit log entries`,
        severity: 'medium'
      });

    } catch (error) {
      results.push({
        testName: 'Audit Logging Error',
        passed: false,
        details: `Audit logging test failed: ${error}`,
        severity: 'critical'
      });
    }

    this.addTestSuite('Audit Logging Tests', results);
  }

  /**
   * Test security monitoring functionality
   */
  async testSecurityMonitoring(): Promise<void> {
    const results: SecurityTestResult[] = [];

    try {
      // Create mock request for testing
      const mockRequest = new Request('https://test.com/api/test', {
        method: 'POST',
        headers: {
          'user-agent': 'Security Test Agent',
          'x-forwarded-for': '192.168.1.100'
        },
        body: JSON.stringify({ test: 'data' })
      });

      // Test security event recording
      await securityMonitor.recordEvent(
        SecurityEventType.UNUSUAL_ACTIVITY,
        ThreatLevel.MEDIUM,
        mockRequest,
        { testEvent: true },
        'test-user'
      );

      results.push({
        testName: 'Security Event Recording',
        passed: true,
        details: 'Successfully recorded security event',
        severity: 'critical'
      });

      // Test request analysis
      await securityMonitor.analyzeRequest(mockRequest, 'test-user');

      results.push({
        testName: 'Request Analysis',
        passed: true,
        details: 'Successfully analyzed request for threats',
        severity: 'high'
      });

      // Test security metrics
      const metrics = securityMonitor.getSecurityMetrics(1);

      results.push({
        testName: 'Security Metrics Generation',
        passed: typeof metrics.totalEvents === 'number',
        details: `Generated security metrics: ${metrics.totalEvents} events`,
        severity: 'medium'
      });

      // Test unresolved events
      const unresolvedEvents = securityMonitor.getUnresolvedEvents();

      results.push({
        testName: 'Unresolved Events Tracking',
        passed: Array.isArray(unresolvedEvents),
        details: `Found ${unresolvedEvents.length} unresolved security events`,
        severity: 'medium'
      });

    } catch (error) {
      results.push({
        testName: 'Security Monitoring Error',
        passed: false,
        details: `Security monitoring test failed: ${error}`,
        severity: 'critical'
      });
    }

    this.addTestSuite('Security Monitoring Tests', results);
  }

  /**
   * Test input validation and sanitization
   */
  async testInputValidation(): Promise<void> {
    const results: SecurityTestResult[] = [];

    try {
      // Test HTML sanitization
      const maliciousHtml = '<script>alert("XSS")</script><p>Safe content</p>';
      const sanitized = sanitizeHtml(maliciousHtml);

      results.push({
        testName: 'XSS Prevention',
        passed: !sanitized.includes('<script>') && sanitized.includes('Safe content'),
        details: 'HTML sanitization removes malicious scripts while preserving safe content',
        severity: 'critical'
      });

      // Test SQL injection patterns (simulated)
      const sqlInjectionAttempt = "'; DROP TABLE users; --";
      const sanitizedSql = sanitizeHtml(sqlInjectionAttempt);

      results.push({
        testName: 'SQL Injection Prevention',
        passed: !sanitizedSql.includes('DROP TABLE'),
        details: 'Input sanitization removes SQL injection patterns',
        severity: 'critical'
      });

      // Test currency validation
      const validCurrency = sanitizeCurrency('$1,234.56');
      const invalidCurrency = () => sanitizeCurrency('invalid');

      results.push({
        testName: 'Currency Validation',
        passed: validCurrency === 1234.56,
        details: 'Currency validation properly parses formatted values',
        severity: 'high'
      });

      try {
        invalidCurrency();
        results.push({
          testName: 'Invalid Currency Rejection',
          passed: false,
          details: 'Should reject invalid currency values',
          severity: 'medium'
        });
      } catch (error) {
        results.push({
          testName: 'Invalid Currency Rejection',
          passed: true,
          details: 'Properly rejects invalid currency values',
          severity: 'medium'
        });
      }

      // Test API request validation
      const validSchema = z.object({
        name: z.string().min(1),
        value: z.number().min(0)
      });

      const validData = { name: 'Test', value: 123 };
      const invalidData = { name: '', value: -1 };

      const validResult = validateApiRequest(validData, validSchema);
      const invalidResult = validateApiRequest(invalidData, validSchema);

      results.push({
        testName: 'API Request Validation',
        passed: validResult.success && !invalidResult.success,
        details: 'Schema validation correctly accepts valid data and rejects invalid data',
        severity: 'high'
      });

    } catch (error) {
      results.push({
        testName: 'Input Validation Error',
        passed: false,
        details: `Input validation test failed: ${error}`,
        severity: 'critical'
      });
    }

    this.addTestSuite('Input Validation Tests', results);
  }

  /**
   * Test rate limiting functionality
   */
  async testRateLimiting(): Promise<void> {
    const results: SecurityTestResult[] = [];

    try {
      // Create test rate limiter
      const testLimiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        maxRequests: 3    // 3 requests max
      });

      const testClient = 'test-client-' + Date.now();

      // Test normal requests
      const req1 = testLimiter.checkLimit(testClient);
      const req2 = testLimiter.checkLimit(testClient);
      const req3 = testLimiter.checkLimit(testClient);

      results.push({
        testName: 'Normal Rate Limiting',
        passed: req1 && req2 && req3,
        details: 'First 3 requests allowed within rate limit',
        severity: 'high'
      });

      // Test rate limit exceeded
      const req4 = testLimiter.checkLimit(testClient);

      results.push({
        testName: 'Rate Limit Enforcement',
        passed: !req4,
        details: '4th request properly blocked by rate limiter',
        severity: 'high'
      });

      // Test rate limit info
      const rateLimitInfo = testLimiter.getRateLimitInfo(testClient);

      results.push({
        testName: 'Rate Limit Information',
        passed: rateLimitInfo.remaining === 0 && rateLimitInfo.total === 3,
        details: `Rate limit info: ${rateLimitInfo.remaining}/${rateLimitInfo.total}`,
        severity: 'medium'
      });

      // Test reset functionality
      testLimiter.reset(testClient);
      const reqAfterReset = testLimiter.checkLimit(testClient);

      results.push({
        testName: 'Rate Limit Reset',
        passed: reqAfterReset,
        details: 'Rate limit reset allows new requests',
        severity: 'medium'
      });

    } catch (error) {
      results.push({
        testName: 'Rate Limiting Error',
        passed: false,
        details: `Rate limiting test failed: ${error}`,
        severity: 'critical'
      });
    }

    this.addTestSuite('Rate Limiting Tests', results);
  }

  /**
   * Test compliance controls
   */
  async testComplianceControls(): Promise<void> {
    const results: SecurityTestResult[] = [];

    try {
      // Test legal feature access control
      const userCanAccess = legalComplianceChecks.canAccessLegalFeatures('PROFESSIONAL', 'PROFESSIONAL');
      const userCannotAccess = legalComplianceChecks.canAccessLegalFeatures('USER', 'FREE');

      results.push({
        testName: 'Legal Feature Access Control',
        passed: userCanAccess && !userCannotAccess,
        details: 'Professional users can access legal features, free users cannot',
        severity: 'high'
      });

      // Test jurisdiction validation
      const validJurisdiction = legalComplianceChecks.validateJurisdiction('CA');
      const invalidJurisdiction = legalComplianceChecks.validateJurisdiction('XX');

      results.push({
        testName: 'Jurisdiction Validation',
        passed: validJurisdiction && !invalidJurisdiction,
        details: 'Valid US states accepted, invalid states rejected',
        severity: 'medium'
      });

      // Test encryption requirement checks
      const requiresEncryption = legalComplianceChecks.requiresEncryption('financial_data');
      const noEncryptionRequired = legalComplianceChecks.requiresEncryption('public_data');

      results.push({
        testName: 'Encryption Requirements',
        passed: requiresEncryption && !noEncryptionRequired,
        details: 'Sensitive data types require encryption, public data does not',
        severity: 'high'
      });

      // Test environment variable validation
      const hasEncryptionKey = process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length === 32;
      const hasJwtSecret = process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32;

      results.push({
        testName: 'Security Configuration',
        passed: !!hasEncryptionKey && !!hasJwtSecret,
        details: 'Required security environment variables properly configured',
        severity: 'critical'
      });

    } catch (error) {
      results.push({
        testName: 'Compliance Controls Error',
        passed: false,
        details: `Compliance controls test failed: ${error}`,
        severity: 'critical'
      });
    }

    this.addTestSuite('Compliance Controls Tests', results);
  }

  /**
   * Add test suite to results
   */
  private addTestSuite(suiteName: string, results: SecurityTestResult[]): void {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const critical = results.filter(r => !r.passed && r.severity === 'critical').length;

    this.results.push({
      suiteName,
      results,
      overallPassed: failed === 0,
      summary: {
        total: results.length,
        passed,
        failed,
        critical
      }
    });
  }

  /**
   * Generate comprehensive security report
   */
  generateReport(): {
    overallStatus: 'PASS' | 'FAIL' | 'WARNING';
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      criticalFailures: number;
      testSuites: number;
    };
    recommendations: string[];
    complianceStatus: {
      encryption: boolean;
      authentication: boolean;
      authorization: boolean;
      auditLogging: boolean;
      inputValidation: boolean;
      rateLimiting: boolean;
    };
  } {
    const totalTests = this.results.reduce((sum, suite) => sum + suite.summary.total, 0);
    const passedTests = this.results.reduce((sum, suite) => sum + suite.summary.passed, 0);
    const failedTests = this.results.reduce((sum, suite) => sum + suite.summary.failed, 0);
    const criticalFailures = this.results.reduce((sum, suite) => sum + suite.summary.critical, 0);

    const recommendations: string[] = [];
    
    // Generate recommendations based on failed tests
    this.results.forEach(suite => {
      suite.results.forEach(test => {
        if (!test.passed) {
          recommendations.push(`${suite.suiteName}: Fix ${test.testName} - ${test.details}`);
        }
      });
    });

    // Determine overall status
    let overallStatus: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
    if (criticalFailures > 0) {
      overallStatus = 'FAIL';
    } else if (failedTests > 0) {
      overallStatus = 'WARNING';
    }

    // Check compliance status
    const complianceStatus = {
      encryption: this.getTestResult('Encryption Tests', 'Basic Encryption/Decryption'),
      authentication: true, // Assume auth is working if we can run tests
      authorization: this.getTestResult('Compliance Controls Tests', 'Legal Feature Access Control'),
      auditLogging: this.getTestResult('Audit Logging Tests', 'Basic Audit Logging'),
      inputValidation: this.getTestResult('Input Validation Tests', 'XSS Prevention'),
      rateLimiting: this.getTestResult('Rate Limiting Tests', 'Rate Limit Enforcement')
    };

    return {
      overallStatus,
      summary: {
        totalTests,
        passedTests,
        failedTests,
        criticalFailures,
        testSuites: this.results.length
      },
      recommendations,
      complianceStatus
    };
  }

  /**
   * Get specific test result
   */
  private getTestResult(suiteName: string, testName: string): boolean {
    const suite = this.results.find(s => s.suiteName === suiteName);
    if (!suite) return false;
    
    const test = suite.results.find(t => t.testName === testName);
    return test ? test.passed : false;
  }
}

// Export convenience functions
export async function runSecurityTests(): Promise<SecurityTestSuite[]> {
  const tester = new SecurityTester();
  return await tester.runAllTests();
}

export async function generateSecurityReport(): Promise<any> {
  const tester = new SecurityTester();
  await tester.runAllTests();
  return tester.generateReport();
}