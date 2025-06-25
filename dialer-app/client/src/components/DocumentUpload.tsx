import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadDocument, PolicyDocument } from '../services/documentsApi';
import './DocumentUpload.css';

interface DocumentUploadProps {
  clientId: string;
  onUploadSuccess?: (document: PolicyDocument) => void;
  onUploadError?: (error: string) => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  clientId,
  onUploadSuccess,
  onUploadError,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Reset states
      setError(null);
      setIsUploading(true);
      setUploadProgress(0);

      // Check if any files were accepted
      if (acceptedFiles.length === 0) {
        setError('No files were accepted. Please upload a PDF file.');
        setIsUploading(false);
        return;
      }

      const file = acceptedFiles[0]; // Take only the first file

      // Check file type
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed.');
        setIsUploading(false);
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size exceeds the 10MB limit.');
        setIsUploading(false);
        return;
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId);

      try {
        // Upload file with progress tracking
        const uploadedDoc: PolicyDocument = await uploadDocument(clientId, file);
        // Handle successful upload
        setIsUploading(false);
        setUploadProgress(100);
        // Call the success callback if provided
        if (onUploadSuccess) {
          onUploadSuccess(uploadedDoc);
        }
      } catch (error: unknown) {
        let errorMessage = 'There was an error uploading your document. Please try again.';
        if (
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          (error as { response?: { data?: { error?: string } } }).response?.data?.error
        ) {
          errorMessage = (error as { response: { data: { error: string } } }).response.data.error;
        }
        setError(errorMessage);
        setIsUploading(false);
        if (onUploadError) {
          onUploadError(errorMessage);
        }
      }
    },
    [clientId, onUploadSuccess, onUploadError]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  return (
    <div className="document-upload-container">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''} ${isDragReject ? 'reject' : ''} ${isUploading ? 'uploading' : ''}`}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="upload-progress">
            <div className="progress-bar">
              <div className="progress" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <p>Uploading... {uploadProgress}%</p>
          </div>
        ) : (
          <>
            <p className="dropzone-text">
              {isDragActive
                ? 'Drop the PDF file here...'
                : 'Drag & drop a PDF file here, or click to select a file'}
            </p>
            <p className="dropzone-subtext">(Only PDF files are accepted, max size: 10MB)</p>
          </>
        )}
      </div>

      {error && (
        <div className="upload-error">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
