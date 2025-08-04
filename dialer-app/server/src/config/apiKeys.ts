import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// API Keys for external integrations
export const API_KEYS = {
  NEXTGEN_SID: process.env.NEXTGEN_SID || 'crk_c615dc7de53e9a5dbf4ece635ad894f1',
  NEXTGEN_API_KEY:
    process.env.NEXTGEN_API_KEY ||
    'key_03a8c03fa7b634848bcb260e1a8d12849f9fe1965eefc7de7dc4221c746191da',
};

// Validate incoming API requests
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  try {
    const sid = req.headers.sid as string;
    const apiKey = req.headers.apikey as string;

    if (!sid || !apiKey) {
      console.error('Missing API credentials:', {
        sid: !!sid,
        apiKey: !!apiKey,
      });
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: Missing required credentials',
      });
    }

    // Check if credentials match our expected values
    if (sid !== API_KEYS.NEXTGEN_SID || apiKey !== API_KEYS.NEXTGEN_API_KEY) {
      console.error('Invalid API credentials');
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: Invalid credentials',
      });
    }

    next();
  } catch (error) {
    console.error('Error validating API credentials:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication',
    });
  }
};
