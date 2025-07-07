"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhone = void 0;
const normalizePhone = (phone) => {
    if (!phone)
        return '';
    // Keep only digits and take the last 10 for a consistent US-based key.
    return phone.replace(/[^\d]/g, '').slice(-10);
};
exports.normalizePhone = normalizePhone;
