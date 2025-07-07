import { Request } from 'express';

export const withTenant = (req: Request, baseFilter: Record<string, any> = {}) => {
  const tenantId = (req as any).user?._id;
  if (!tenantId) throw new Error('Tenant ID missing on request user');
  return { ...baseFilter, tenantId };
}; 