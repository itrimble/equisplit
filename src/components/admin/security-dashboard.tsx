'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  Shield, 
  Activity, 
  Users, 
  Lock, 
  Eye, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp
} from 'lucide-react'

interface SecurityMetrics {
  totalEvents: number
  eventsByType: Record<string, number>
  eventsByLevel: Record<string, number>
  topIPs: Array<{ ip: string; count: number }>
  unresolvedEvents: number
}

interface SecurityEvent {
  id: string
  type: string
  level: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  ipAddress: string
  endpoint: string
  resolved: boolean
  details: Record<string, any>
}

interface ComplianceStatus {
  encryption: boolean
  authentication: boolean
  authorization: boolean
  auditLogging: boolean
  inputValidation: boolean
  rateLimiting: boolean
}

export function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Fetch security data
  const fetchSecurityData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch security metrics
      const metricsResponse = await fetch('/api/admin?action=security-metrics&hours=24')
      if (!metricsResponse.ok) throw new Error('Failed to fetch security metrics')
      const metricsData = await metricsResponse.json()
      setMetrics(metricsData.data)

      // Fetch unresolved security events
      const eventsResponse = await fetch('/api/admin?action=security-events&resolved=false&limit=20')
      if (!eventsResponse.ok) throw new Error('Failed to fetch security events')
      const eventsData = await eventsResponse.json()
      setEvents(eventsData.data || [])

      // Fetch compliance status
      const complianceResponse = await fetch('/api/admin?action=compliance-status')
      if (!complianceResponse.ok) throw new Error('Failed to fetch compliance status')
      const complianceData = await complianceResponse.json()
      setCompliance(complianceData.data)

      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Resolve security event
  const resolveEvent = async (eventId: string) => {
    try {
      const response = await fetch('/api/admin?action=resolve-security-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      })

      if (!response.ok) throw new Error('Failed to resolve security event')

      // Refresh events
      await fetchSecurityData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve event')
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchSecurityData()
    const interval = setInterval(fetchSecurityData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Get threat level color
  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'warning' as any
      case 'low': return 'secondary'
      default: return 'default'
    }
  }

  // Get threat level icon
  const getThreatLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <XCircle className="h-4 w-4" />
      case 'high': return <AlertTriangle className="h-4 w-4" />
      case 'medium': return <Clock className="h-4 w-4" />
      case 'low': return <CheckCircle className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading security dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Security Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time security monitoring and compliance status
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Badge>
          <Button 
            onClick={fetchSecurityData} 
            disabled={loading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Security Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Security events detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {metrics?.unresolvedEvents || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High/Critical Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics?.eventsByLevel?.high || 0) + (metrics?.eventsByLevel?.critical || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Severe security incidents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Threat IPs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.topIPs?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Suspicious IP addresses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed information */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="metrics">Threat Metrics</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Status</TabsTrigger>
          <TabsTrigger value="ips">Threat Intelligence</TabsTrigger>
        </TabsList>

        {/* Security Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unresolved Security Events</CardTitle>
              <CardDescription>
                Security events requiring investigation and resolution
              </CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No unresolved security events</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getThreatLevelColor(event.level)}>
                            {getThreatLevelIcon(event.level)}
                            {event.level.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{event.type}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => resolveEvent(event.id)}
                          >
                            Resolve
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">IP Address:</span> {event.ipAddress}
                        </div>
                        <div>
                          <span className="font-medium">Endpoint:</span> {event.endpoint}
                        </div>
                      </div>
                      {event.details && Object.keys(event.details).length > 0 && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <span className="font-medium">Details:</span>
                          <pre className="mt-1 whitespace-pre-wrap">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Threat Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Events by Type</CardTitle>
                <CardDescription>Distribution of security event types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics?.eventsByType && Object.entries(metrics.eventsByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm">{type.replace(/_/g, ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Events by Severity</CardTitle>
                <CardDescription>Distribution of threat levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics?.eventsByLevel && Object.entries(metrics.eventsByLevel).map(([level, count]) => (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getThreatLevelIcon(level)}
                        <span className="text-sm capitalize">{level}</span>
                      </div>
                      <Badge variant={getThreatLevelColor(level)}>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Status Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SOC 2 Compliance Status</CardTitle>
              <CardDescription>Real-time compliance monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {compliance && Object.entries(compliance).map(([control, status]) => (
                  <div key={control} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-2">
                      {status ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium capitalize">
                        {control.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                    <Badge variant={status ? 'default' : 'destructive'}>
                      {status ? 'Compliant' : 'Non-Compliant'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Threat Intelligence Tab */}
        <TabsContent value="ips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Threat Sources</CardTitle>
              <CardDescription>IP addresses with highest security event count</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics?.topIPs && metrics.topIPs.length > 0 ? (
                <div className="space-y-3">
                  {metrics.topIPs.map((ipData, index) => (
                    <div key={ipData.ip} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <div className="font-medium font-mono">{ipData.ip}</div>
                          <div className="text-sm text-muted-foreground">
                            {ipData.count} security events
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-red-500" />
                        <Badge variant="destructive">{ipData.count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No threat sources detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}