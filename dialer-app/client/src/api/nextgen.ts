import axiosInstance from './axiosInstance';

export interface NextGenCred {
  sid: string;
  apiKey: string;
  createdAt: string;
}

export const fetchNextGenCred = async (): Promise<NextGenCred | null> => {
  try {
    const res = await axiosInstance.get('/api/integrations/nextgen/credentials');
    if (res.data.connected === false) return null;
    return res.data as NextGenCred;
  } catch (err) {
    if ((err as any).response?.status === 404) return null;
    throw err;
  }
};

export const rotateNextGenCred = async (): Promise<NextGenCred> => {
  const res = await axiosInstance.post('/api/integrations/nextgen/credentials/rotate');
  return res.data as NextGenCred;
}; 