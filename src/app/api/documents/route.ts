import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { auditLogger, AuditAction, ComplianceLevel } from '@/lib/audit'
import { validateApiRequest } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { encryptString, decryptString } from '@/lib/encryption'
import { z } from 'zod'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

// Request schemas
const generateDocumentSchema = z.object({
  calculationId: z.string(),
  documentType: z.enum(['MARITAL_SETTLEMENT_AGREEMENT', 'FINANCIAL_AFFIDAVIT', 'PROPERTY_DEBT_SUMMARY']),
  customizations: z.object({
    includeDisclaimer: z.boolean().default(true),
    courtName: z.string().max(200).optional(),
    caseNumber: z.string().max(100).optional(),
    attorneyInfo: z.object({
      name: z.string().max(100),
      barNumber: z.string().max(50),
      firm: z.string().max(200),
      address: z.string().max(500),
      phone: z.string().max(20),
      email: z.string().email(),
    }).optional(),
  }).optional(),
})

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
    const body = await request.json()

    switch (action) {
      case 'generate':
        return await generateDocument(request, session.user.id, body)
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Document API error:', error)
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
    const documentId = searchParams.get('id')
    const action = searchParams.get('action')

    if (documentId) {
      return await getDocument(request, session.user.id, documentId)
    } else if (action === 'list') {
      return await getDocumentsList(request, session.user.id)
    } else {
      return NextResponse.json(
        { error: 'Document ID or action required' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Document GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID required' },
        { status: 400 }
      )
    }

    return await deleteDocument(request, session.user.id, documentId)

  } catch (error) {
    console.error('Document DELETE API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateDocument(request: NextRequest, userId: string, body: any) {
  const validation = validateApiRequest(body, generateDocumentSchema)
  
  if (!validation.success) {
    await auditLogger.logUserAction(
      userId,
      AuditAction.CREATE,
      '/api/documents?action=generate',
      request,
      { errors: validation.errors },
      ComplianceLevel.LEGAL
    )
    
    return NextResponse.json(
      { error: 'Invalid request data', details: validation.errors },
      { status: 400 }
    )
  }

  const { calculationId, documentType, customizations } = validation.data

  try {
    // Verify calculation belongs to user
    const calculation = await prisma.calculation.findFirst({
      where: {
        id: calculationId,
        userId: userId,
      },
      include: {
        assets: true,
        debts: true,
        user: true,
      },
    })

    if (!calculation) {
      return NextResponse.json(
        { error: 'Calculation not found' },
        { status: 404 }
      )
    }

    // Check if user has access to premium features
    const userRole = calculation.user.role
    const subscriptionTier = calculation.user.subscriptionTier

    if (documentType !== 'PROPERTY_DEBT_SUMMARY' && 
        userRole === 'USER' && 
        subscriptionTier === 'FREE') {
      return NextResponse.json(
        { error: 'Premium subscription required for this document type' },
        { status: 403 }
      )
    }

    // Generate the document
    const documentBuffer = await generatePDFDocument(
      calculation,
      documentType,
      customizations || {}
    )

    // Save document record
    const document = await prisma.document.create({
      data: {
        userId: userId,
        calculationId: calculationId,
        type: documentType,
        title: getDocumentTitle(documentType),
        filename: `${documentType.toLowerCase()}_${Date.now()}.pdf`,
        filePath: encryptString(`/documents/${userId}/${calculationId}/`),
        mimeType: 'application/pdf',
        fileSize: documentBuffer.length,
        status: 'GENERATED',
        isCourtReady: documentType !== 'PROPERTY_DEBT_SUMMARY',
        jurisdiction: calculation.jurisdiction,
        generatedAt: new Date(),
      },
    })

    // Log document generation
    await auditLogger.logUserAction(
      userId,
      AuditAction.CREATE,
      '/api/documents?action=generate',
      request,
      {
        documentId: document.id,
        documentType,
        calculationId,
        fileSize: documentBuffer.length,
      },
      ComplianceLevel.LEGAL
    )

    // Return document info and base64 data for download
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        type: document.type,
        title: document.title,
        filename: document.filename,
        fileSize: document.fileSize,
        generatedAt: document.generatedAt,
      },
      downloadData: documentBuffer.toString('base64'),
      message: 'Document generated successfully',
    })

  } catch (error) {
    console.error('Generate document error:', error)
    
    await auditLogger.logUserAction(
      userId,
      AuditAction.CREATE,
      '/api/documents?action=generate',
      request,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    )
  }
}

