"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer';
async function fixAdminPassword() {
    try {
        // Connect to MongoDB
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        // Find the ORIGINAL admin user by ID
        const originalAdminId = '68031c6250449693533f5ae7';
        // Hash the new password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash('admin123', salt);
        // Update the original admin user's password
        const result = await User_1.default.findByIdAndUpdate(originalAdminId, {
            $set: {
                password: hashedPassword,
            },
        }, { new: true });
        if (result) {
            console.log('Original admin user password updated successfully!');
            console.log('User ID:', result._id);
            console.log('Email:', result.email);
            console.log('New Password: admin123');
            // Delete the duplicate admin user we accidentally created
            const duplicateDeleted = await User_1.default.deleteOne({
                email: 'admin@crokodial.com',
                _id: { $ne: originalAdminId },
            });
            if (duplicateDeleted.deletedCount > 0) {
                console.log('Deleted duplicate admin user');
            }
        }
        else {
            console.error('Original admin user not found!');
        }
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
    catch (error) {
        console.error('Error fixing admin password:', error);
        process.exit(1);
    }
}
fixAdminPassword();
