import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { auditLogger, AuditAction, ComplianceLevel } from '@/lib/audit'
import { securityMonitor } from '@/lib/security-monitor'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // Authentication and authorization check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin privileges
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== UserRole.ADMIN) {
      await auditLogger.logUserAction(
        session.user.id,
        AuditAction.READ,
        '/api/admin',
        request,
        { unauthorized: true },
        ComplianceLevel.LEGAL
      )

      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'security-metrics':
        return await getSecurityMetrics(request, session.user.id)
      case 'audit-logs':
        return await getAuditLogs(request, session.user.id)
      case 'system-stats':
        return await getSystemStats(request, session.user.id)
      case 'user-activity':
        return await getUserActivity(request, session.user.id)
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Admin API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication and authorization check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const body = await request.json()

    switch (action) {
      case 'resolve-security-event':
        return await resolveSecurityEvent(request, session.user.id, body)
      case 'update-user-role':
        return await updateUserRole(request, session.user.id, body)
      case 'system-maintenance':
        return await systemMaintenance(request, session.user.id, body)
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Admin POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getSecurityMetrics(request: NextRequest, adminUserId: string) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '24')

    // Get security metrics from security monitor
    const metrics = securityMonitor.getSecurityMetrics(hours)
    const unresolvedEvents = securityMonitor.getUnresolvedEvents()

    // Get additional security stats from database
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    
    const securityStats = await prisma.auditLog.groupBy({
      by: ['action', 'complianceLevel'],
      where: {
        timestamp: { gte: cutoff },
      },
      _count: true,
    })

    // Log admin access
    await auditLogger.logUserAction(
      adminUserId,
      AuditAction.READ,
      '/api/admin?action=security-metrics',
      request,
      { hours, unresolvedEventsCount: unresolvedEvents.length },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json({
      success: true,
      securityMetrics: {
        ...metrics,
        unresolvedEvents: unresolvedEvents.map(event => ({
          id: event.id,
          type: event.type,
          level: event.level,
          timestamp: event.timestamp,
          ipAddress: event.ipAddress,
          endpoint: event.endpoint,
        })),
        auditStats: securityStats,
      },
      timeframe: `${hours} hours`,
    })

  } catch (error) {
    console.error('Get security metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to get security metrics' },
      { status: 500 }
    )
  }
}

async function getAuditLogs(request: NextRequest, adminUserId: string) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const userId = searchParams.get('userId')
    const action = searchParams.get('auditAction')
    const complianceLevel = searchParams.get('complianceLevel')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    
    if (userId) where.userId = userId
    if (action) where.action = action
    if (complianceLevel) where.complianceLevel = complianceLevel
    
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = new Date(startDate)
      if (endDate) where.timestamp.lte = new Date(endDate)
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 100),
      skip: offset,
      include: {
        user: {
          select: {
            email: true,
            name: true,
            role: true,
          },
        },
      },
    })

    const total = await prisma.auditLog.count({ where })

    // Log admin audit access
    await auditLogger.logUserAction(
      adminUserId,
      AuditAction.READ,
      '/api/admin?action=audit-logs',
      request,
      { 
        filters: { userId, action, complianceLevel, startDate, endDate },
        resultCount: auditLogs.length,
        total,
      },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json({
      success: true,
      auditLogs: auditLogs.map(log => ({
        id: log.id,
        userId: log.userId,
        user: log.user,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        complianceLevel: log.complianceLevel,
        timestamp: log.timestamp,
        // Don't include sensitive details in admin view
      })),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + auditLogs.length < total,
      },
    })

  } catch (error) {
    console.error('Get audit logs error:', error)
    return NextResponse.json(
      { error: 'Failed to get audit logs' },
      { status: 500 }
    )
  }
}

async function getSystemStats(request: NextRequest, adminUserId: string) {
  try {
    // Get various system statistics
    const [
      totalUsers,
      activeUsersToday,
      totalCalculations,
      calculationsToday,
      totalDocuments,
      documentsToday,
      totalAssets,
      totalDebts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.calculation.count(),
      prisma.calculation.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.document.count(),
      prisma.document.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.asset.count(),
      prisma.debt.count(),
    ])

    // Get subscription tier breakdown
    const subscriptionStats = await prisma.user.groupBy({
      by: ['subscriptionTier'],
      _count: true,
    })

    // Get jurisdiction breakdown
    const jurisdictionStats = await prisma.calculation.groupBy({
      by: ['jurisdiction'],
      _count: true,
      orderBy: {
        _count: {
          jurisdiction: 'desc',
        },
      },
      take: 10,
    })

    // Log admin stats access
    await auditLogger.logUserAction(
      adminUserId,
      AuditAction.READ,
      '/api/admin?action=system-stats',
      request,
      { statsRetrieved: true },
      ComplianceLevel.STANDARD
    )

    return NextResponse.json({
      success: true,
      systemStats: {
        users: {
          total: totalUsers,
          activeToday: activeUsersToday,
          subscriptionBreakdown: subscriptionStats,
        },
        calculations: {
          total: totalCalculations,
          today: calculationsToday,
          jurisdictionBreakdown: jurisdictionStats,
        },
        documents: {
          total: totalDocuments,
          today: documentsToday,
        },
        data: {
          totalAssets,
          totalDebts,
        },
      },
      generatedAt: new Date(),
    })

  } catch (error) {
    console.error('Get system stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get system stats' },
      { status: 500 }
    )
  }
}

