// Shared formatting utilities for the client

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    if (dateString.includes('/') && !dateString.includes('T')) {
      return dateString;
    }
    if (dateString.includes('-') && !dateString.includes('T')) {
      const [year, month, day] = dateString.split('-');
      if (year && month && day) {
        return `${month}/${day}/${year}`;
      }
    }
    if (dateString.includes('T')) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
      }
    }
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
    }
  } catch (error) {
    // fallback
  }
  return dateString;
};

export const truncateFileName = (fileName: string, maxLength = 25): string => {
  if (fileName.length <= maxLength) return fileName;
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex !== -1) {
    const extension = fileName.substring(lastDotIndex);
    const name = fileName.substring(0, lastDotIndex);
    if (name.length > maxLength - extension.length - 3) {
      return name.substring(0, maxLength - extension.length - 3) + '...' + extension;
    }
  }
  return fileName.substring(0, maxLength - 3) + '...';
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return phone;
};
