"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIntegrationCred = void 0;
const IntegrationCredential_1 = __importDefault(require("../models/IntegrationCredential"));
const getIntegrationCred = async (tenantId, provider, allowEnvFallback = true) => {
    const cred = await IntegrationCredential_1.default.findOne({ tenantId, provider });
    if (cred)
        return cred;
    if (!allowEnvFallback)
        return null;
    // Legacy global env var fallback (will be removed after migration)
    if (provider === 'groupme' && process.env.GROUPME_TOKEN) {
        return {
            accessToken: process.env.GROUPME_TOKEN,
            tenantId: null,
            provider,
        };
    }
    if (provider === 'textdrip' && process.env.TEXTDRIP_API_KEY) {
        return {
            accessToken: process.env.TEXTDRIP_API_KEY,
            tenantId: null,
            provider,
        };
    }
    if (provider === 'calendly' && process.env.CALENDLY_TOKEN) {
        return {
            accessToken: process.env.CALENDLY_TOKEN,
            tenantId: null,
            provider,
        };
    }
    return null;
};
exports.getIntegrationCred = getIntegrationCred;
