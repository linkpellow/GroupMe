import axiosInstance from '../api/axiosInstance';

export interface PolicyDocument {
  _id: string;
  clientId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: string;
  fileUrl: string;
}

export interface DocumentsResponse {
  documents: PolicyDocument[];
}

export async function uploadDocument(file: File, clientId: string): Promise<PolicyDocument> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('clientId', clientId);
  const response = await axiosInstance.post('/api/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function listDocuments(clientId: string): Promise<PolicyDocument[]> {
  const response = await axiosInstance.get(`/api/documents/client/${clientId}`);
  if (response.data && response.data.documents) {
    return response.data.documents;
  }
  return [];
}

export async function getDocuments(clientId: string): Promise<DocumentsResponse> {
  const response = await axiosInstance.get(`/api/documents/client/${clientId}`);
  return response.data;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await axiosInstance.delete(`/api/documents/${documentId}`);
}

export async function isDocumentDeleted(documentId: string): Promise<{ isDeleted: boolean }> {
  const response = await axiosInstance.get(`/api/documents/isDeleted/${documentId}`);
  return response.data;
}