async function getDocument(request: NextRequest, userId: string, documentId: string) {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: userId,
      },
      include: {
        calculation: {
          select: {
            id: true,
            title: true,
            jurisdiction: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Log document access
    await auditLogger.logUserAction(
      userId,
      AuditAction.READ,
      '/api/documents',
      request,
      { documentId, documentType: document.type },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        type: document.type,
        title: document.title,
        filename: document.filename,
        fileSize: document.fileSize,
        status: document.status,
        isCourtReady: document.isCourtReady,
        jurisdiction: document.jurisdiction,
        generatedAt: document.generatedAt,
        calculation: document.calculation,
      },
    })

  } catch (error) {
    console.error('Get document error:', error)
    return NextResponse.json(
      { error: 'Failed to get document' },
      { status: 500 }
    )
  }
}

async function getDocumentsList(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const documentType = searchParams.get('type')

    const where: any = { userId }
    if (documentType) {
      where.type = documentType
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      take: Math.min(limit, 50),
      skip: offset,
      select: {
        id: true,
        type: true,
        title: true,
        filename: true,
        fileSize: true,
        status: true,
        isCourtReady: true,
        jurisdiction: true,
        generatedAt: true,
        calculation: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    // Log documents list access
    await auditLogger.logUserAction(
      userId,
      AuditAction.READ,
      '/api/documents?action=list',
      request,
      { documentCount: documents.length, documentType, limit, offset },
      ComplianceLevel.STANDARD
    )

    return NextResponse.json({
      success: true,
      documents,
      pagination: {
        limit,
        offset,
        hasMore: documents.length === limit,
      },
    })

  } catch (error) {
    console.error('Get documents list error:', error)
    return NextResponse.json(
      { error: 'Failed to get documents list' },
      { status: 500 }
    )
  }
}

async function deleteDocument(request: NextRequest, userId: string, documentId: string) {
  try {
    // Verify document belongs to user
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: userId,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Delete document record
    await prisma.document.delete({
      where: { id: documentId },
    })

    // Log document deletion
    await auditLogger.logUserAction(
      userId,
      AuditAction.DELETE,
      '/api/documents',
      request,
      { documentId, documentType: document.type, filename: document.filename },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    })

  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}

// Helper functions
function getDocumentTitle(documentType: string): string {
  switch (documentType) {
    case 'MARITAL_SETTLEMENT_AGREEMENT':
      return 'Marital Settlement Agreement'
    case 'FINANCIAL_AFFIDAVIT':
      return 'Financial Affidavit'
    case 'PROPERTY_DEBT_SUMMARY':
      return 'Property and Debt Summary'
    default:
      return 'Legal Document'
  }
}

async function generatePDFDocument(
  calculation: any,
  documentType: string,
  customizations: any
): Promise<Buffer> {
  const doc = new jsPDF()
  
  // Add document header
  doc.setFontSize(16)
  doc.text(getDocumentTitle(documentType), 20, 20)
  
  // Add disclaimer if requested
  if (customizations.includeDisclaimer !== false) {
    doc.setFontSize(8)
    doc.text(
      'LEGAL DISCLAIMER: This document is for informational purposes only and does not constitute legal advice.',
      20,
      30
    )
    doc.text(
      'Consult with a qualified attorney before using this document in legal proceedings.',
      20,
      35
    )
  }

  // Add court information if provided
  let yPosition = 50
  if (customizations.courtName) {
    doc.setFontSize(12)
    doc.text(`Court: ${customizations.courtName}`, 20, yPosition)
    yPosition += 10
  }
  
  if (customizations.caseNumber) {
    doc.text(`Case Number: ${customizations.caseNumber}`, 20, yPosition)
    yPosition += 10
  }

  yPosition += 10

  // Add calculation information
  doc.setFontSize(14)
  doc.text('Property Division Calculation', 20, yPosition)
  yPosition += 15

  doc.setFontSize(10)
  doc.text(`Jurisdiction: ${calculation.jurisdiction}`, 20, yPosition)
  yPosition += 5
  doc.text(`Marriage Date: ${new Date(calculation.marriageDate).toLocaleDateString()}`, 20, yPosition)
  yPosition += 5
  
  if (calculation.separationDate) {
    doc.text(`Separation Date: ${new Date(calculation.separationDate).toLocaleDateString()}`, 20, yPosition)
    yPosition += 5
  }

  yPosition += 10

  // Add assets table
  if (calculation.assets && calculation.assets.length > 0) {
    doc.setFontSize(12)
    doc.text('Assets', 20, yPosition)
    yPosition += 10

    const assetRows = calculation.assets.map((asset: any) => [
      decryptString(asset.description) || 'N/A',
      asset.type,
      `$${asset.currentValue.toLocaleString()}`,
      asset.isSeparateProperty ? 'Separate' : 'Community',
    ])

    doc.autoTable({
      startY: yPosition,
      head: [['Description', 'Type', 'Value', 'Classification']],
      body: assetRows,
      theme: 'grid',
      styles: { fontSize: 8 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 20
  }

  // Add debts table
  if (calculation.debts && calculation.debts.length > 0) {
    doc.setFontSize(12)
    doc.text('Debts', 20, yPosition)
    yPosition += 10

    const debtRows = calculation.debts.map((debt: any) => [
      decryptString(debt.description) || 'N/A',
      debt.type,
      `$${debt.currentBalance.toLocaleString()}`,
      debt.isSeparateProperty ? 'Separate' : 'Community',
    ])

    doc.autoTable({
      startY: yPosition,
      head: [['Description', 'Type', 'Balance', 'Classification']],
      body: debtRows,
      theme: 'grid',
      styles: { fontSize: 8 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 20
  }

  // Add calculation results if available
  if (calculation.resultsJson) {
    try {
      const results = JSON.parse(decryptString(calculation.resultsJson) || '{}')
      
      doc.setFontSize(12)
      doc.text('Calculation Results', 20, yPosition)
      yPosition += 10

      if (results.confidenceLevel) {
        doc.setFontSize(10)
        doc.text(`Confidence Level: ${(results.confidenceLevel * 100).toFixed(1)}%`, 20, yPosition)
        yPosition += 10
      }
    } catch (error) {
      console.error('Error parsing calculation results:', error)
    }
  }

  // Add attorney information if provided
  if (customizations.attorneyInfo) {
    const attorney = customizations.attorneyInfo
    yPosition += 20
    
    doc.setFontSize(12)
    doc.text('Attorney Information', 20, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    doc.text(`Name: ${attorney.name}`, 20, yPosition)
    yPosition += 5
    doc.text(`Bar Number: ${attorney.barNumber}`, 20, yPosition)
    yPosition += 5
    doc.text(`Firm: ${attorney.firm}`, 20, yPosition)
    yPosition += 5
    doc.text(`Address: ${attorney.address}`, 20, yPosition)
    yPosition += 5
    doc.text(`Phone: ${attorney.phone}`, 20, yPosition)
    yPosition += 5
    doc.text(`Email: ${attorney.email}`, 20, yPosition)
  }

  // Add footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Generated by EquiSplit on ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`,
      20,
      doc.internal.pageSize.height - 10
    )
  }

  return Buffer.from(doc.output('arraybuffer'))
}