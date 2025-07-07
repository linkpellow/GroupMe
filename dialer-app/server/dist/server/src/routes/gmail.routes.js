"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const gmailController = __importStar(require("../controllers/gmail.controller"));
const router = express_1.default.Router();
// Auth routes
router.get('/auth-url', auth_1.auth, gmailController.generateAuthUrl);
router.get('/callback', gmailController.handleOAuthCallback);
// Add an additional route to handle Google's redirect to /api/auth/gmail/callback
router.get('/auth/gmail/callback', gmailController.handleOAuthCallback);
router.get('/status', auth_1.auth, gmailController.getConnectionStatus);
router.post('/disconnect', auth_1.auth, gmailController.disconnectGmail);
// Email routes
router.get('/messages', auth_1.auth, gmailController.getMessages);
router.get('/messages/:id', auth_1.auth, gmailController.getMessage);
router.post('/send', auth_1.auth, gmailController.sendEmail);
router.post('/messages/:id/trash', auth_1.auth, gmailController.trashEmail);
router.get('/labels', auth_1.auth, gmailController.getLabels);
// Process marketplace leads
router.post('/process-marketplace-leads', auth_1.auth, gmailController.processMarketplaceLeads);
exports.default = router;
