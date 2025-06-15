import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { auditLogger, AuditAction, ComplianceLevel } from '@/lib/audit'
import { validateFileUpload } from '@/lib/validation'
import { encryptString } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { performSecurityScan } from '@/lib/file-security'
import pdfParse from 'pdf-parse'
import { createWorker } from 'tesseract.js'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/uploads'

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'document':
        return await uploadDocument(request, session.user.id)
      case 'parse-pdf':
        return await parsePDFDocument(request, session.user.id)
      case 'ocr-image':
        return await performOCR(request, session.user.id)
      case 'parse-csv':
        return await parseCSVDocument(request, session.user.id)
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'uploads':
        return await getUserUploads(request, session.user.id)
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Upload GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function uploadDocument(request: NextRequest, userId: string) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const calculationId = formData.get('calculationId') as string
    const documentType = formData.get('documentType') as string || 'SUPPORTING_DOCUMENT'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file
    const fileValidation = validateFileUpload(file)
    if (!fileValidation.isValid) {
      await auditLogger.logUserAction(
        userId,
        AuditAction.CREATE,
        '/api/upload?action=document',
        request,
        { errors: fileValidation.errors, filename: file.name },
        ComplianceLevel.LEGAL
      )

      return NextResponse.json(
        { error: 'Invalid file', details: fileValidation.errors },
        { status: 400 }
      )
    }

    // Perform security scan
    const securityResult = await performSecurityScan(file)
    if (!securityResult.isSecure) {
      await auditLogger.logUserAction(
        userId,
        AuditAction.CREATE,
        '/api/upload?action=document',
        request,
        { 
          securityThreats: securityResult.threats, 
          securityScore: securityResult.score,
          filename: file.name 
        },
        ComplianceLevel.LEGAL
      )

      return NextResponse.json(
        { 
          error: 'File failed security scan', 
          details: securityResult.threats,
          securityScore: securityResult.score 
        },
        { status: 400 }
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds limit' },
        { status: 400 }
      )
    }

    // Verify calculation ownership if provided
    if (calculationId) {
      const calculation = await prisma.calculation.findFirst({
        where: {
          id: calculationId,
          userId: userId,
        },
      })

      if (!calculation) {
        return NextResponse.json(
          { error: 'Calculation not found' },
          { status: 404 }
        )
      }
    }

    // Create upload directory
    const userUploadDir = path.join(UPLOAD_DIR, userId)
    if (!existsSync(userUploadDir)) {
      await mkdir(userUploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = path.extname(file.name)
    const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = path.join(userUploadDir, filename)

    // Save file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(filePath, buffer)

    // Create document record
    const document = await prisma.document.create({
      data: {
        userId: userId,
        calculationId: calculationId || null,
        type: documentType as any,
        title: file.name,
        filename: filename,
        filePath: encryptString(filePath),
        mimeType: file.type,
        fileSize: file.size,
        status: 'DRAFT',
        isCourtReady: false,
      },
    })

    // Log successful upload
    await auditLogger.logUserAction(
      userId,
      AuditAction.CREATE,
      '/api/upload?action=document',
      request,
      {
        documentId: document.id,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        calculationId,
      },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        uploadedAt: document.createdAt,
      },
      message: 'File uploaded successfully',
    })

  } catch (error) {
    console.error('Upload document error:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}

async function parsePDFDocument(request: NextRequest, userId: string) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
    }

    // Parse PDF
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const pdfData = await pdfParse(buffer)

    // Extract potential financial data patterns
    const extractedData = extractFinancialData(pdfData.text)

    // Log PDF parsing
    await auditLogger.logUserAction(
      userId,
      AuditAction.READ,
      '/api/upload?action=parse-pdf',
      request,
      {
        filename: file.name,
        fileSize: file.size,
        pagesCount: pdfData.numpages,
        extractedItemsCount: extractedData.length,
      },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json({
      success: true,
      pdfInfo: {
        pages: pdfData.numpages,
        textLength: pdfData.text.length,
      },
      extractedText: pdfData.text,
      extractedData,
      message: 'PDF parsed successfully',
    })

  } catch (error) {
    console.error('Parse PDF error:', error)
    return NextResponse.json(
      { error: 'Failed to parse PDF' },
      { status: 500 }
    )
  }
}

