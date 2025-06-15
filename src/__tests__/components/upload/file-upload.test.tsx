/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { FileUpload } from '@/components/upload/file-upload'

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(({ onDrop, accept, maxSize }) => ({
    getRootProps: () => ({
      onClick: jest.fn(),
    }),
    getInputProps: () => ({
      type: 'file',
    }),
    isDragActive: false,
    fileRejections: [],
  })),
}))

const mockOnFileUpload = jest.fn()
const mockOnFileRemove = jest.fn()

// Helper to create mock files
const createMockFile = (name: string, type: string, size: number = 1024): File => {
  const blob = new Blob(['test content'], { type })
  Object.defineProperty(blob, 'name', { value: name })
  Object.defineProperty(blob, 'size', { value: size })
  return blob as File
}

describe('FileUpload Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render upload area correctly', () => {
      render(
        <FileUpload onFileUpload={mockOnFileUpload} />
      )

      expect(screen.getByText('Upload Financial Documents')).toBeInTheDocument()
      expect(screen.getByText(/Drag & drop files here/)).toBeInTheDocument()
      expect(screen.getByText(/Supported: PDF, Images/)).toBeInTheDocument()
    })

    it('should display file type badges', () => {
      render(
        <FileUpload onFileUpload={mockOnFileUpload} />
      )

      expect(screen.getByText('PDF Document')).toBeInTheDocument()
      expect(screen.getByText('JPEG Image')).toBeInTheDocument()
      expect(screen.getByText('CSV File')).toBeInTheDocument()
    })

    it('should render with custom class name', () => {
      const { container } = render(
        <FileUpload 
          onFileUpload={mockOnFileUpload} 
          className="custom-class"
        />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('File Upload Functionality', () => {
    it('should handle successful file upload', async () => {
      const mockResult = {
        success: true,
        message: 'File uploaded successfully',
        extractedData: []
      }
      mockOnFileUpload.mockResolvedValue(mockResult)

      const { useDropzone } = require('react-dropzone')
      let onDropCallback: Function

      useDropzone.mockImplementation(({ onDrop }: any) => {
        onDropCallback = onDrop
        return {
          getRootProps: () => ({}),
          getInputProps: () => ({}),
          isDragActive: false,
          fileRejections: [],
        }
      })

      render(
        <FileUpload onFileUpload={mockOnFileUpload} />
      )

      const file = createMockFile('test.pdf', 'application/pdf')
      
      // Simulate file drop
      await onDropCallback([file])

      await waitFor(() => {
        expect(mockOnFileUpload).toHaveBeenCalledWith(file, 'parse-pdf')
      })

      await waitFor(() => {
        expect(screen.getByText('File uploaded successfully')).toBeInTheDocument()
      })
    })

    it('should handle file upload error', async () => {
      const error = new Error('Upload failed')
      mockOnFileUpload.mockRejectedValue(error)

      const { useDropzone } = require('react-dropzone')
      let onDropCallback: Function

      useDropzone.mockImplementation(({ onDrop }: any) => {
        onDropCallback = onDrop
        return {
          getRootProps: () => ({}),
          getInputProps: () => ({}),
          isDragActive: false,
          fileRejections: [],
        }
      })

      render(
        <FileUpload onFileUpload={mockOnFileUpload} />
      )

      const file = createMockFile('test.pdf', 'application/pdf')
      
      await onDropCallback([file])

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument()
      })
    })

    it('should show progress during upload', async () => {
      let resolveUpload: Function
      const uploadPromise = new Promise((resolve) => {
        resolveUpload = resolve
      })
      mockOnFileUpload.mockReturnValue(uploadPromise)

      const { useDropzone } = require('react-dropzone')
      let onDropCallback: Function

      useDropzone.mockImplementation(({ onDrop }: any) => {
        onDropCallback = onDrop
        return {
          getRootProps: () => ({}),
          getInputProps: () => ({}),
          isDragActive: false,
          fileRejections: [],
        }
      })

      render(
        <FileUpload onFileUpload={mockOnFileUpload} />
      )

      const file = createMockFile('test.pdf', 'application/pdf')
      
      await onDropCallback([file])

      // Should show processing state
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument()
      })

      // Resolve upload
      resolveUpload({ success: true, message: 'Done' })

      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument()
      })
    })
  })

  describe('File Type Handling', () => {
    it('should determine correct action for PDF files', async () => {
      const { useDropzone } = require('react-dropzone')
      let onDropCallback: Function

      useDropzone.mockImplementation(({ onDrop }: any) => {
        onDropCallback = onDrop
        return {
          getRootProps: () => ({}),
          getInputProps: () => ({}),
          isDragActive: false,
          fileRejections: [],
        }
      })

      render(
        <FileUpload onFileUpload={mockOnFileUpload} />
      )

      const file = createMockFile('document.pdf', 'application/pdf')
      await onDropCallback([file])

      expect(mockOnFileUpload).toHaveBeenCalledWith(file, 'parse-pdf')
    })

    it('should determine correct action for image files', async () => {
      const { useDropzone } = require('react-dropzone')
      let onDropCallback: Function

      useDropzone.mockImplementation(({ onDrop }: any) => {
        onDropCallback = onDrop
        return {
          getRootProps: () => ({}),
          getInputProps: () => ({}),
          isDragActive: false,
          fileRejections: [],
        }
      })

      render(
        <FileUpload onFileUpload={mockOnFileUpload} />
      )

      const file = createMockFile('scan.jpg', 'image/jpeg')
      await onDropCallback([file])

      expect(mockOnFileUpload).toHaveBeenCalledWith(file, 'ocr-image')
    })

    it('should determine correct action for CSV files', async () => {
      const { useDropzone } = require('react-dropzone')
      let onDropCallback: Function

      useDropzone.mockImplementation(({ onDrop }: any) => {
        onDropCallback = onDrop
        return {
          getRootProps: () => ({}),
          getInputProps: () => ({}),
          isDragActive: false,
          fileRejections: [],
        }
      })

      render(
        <FileUpload onFileUpload={mockOnFileUpload} />
      )

      const file = createMockFile('data.csv', 'text/csv')
      await onDropCallback([file])

      expect(mockOnFileUpload).toHaveBeenCalledWith(file, 'parse-csv')
    })
  })

  describe('File Management', () => {
    it('should display uploaded files', async () => {
      const mockResult = {
        success: true,
        message: 'File uploaded successfully',
        extractedData: [{ type: 'asset', value: '$10,000' }]
      }
      mockOnFileUpload.mockResolvedValue(mockResult)

      const { useDropzone } = require('react-dropzone')
      let onDropCallback: Function

      useDropzone.mockImplementation(({ onDrop }: any) => {
        onDropCallback = onDrop
        return {
          getRootProps: () => ({}),
          getInputProps: () => ({}),
          isDragActive: false,
          fileRejections: [],
        }
      })

      render(
        <FileUpload onFileUpload={mockOnFileUpload} />
      )

      const file = createMockFile('test.pdf', 'application/pdf')
      await onDropCallback([file])

      await waitFor(() => {
        expect(screen.getByText('Uploaded Files')).toBeInTheDocument()
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
        expect(screen.getByText('Found 1 financial items')).toBeInTheDocument()
      })
    })

    it('should allow file removal', async () => {
      const mockResult = { success: true, message: 'Uploaded' }
      mockOnFileUpload.mockResolvedValue(mockResult)

      const { useDropzone } = require('react-dropzone')
      let onDropCallback: Function

      useDropzone.mockImplementation(({ onDrop }: any) => {
        onDropCallback = onDrop
        return {
          getRootProps: () => ({}),
          getInputProps: () => ({}),
          isDragActive: false,
          fileRejections: [],
        }
      })

      render(
        <FileUpload 
          onFileUpload={mockOnFileUpload}
          onFileRemove={mockOnFileRemove}
        />
      )

      const file = createMockFile('test.pdf', 'application/pdf')
      await onDropCallback([file])

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })

      // Find and click remove button
      const removeButton = screen.getByRole('button', { name: /×/ })
      fireEvent.click(removeButton)

      await waitFor(() => {
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument()
      })
    })
  })

  describe('File Size Formatting', () => {
    it('should format file sizes correctly', async () => {
      const mockResult = { success: true, message: 'Uploaded' }
      mockOnFileUpload.mockResolvedValue(mockResult)

      const { useDropzone } = require('react-dropzone')
      let onDropCallback: Function

      useDropzone.mockImplementation(({ onDrop }: any) => {
        onDropCallback = onDrop
        return {
          getRootProps: () => ({}),
          getInputProps: () => ({}),
          isDragActive: false,
          fileRejections: [],
        }
      })

      render(
        <FileUpload onFileUpload={mockOnFileUpload} />
      )

      const file = createMockFile('test.pdf', 'application/pdf', 1024 * 1024) // 1MB
      await onDropCallback([file])

      await waitFor(() => {
        expect(screen.getByText(/1 MB/)).toBeInTheDocument()
      })
    })
  })

  describe('File Rejections', () => {
    it('should display file rejection errors', () => {
      const { useDropzone } = require('react-dropzone')

      useDropzone.mockImplementation(() => ({
        getRootProps: () => ({}),
        getInputProps: () => ({}),
        isDragActive: false,
        fileRejections: [
          {
            file: createMockFile('large.pdf', 'application/pdf'),
            errors: [{ message: 'File too large' }]
          }
        ],
      }))

      render(
        <FileUpload onFileUpload={mockOnFileUpload} />
      )

      expect(screen.getByText('Some files were rejected:')).toBeInTheDocument()
      expect(screen.getByText(/large.pdf: File too large/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria labels and roles', () => {
      render(
        <FileUpload onFileUpload={mockOnFileUpload} />
      )

      // Check for proper headings
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Upload Financial Documents')
      
      // Check for input element
      expect(screen.getByDisplayValue('')).toBeInTheDocument()
    })
  })
})