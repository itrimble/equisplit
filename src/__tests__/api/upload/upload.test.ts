/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/upload/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { auditLogger } from '@/lib/audit'
import { performSecurityScan } from '@/lib/file-security'

// Mock dependencies
jest.mock('@/lib/auth')
jest.mock('@/lib/prisma')
jest.mock('@/lib/audit')
jest.mock('@/lib/file-security')
jest.mock('fs/promises')
jest.mock('fs')
jest.mock('path')
jest.mock('pdf-parse')
jest.mock('tesseract.js')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockAuditLogger = auditLogger as jest.Mocked<typeof auditLogger>
const mockPerformSecurityScan = performSecurityScan as jest.MockedFunction<typeof performSecurityScan>

// Mock file objects
const createMockFile = (name: string, type: string, size: number = 1024): File => {
  const blob = new Blob(['test content'], { type })
  Object.defineProperty(blob, 'name', { value: name })
  Object.defineProperty(blob, 'size', { value: size })
  return blob as File
}

describe('/api/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default auth mock
    mockAuth.mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' }
    } as any)

    // Default security scan mock
    mockPerformSecurityScan.mockResolvedValue({
      isSecure: true,
      threats: [],
      score: 100,
      checks: {
        fileExtension: true,
        fileSize: true,
        magicBytes: true,
        maliciousPatterns: true,
        fileStructure: true,
      }
    })

    // Default audit logger mock
    mockAuditLogger.logUserAction = jest.fn().mockResolvedValue(undefined)

    // Default prisma mocks
    mockPrisma.calculation.findFirst = jest.fn()
    mockPrisma.document.create = jest.fn()
    mockPrisma.document.findMany = jest.fn()
  })

  describe('POST - Document Upload', () => {
    it('should upload a valid PDF document successfully', async () => {
      const file = createMockFile('test.pdf', 'application/pdf')
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', 'SUPPORTING_DOCUMENT')

      const request = new NextRequest('http://localhost:3000/api/upload?action=document', {
        method: 'POST',
        body: formData,
      })

      mockPrisma.document.create.mockResolvedValue({
        id: 'doc-123',
        filename: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        createdAt: new Date(),
      } as any)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.document.filename).toBe('test.pdf')
      expect(mockPerformSecurityScan).toHaveBeenCalledWith(file)
      expect(mockPrisma.document.create).toHaveBeenCalled()
    })

    it('should reject file that fails security scan', async () => {
      const file = createMockFile('malicious.pdf', 'application/pdf')
      const formData = new FormData()
      formData.append('file', file)

      mockPerformSecurityScan.mockResolvedValue({
        isSecure: false,
        threats: ['Malicious content detected'],
        score: 30,
        checks: {
          fileExtension: true,
          fileSize: true,
          magicBytes: false,
          maliciousPatterns: false,
          fileStructure: true,
        }
      })

      const request = new NextRequest('http://localhost:3000/api/upload?action=document', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File failed security scan')
      expect(data.details).toContain('Malicious content detected')
      expect(mockPrisma.document.create).not.toHaveBeenCalled()
    })

    it('should require authentication', async () => {
      mockAuth.mockResolvedValue(null)

      const file = createMockFile('test.pdf', 'application/pdf')
      const formData = new FormData()
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload?action=document', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should reject files that are too large', async () => {
      const file = createMockFile('large.pdf', 'application/pdf', 20 * 1024 * 1024) // 20MB
      const formData = new FormData()
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload?action=document', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File size exceeds limit')
    })
  })

  describe('POST - PDF Parsing', () => {
    it('should parse PDF and extract financial data', async () => {
      const file = createMockFile('financial.pdf', 'application/pdf')
      const formData = new FormData()
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload?action=parse-pdf', {
        method: 'POST',
        body: formData,
      })

      // Mock pdf-parse
      const mockPdfParse = require('pdf-parse')
      mockPdfParse.mockResolvedValue({
        numpages: 2,
        text: 'Bank Account: $50,000\nMortgage: $200,000\nRetirement Account: $75,000',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.pdfInfo.pages).toBe(2)
      expect(data.extractedData).toBeDefined()
      expect(data.extractedText).toContain('Bank Account')
    })

    it('should reject non-PDF files', async () => {
      const file = createMockFile('document.txt', 'text/plain')
      const formData = new FormData()
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload?action=parse-pdf', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File must be a PDF')
    })
  })

  describe('POST - OCR Processing', () => {
    it('should perform OCR on image files', async () => {
      const file = createMockFile('document.jpg', 'image/jpeg')
      const formData = new FormData()
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload?action=ocr-image', {
        method: 'POST',
        body: formData,
      })

      // Mock tesseract.js
      const { createWorker } = require('tesseract.js')
      const mockWorker = {
        recognize: jest.fn().mockResolvedValue({
          data: { text: 'Checking Account Balance: $25,000' }
        }),
        terminate: jest.fn().mockResolvedValue(undefined)
      }
      createWorker.mockResolvedValue(mockWorker)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.ocrText).toBe('Checking Account Balance: $25,000')
      expect(data.extractedData).toBeDefined()
    })

    it('should reject non-image files', async () => {
      const file = createMockFile('document.pdf', 'application/pdf')
      const formData = new FormData()
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload?action=ocr-image', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File must be an image')
    })
  })

  describe('POST - CSV Parsing', () => {
    it('should parse CSV and extract financial data', async () => {
      const csvContent = 'Description,Amount,Type\nSavings Account,$10000,Asset\nMortgage,$150000,Debt'
      const file = new Blob([csvContent], { type: 'text/csv' }) as File
      Object.defineProperty(file, 'name', { value: 'financial-data.csv' })
      Object.defineProperty(file, 'size', { value: csvContent.length })

      const formData = new FormData()
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload?action=parse-csv', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.csvInfo.rows).toBe(3) // header + 2 data rows
      expect(data.extractedFinancialData).toBeDefined()
      expect(data.extractedFinancialData.length).toBeGreaterThan(0)
    })

    it('should reject non-CSV files', async () => {
      const file = createMockFile('document.pdf', 'application/pdf')
      const formData = new FormData()
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/upload?action=parse-csv', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File must be CSV or Excel format')
    })
  })

  describe('GET - User Uploads', () => {
    it('should fetch user uploads successfully', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          type: 'SUPPORTING_DOCUMENT',
          title: 'Bank Statement',
          filename: 'bank-statement.pdf',
          fileSize: 2048,
          mimeType: 'application/pdf',
          status: 'COMPLETED',
          createdAt: new Date(),
          calculation: null,
        }
      ]

      mockPrisma.document.findMany.mockResolvedValue(mockDocuments as any)

      const request = new NextRequest('http://localhost:3000/api/upload?action=uploads')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.uploads).toEqual(mockDocuments)
      expect(data.pagination).toBeDefined()
    })

    it('should filter by calculation ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/upload?action=uploads&calculationId=calc-123')

      mockPrisma.document.findMany.mockResolvedValue([])

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            calculationId: 'calc-123'
          })
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid action parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/upload?action=invalid', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid action parameter')
    })

    it('should handle missing file parameter', async () => {
      const formData = new FormData()
      const request = new NextRequest('http://localhost:3000/api/upload?action=document', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No file provided')
    })

    it('should handle database errors', async () => {
      const file = createMockFile('test.pdf', 'application/pdf')
      const formData = new FormData()
      formData.append('file', file)

      mockPrisma.document.create.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/upload?action=document', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to upload document')
    })
  })
})