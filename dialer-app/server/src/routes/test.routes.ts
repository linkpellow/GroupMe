import express, { Request, Response, Router } from 'express';
import { broadcastNewLeadNotification } from '../index';
import logger from '../utils/logger';

const router: Router = express.Router();

// This entire route is for development and testing purposes only.
// It should not be exposed in a production environment.

router.get('/broadcast', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Attempted to access dev-only test broadcast endpoint in production.');
    return res.status(404).send('Not found');
  }

  try {
    const leadData = {
      leadId: `test_${Date.now()}`,
      name: 'Dev Test Lead',
      source: 'NextGen',
      isNew: true,
    };

    logger.info('Broadcasting a test lead notification via /api/test/broadcast');
    broadcastNewLeadNotification(leadData);

    res.status(200).json({
      success: true,
      message: 'Test lead notification broadcasted.',
      data: leadData,
    });
  } catch (error: any) {
    logger.error('Failed to broadcast test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during test broadcast.',
      error: error.message,
    });
  }
});

export default router; 