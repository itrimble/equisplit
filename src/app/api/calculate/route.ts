import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { auditLogger, AuditAction, ComplianceLevel } from '@/lib/audit'
import { validateApiRequest, personalInfoSchema, assetValueSchema, debtSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { calculatePropertyDivision } from '@/utils/calculations'
import { encryptString } from '@/lib/encryption'
import { z } from 'zod'

// Request schema for calculation API
const calculateRequestSchema = z.object({
  personalInfo: personalInfoSchema,
  assets: z.array(assetValueSchema),
  debts: z.array(debtSchema),
  saveCalculation: z.boolean().default(true),
  calculationTitle: z.string().max(100).optional(),
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

    // Parse and validate request body
    const body = await request.json()
    const validation = validateApiRequest(body, calculateRequestSchema)
    
    if (!validation.success) {
      await auditLogger.logUserAction(
        session.user.id,
        AuditAction.CALCULATE,
        '/api/calculate',
        request,
        { errors: validation.errors },
        ComplianceLevel.LEGAL
      )
      
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.errors },
        { status: 400 }
      )
    }

    const { personalInfo, assets, debts, saveCalculation, calculationTitle } = validation.data

    // Perform the calculation
    const calculationInput = {
      personalInfo,
      assets,
      debts,
    }

    const result = calculatePropertyDivision(calculationInput)

    // Save calculation if requested
    let calculationId: string | undefined

    if (saveCalculation) {
      const calculation = await prisma.calculation.create({
        data: {
          userId: session.user.id,
          title: calculationTitle || `Calculation ${new Date().toLocaleDateString()}`,
          jurisdiction: personalInfo.jurisdiction,
          propertyRegime: personalInfo.jurisdiction === 'CA' || personalInfo.jurisdiction === 'TX' || 
                          personalInfo.jurisdiction === 'AZ' || personalInfo.jurisdiction === 'WA' ||
                          personalInfo.jurisdiction === 'ID' || personalInfo.jurisdiction === 'LA' ||
                          personalInfo.jurisdiction === 'NV' || personalInfo.jurisdiction === 'NM' ||
                          personalInfo.jurisdiction === 'WI' ? 'COMMUNITY' : 'EQUITABLE',
          marriageDate: personalInfo.marriageDate,
          separationDate: personalInfo.separationDate || null,
          hasPrenup: personalInfo.hasPrenup,
          resultsJson: encryptString(JSON.stringify(result)),
          confidenceLevel: result.confidenceLevel,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })

      calculationId = calculation.id

      // Save assets
      for (const asset of assets) {
        await prisma.asset.create({
          data: {
            userId: session.user.id,
            calculationId: calculation.id,
            type: asset.type,
            description: encryptString(asset.description),
            currentValue: asset.currentValue,
            acquisitionDate: asset.acquisitionDate || null,
            acquisitionValue: asset.acquisitionValue || null,
            isSeparateProperty: asset.isSeparateProperty,
            notes: asset.notes ? encryptString(asset.notes) : null,
          },
        })
      }

      // Save debts
      for (const debt of debts) {
        await prisma.debt.create({
          data: {
            userId: session.user.id,
            calculationId: calculation.id,
            type: debt.type,
            description: encryptString(debt.description),
            currentBalance: debt.currentBalance,
            originalAmount: debt.originalAmount || null,
            acquisitionDate: debt.acquisitionDate || null,
            isSeparateProperty: debt.isSeparateProperty,
            notes: debt.notes ? encryptString(debt.notes) : null,
          },
        })
      }
    }

    // Log successful calculation
    await auditLogger.logUserAction(
      session.user.id,
      AuditAction.CALCULATE,
      '/api/calculate',
      request,
      {
        calculationId,
        assetCount: assets.length,
        debtCount: debts.length,
        jurisdiction: personalInfo.jurisdiction,
        savedCalculation: saveCalculation,
        confidenceLevel: result.confidenceLevel,
      },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json({
      success: true,
      result,
      calculationId,
      message: saveCalculation 
        ? 'Calculation completed and saved successfully'
        : 'Calculation completed successfully'
    })

  } catch (error) {
    console.error('Calculation API error:', error)

    // Log error
    if (error instanceof Error) {
      await auditLogger.logUserAction(
        (await auth())?.user?.id || 'unknown',
        AuditAction.CALCULATE,
        '/api/calculate',
        request,
        { error: error.message },
        ComplianceLevel.LEGAL
      )
    }

    return NextResponse.json(
      { error: 'Internal server error during calculation' },
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const calculationId = searchParams.get('id')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (calculationId) {
      // Get specific calculation
      const calculation = await prisma.calculation.findFirst({
        where: {
          id: calculationId,
          userId: session.user.id,
        },
        include: {
          assets: true,
          debts: true,
        },
      })

      if (!calculation) {
        return NextResponse.json(
          { error: 'Calculation not found' },
          { status: 404 }
        )
      }

      // Log access
      await auditLogger.logUserAction(
        session.user.id,
        AuditAction.READ,
        '/api/calculate',
        request,
        { calculationId },
        ComplianceLevel.LEGAL
      )

      return NextResponse.json({
        success: true,
        calculation,
      })
    } else {
      // Get user's calculations list
      const calculations = await prisma.calculation.findMany({
        where: {
          userId: session.user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          jurisdiction: true,
          status: true,
          confidenceLevel: true,
          createdAt: true,
          completedAt: true,
          _count: {
            select: {
              assets: true,
              debts: true,
            },
          },
        },
      })

      // Log access
      await auditLogger.logUserAction(
        session.user.id,
        AuditAction.READ,
        '/api/calculate',
        request,
        { count: calculations.length, limit, offset },
        ComplianceLevel.STANDARD
      )

      return NextResponse.json({
        success: true,
        calculations,
        pagination: {
          limit,
          offset,
          hasMore: calculations.length === limit,
        },
      })
    }

  } catch (error) {
    console.error('Calculation GET API error:', error)
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

    // Get calculation ID from query params
    const { searchParams } = new URL(request.url)
    const calculationId = searchParams.get('id')

    if (!calculationId) {
      return NextResponse.json(
        { error: 'Calculation ID required' },
        { status: 400 }
      )
    }

    // Verify ownership and delete
    const calculation = await prisma.calculation.findFirst({
      where: {
        id: calculationId,
        userId: session.user.id,
      },
    })

    if (!calculation) {
      return NextResponse.json(
        { error: 'Calculation not found' },
        { status: 404 }
      )
    }

    // Delete calculation (cascade will handle related records)
    await prisma.calculation.delete({
      where: {
        id: calculationId,
      },
    })

    // Log deletion
    await auditLogger.logUserAction(
      session.user.id,
      AuditAction.DELETE,
      '/api/calculate',
      request,
      { calculationId, title: calculation.title },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json({
      success: true,
      message: 'Calculation deleted successfully',
    })

  } catch (error) {
    console.error('Calculation DELETE API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}