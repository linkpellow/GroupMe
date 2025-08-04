import IntegrationCredential, { IntegrationProvider } from '../models/IntegrationCredential';
import mongoose from 'mongoose';

export const getIntegrationCred = async (
  tenantId: mongoose.Types.ObjectId | string,
  provider: IntegrationProvider,
  allowEnvFallback = true
) => {
  const cred = await IntegrationCredential.findOne({ tenantId, provider });
  if (cred) return cred;

  if (!allowEnvFallback) return null;

  // Legacy global env var fallback (will be removed after migration)
  if (provider === 'groupme' && process.env.GROUPME_TOKEN) {
    return {
      accessToken: process.env.GROUPME_TOKEN,
      tenantId: null,
      provider,
    } as any;
  }
  if (provider === 'textdrip' && process.env.TEXTDRIP_API_KEY) {
    return {
      accessToken: process.env.TEXTDRIP_API_KEY,
      tenantId: null,
      provider,
    } as any;
  }
  if (provider === 'calendly' && process.env.CALENDLY_TOKEN) {
    return {
      accessToken: process.env.CALENDLY_TOKEN,
      tenantId: null,
      provider,
    } as any;
  }

  return null;
}; 