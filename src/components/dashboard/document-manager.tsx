'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/upload/file-upload';
import { 
  DocumentTextIcon, 
  DocumentArrowDownIcon,
  TrashIcon,
  EyeIcon,
  FolderOpenIcon,
  CloudArrowUpIcon,
  PlusIcon 
} from '@heroicons/react/24/outline';

interface DocumentManagerProps {
  userId: string;
}

// Mock data - replace with actual API calls
const mockDocuments = [
  {
    id: 'doc_123',
    name: 'Marital Settlement Agreement - CA',
    type: 'generated',
    format: 'pdf',
    size: 245760, // bytes
    createdAt: new Date('2024-06-14'),
    calculationId: 'calc_123',
    status: 'completed',
    downloadUrl: '/api/documents/doc_123/download',
  },
  {
    id: 'doc_124',
    name: 'Financial Affidavit - TX',
    type: 'generated',
    format: 'pdf',
    size: 128512,
    createdAt: new Date('2024-06-12'),
    calculationId: 'calc_125',
    status: 'completed',
    downloadUrl: '/api/documents/doc_124/download',
  },
  {
    id: 'doc_125',
    name: 'Bank Statements - Chase 2024',
    type: 'uploaded',
    format: 'pdf',
    size: 1024000,
    createdAt: new Date('2024-06-13'),
    calculationId: 'calc_124',
    status: 'processed',
    downloadUrl: '/api/documents/doc_125/download',
  },
  {
    id: 'doc_126',
    name: 'Property Appraisal Report',
    type: 'uploaded',
    format: 'pdf',
    size: 2048000,
    createdAt: new Date('2024-06-11'),
    calculationId: 'calc_124',
    status: 'processing',
    downloadUrl: null,
  },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getDocumentIcon(type: string, format: string) {
  if (type === 'generated') {
    return DocumentTextIcon;
  }
  return DocumentArrowDownIcon;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
    case 'processed':
      return <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">Ready</Badge>;
    case 'processing':
      return <Badge variant="outline" className="text-yellow-700 bg-yellow-50 border-yellow-200">Processing</Badge>;
    case 'failed':
      return <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200">Failed</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'generated':
      return <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">Generated</Badge>;
    case 'uploaded':
      return <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200">Uploaded</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

export function DocumentManager({ userId }: DocumentManagerProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'generated' | 'uploaded'>('all');
  const [showUpload, setShowUpload] = useState(false);

  const filteredDocuments = mockDocuments.filter((doc) => {
    if (activeTab === 'all') return true;
    return doc.type === activeTab;
  });

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        {/* Tab Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Documents ({mockDocuments.length})
          </button>
          <button
            onClick={() => setActiveTab('generated')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'generated'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Generated ({mockDocuments.filter(d => d.type === 'generated').length})
          </button>
          <button
            onClick={() => setActiveTab('uploaded')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'uploaded'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Uploaded ({mockDocuments.filter(d => d.type === 'uploaded').length})
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowUpload(!showUpload)}
          >
            <CloudArrowUpIcon className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
          <Link href="/dashboard/documents/generate">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Generate Document
            </Button>
          </Link>
        </div>
      </div>

      {/* File Upload Section */}
      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload
              onUploadComplete={(files) => {
                console.log('Files uploaded:', files);
                setShowUpload(false);
                // Refresh documents list
              }}
              maxFiles={5}
              maxSize={10 * 1024 * 1024} // 10MB
              acceptedFileTypes={['.pdf', '.csv', '.xlsx', '.docx']}
            />
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <div className="space-y-4">
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FolderOpenIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No documents found
              </h3>
              <p className="text-gray-500 mb-4">
                {activeTab === 'generated'
                  ? 'Complete a calculation to generate your first document.'
                  : activeTab === 'uploaded'
                  ? 'Upload financial documents to get started.'
                  : 'Upload documents or complete a calculation to get started.'}
              </p>
              <div className="flex gap-2 justify-center">
                {activeTab !== 'generated' && (
                  <Button variant="outline" onClick={() => setShowUpload(true)}>
                    Upload Files
                  </Button>
                )}
                {activeTab !== 'uploaded' && (
                  <Link href="/calculator">
                    <Button>
                      Start Calculation
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredDocuments.map((document) => {
            const Icon = getDocumentIcon(document.type, document.format);
            
            return (
              <Card key={document.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    {/* Document Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <Icon className="h-8 w-8 text-gray-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {document.name}
                          </h3>
                          {getStatusBadge(document.status)}
                          {getTypeBadge(document.type)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{formatFileSize(document.size)}</span>
                          <span>{document.format.toUpperCase()}</span>
                          <span>{document.createdAt.toLocaleDateString()}</span>
                          {document.calculationId && (
                            <Link 
                              href={`/calculator/results?id=${document.calculationId}`}
                              className="text-blue-600 hover:text-blue-500"
                            >
                              View Calculation
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      {document.status === 'completed' || document.status === 'processed' ? (
                        <>
                          <Button variant="outline" size="sm">
                            <EyeIcon className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          <Button variant="outline" size="sm">
                            <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </>
                      ) : document.status === 'processing' ? (
                        <Badge variant="outline" className="text-yellow-700 bg-yellow-50">
                          Processing...
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-700 bg-red-50">
                          Processing Failed
                        </Badge>
                      )}
                      
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Storage Usage */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Storage Usage</h4>
              <p className="text-sm text-gray-500">
                {formatFileSize(mockDocuments.reduce((acc, doc) => acc + doc.size, 0))} of 100 MB used
              </p>
            </div>
            <Link href="/dashboard/billing" className="text-sm text-blue-600 hover:text-blue-500">
              Upgrade for more storage →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}