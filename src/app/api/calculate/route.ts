import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { auditLogger, AuditAction, ComplianceLevel } from '@/lib/audit'
import { validateApiRequest, personalInfoSchema, assetValueSchema, debtSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { calculatePropertyDivision } from '@/utils/calculations'
import { encryptString } from '@/lib/encryption'
import { withSecurity, SECURITY_CONFIGS } from '@/lib/security-middleware'
import { withErrorHandling, createAuthErrorResponse, createValidationErrorResponse, ApiContext } from '@/lib/api-error-handler'
import { createCalculationError, createSystemError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Request schema for calculation API
const calculateRequestSchema = z.object({
  personalInfo: personalInfoSchema,
  assets: z.array(assetValueSchema),
  debts: z.array(debtSchema),
  saveCalculation: z.boolean().default(true),
  calculationTitle: z.string().max(100).optional(),
})

async function handlePOST(request: NextRequest, context: ApiContext) {
  // Authentication check
  const session = await auth()
  if (!session?.user?.id) {
    throw createAuthErrorResponse('Authentication required for property calculations')
  }

  // Add user context
  context.userId = session.user.id
  context.sessionId = session.sessionToken

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
    
    throw createValidationErrorResponse(
      'Invalid calculation request data',
      validation.errors
    )
  }

  const { personalInfo, assets, debts, saveCalculation, calculationTitle } = validation.data

  // Log calculation attempt
  await logger.logCalculation(
    'property_division',
    personalInfo.jurisdiction,
    session.user.id
  )

  // Perform the calculation
  const calculationInput = {
    personalInfo,
    assets,
    debts,
  }

  let result
  try {
    result = calculatePropertyDivision(calculationInput)
  } catch (calculationError) {
    throw createCalculationError(
      `Property division calculation failed for ${personalInfo.jurisdiction}`,
      {
        technicalDetails: {
          jurisdiction: personalInfo.jurisdiction,
          assetCount: assets.length,
          debtCount: debts.length,
          error: calculationError instanceof Error ? calculationError.message : String(calculationError)
        },
        context: {
          userId: session.user.id,
          endpoint: '/api/calculate'
        }
      }
    )
  }

  // Save calculation if requested
  let calculationId: string | undefined

  if (saveCalculation) {
    try {
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

      // Save assets in batch (performance optimization)
      if (assets.length > 0) {
        const assetData = assets.map(asset => ({
          userId: session.user.id,
          calculationId: calculation.id,
          type: asset.type,
          description: encryptString(asset.description),
          currentValue: asset.currentValue,
          acquisitionDate: asset.acquisitionDate || null,
          acquisitionValue: asset.acquisitionValue || null,
          isSeparateProperty: asset.isSeparateProperty,
          notes: asset.notes ? encryptString(asset.notes) : null,
        }));

        await prisma.asset.createMany({
          data: assetData,
          skipDuplicates: true,
        });
      }

      // Save debts in batch (performance optimization)
      if (debts.length > 0) {
        const debtData = debts.map(debt => ({
          userId: session.user.id,
          calculationId: calculation.id,
          type: debt.type,
          description: encryptString(debt.description),
          currentBalance: debt.currentBalance,
          originalAmount: debt.originalAmount || null,
          acquisitionDate: debt.acquisitionDate || null,
          isSeparateProperty: debt.isSeparateProperty,
          notes: debt.notes ? encryptString(debt.notes) : null,
        }));

        await prisma.debt.createMany({
          data: debtData,
          skipDuplicates: true,
        });
      }
    } catch (dbError) {
      throw createSystemError(
        'Failed to save calculation to database',
        {
          technicalDetails: {
            error: dbError instanceof Error ? dbError.message : String(dbError),
            calculationTitle
          },
          context: {
            userId: session.user.id,
            endpoint: '/api/calculate'
          }
        }
      )
    }
  }

  // Log successful calculation
  await logger.logCalculation(
    'property_division',
    personalInfo.jurisdiction,
    session.user.id,
    result
  )

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
}

async function handleGET(request: NextRequest, context: ApiContext) {
  // Authentication check
  const session = await auth()
  if (!session?.user?.id) {
    throw createAuthErrorResponse('Authentication required for calculation history')
  }

  context.userId = session.user.id

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

      const response = NextResponse.json({
        success: true,
        calculation,
      })

      // Add legal disclaimer headers
      response.headers.set('X-Legal-Disclaimer', 'Educational calculations only. Not legal advice.')
      response.headers.set('X-Professional-Consultation', 'Consult qualified legal professionals.')
      response.headers.set('X-No-Attorney-Client', 'No attorney-client relationship created.')

      return response
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

      const response = NextResponse.json({
        success: true,
        calculations,
        pagination: {
          limit,
          offset,
          hasMore: calculations.length === limit,
        },
      })

      // Add legal disclaimer headers
      response.headers.set('X-Legal-Disclaimer', 'Educational calculations only. Not legal advice.')
      response.headers.set('X-Professional-Consultation', 'Consult qualified legal professionals.')

      return response
    }
}

async function handleDELETE(request: NextRequest) {
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

// Export handlers with security middleware and error handling
export const POST = withSecurity(
  withErrorHandling(handlePOST), 
  SECURITY_CONFIGS.CALCULATION
)
export const GET = withSecurity(
  withErrorHandling(handleGET), 
  SECURITY_CONFIGS.CALCULATION
)
export const DELETE = withSecurity(
  withErrorHandling(handleDELETE), 
  SECURITY_CONFIGS.CALCULATION
)