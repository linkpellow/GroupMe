import express, { Router } from 'express';
import { auth } from '../middleware/auth';
import * as emailTemplateController from '../controllers/emailTemplate.controller';

const router: Router = express.Router();

// Template CRUD routes
router.post('/', auth, emailTemplateController.createTemplate);
router.get('/', auth, emailTemplateController.getTemplates);
router.get('/:id', auth, emailTemplateController.getTemplateById);
router.put('/:id', auth, emailTemplateController.updateTemplate);
router.delete('/:id', auth, emailTemplateController.deleteTemplate);

export default router;
