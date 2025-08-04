"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const dispositions_controller_1 = require("../controllers/dispositions.controller");
const router = (0, express_1.Router)();
// Public routes
// none
// Protected routes (require authentication)
router.get('/', auth_1.auth, dispositions_controller_1.getUserDispositions);
router.get('/all', auth_1.auth, auth_1.isAdmin, dispositions_controller_1.getAllDispositions);
router.get('/:id', auth_1.auth, dispositions_controller_1.getDisposition);
router.post('/', auth_1.auth, dispositions_controller_1.createDisposition);
router.put('/:id', auth_1.auth, dispositions_controller_1.updateDisposition);
router.delete('/:id', auth_1.auth, dispositions_controller_1.deleteDisposition);
router.post('/seed-defaults', auth_1.auth, auth_1.isAdmin, dispositions_controller_1.seedDefaultDispositions);
exports.default = router;
