'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  Clock, 
  FileImage, 
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/utils/cn'

export interface Document {
  id: string
  type: string
  title: string
  filename: string
  fileSize: number
  mimeType: string
  status: string
  createdAt: string
  calculation?: {
    id: string
    title: string
  }
}

export interface FileManagerProps {
  calculationId?: string
  onFilePreview?: (document: Document) => void
  onFileDownload?: (document: Document) => void
  onFileDelete?: (documentId: string) => void
  className?: string
}

const DocumentIcon = ({ mimeType }: { mimeType: string }) => {
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />
  if (mimeType.startsWith('image/')) return <FileImage className="h-5 w-5 text-blue-500" />
  if (mimeType.includes('csv') || mimeType.includes('excel') || mimeType.includes('spreadsheet')) 
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />
  return <FileText className="h-5 w-5 text-gray-500" />
}

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return { variant: 'default' as const, icon: CheckCircle, color: 'text-green-500' }
      case 'processing':
        return { variant: 'secondary' as const, icon: Clock, color: 'text-blue-500' }
      case 'draft':
        return { variant: 'outline' as const, icon: FileText, color: 'text-gray-500' }
      case 'error':
        return { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-500' }
      default:
        return { variant: 'outline' as const, icon: FileText, color: 'text-gray-500' }
    }
  }

  const config = getStatusConfig(status)
  const IconComponent = config.icon

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <IconComponent className={cn('h-3 w-3', config.color)} />
      {status}
    </Badge>
  )
}

export function FileManager({ 
  calculationId, 
  onFilePreview, 
  onFileDownload, 
  onFileDelete,
  className 
}: FileManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({ action: 'uploads' })
      if (calculationId) {
        params.append('calculationId', calculationId)
      }

      const response = await fetch(`/api/upload?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch documents')
      }

      setDocuments(data.uploads || [])
    } catch (err) {
      console.error('Error fetching documents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    try {
      // This would typically call a DELETE endpoint
      // For now, we'll just remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
      
      if (onFileDelete) {
        onFileDelete(documentId)
      }
    } catch (err) {
      console.error('Error deleting document:', err)
      setError('Failed to delete document')
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [calculationId])

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
            <span className="ml-2 text-gray-600">Loading documents...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={fetchDocuments} 
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Document Library
          <Button 
            onClick={fetchDocuments} 
            variant="outline" 
            size="sm"
          >
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          {documents.length > 0 
            ? `${documents.length} document${documents.length === 1 ? '' : 's'} uploaded`
            : 'No documents uploaded yet'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>No documents found</p>
            <p className="text-sm">Upload some files to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <DocumentIcon mimeType={document.mimeType} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">{document.title}</p>
                    <StatusBadge status={document.status} />
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{formatFileSize(document.fileSize)}</span>
                    <span>•</span>
                    <span>{formatDate(document.createdAt)}</span>
                    {document.calculation && (
                      <>
                        <span>•</span>
                        <span className="truncate">
                          {document.calculation.title}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onFilePreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFilePreview(document)}
                      className="h-8 w-8 p-0"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {onFileDownload && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFileDownload(document)}
                      className="h-8 w-8 p-0"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(document.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FileManager