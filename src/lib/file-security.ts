/**
 * File Security Scanning and Validation
 * Provides comprehensive security checks for uploaded files
 */

import { createHash } from 'crypto'

export interface FileSecurityResult {
  isSecure: boolean
  threats: string[]
  score: number // 0-100 (100 = completely safe)
  checks: {
    fileExtension: boolean
    fileSize: boolean
    magicBytes: boolean
    maliciousPatterns: boolean
    fileStructure: boolean
  }
}

export interface ScanOptions {
  maxFileSize: number
  allowedExtensions: string[]
  enableDeepScan: boolean
}

const DEFAULT_OPTIONS: ScanOptions = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.csv', '.xlsx', '.xls'],
  enableDeepScan: true,
}

// Known malicious file signatures (magic bytes)
const MALICIOUS_SIGNATURES = [
  // Windows executables
  '4d5a', // MZ header (Windows PE)
  '504b0304', // ZIP/JAR with potential payload
  // Script injections
  '3c73637269707420', // <script
  '6a6176617363726970743a', // javascript:
  // Suspicious patterns
  '25504446', // %PDF with anomalies
]

// Suspicious patterns in file content
const SUSPICIOUS_PATTERNS = [
  /javascript:/gi,
  /<script[^>]*>/gi,
  /eval\s*\(/gi,
  /document\.write/gi,
  /window\.location/gi,
  /XMLHttpRequest/gi,
  /<iframe[^>]*>/gi,
  /data:text\/html/gi,
  /data:application\/x-/gi,
]

// File structure validators
const VALID_PDF_SIGNATURE = '25504446' // %PDF
const VALID_JPEG_SIGNATURES = ['ffd8ff', 'ffd8ffe0', 'ffd8ffe1']
const VALID_PNG_SIGNATURE = '89504e47'
const VALID_GIF_SIGNATURES = ['474946383761', '474946383961'] // GIF87a, GIF89a

export class FileSecurityScanner {
  private options: ScanOptions

  constructor(options: Partial<ScanOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Perform comprehensive security scan on file
   */
  async scanFile(file: File): Promise<FileSecurityResult> {
    const result: FileSecurityResult = {
      isSecure: true,
      threats: [],
      score: 100,
      checks: {
        fileExtension: false,
        fileSize: false,
        magicBytes: false,
        maliciousPatterns: false,
        fileStructure: false,
      }
    }

    try {
      // Check file extension
      result.checks.fileExtension = this.validateFileExtension(file.name)
      if (!result.checks.fileExtension) {
        result.threats.push('Suspicious file extension')
        result.score -= 30
      }

      // Check file size
      result.checks.fileSize = this.validateFileSize(file.size)
      if (!result.checks.fileSize) {
        result.threats.push('File size exceeds security limits')
        result.score -= 20
      }

      // Get file buffer for deep scanning
      const buffer = Buffer.from(await file.arrayBuffer())

      // Check magic bytes
      result.checks.magicBytes = this.validateMagicBytes(buffer)
      if (!result.checks.magicBytes) {
        result.threats.push('Suspicious file signature detected')
        result.score -= 40
      }

      // Scan for malicious patterns
      if (this.options.enableDeepScan) {
        result.checks.maliciousPatterns = this.scanForMaliciousPatterns(buffer)
        if (!result.checks.maliciousPatterns) {
          result.threats.push('Malicious content patterns detected')
          result.score -= 35
        }

        // Validate file structure
        result.checks.fileStructure = await this.validateFileStructure(file, buffer)
        if (!result.checks.fileStructure) {
          result.threats.push('Invalid or corrupted file structure')
          result.score -= 25
        }
      }

      // Final security assessment
      result.isSecure = result.score >= 70 && result.threats.length === 0
      
      return result

    } catch (error) {
      console.error('File security scan error:', error)
      return {
        isSecure: false,
        threats: ['Security scan failed'],
        score: 0,
        checks: {
          fileExtension: false,
          fileSize: false,
          magicBytes: false,
          maliciousPatterns: false,
          fileStructure: false,
        }
      }
    }
  }

  /**
   * Validate file extension against allowed list
   */
  private validateFileExtension(filename: string): boolean {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    return this.options.allowedExtensions.includes(extension)
  }

  /**
   * Validate file size
   */
  private validateFileSize(size: number): boolean {
    return size > 0 && size <= this.options.maxFileSize
  }

  /**
   * Check file magic bytes for known malicious signatures
   */
  private validateMagicBytes(buffer: Buffer): boolean {
    const header = buffer.subarray(0, 16).toString('hex').toLowerCase()
    
    // Check for known malicious signatures
    for (const signature of MALICIOUS_SIGNATURES) {
      if (header.startsWith(signature)) {
        return false
      }
    }

    return true
  }

  /**
   * Scan file content for malicious patterns
   */
  private scanForMaliciousPatterns(buffer: Buffer): boolean {
    const content = buffer.toString('utf8')
    
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(content)) {
        return false
      }
    }

    return true
  }

  /**
   * Validate file structure based on file type
   */
  private async validateFileStructure(file: File, buffer: Buffer): Promise<boolean> {
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    const header = buffer.subarray(0, 16).toString('hex').toLowerCase()

    switch (extension) {
      case '.pdf':
        return header.startsWith(VALID_PDF_SIGNATURE)
      
      case '.jpg':
      case '.jpeg':
        return VALID_JPEG_SIGNATURES.some(sig => header.startsWith(sig))
      
      case '.png':
        return header.startsWith(VALID_PNG_SIGNATURE)
      
      case '.gif':
        return VALID_GIF_SIGNATURES.some(sig => header.startsWith(sig))
      
      case '.csv':
        // CSV should be plain text with no suspicious binary content
        try {
          const text = buffer.toString('utf8')
          return text.length > 0 && !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/.test(text)
        } catch {
          return false
        }
      
      case '.xlsx':
      case '.xls':
        // Excel files should start with ZIP signature (XLSX) or OLE signature (XLS)
        return header.startsWith('504b0304') || header.startsWith('d0cf11e0')
      
      default:
        return true // Unknown extensions pass structure check
    }
  }

  /**
   * Generate file hash for integrity checking
   */
  generateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex')
  }

  /**
   * Check file against known malware hash database (stub)
   * In production, this would query external threat intelligence APIs
   */
  async checkMalwareDatabase(fileHash: string): Promise<boolean> {
    // Stub implementation - in production, integrate with:
    // - VirusTotal API
    // - Microsoft Defender API
    // - Custom threat intelligence feeds
    
    const KNOWN_MALWARE_HASHES = [
      // Add known malicious file hashes here
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // empty file
    ]

    return !KNOWN_MALWARE_HASHES.includes(fileHash.toLowerCase())
  }

  /**
   * Quarantine suspicious file (move to quarantine directory)
   */
  async quarantineFile(filePath: string, reason: string): Promise<void> {
    // Implementation would move file to secure quarantine location
    // and log the incident for security monitoring
    console.warn(`File quarantined: ${filePath}, Reason: ${reason}`)
  }
}

// Export default scanner instance
export const fileSecurityScanner = new FileSecurityScanner()

// Export security check function for easy use
export async function performSecurityScan(file: File): Promise<FileSecurityResult> {
  return fileSecurityScanner.scanFile(file)
}