async function performOCR(request: NextRequest, userId: string) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check if file is an image
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!imageTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Perform OCR
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const worker = await createWorker('eng')
    const { data: { text } } = await worker.recognize(buffer)
    await worker.terminate()

    // Extract potential financial data from OCR text
    const extractedData = extractFinancialData(text)

    // Log OCR processing
    await auditLogger.logUserAction(
      userId,
      AuditAction.READ,
      '/api/upload?action=ocr-image',
      request,
      {
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        textLength: text.length,
        extractedItemsCount: extractedData.length,
      },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json({
      success: true,
      ocrText: text,
      extractedData,
      confidence: 'OCR completed', // Tesseract provides confidence per word, simplified here
      message: 'OCR processing completed successfully',
    })

  } catch (error) {
    console.error('OCR processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process OCR' },
      { status: 500 }
    )
  }
}

async function getUserUploads(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const calculationId = searchParams.get('calculationId')

    const where: any = { userId }
    if (calculationId) {
      where.calculationId = calculationId
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
      skip: offset,
      select: {
        id: true,
        type: true,
        title: true,
        filename: true,
        fileSize: true,
        mimeType: true,
        status: true,
        createdAt: true,
        calculation: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    // Log uploads access
    await auditLogger.logUserAction(
      userId,
      AuditAction.READ,
      '/api/upload?action=uploads',
      request,
      { documentCount: documents.length, calculationId, limit, offset },
      ComplianceLevel.STANDARD
    )

    return NextResponse.json({
      success: true,
      uploads: documents,
      pagination: {
        limit,
        offset,
        hasMore: documents.length === limit,
      },
    })

  } catch (error) {
    console.error('Get user uploads error:', error)
    return NextResponse.json(
      { error: 'Failed to get uploads' },
      { status: 500 }
    )
  }
}

// Helper function to extract financial data from text
function extractFinancialData(text: string): Array<{
  type: 'currency' | 'account' | 'date' | 'asset' | 'debt';
  value: string;
  confidence: number;
  context?: string;
}> {
  const extracted: Array<{
    type: 'currency' | 'account' | 'date' | 'asset' | 'debt';
    value: string;
    confidence: number;
    context?: string;
  }> = []

  // Currency patterns
  const currencyRegex = /\$[\d,]+\.?\d*/g
  const currencyMatches = text.match(currencyRegex)
  if (currencyMatches) {
    currencyMatches.forEach(match => {
      extracted.push({
        type: 'currency',
        value: match,
        confidence: 0.9,
      })
    })
  }

  // Account number patterns
  const accountRegex = /(?:account|acct)[\s#]*:?\s*[\d-]{8,}/gi
  const accountMatches = text.match(accountRegex)
  if (accountMatches) {
    accountMatches.forEach(match => {
      extracted.push({
        type: 'account',
        value: match,
        confidence: 0.7,
      })
    })
  }

  // Date patterns
  const dateRegex = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{1,2}-\d{1,2}-\d{2,4}\b/g
  const dateMatches = text.match(dateRegex)
  if (dateMatches) {
    dateMatches.forEach(match => {
      extracted.push({
        type: 'date',
        value: match,
        confidence: 0.8,
      })
    })
  }

  // Asset keywords
  const assetKeywords = [
    'house', 'home', 'property', 'vehicle', 'car', 'truck', 'boat',
    'investment', 'stock', 'bond', 'savings', 'checking', 'retirement',
    '401k', 'ira', 'pension', 'business', 'jewelry', 'art'
  ]
  
  assetKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b.*?\\$[\\d,]+\\.?\\d*`, 'gi')
    const matches = text.match(regex)
    if (matches) {
      matches.forEach(match => {
        extracted.push({
          type: 'asset',
          value: match,
          confidence: 0.6,
          context: keyword,
        })
      })
    }
  })

  // Debt keywords
  const debtKeywords = [
    'mortgage', 'loan', 'debt', 'credit card', 'balance', 'owed',
    'liability', 'payment', 'monthly payment'
  ]
  
  debtKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b.*?\\$[\\d,]+\\.?\\d*`, 'gi')
    const matches = text.match(regex)
    if (matches) {
      matches.forEach(match => {
        extracted.push({
          type: 'debt',
          value: match,
          confidence: 0.6,
          context: keyword,
        })
      })
    }
  })

  return extracted
}

