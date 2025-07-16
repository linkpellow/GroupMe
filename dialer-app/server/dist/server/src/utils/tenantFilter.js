"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTenant = void 0;
const withTenant = (req, baseFilter = {}) => {
    const tenantId = req.user?._id;
    if (!tenantId)
        throw new Error('tenantId missing on request');
    return { ...baseFilter, tenantId };
};
exports.withTenant = withTenant;
