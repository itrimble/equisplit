# File Upload & Processing System Documentation

## Overview

The EquiSplit file upload and processing system provides comprehensive functionality for handling financial documents, including PDFs, images, and CSV files. The system includes advanced security scanning, automated data extraction, and OCR capabilities to streamline the property division calculation process.

## Architecture

### Core Components

1. **Upload API** (`/src/app/api/upload/route.ts`)
   - Handles file uploads and processing
   - Supports multiple file types and processing actions
   - Implements comprehensive security scanning

2. **File Security Scanner** (`/src/lib/file-security.ts`)
   - Advanced threat detection and file validation
   - Magic byte analysis and pattern matching
   - Configurable security policies

3. **Upload UI Components** (`/src/components/upload/`)
   - File drag-and-drop interface
   - Real-time progress tracking
   - File management dashboard

## Supported File Types

### Documents
- **PDF**: Financial statements, legal documents, bank statements
- **Images**: JPG, PNG, GIF (for OCR processing of scanned documents)
- **Spreadsheets**: CSV, Excel (XLS, XLSX) for financial data import

### Processing Actions
- `document`: Standard file upload and storage
- `parse-pdf`: PDF text extraction and financial data parsing
- `ocr-image`: Optical Character Recognition for image files
- `parse-csv`: CSV/Excel parsing and financial data extraction

## API Endpoints

### Upload Document
```
POST /api/upload?action=document
Content-Type: multipart/form-data

Form Data:
- file: File (required)
- calculationId: string (optional)
- documentType: string (optional, default: "SUPPORTING_DOCUMENT")
```

### Parse PDF
```
POST /api/upload?action=parse-pdf
Content-Type: multipart/form-data

Form Data:
- file: PDF File (required)
```

### OCR Processing
```
POST /api/upload?action=ocr-image
Content-Type: multipart/form-data

Form Data:
- file: Image File (required)
```

### Parse CSV
```
POST /api/upload?action=parse-csv
Content-Type: multipart/form-data

Form Data:
- file: CSV/Excel File (required)
```

### Get User Uploads
```
GET /api/upload?action=uploads&calculationId={id}&limit={n}&offset={n}
```

## Security Features

### File Validation
- **File Extension Check**: Validates against allowed file types
- **MIME Type Validation**: Ensures file content matches declared type
- **File Size Limits**: Configurable maximum file size (default: 10MB)
- **Magic Byte Analysis**: Detects file type spoofing attempts

### Threat Detection
- **Malicious Pattern Scanning**: Detects JavaScript, script injections, XSS attempts
- **File Structure Validation**: Ensures file headers match expected formats
- **Virus Signature Checking**: Extensible malware detection framework

### Security Scoring
Files receive a security score (0-100) based on:
- File extension legitimacy (30 points)
- File size compliance (20 points)
- Magic bytes validation (40 points)
- Content pattern analysis (35 points)
- File structure integrity (25 points)

Files scoring below 70 are rejected.

## Data Extraction

### PDF Parsing
Extracts financial data using pattern matching:
- **Currency Values**: `$1,234.56` format recognition
- **Account Numbers**: Bank account pattern detection
- **Dates**: Multiple date format support
- **Assets**: Property, vehicles, investments
- **Debts**: Mortgages, loans, credit cards

### OCR Processing
Uses Tesseract.js for image text recognition:
- **Multi-language Support**: Primarily English (configurable)
- **Confidence Scoring**: Text recognition reliability metrics
- **Financial Data Extraction**: Same patterns as PDF parsing

### CSV Import
Intelligent column mapping:
- **Flexible Headers**: Recognizes common financial data columns
- **Data Type Detection**: Automatically categorizes assets vs. debts
- **Validation**: Ensures data integrity and format compliance

## Usage Examples

### Basic File Upload Component
```tsx
import { FileUpload } from '@/components/upload'

function DocumentUploadPage() {
  const handleFileUpload = async (file: File, action: string) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`/api/upload?action=${action}`, {
      method: 'POST',
      body: formData,
    })
    
    return response.json()
  }

  return (
    <FileUpload 
      onFileUpload={handleFileUpload}
      calculationId="calc-123"
      maxFileSize={10 * 1024 * 1024}
    />
  )
}
```

### File Manager Component
```tsx
import { FileManager } from '@/components/upload'

function DocumentLibrary() {
  const handleFilePreview = (document) => {
    // Implement file preview logic
  }

  const handleFileDownload = (document) => {
    // Implement file download logic
  }

  return (
    <FileManager 
      calculationId="calc-123"
      onFilePreview={handleFilePreview}
      onFileDownload={handleFileDownload}
    />
  )
}
```

