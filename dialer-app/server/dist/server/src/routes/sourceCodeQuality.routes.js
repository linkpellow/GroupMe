"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const sourceCodeQuality_controller_1 = require("../controllers/sourceCodeQuality.controller");
const router = express_1.default.Router();
// Validation middleware
const setQualityValidation = [
    (0, express_validator_1.check)('sourceCode', 'Source code is required').not().isEmpty().trim(),
    (0, express_validator_1.check)('quality', 'Quality must be either "quality" or "low-quality"')
        .isIn(['quality', 'low-quality'])
];
// All routes require authentication
router.use(auth_1.auth);
// Routes
router.get('/', sourceCodeQuality_controller_1.getQualityAssignments);
router.get('/counts', sourceCodeQuality_controller_1.getQualityCounts);
router.post('/', setQualityValidation, sourceCodeQuality_controller_1.setQualityAssignment);
router.delete('/:sourceCode', sourceCodeQuality_controller_1.removeQualityAssignment);
exports.default = router;
