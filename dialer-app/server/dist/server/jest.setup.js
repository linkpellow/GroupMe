"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
// Jest global setup: close mongoose and unref global timers to avoid open handle leaks
const mongoose_1 = __importDefault(require("mongoose"));
afterAll(async () => {
    try {
        if (mongoose_1.default.connection.readyState !== 0) {
            await mongoose_1.default.disconnect();
        }
    }
    catch {
        // ignore
    }
    // Unref any intervals created during tests
    const handles = process._getActiveHandles?.();
    handles?.forEach((h) => {
        if (typeof h.unref === 'function') {
            try {
                h.unref();
            }
            catch { }
        }
    });
});
