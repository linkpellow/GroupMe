"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const dialCount_controller_1 = require("../controllers/dialCount.controller");
const router = (0, express_1.Router)();
// Protected routes
router.post('/increment', auth_1.auth, dialCount_controller_1.incrementDialCount);
router.get('/', auth_1.auth, dialCount_controller_1.getDialCounts);
exports.default = router;