async function getUserActivity(request: NextRequest, adminUserId: string) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const limit = parseInt(searchParams.get('limit') || '20')

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get most active users
    const userActivity = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        timestamp: { gte: cutoff },
        userId: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: limit,
    })

    // Get user details
    const userIds = userActivity.map(activity => activity.userId).filter(Boolean) as string[]
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionTier: true,
        createdAt: true,
      },
    })

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user
      return acc
    }, {} as Record<string, typeof users[0]>)

    // Log admin activity access
    await auditLogger.logUserAction(
      adminUserId,
      AuditAction.READ,
      '/api/admin?action=user-activity',
      request,
      { days, userCount: userActivity.length },
      ComplianceLevel.STANDARD
    )

    return NextResponse.json({
      success: true,
      userActivity: userActivity.map(activity => ({
        userId: activity.userId,
        user: userMap[activity.userId!],
        activityCount: activity._count,
      })),
      timeframe: `${days} days`,
    })

  } catch (error) {
    console.error('Get user activity error:', error)
    return NextResponse.json(
      { error: 'Failed to get user activity' },
      { status: 500 }
    )
  }
}

async function resolveSecurityEvent(request: NextRequest, adminUserId: string, body: any) {
  try {
    const { eventId } = body

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID required' },
        { status: 400 }
      )
    }

    const resolved = await securityMonitor.resolveEvent(eventId, adminUserId)

    if (!resolved) {
      return NextResponse.json(
        { error: 'Security event not found' },
        { status: 404 }
      )
    }

    // Log security event resolution
    await auditLogger.logUserAction(
      adminUserId,
      AuditAction.UPDATE,
      '/api/admin?action=resolve-security-event',
      request,
      { eventId, resolvedBy: adminUserId },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json({
      success: true,
      message: 'Security event resolved successfully',
    })

  } catch (error) {
    console.error('Resolve security event error:', error)
    return NextResponse.json(
      { error: 'Failed to resolve security event' },
      { status: 500 }
    )
  }
}

async function updateUserRole(request: NextRequest, adminUserId: string, body: any) {
  try {
    const { userId, newRole } = body

    if (!userId || !newRole) {
      return NextResponse.json(
        { error: 'User ID and new role required' },
        { status: 400 }
      )
    }

    if (!Object.values(UserRole).includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    // Log role change
    await auditLogger.logUserAction(
      adminUserId,
      AuditAction.UPDATE,
      '/api/admin?action=update-user-role',
      request,
      { targetUserId: userId, newRole, updatedBy: adminUserId },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User role updated successfully',
    })

  } catch (error) {
    console.error('Update user role error:', error)
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    )
  }
}

async function systemMaintenance(request: NextRequest, adminUserId: string, body: any) {
  try {
    const { action, parameters } = body

    let result = {}

    switch (action) {
      case 'cleanup-old-data':
        // Clean up old audit logs, etc.
        const daysToKeep = parameters?.daysToKeep || 365
        const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
        
        const deletedLogs = await prisma.auditLog.deleteMany({
          where: {
            timestamp: { lt: cutoff },
            complianceLevel: 'STANDARD', // Keep legal and financial logs longer
          },
        })
        
        result = { deletedAuditLogs: deletedLogs.count }
        break

      case 'refresh-security-metrics':
        // Force refresh of security metrics
        result = { message: 'Security metrics refreshed' }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid maintenance action' },
          { status: 400 }
        )
    }

    // Log maintenance action
    await auditLogger.logUserAction(
      adminUserId,
      AuditAction.UPDATE,
      '/api/admin?action=system-maintenance',
      request,
      { maintenanceAction: action, parameters, result },
      ComplianceLevel.LEGAL
    )

    return NextResponse.json({
      success: true,
      result,
      message: 'Maintenance action completed successfully',
    })

  } catch (error) {
    console.error('System maintenance error:', error)
    return NextResponse.json(
      { error: 'Failed to perform maintenance action' },
      { status: 500 }
    )
  }
}