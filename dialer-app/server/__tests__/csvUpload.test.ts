import request from 'supertest';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import app from '../src/index';
import UserModel from '../src/models/User';
import LeadModel from '../src/models/Lead';

// Helper: create a regular test user and return JWT token
async function createUserAndGetToken() {
  const email = `user${Date.now()}@test.com`;
  const password = 'TestPass123!';
  const name = 'CSV Tester';
  const user = await UserModel.create({ email, password, name, username: email });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return { user, token: res.body.token };
}

describe('Tenant-aware CSV Upload', () => {
  let token: string;
  let userId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || '', {});
    }
    const created = await createUserAndGetToken();
    token = created.token;
    userId = created.user._id;
  });

  afterAll(async () => {
    // Clean up leads created in this test
    await LeadModel.deleteMany({ tenantId: userId });
    await UserModel.deleteOne({ _id: userId });
    await mongoose.disconnect();
  });

  it('imports a CSV and stamps tenantId', async () => {
    const csv = 'first_name,last_name,email,phone\nJohn,Doe,john.doe@example.com,5551234567\n';
    const res = await request(app)
      .post('/api/csv-upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csv), 'leads.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify lead exists with tenantId
    const lead = await LeadModel.findOne({ email: 'john.doe@example.com' }).lean();
    expect(lead).toBeTruthy();
    expect(lead?.tenantId.toString()).toBe(userId.toString());
  });
}); 