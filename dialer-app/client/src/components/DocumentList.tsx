import React, { useState } from 'react';
import './DocumentList.css';
import { deleteDocument, PolicyDocument } from '../services/documentsApi';
import { formatFileSize, formatDate, truncateFileName } from '../utils/formatUtils';

interface Document {
  _id: string;
  clientId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: string;
  fileUrl: string;
}

interface DocumentListProps {
  documents: Document[];
  onDocumentDeleted?: (documentId: string) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ documents, onDocumentDeleted }) => {
  const [viewDocument, setViewDocument] = useState<PolicyDocument | null>(null);

  const handleDelete = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await deleteDocument(documentId);
      if (onDocumentDeleted) {
        onDocumentDeleted(documentId);
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document. Please try again.');
    }
  };

  const getFileIcon = (fileName: string) => {
    if (
      fileName.toLowerCase().includes('insurance') ||
      fileName.toLowerCase().includes('policy') ||
      fileName.toLowerCase().includes('coverage')
    ) {
      return 'insurance-icon';
    } else if (
      fileName.toLowerCase().includes('health') ||
      fileName.toLowerCase().includes('medical')
    ) {
      return 'health-icon';
    } else {
      return 'document-icon';
    }
  };

  return (
    <div className="documents-list">
      <h3>Policy Documents</h3>

      {viewDocument && (
        <div
          className="document-viewer-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewDocument(null);
          }}
        >
          <div className="document-viewer">
            <div className="document-viewer-header">
              <div className="document-title">
                <div className={`header-icon ${getFileIcon(viewDocument.fileName)}`}></div>
                <h4>{viewDocument.fileName}</h4>
              </div>
              <div className="viewer-controls">
                <a
                  href={viewDocument.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="download-btn"
                  title="Download"
                >
                  <span>Download</span>
                </a>
                <button className="close-btn" onClick={() => setViewDocument(null)} title="Close">
                  ×
                </button>
              </div>
            </div>
            <div className="document-viewer-body">
              <iframe
                src={viewDocument.fileUrl}
                title={viewDocument.fileName}
                className="document-iframe"
              ></iframe>
            </div>
            <div className="document-viewer-footer">
              <div className="document-info">
                <span>{formatFileSize(viewDocument.fileSize)}</span>
                <span className="dot-separator">•</span>
                <span>Uploaded on {formatDate(viewDocument.uploadDate)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="documents-grid">
        {documents.length > 0 ? (
          documents.map((doc) => (
            <div key={doc._id} className="document-card" onClick={() => setViewDocument(doc)}>
              <div className={`document-icon ${getFileIcon(doc.fileName)}`}></div>
              <div className="document-info">
                <div className="document-name" title={doc.fileName}>
                  {truncateFileName(doc.fileName)}
                </div>
                <div className="document-meta">
                  <span>{formatFileSize(doc.fileSize)}</span>
                  <span className="dot-separator">•</span>
                  <span>{formatDate(doc.uploadDate)}</span>
                </div>
              </div>
              <div className="document-actions">
                <button
                  className="view-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewDocument(doc);
                  }}
                >
                  View
                </button>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc._id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-documents">No policy documents uploaded yet.</div>
        )}
      </div>
    </div>
  );
};

export default DocumentList;
