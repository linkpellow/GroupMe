"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User")); // Adjust path as needed
require("../config/envLoader"); // Ensure env vars are loaded
const updateUserPassword = async () => {
    const adminEmail = 'admin@crokodial.com';
    const newPassword = 'admin'; // The new password you want to set
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI not found in environment variables. Exiting.');
        process.exit(1);
    }
    try {
        console.log('Connecting to database...');
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log('Database connected.');
        console.log(`Searching for user: ${adminEmail}`);
        const user = await User_1.default.findOne({ email: adminEmail });
        if (!user) {
            console.error(`User with email ${adminEmail} not found.`);
            return;
        }
        console.log('User found. Hashing new password...');
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, salt);
        console.log('Password hashed. Updating user...');
        user.password = hashedPassword;
        await user.save();
        console.log(`Successfully updated password for ${adminEmail}.`);
    }
    catch (error) {
        console.error('An error occurred while updating the password:', error);
    }
    finally {
        console.log('Closing database connection.');
        await mongoose_1.default.connection.close();
    }
};
updateUserPassword();
