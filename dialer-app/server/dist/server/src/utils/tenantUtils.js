"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTenant = void 0;
const withTenant = (req, baseFilter = {}) => {
    const tenantId = req.user?._id;
    if (!tenantId)
        throw new Error('Tenant ID missing on request user');
    return { ...baseFilter, tenantId };
};
exports.withTenant = withTenant;
