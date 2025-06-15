import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { auditLogger, AuditAction, ComplianceLevel } from '@/lib/audit'
import { validateApiRequest, sanitizeText } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Request schemas
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(254).optional(),
})

const updatePreferencesSchema = z.object({
  mfaEnabled: z.boolean().optional(),
  subscriptionTier: z.enum(['FREE', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
})

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
      case 'profile':
        return await getUserProfile(request, session.user.id)
      case 'statistics':
        return await getUserStatistics(request, session.user.id)
      case 'audit-logs':
        return await getUserAuditLogs(request, session.user.id)
      default:
        // Default to profile
        return await getUserProfile(request, session.user.id)
    }
  } catch (error) {
    console.error('User GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
      case 'profile':
        return await updateUserProfile(request, session.user.id, body)
      case 'preferences':
        return await updateUserPreferences(request, session.user.id, body)
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('User PUT API error:', error)
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
    const action = searchParams.get('action')

    switch (action) {
      case 'account':
        return await deleteUserAccount(request, session.user.id)
      case 'data':
        return await deleteUserData(request, session.user.id)
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('User DELETE API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getUserProfile(request: NextRequest, userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
        image: true,
        role: true,
        subscriptionStatus: true,
        subscriptionTier: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            calculations: true,
            assets: true,
            debts: true,
            documents: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Log profile access
    await auditLogger.logUserAction(
      userId,
      AuditAction.READ,
      '/api/user?action=profile',
      request,
      {},
      ComplianceLevel.STANDARD
    )

    return NextResponse.json({
      success: true,
      user,
    })

  } catch (error) {
    console.error('Get user profile error:', error)
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    )
  }
}

async function getUserStatistics(request: NextRequest, userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        _count: {
          select: {
            calculations: true,
            assets: true,
            debts: true,
            documents: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get additional statistics
    const calculationsThisMonth = await prisma.calculation.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    })

    const lastCalculation = await prisma.calculation.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })

    // Log statistics access
    await auditLogger.logUserAction(
      userId,
      AuditAction.READ,
      '/api/user?action=statistics',
      request,
      { calculationsThisMonth },
      ComplianceLevel.STANDARD
    )

    return NextResponse.json({
      success: true,
      statistics: {
        memberSince: user.createdAt,
        totalCalculations: user._count.calculations,
        totalAssets: user._count.assets,
        totalDebts: user._count.debts,
        totalDocuments: user._count.documents,
        calculationsThisMonth,
        lastCalculation: lastCalculation?.createdAt || null,
      },
    })

  } catch (error) {
    console.error('Get user statistics error:', error)
    return NextResponse.json(
      { error: 'Failed to get user statistics' },
      { status: 500 }
    )
  }
}

async function getUserAuditLogs(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const auditLogs = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 100), // Max 100 records
      skip: offset,
      select: {
        id: true,
        action: true,
        resource: true,
        ipAddress: true,
        complianceLevel: true,
        timestamp: true,
        // Don't include sensitive details
      },
    })

    // Log audit access
    await auditLogger.logUserAction(
      userId,
      AuditAction.READ,
      '/api/user?action=audit-logs',
      request,
      { recordCount: auditLogs.length, limit, offset },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json({
      success: true,
      auditLogs,
      pagination: {
        limit,
        offset,
        hasMore: auditLogs.length === limit,
      },
    })

  } catch (error) {
    console.error('Get user audit logs error:', error)
    return NextResponse.json(
      { error: 'Failed to get audit logs' },
      { status: 500 }
    )
  }
}

async function updateUserProfile(request: NextRequest, userId: string, body: any) {
  const validation = validateApiRequest(body, updateProfileSchema)
  
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request data', details: validation.errors },
      { status: 400 }
    )
  }

  const updates = validation.data

  try {
    // Sanitize input
    if (updates.name) {
      updates.name = sanitizeText(updates.name, 100)
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: {
        id: true,
        email: true,
        name: true,
        updatedAt: true,
      },
    })

    // Log profile update
    await auditLogger.logUserAction(
      userId,
      AuditAction.UPDATE,
      '/api/user?action=profile',
      request,
      { updatedFields: Object.keys(updates) },
      ComplianceLevel.STANDARD
    )

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully',
    })

  } catch (error) {
    console.error('Update user profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

async function updateUserPreferences(request: NextRequest, userId: string, body: any) {
  const validation = validateApiRequest(body, updatePreferencesSchema)
  
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request data', details: validation.errors },
      { status: 400 }
    )
  }

  const updates = validation.data

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: {
        id: true,
        mfaEnabled: true,
        subscriptionTier: true,
        updatedAt: true,
      },
    })

    // Log preferences update
    await auditLogger.logUserAction(
      userId,
      AuditAction.UPDATE,
      '/api/user?action=preferences',
      request,
      { updatedFields: Object.keys(updates) },
      ComplianceLevel.STANDARD
    )

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Preferences updated successfully',
    })

  } catch (error) {
    console.error('Update user preferences error:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}

async function deleteUserData(request: NextRequest, userId: string) {
  try {
    // Delete user data but keep the account for audit purposes
    await prisma.$transaction(async (tx) => {
      // Delete calculations and related data
      await tx.calculation.deleteMany({
        where: { userId },
      })

      // Delete assets
      await tx.asset.deleteMany({
        where: { userId },
      })

      // Delete debts
      await tx.debt.deleteMany({
        where: { userId },
      })

      // Delete documents
      await tx.document.deleteMany({
        where: { userId },
      })

      // Note: We keep audit logs for compliance
    })

    // Log data deletion
    await auditLogger.logUserAction(
      userId,
      AuditAction.DELETE,
      '/api/user?action=data',
      request,
      { action: 'user_data_deletion' },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json({
      success: true,
      message: 'User data deleted successfully',
    })

  } catch (error) {
    console.error('Delete user data error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user data' },
      { status: 500 }
    )
  }
}

async function deleteUserAccount(request: NextRequest, userId: string) {
  try {
    // Full account deletion (GDPR right to be forgotten)
    await prisma.$transaction(async (tx) => {
      // Delete all user data first
      await tx.calculation.deleteMany({
        where: { userId },
      })

      await tx.asset.deleteMany({
        where: { userId },
      })

      await tx.debt.deleteMany({
        where: { userId },
      })

      await tx.document.deleteMany({
        where: { userId },
      })

      // Delete audit logs (only for full account deletion)
      await tx.auditLog.deleteMany({
        where: { userId },
      })

      // Delete accounts and sessions
      await tx.account.deleteMany({
        where: { userId },
      })

      await tx.session.deleteMany({
        where: { userId },
      })

      // Finally delete the user
      await tx.user.delete({
        where: { id: userId },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    })

  } catch (error) {
    console.error('Delete user account error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}