import request from 'supertest';
import mongoose from 'mongoose';
import * as LeadModule from '../src/models/Lead';
import app from '../src/app';

// Mock the entire Lead module
jest.mock('../src/models/Lead');

const mockedLeadModule = LeadModule as jest.Mocked<typeof LeadModule>;

describe('NextGen Webhook Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should capture and store dob, weight, and sourceCode from webhook payload', async () => {
    const mockLead = {
      _id: new mongoose.Types.ObjectId(),
      name: 'John Doe',
      phone: '555-1234',
      email: 'john@test.com',
      dob: new Date('1990-01-02'),
      weight: 185,
      sourceCode: 'ABC123def'
    } as any;

    mockedLeadModule.upsertLead.mockResolvedValue({
      lead: mockLead,
      isNew: true
    });

    const payload = {
      name: 'John Doe',
      phone: '555-1234',
      email: 'john@test.com',
      dob: '1990-01-02',
      weight: 185,
      source_hash: 'ABC123def'
    };

    const response = await request(app)
      .post('/webhook/nextgen')
      .send(payload)
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      leadId: mockLead._id.toString(),
      isNew: true
    });

    expect(mockedLeadModule.upsertLead).toHaveBeenCalledWith(
      expect.objectContaining({
        dob: '1990-01-02',          // whatever you pass in test payload
        weight: 185,                // numeric
        source_hash: 'ABC123def',   // raw value for mapping
        source: 'NextGen'
      })
    );
  });

  it('should handle missing dob and weight gracefully', async () => {
    const mockLead = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Jane Doe',
      phone: '555-5678',
      email: 'jane@test.com',
      sourceCode: 'NextGen'
    } as any;

    mockedLeadModule.upsertLead.mockResolvedValue({
      lead: mockLead,
      isNew: true
    });

    const payload = {
      name: 'Jane Doe',
      phone: '555-5678',
      email: 'jane@test.com',
      campaign_name: 'Spring2024'
    };

    const response = await request(app)
      .post('/webhook/nextgen')
      .send(payload)
      .expect(200);

    expect(mockedLeadModule.upsertLead).toHaveBeenCalledWith(
      expect.objectContaining({
        dob: undefined,
        weight: undefined,
        campaign_name: 'Spring2024',
        source: 'NextGen'
      })
    );
  });

  it('should use campaign_name as fallback for sourceCode', async () => {
    const mockLead = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Bob Smith',
      phone: '555-9999',
      email: 'bob@test.com',
      sourceCode: 'Spring2024'
    } as any;

    mockedLeadModule.upsertLead.mockResolvedValue({
      lead: mockLead,
      isNew: false
    });

    const payload = {
      name: 'Bob Smith',
      phone: '555-9999',
      email: 'bob@test.com',
      dob: '1985-03-15',
      weight: 175,
      campaign_name: 'Spring2024'
    };

    const response = await request(app)
      .post('/webhook/nextgen')
      .send(payload)
      .expect(200);

    expect(mockedLeadModule.upsertLead).toHaveBeenCalledWith(
      expect.objectContaining({
        dob: '1985-03-15',
        weight: 175,
        campaign_name: 'Spring2024',
        source: 'NextGen'
      })
    );
  });

  it('should default to NextGen when no source_hash or campaign_name provided', async () => {
    const mockLead = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Alice Johnson',
      phone: '555-7777',
      email: 'alice@test.com',
      sourceCode: 'NextGen'
    } as any;

    mockedLeadModule.upsertLead.mockResolvedValue({
      lead: mockLead,
      isNew: true
    });

    const payload = {
      name: 'Alice Johnson',
      phone: '555-7777',
      email: 'alice@test.com',
      dob: '1992-12-25',
      weight: 140
    };

    const response = await request(app)
      .post('/webhook/nextgen')
      .send(payload)
      .expect(200);

    expect(mockedLeadModule.upsertLead).toHaveBeenCalledWith(
      expect.objectContaining({
        dob: '1992-12-25',
        weight: 140,
        source: 'NextGen'
      })
    );
  });
});