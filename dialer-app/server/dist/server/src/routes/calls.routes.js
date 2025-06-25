"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const calls_controller_1 = require("../controllers/calls.controller");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Validation middleware
const callValidation = [
    (0, express_validator_1.check)('leadId', 'Lead ID is required').not().isEmpty(),
    (0, express_validator_1.check)('phone', 'Phone number is required').not().isEmpty(),
];
// Routes
router.post('/initiate', [auth_1.auth, ...callValidation], calls_controller_1.initiateCall);
router.post('/status', calls_controller_1.handleCallStatus);
router.get('/history', auth_1.auth, calls_controller_1.getCallHistory);
exports.default = router;
