"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../src/index"));
const mongoose_1 = __importDefault(require("mongoose"));
const Passcode_1 = __importDefault(require("../src/models/Passcode"));
const User_1 = __importDefault(require("../src/models/User"));
// Helper to create a test admin user and get a JWT
async function createAdminAndGetToken() {
    const email = `admin${Date.now()}@test.com`;
    const password = 'TestPassword123!';
    const name = 'Test Admin';
    const user = await User_1.default.create({ email, password, name, username: email, role: 'admin' });
    const res = await (0, supertest_1.default)(index_1.default).post('/api/auth/login').send({ email, password });
    return { user, token: res.body.token };
}
describe.skip('Invite-Only Passcode System', () => {
    let adminToken;
    let passcode;
    let passcodeId;
    beforeAll(async () => {
        // Connect to test DB if not already
        if (mongoose_1.default.connection.readyState === 0) {
            await mongoose_1.default.connect(process.env.MONGO_URI || '', {});
        }
        // Create admin
        const { token } = await createAdminAndGetToken();
        adminToken = token;
    });
    afterAll(async () => {
        await Passcode_1.default.deleteMany({ description: 'test-passcode' });
        await mongoose_1.default.disconnect();
    });
    it('should allow admin to create a passcode', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/passcodes')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ code: 'TEST1234', maxUses: 2, description: 'test-passcode' });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        passcode = res.body.data.code;
    });
    it('should validate a valid passcode', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/validate-passcode')
            .send({ code: passcode });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
    it('should consume a passcode', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/consume-passcode')
            .send({ code: passcode });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
    it('should not validate an invalid passcode', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/validate-passcode')
            .send({ code: 'INVALIDCODE' });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
    it('should not consume a passcode more than maxUses', async () => {
        // Use up the last allowed use
        await (0, supertest_1.default)(index_1.default).post('/api/auth/consume-passcode').send({ code: passcode });
        // Now it should be maxed out
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/consume-passcode')
            .send({ code: passcode });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/usage limit/i);
    });
    it('should rate limit excessive validation attempts', async () => {
        for (let i = 0; i < 5; i++) {
            await (0, supertest_1.default)(index_1.default).post('/api/auth/validate-passcode').send({ code: 'INVALID' });
        }
        const res = await (0, supertest_1.default)(index_1.default).post('/api/auth/validate-passcode').send({ code: 'INVALID' });
        expect(res.status).toBe(429);
        expect(res.body.success).toBe(false);
    });
    it('should allow admin to deactivate and delete a passcode', async () => {
        // Create a new passcode for this test
        const createRes = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/passcodes')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ code: 'DELETEME', maxUses: 1, description: 'test-passcode' });
        passcodeId = (await Passcode_1.default.findOne({ code: 'DELETEME' }))?._id.toString();
        // Deactivate
        const deactivateRes = await (0, supertest_1.default)(index_1.default)
            .put(`/api/auth/passcodes/${passcodeId}/deactivate`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(deactivateRes.status).toBe(200);
        expect(deactivateRes.body.success).toBe(true);
        // Delete
        const deleteRes = await (0, supertest_1.default)(index_1.default)
            .delete(`/api/auth/passcodes/${passcodeId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.success).toBe(true);
    });
});
