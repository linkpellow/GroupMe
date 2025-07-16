"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = __importDefault(require("../src/index"));
const User_1 = __importDefault(require("../src/models/User"));
const Lead_1 = __importDefault(require("../src/models/Lead"));
// Helper: create a regular test user and return JWT token
async function createUserAndGetToken() {
    const email = `user${Date.now()}@test.com`;
    const password = 'TestPass123!';
    const name = 'CSV Tester';
    const user = await User_1.default.create({ email, password, name, username: email });
    const res = await (0, supertest_1.default)(index_1.default).post('/api/auth/login').send({ email, password });
    return { user, token: res.body.token };
}
describe('Tenant-aware CSV Upload', () => {
    let token;
    let userId;
    beforeAll(async () => {
        if (mongoose_1.default.connection.readyState === 0) {
            await mongoose_1.default.connect(process.env.MONGO_URI || '', {});
        }
        const created = await createUserAndGetToken();
        token = created.token;
        userId = created.user._id;
    });
    afterAll(async () => {
        // Clean up leads created in this test
        await Lead_1.default.deleteMany({ tenantId: userId });
        await User_1.default.deleteOne({ _id: userId });
        await mongoose_1.default.disconnect();
    });
    it('imports a CSV and stamps tenantId', async () => {
        const csv = 'first_name,last_name,email,phone\nJohn,Doe,john.doe@example.com,5551234567\n';
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/csv-upload')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', Buffer.from(csv), 'leads.csv');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        // Verify lead exists with tenantId
        const lead = await Lead_1.default.findOne({ email: 'john.doe@example.com' }).lean();
        expect(lead).toBeTruthy();
        expect(lead?.tenantId.toString()).toBe(userId.toString());
    });
});