async function parseCSVDocument(request: NextRequest, userId: string) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check if file is CSV or Excel
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File must be CSV or Excel format' },
        { status: 400 }
      )
    }

    // Parse CSV data
    const arrayBuffer = await file.arrayBuffer()
    const text = new TextDecoder().decode(arrayBuffer)
    
    // Simple CSV parsing (for basic CSV files)
    const rows = text.split('\n').map(row => 
      row.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
    ).filter(row => row.some(cell => cell.length > 0))

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No data found in CSV file' },
        { status: 400 }
      )
    }

    // Extract and validate financial data from CSV
    const extractedFinancialData = extractFinancialDataFromCSV(rows)

    // Log CSV parsing
    await auditLogger.logUserAction(
      userId,
      AuditAction.READ,
      '/api/upload?action=parse-csv',
      request,
      {
        filename: file.name,
        fileSize: file.size,
        rowCount: rows.length,
        extractedItemsCount: extractedFinancialData.length,
      },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json({
      success: true,
      csvInfo: {
        rows: rows.length,
        columns: rows[0]?.length || 0,
        headers: rows[0] || [],
      },
      rawData: rows,
      extractedFinancialData,
      message: 'CSV parsed successfully',
    })

  } catch (error) {
    console.error('Parse CSV error:', error)
    return NextResponse.json(
      { error: 'Failed to parse CSV' },
      { status: 500 }
    )
  }
}

// Helper function to extract financial data from CSV rows
function extractFinancialDataFromCSV(rows: string[][]): Array<{
  type: 'asset' | 'debt';
  description: string;
  value: number;
  category?: string;
  source: 'csv';
  rowIndex: number;
}> {
  const extracted: Array<{
    type: 'asset' | 'debt';
    description: string;
    value: number;
    category?: string;
    source: 'csv';
    rowIndex: number;
  }> = []

  if (rows.length === 0) return extracted

  const headers = rows[0].map(h => h.toLowerCase())
  
  // Look for common financial column patterns
  const descriptionColumns = headers.findIndex(h => 
    h.includes('description') || h.includes('item') || h.includes('name') || h.includes('account')
  )
  const valueColumns = headers.findIndex(h => 
    h.includes('amount') || h.includes('value') || h.includes('balance') || h.includes('total')
  )
  const typeColumns = headers.findIndex(h => 
    h.includes('type') || h.includes('category') || h.includes('class')
  )

  // Process data rows (skip header)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    
    if (descriptionColumns >= 0 && valueColumns >= 0 && row[descriptionColumns] && row[valueColumns]) {
      try {
        const description = row[descriptionColumns].trim()
        const valueStr = row[valueColumns].replace(/[$,\s]/g, '')
        const value = parseFloat(valueStr)
        
        if (!isNaN(value) && value > 0 && description.length > 0) {
          // Determine if it's an asset or debt based on description or type column
          let type: 'asset' | 'debt' = 'asset'
          const category = typeColumns >= 0 ? row[typeColumns] : undefined
          
          // Check for debt keywords
          const debtKeywords = ['debt', 'loan', 'mortgage', 'credit', 'liability', 'owed', 'balance due']
          const isDebt = debtKeywords.some(keyword => 
            description.toLowerCase().includes(keyword) || 
            (category && category.toLowerCase().includes(keyword))
          )
          
          if (isDebt) {
            type = 'debt'
          }

          extracted.push({
            type,
            description,
            value,
            category,
            source: 'csv',
            rowIndex: i,
          })
        }
      } catch (error) {
        // Skip invalid rows
        continue
      }
    }
  }

  return extracted
}