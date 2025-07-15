"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer';
async function fixAdminUser() {
    try {
        // Connect to MongoDB
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        // Hash the password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash('admin123', salt);
        // Find and update admin user or create if doesn't exist
        const adminUser = await User_1.default.findOneAndUpdate({ email: 'admin@crokodial.com' }, {
            $set: {
                email: 'admin@crokodial.com',
                password: hashedPassword,
                name: 'Admin User',
                username: 'admin@crokodial.com',
                role: 'admin',
            },
        }, { upsert: true, new: true });
        console.log('Admin user fixed successfully!');
        console.log('Email: admin@crokodial.com');
        console.log('Password: admin123');
        console.log('User ID:', adminUser._id);
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
    catch (error) {
        console.error('Error fixing admin user:', error);
        process.exit(1);
    }
}
fixAdminUser();
