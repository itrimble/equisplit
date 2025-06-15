/**
 * @jest-environment node
 */

import { FileSecurityScanner, performSecurityScan } from '@/lib/file-security'

// Mock crypto module
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mocked-hash-value')
  }))
}))

// Helper to create mock files
const createMockFile = (
  name: string, 
  type: string, 
  content: string = 'test content',
  size?: number
): File => {
  const buffer = Buffer.from(content)
  const blob = new Blob([buffer], { type })
  Object.defineProperty(blob, 'name', { value: name })
  Object.defineProperty(blob, 'size', { value: size || buffer.length })
  Object.defineProperty(blob, 'arrayBuffer', {
    value: async () => buffer.buffer
  })
  return blob as File
}

describe('FileSecurityScanner', () => {
  let scanner: FileSecurityScanner

  beforeEach(() => {
    scanner = new FileSecurityScanner()
  })

  describe('Valid File Scanning', () => {
    it('should pass security scan for valid PDF file', async () => {
      // PDF file with proper header
      const pdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\nThis is a test PDF content'
      const file = createMockFile('document.pdf', 'application/pdf', pdfContent)

      const result = await scanner.scanFile(file)

      expect(result.isSecure).toBe(true)
      expect(result.threats).toHaveLength(0)
      expect(result.score).toBe(100)
      expect(result.checks.fileExtension).toBe(true)
      expect(result.checks.fileSize).toBe(true)
      expect(result.checks.fileStructure).toBe(true)
    })

    it('should pass security scan for valid JPEG image', async () => {
      // JPEG file with proper header (simplified)
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])
      const jpegContent = Buffer.concat([jpegHeader, Buffer.from('...image data...')])
      const file = createMockFile('image.jpg', 'image/jpeg', jpegContent.toString())

      const result = await scanner.scanFile(file)

      expect(result.isSecure).toBe(true)
      expect(result.threats).toHaveLength(0)
      expect(result.score).toBe(100)
    })

    it('should pass security scan for valid CSV file', async () => {
      const csvContent = 'Name,Amount,Type\nSavings Account,10000,Asset\nMortgage,150000,Debt'
      const file = createMockFile('data.csv', 'text/csv', csvContent)

      const result = await scanner.scanFile(file)

      expect(result.isSecure).toBe(true)
      expect(result.threats).toHaveLength(0)
      expect(result.score).toBe(100)
    })
  })

  describe('Security Threat Detection', () => {
    it('should detect malicious file extensions', async () => {
      const file = createMockFile('malware.exe', 'application/octet-stream')
      
      const result = await scanner.scanFile(file)

      expect(result.isSecure).toBe(false)
      expect(result.threats).toContain('Suspicious file extension')
      expect(result.score).toBeLessThan(100)
      expect(result.checks.fileExtension).toBe(false)
    })

    it('should detect oversized files', async () => {
      const file = createMockFile('large.pdf', 'application/pdf', 'content', 20 * 1024 * 1024) // 20MB
      
      const result = await scanner.scanFile(file)

      expect(result.isSecure).toBe(false)
      expect(result.threats).toContain('File size exceeds security limits')
      expect(result.score).toBeLessThan(100)
      expect(result.checks.fileSize).toBe(false)
    })

    it('should detect suspicious magic bytes', async () => {
      // Windows PE header (MZ)
      const maliciousContent = Buffer.from([0x4D, 0x5A, 0x90, 0x00]) // MZ header
      const file = createMockFile('document.pdf', 'application/pdf', maliciousContent.toString())
      
      const result = await scanner.scanFile(file)

      expect(result.isSecure).toBe(false)
      expect(result.threats).toContain('Suspicious file signature detected')
      expect(result.score).toBeLessThan(100)
      expect(result.checks.magicBytes).toBe(false)
    })

    it('should detect malicious script patterns', async () => {
      const maliciousContent = 'This file contains <script>alert("XSS")</script> malicious content'
      const file = createMockFile('document.pdf', 'application/pdf', maliciousContent)
      
      const result = await scanner.scanFile(file)

      expect(result.isSecure).toBe(false)
      expect(result.threats).toContain('Malicious content patterns detected')
      expect(result.score).toBeLessThan(100)
      expect(result.checks.maliciousPatterns).toBe(false)
    })

    it('should detect JavaScript injection patterns', async () => {
      const maliciousContent = 'javascript:alert("malicious")'
      const file = createMockFile('data.csv', 'text/csv', maliciousContent)
      
      const result = await scanner.scanFile(file)

      expect(result.isSecure).toBe(false)
      expect(result.threats).toContain('Malicious content patterns detected')
      expect(result.checks.maliciousPatterns).toBe(false)
    })

    it('should detect file structure mismatches', async () => {
      // PDF extension but JPEG content
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])
      const file = createMockFile('document.pdf', 'application/pdf', jpegHeader.toString())
      
      const result = await scanner.scanFile(file)

      expect(result.isSecure).toBe(false)
      expect(result.threats).toContain('Invalid or corrupted file structure')
      expect(result.checks.fileStructure).toBe(false)
    })
  })

  describe('Configuration Options', () => {
    it('should respect custom file size limits', async () => {
      const customScanner = new FileSecurityScanner({ 
        maxFileSize: 1024 // 1KB limit
      })
      const file = createMockFile('large.pdf', 'application/pdf', 'content', 2048) // 2KB file
      
      const result = await customScanner.scanFile(file)

      expect(result.checks.fileSize).toBe(false)
      expect(result.threats).toContain('File size exceeds security limits')
    })

    it('should respect custom allowed extensions', async () => {
      const customScanner = new FileSecurityScanner({ 
        allowedExtensions: ['.txt', '.md']
      })
      const file = createMockFile('document.pdf', 'application/pdf')
      
      const result = await customScanner.scanFile(file)

      expect(result.checks.fileExtension).toBe(false)
      expect(result.threats).toContain('Suspicious file extension')
    })

    it('should skip deep scan when disabled', async () => {
      const customScanner = new FileSecurityScanner({ 
        enableDeepScan: false
      })
      const maliciousContent = '<script>alert("XSS")</script>'
      const file = createMockFile('document.pdf', 'application/pdf', maliciousContent)
      
      const result = await customScanner.scanFile(file)

      // Should not check malicious patterns when deep scan is disabled
      expect(result.checks.maliciousPatterns).toBe(false)
      expect(result.checks.fileStructure).toBe(false)
    })
  })

  describe('File Hash Generation', () => {
    it('should generate file hash correctly', () => {
      const buffer = Buffer.from('test content')
      const hash = scanner.generateFileHash(buffer)
      
      expect(hash).toBe('mocked-hash-value')
    })
  })

  describe('Malware Database Check', () => {
    it('should check against malware hash database', async () => {
      const cleanHash = 'clean-file-hash'
      const maliciousHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      
      const cleanResult = await scanner.checkMalwareDatabase(cleanHash)
      const maliciousResult = await scanner.checkMalwareDatabase(maliciousHash)
      
      expect(cleanResult).toBe(true)
      expect(maliciousResult).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle scan errors gracefully', async () => {
      // Create a file that will cause arrayBuffer() to throw
      const file = createMockFile('error.pdf', 'application/pdf')
      Object.defineProperty(file, 'arrayBuffer', {
        value: () => Promise.reject(new Error('Read error'))
      })
      
      const result = await scanner.scanFile(file)

      expect(result.isSecure).toBe(false)
      expect(result.threats).toContain('Security scan failed')
      expect(result.score).toBe(0)
    })
  })

  describe('Exported Functions', () => {
    it('should export performSecurityScan function', async () => {
      const file = createMockFile('test.pdf', 'application/pdf', '%PDF-1.4 test content')
      
      const result = await performSecurityScan(file)

      expect(result).toBeDefined()
      expect(result.isSecure).toBeDefined()
      expect(result.threats).toBeDefined()
      expect(result.score).toBeDefined()
      expect(result.checks).toBeDefined()
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle multiple security issues in one file', async () => {
      // Large file with malicious content and wrong extension
      const maliciousContent = '<script>alert("XSS")</script>'.repeat(1000)
      const file = createMockFile('document.exe', 'application/octet-stream', maliciousContent, 15 * 1024 * 1024)
      
      const result = await scanner.scanFile(file)

      expect(result.isSecure).toBe(false)
      expect(result.threats.length).toBeGreaterThan(1)
      expect(result.threats).toContain('Suspicious file extension')
      expect(result.threats).toContain('File size exceeds security limits')
      expect(result.threats).toContain('Malicious content patterns detected')
      expect(result.score).toBeLessThan(50)
    })

    it('should handle edge case file names', async () => {
      const edgeCaseFiles = [
        createMockFile('', 'application/pdf'), // empty name
        createMockFile('file.with.multiple.dots.pdf', 'application/pdf'),
        createMockFile('file with spaces.pdf', 'application/pdf'),
        createMockFile('файл.pdf', 'application/pdf'), // unicode
      ]

      for (const file of edgeCaseFiles) {
        const result = await scanner.scanFile(file)
        expect(result).toBeDefined()
        expect(typeof result.isSecure).toBe('boolean')
      }
    })
  })
})