import { Request, Response } from 'express';
import Lead from '../src/models/Lead';
import NextGenCredential from '../src/models/NextGenCredential';

// Mock the models
jest.mock('../src/models/Lead');
jest.mock('../src/models/NextGenCredential');
jest.mock('../src/models/User');

// Mock broadcast function
jest.mock('../src/index', () => ({
  broadcastNewLeadNotification: jest.fn()
}));

// Import the actual webhook handler function after mocks
import webhookRoutes from '../src/routes/webhook.routes';

describe('NextGen Webhook Premium Listing Integration', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let setMock: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup response mocks
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    setMock = jest.fn();

    mockRes = {
      status: statusMock,
      json: jsonMock,
      set: setMock
    };

    // Mock NextGenCredential to always return valid credential
    (NextGenCredential.findOne as jest.Mock).mockResolvedValue({
      sid: 'test-sid',
      apiKey: 'test-key',
      tenantId: 'test-tenant-id',
      active: true,
      lean: jest.fn().mockResolvedValue({
        sid: 'test-sid',
        apiKey: 'test-key',
        tenantId: 'test-tenant-id',
        active: true
      })
    });
  });

  const baseLeadData = {
    lead_id: 'D-TEST-001',
    nextgen_id: 'NG-TEST-001',
    first_name: 'John',
    last_name: 'Doe',
    phone: '5551234567',
    email: 'john.doe@example.com',
    product: 'data',
    campaign_name: 'Test Campaign',
    price: '45.00'
  };

  const premiumLeadData = {
    ...baseLeadData,
    product: 'ad',
    price: '5.00'
  };

  it('should handle main lead followed by premium listing', async () => {
    mockReq = {
      body: premiumLeadData,
      headers: {
        sid: 'test-sid',
        apikey: 'test-key'
      },
      ip: '127.0.0.1'
    } as any;

    // Mock existing lead (main data record)
    const existingLead = {
      _id: 'lead-123',
      nextgenId: 'NG-TEST-001',
      firstName: 'John',
      lastName: 'Doe',
      phone: '(555) 123-4567',
      email: 'john.doe@example.com',
      product: 'data',
      price: 45,
      notes: 'Original notes'
    };

    (Lead.findOne as jest.Mock).mockResolvedValue({
      lean: jest.fn().mockResolvedValue(existingLead)
    });

    // Mock the update
    (Lead.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      ...existingLead,
      price: 50,
      notes: 'Original notes\n\n💎 Premium Listing Applied:\nBase Price: $45\nPremium Listing: $5\nTotal Price: $50',
      _id: { toString: () => 'lead-123' }
    });

    // Find the webhook handler
    const router = webhookRoutes;
    const routes = (router as any).stack;
    const nextgenRoute = routes.find((r: any) => r.route?.path === '/nextgen');
    const handler = nextgenRoute.route.stack.find((s: any) => s.method === 'post').handle;

    // Mock next function
    const next = jest.fn();

    // First call the auth middleware
    const authMiddleware = nextgenRoute.route.stack[0].handle;
    await authMiddleware(mockReq as Request, mockRes as Response, next);

    // Then call the actual handler
    await handler(mockReq as Request, mockRes as Response);

    // Verify the lead was updated with merged price
    expect(Lead.findByIdAndUpdate).toHaveBeenCalledWith(
      'lead-123',
      expect.objectContaining({
        $set: expect.objectContaining({
          price: 50,
          notes: expect.stringContaining('💎 Premium Listing Applied:')
        })
      }),
      { new: true }
    );

    // Verify response
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        leadId: 'lead-123',
        isNew: false
      })
    );
  });

  it('should handle premium listing followed by main lead', async () => {
    // First request: premium listing (no existing lead)
    mockReq = {
      body: premiumLeadData,
      headers: {
        sid: 'test-sid',
        apikey: 'test-key'
      }
    } as any;

    (Lead.findOne as jest.Mock).mockResolvedValue({
      lean: jest.fn().mockResolvedValue(null) // No existing lead
    });

    // Mock upsertLead for creating new premium listing
    (Lead as any).upsertLead = jest.fn().mockResolvedValue({
      lead: {
        _id: { toString: () => 'lead-456' },
        product: 'ad',
        price: 5
      },
      isNew: true
    });

    // Find the webhook handler
    const router = webhookRoutes;
    const routes = (router as any).stack;
    const nextgenRoute = routes.find((r: any) => r.route?.path === '/nextgen');
    const handler = nextgenRoute.route.stack.find((s: any) => s.method === 'post').handle;

    // Mock next function
    const next = jest.fn();

    // Call auth middleware
    const authMiddleware = nextgenRoute.route.stack[0].handle;
    await authMiddleware(mockReq as Request, mockRes as Response, next);

    // Call handler for premium listing
    await handler(mockReq as Request, mockRes as Response);

    // Verify premium listing was created
    expect((Lead as any).upsertLead).toHaveBeenCalledWith(
      expect.objectContaining({
        product: 'ad',
        source: 'NextGen'
      })
    );

    // Now send main data record
    mockReq.body = baseLeadData;

    // Mock existing premium listing
    const existingPremium = {
      _id: 'lead-456',
      nextgenId: 'NG-TEST-001',
      product: 'ad',
      price: 5
    };

    (Lead.findOne as jest.Mock).mockResolvedValue({
      lean: jest.fn().mockResolvedValue(existingPremium)
    });

    // Mock the update with main data
    (Lead.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      _id: { toString: () => 'lead-456' },
      product: 'data',
      price: 50,
      firstName: 'John',
      lastName: 'Doe'
    });

    // Reset mocks for second call
    jsonMock.mockClear();
    statusMock.mockClear();

    // Call handler for main data record
    await handler(mockReq as Request, mockRes as Response);

    // Verify the lead was updated with main data and combined price
    expect(Lead.findByIdAndUpdate).toHaveBeenCalledWith(
      'lead-456',
      expect.objectContaining({
        $set: expect.objectContaining({
          product: 'data',
          price: 50,
          firstName: 'John',
          lastName: 'Doe'
        })
      }),
      { new: true }
    );
  });
}); 