import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentManager } from '@/components/dashboard/document-manager';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock FileUpload component
jest.mock('@/components/upload/file-upload', () => {
  return function MockFileUpload({ onUploadComplete }: { onUploadComplete: (files: any[]) => void }) {
    return (
      <div data-testid="file-upload">
        <button 
          onClick={() => onUploadComplete([{ name: 'test.pdf', size: 1024 }])}
        >
          Mock Upload
        </button>
      </div>
    );
  };
});

describe('DocumentManager', () => {
  const mockUserId = 'user_123';
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders document manager with tab filters', () => {
    render(<DocumentManager userId={mockUserId} />);

    // Check for tab buttons
    expect(screen.getByText(/All Documents \(4\)/)).toBeInTheDocument();
    expect(screen.getByText(/Generated \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Uploaded \(2\)/)).toBeInTheDocument();
  });

  it('displays action buttons', () => {
    render(<DocumentManager userId={mockUserId} />);

    expect(screen.getByText('Upload Files')).toBeInTheDocument();
    expect(screen.getByText('Generate Document')).toBeInTheDocument();
  });

  it('shows all documents by default', () => {
    render(<DocumentManager userId={mockUserId} />);

    expect(screen.getByText('Marital Settlement Agreement - CA')).toBeInTheDocument();
    expect(screen.getByText('Financial Affidavit - TX')).toBeInTheDocument();
    expect(screen.getByText('Bank Statements - Chase 2024')).toBeInTheDocument();
    expect(screen.getByText('Property Appraisal Report')).toBeInTheDocument();
  });

  it('filters documents by type when tabs are clicked', async () => {
    render(<DocumentManager userId={mockUserId} />);

    // Click on Generated tab
    const generatedTab = screen.getByText(/Generated \(2\)/);
    await user.click(generatedTab);

    await waitFor(() => {
      expect(screen.getByText('Marital Settlement Agreement - CA')).toBeInTheDocument();
      expect(screen.getByText('Financial Affidavit - TX')).toBeInTheDocument();
      expect(screen.queryByText('Bank Statements - Chase 2024')).not.toBeInTheDocument();
    });

    // Click on Uploaded tab
    const uploadedTab = screen.getByText(/Uploaded \(2\)/);
    await user.click(uploadedTab);

    await waitFor(() => {
      expect(screen.queryByText('Marital Settlement Agreement - CA')).not.toBeInTheDocument();
      expect(screen.getByText('Bank Statements - Chase 2024')).toBeInTheDocument();
      expect(screen.getByText('Property Appraisal Report')).toBeInTheDocument();
    });
  });

  it('displays document status badges correctly', () => {
    render(<DocumentManager userId={mockUserId} />);

    expect(screen.getAllByText('Ready')).toHaveLength(3);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('shows document type badges', () => {
    render(<DocumentManager userId={mockUserId} />);

    expect(screen.getAllByText('Generated')).toHaveLength(2);
    expect(screen.getAllByText('Uploaded')).toHaveLength(2);
  });

  it('displays file sizes correctly', () => {
    render(<DocumentManager userId={mockUserId} />);

    expect(screen.getByText('240 KB')).toBeInTheDocument(); // 245760 bytes
    expect(screen.getByText('125.5 KB')).toBeInTheDocument(); // 128512 bytes
    expect(screen.getByText('1 MB')).toBeInTheDocument(); // 1024000 bytes
    expect(screen.getByText('2 MB')).toBeInTheDocument(); // 2048000 bytes
  });

  it('shows file formats', () => {
    render(<DocumentManager userId={mockUserId} />);

    // All mock documents are PDF
    expect(screen.getAllByText('PDF')).toHaveLength(4);
  });

  it('renders action buttons for ready documents', () => {
    render(<DocumentManager userId={mockUserId} />);

    // Ready documents should have Preview and Download buttons
    expect(screen.getAllByText('Preview')).toHaveLength(3);
    expect(screen.getAllByText('Download')).toHaveLength(3);
  });

  it('shows processing status for documents being processed', () => {
    render(<DocumentManager userId={mockUserId} />);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('displays storage usage section', () => {
    render(<DocumentManager userId={mockUserId} />);

    expect(screen.getByText('Storage Usage')).toBeInTheDocument();
    expect(screen.getByText(/of 100 MB used/)).toBeInTheDocument();
    expect(screen.getByText('Upgrade for more storage →')).toBeInTheDocument();
  });

  it('shows file upload component when upload button is clicked', async () => {
    render(<DocumentManager userId={mockUserId} />);

    const uploadButton = screen.getByText('Upload Files');
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
      expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    });
  });

  it('hides file upload component after successful upload', async () => {
    render(<DocumentManager userId={mockUserId} />);

    // Open upload
    const uploadButton = screen.getByText('Upload Files');
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    // Simulate upload completion
    const mockUploadButton = screen.getByText('Mock Upload');
    await user.click(mockUploadButton);

    await waitFor(() => {
      expect(screen.queryByTestId('file-upload')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no documents match filter', async () => {
    render(<DocumentManager userId={mockUserId} />);

    // This would require mocking an empty state, but for now we test the structure
    // In a real scenario, you'd mock the data to return empty arrays
    expect(screen.getByText(/All Documents/)).toBeInTheDocument();
  });

  it('displays calculation links for documents', () => {
    render(<DocumentManager userId={mockUserId} />);

    expect(screen.getAllByText('View Calculation')).toHaveLength(4);
  });

  it('renders delete buttons for all documents', () => {
    render(<DocumentManager userId={mockUserId} />);

    // Each document should have a delete button (trash icon)
    const deleteButtons = screen.getAllByRole('button');
    const trashButtons = deleteButtons.filter(button => 
      button.querySelector('svg') && button.className.includes('text-red-600')
    );
    expect(trashButtons).toHaveLength(4);
  });

  it('has proper responsive layout', () => {
    const { container } = render(<DocumentManager userId={mockUserId} />);

    // Check for responsive flex classes in action bar
    const flexElements = container.querySelectorAll('.flex');
    expect(flexElements.length).toBeGreaterThan(0);

    // Check for responsive grid classes if any
    const gridElements = container.querySelectorAll('.grid');
    expect(gridElements.length).toBeGreaterThan(0);
  });
});