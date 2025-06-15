'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { FileText, Upload, X, CheckCircle, AlertTriangle, FileImage, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface FileUploadProps {
  onFileUpload: (file: File, action: string) => Promise<any>
  onFileRemove?: (fileId: string) => void
  acceptedFileTypes?: string[]
  maxFileSize?: number
  calculationId?: string
  documentType?: string
  className?: string
}

export interface UploadedFile {
  id: string
  file: File
  status: 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  result?: any
  error?: string
  action?: string
}

const ACCEPTED_TYPES = {
  'application/pdf': 'PDF Document',
  'image/jpeg': 'JPEG Image',
  'image/png': 'PNG Image',
  'image/gif': 'GIF Image',
  'text/csv': 'CSV File',
  'application/vnd.ms-excel': 'Excel File (XLS)',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel File (XLSX)',
}

const ACTION_TYPES = {
  'application/pdf': 'parse-pdf',
  'image/jpeg': 'ocr-image',
  'image/png': 'ocr-image',
  'image/gif': 'ocr-image',
  'text/csv': 'parse-csv',
  'application/vnd.ms-excel': 'parse-csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'parse-csv',
}

const FileIcon = ({ mimeType }: { mimeType: string }) => {
  if (mimeType === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />
  if (mimeType.startsWith('image/')) return <FileImage className="h-8 w-8 text-blue-500" />
  if (mimeType.includes('csv') || mimeType.includes('excel') || mimeType.includes('spreadsheet')) 
    return <FileSpreadsheet className="h-8 w-8 text-green-500" />
  return <FileText className="h-8 w-8 text-gray-500" />
}

export function FileUpload({ 
  onFileUpload, 
  onFileRemove,
  acceptedFileTypes = Object.keys(ACCEPTED_TYPES),
  maxFileSize = 10 * 1024 * 1024, // 10MB
  calculationId,
  documentType,
  className 
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true)

    for (const file of acceptedFiles) {
      const fileId = `${Date.now()}-${Math.random()}`
      const uploadedFile: UploadedFile = {
        id: fileId,
        file,
        status: 'uploading',
        progress: 0,
        action: ACTION_TYPES[file.type as keyof typeof ACTION_TYPES] || 'document'
      }

      setUploadedFiles(prev => [...prev, uploadedFile])

      try {
        // Update progress
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress: 50, status: 'processing' as const } : f
        ))

        // Upload and process file
        const result = await onFileUpload(file, uploadedFile.action)
        
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { 
            ...f, 
            progress: 100, 
            status: 'success' as const, 
            result 
          } : f
        ))

      } catch (error) {
        console.error('File upload error:', error)
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { 
            ...f, 
            status: 'error' as const, 
            error: error instanceof Error ? error.message : 'Upload failed' 
          } : f
        ))
      }
    }

    setIsProcessing(false)
  }, [onFileUpload])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
    multiple: true,
  })

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
    if (onFileRemove) {
      onFileRemove(fileId)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'success': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      case 'processing': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Financial Documents
          </CardTitle>
          <CardDescription>
            Upload PDFs, images, or CSV files containing financial information. 
            Files will be automatically processed and analyzed for relevant data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-blue-600">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag & drop files here, or click to select files
                </p>
                <p className="text-sm text-gray-500">
                  Supported: PDF, Images (JPG, PNG, GIF), CSV, Excel
                  <br />
                  Maximum size: {formatFileSize(maxFileSize)}
                </p>
              </div>
            )}
          </div>

          {/* File Type Legend */}
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(ACCEPTED_TYPES).map(([type, label]) => (
              <Badge key={type} variant="outline" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>

          {/* File Rejections */}
          {fileRejections.length > 0 && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Some files were rejected:</strong>
                <ul className="mt-1 list-disc list-inside">
                  {fileRejections.map(({ file, errors }) => (
                    <li key={file.name} className="text-sm">
                      {file.name}: {errors.map(e => e.message).join(', ')}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadedFiles.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                <FileIcon mimeType={uploadedFile.file.type} />
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{uploadedFile.file.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(uploadedFile.file.size)} • {ACCEPTED_TYPES[uploadedFile.file.type as keyof typeof ACCEPTED_TYPES]}
                  </p>
                  
                  {/* Progress bar */}
                  {(uploadedFile.status === 'uploading' || uploadedFile.status === 'processing') && (
                    <div className="mt-2">
                      <Progress 
                        value={uploadedFile.progress} 
                        className="h-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {uploadedFile.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                      </p>
                    </div>
                  )}

                  {/* Success message */}
                  {uploadedFile.status === 'success' && uploadedFile.result && (
                    <div className="mt-2 text-sm text-green-600">
                      {uploadedFile.result.message}
                      {uploadedFile.result.extractedData && (
                        <p className="text-xs">
                          Found {uploadedFile.result.extractedData.length} financial items
                        </p>
                      )}
                    </div>
                  )}

                  {/* Error message */}
                  {uploadedFile.status === 'error' && (
                    <div className="mt-2 text-sm text-red-600">
                      {uploadedFile.error}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {getStatusIcon(uploadedFile.status)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadedFile.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default FileUpload