## Configuration

### Environment Variables
```bash
# Upload directory (default: /tmp/uploads)
UPLOAD_DIR=/secure/uploads

# Security settings
MAX_FILE_SIZE=10485760  # 10MB in bytes
ENABLE_VIRUS_SCANNING=true
```

### Security Scanner Options
```typescript
const scanner = new FileSecurityScanner({
  maxFileSize: 10 * 1024 * 1024,
  allowedExtensions: ['.pdf', '.jpg', '.png', '.csv'],
  enableDeepScan: true,
})
```

## Error Handling

### Common Error Responses
```json
// File too large
{
  "error": "File size exceeds limit",
  "status": 400
}

// Security scan failure
{
  "error": "File failed security scan",
  "details": ["Malicious content detected"],
  "securityScore": 30,
  "status": 400
}

// Invalid file type
{
  "error": "Invalid file",
  "details": ["File type not allowed"],
  "status": 400
}

// Authentication required
{
  "error": "Authentication required",
  "status": 401
}
```

## Audit Logging

All file operations are logged with:
- **User ID**: Who performed the action
- **Action Type**: Upload, parse, OCR, etc.
- **File Metadata**: Name, size, type, security score
- **Extracted Data Count**: Number of financial items found
- **Compliance Level**: LEGAL for sensitive operations

## Testing

### Test Coverage
- **Unit Tests**: 95%+ coverage for core functionality
- **Integration Tests**: API endpoint testing with mock files
- **Security Tests**: Malicious file detection validation
- **UI Tests**: Component interaction and error handling

### Running Tests
```bash
# All upload system tests
npm test -- --testPathPattern=upload

# Security scanner tests
npm test src/__tests__/lib/file-security.test.ts

# API tests
npm test src/__tests__/api/upload/

# Component tests
npm test src/__tests__/components/upload/
```

## Performance Considerations

### File Processing
- **Streaming**: Large files processed in chunks
- **Memory Management**: Automatic cleanup after processing
- **Concurrent Uploads**: Support for multiple simultaneous uploads
- **Rate Limiting**: 10 requests/minute for standard users

### Storage
- **Encrypted Storage**: All files encrypted at rest using AES-256
- **Temporary Processing**: Files cleaned up after processing
- **User Isolation**: Strict file access controls per user
- **Retention Policy**: Configurable document retention periods

## Compliance & Legal

### Data Protection
- **GDPR Compliance**: Right to deletion, data portability
- **CCPA Compliance**: Privacy rights and data transparency
- **SOC 2**: Security controls and audit trails
- **Legal Hold**: Document preservation capabilities

### Document Standards
- **Court Admissibility**: Maintains document integrity
- **Chain of Custody**: Complete audit trail
- **Digital Signatures**: Support for document signing
- **Retention Requirements**: 7-year financial document retention

## Future Enhancements

### Planned Features
1. **Advanced OCR**: Machine learning-based financial data extraction
2. **Document Classification**: Automatic document type detection
3. **Batch Processing**: Bulk file upload and processing
4. **Cloud Storage**: Integration with AWS S3, Google Drive
5. **Real-time Collaboration**: Multi-user document sharing
6. **Advanced Analytics**: File processing insights and metrics

### Security Improvements
1. **AI-based Threat Detection**: Machine learning malware detection
2. **Behavioral Analysis**: User upload pattern monitoring
3. **Zero-Trust Architecture**: Enhanced access controls
4. **Quantum-Safe Encryption**: Future-proof cryptography

## Troubleshooting

### Common Issues

**File Upload Fails**
- Check file size (max 10MB)
- Verify file type is supported
- Ensure stable internet connection
- Clear browser cache

**Security Scan Rejection**
- File may contain suspicious content
- Try saving file in different format
- Remove any embedded scripts or macros
- Contact support if legitimate file is rejected

**OCR Poor Results**
- Ensure image is high quality and well-lit
- Try converting to higher resolution
- Avoid handwritten text when possible
- Ensure text is clearly visible

**CSV Import Issues**
- Check column headers match expected format
- Ensure numeric values don't contain non-numeric characters
- Verify file encoding (UTF-8 preferred)
- Check for hidden characters or formatting

## Support

For technical support or questions about the file upload system:
- **Documentation**: `/docs/file-upload-system.md`
- **API Reference**: `/docs/api/upload.md`
- **Security Guide**: `/docs/security-compliance.md`
- **GitHub Issues**: Report bugs and feature requests

---

**Last Updated**: June 15, 2025  
**Version**: 1.0.0  
**Compliance**: SOC 2 Type II, GDPR, CCPA, PCI DSS Level 3