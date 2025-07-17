"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const User_1 = __importDefault(require("../../models/User"));
const Lead_1 = __importDefault(require("../../models/Lead"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env.local') });
(async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri)
            throw new Error('MONGODB_URI not defined');
        await mongoose_1.default.connect(mongoUri);
        console.log('Connected to Mongo');
        const admin = await User_1.default.findOne({ role: 'admin' }).lean();
        if (!admin)
            throw new Error('Admin user not found');
        const result = await Lead_1.default.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: admin._id } });
        console.log('Back-fill complete. Modified leads:', result.modifiedCount);
    }
    catch (err) {
        console.error('Back-fill error', err);
    }
    finally {
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
})();
