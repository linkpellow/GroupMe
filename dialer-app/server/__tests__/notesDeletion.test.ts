import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock shared config ahead of controller import
jest.mock('@shared/config/queryConfig', () => ({
  US_STATES: [],
  ALLOWED_DISPOSITIONS: [],
  PIPELINE_SOURCES: {},
}), { virtual: true });

// --- Mock LeadModel ---
const mockFindById = jest.fn();
const mockFindOneAndUpdate = jest.fn();

jest.mock('../src/models/Lead', () => {
  return {
    __esModule: true,
    default: {
      findById: (...args: any[]) => mockFindById(...args),
      findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const leadsController = require('../src/controllers/leads.controller.ts');
const updateLead = (leadsController as any).updateLead;

// Helper to build mock req/res
function buildMocks(body: any = {}) {
  const req: any = {
    params: { id: 'abc123' },
    body,
    user: { id: 'tester', role: 'admin' },
  };

  const resJson = jest.fn();
  const resStatus = jest.fn().mockReturnValue({ json: resJson });
  const res: any = {
    json: resJson,
    status: resStatus,
  };
  return { req, res, resJson, resStatus };
}

describe('updateLead – empty notes deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Existing lead stub
    (mockFindById as any).mockResolvedValue({ _id: 'abc123', notes: 'OLD', disposition: '', toObject: () => ({ _id: 'abc123', notes: '' }) });
    // Simulate DB returning updated object with notes ""
    (mockFindOneAndUpdate as any).mockResolvedValue({ _id: 'abc123', notes: '' , toObject: () => ({ _id: 'abc123', notes: '' })});
  });

  it('persists empty string notes instead of dropping the field', async () => {
    const { req, res } = buildMocks({ notes: '' });

    await updateLead(req, res);

    // Ensure DB update was called with $set.notes = ""
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'abc123' },
      { $set: { notes: '' } },
      expect.any(Object)
    );
  });
}); 