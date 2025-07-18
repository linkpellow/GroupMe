"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const User_1 = __importDefault(require("../models/User"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env.local') });
const resetAdminPassword = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('[MIGRATE] Error: MONGODB_URI is not defined.');
        process.exit(1);
    }
    try {
        await mongoose_1.default.connect(uri);
        console.log('[MIGRATE] Connected to MongoDB to reset admin password.');
        const adminEmail = 'admin@crokodial.com';
        const plainPassword = 'admin123';
        const adminUser = await User_1.default.findOne({ email: adminEmail });
        if (!adminUser) {
            console.log(`[MIGRATE] Admin user ${adminEmail} not found. Creating...`);
            const hashedPassword = await bcryptjs_1.default.hash(plainPassword, 10);
            await User_1.default.create({
                email: adminEmail,
                password: hashedPassword,
                name: 'Admin',
                role: 'admin',
                username: adminEmail,
            });
            console.log(`[MIGRATE] Admin user created and password set.`);
        }
        else {
            // Only update if the password does not match
            const isMatch = await bcryptjs_1.default.compare(plainPassword, adminUser.password);
            if (!isMatch) {
                console.log(`[MIGRATE] Admin password for ${adminEmail} is incorrect. Resetting...`);
                adminUser.password = plainPassword; // Let the pre-save hook handle hashing
                await adminUser.save();
                console.log(`[MIGRATE] Admin password has been reset successfully.`);
            }
            else {
                console.log(`[MIGRATE] Admin password for ${adminEmail} is already correct. No action taken.`);
            }
        }
    }
    catch (error) {
        console.error('[MIGRATE] An error occurred during the password reset migration:', error);
        process.exit(1);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('[MIGRATE] Disconnected from MongoDB.');
    }
};
resetAdminPassword().then(() => {
    process.exit(0);
});
