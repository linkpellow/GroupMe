import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import UserModel from '../models/User';
import { JWT_SECRET, verifyToken } from '../config/jwt.config';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

interface JWTPayload {
  _id?: string;
  id?: string;
  [key: string]: any;
}

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First check Authorization header
    let token = req.header('Authorization');

    // If no Authorization header, check for token in cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Handle various token formats
    if (token) {
      // Remove 'Bearer ' prefix if present
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }

      try {
        const decoded = verifyToken(token) as JWTPayload;

        // Handle both _id and id in the token payload
        const userId = decoded._id || decoded.id;
        if (!userId) {
          return res.status(401).json({ error: 'Invalid token format' });
        }

        if (process.env.NODE_ENV === 'development') console.debug('[AUTH] Lookup user %s', userId);
        const user = await UserModel.findById(userId);
        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }

        // Add both id and _id to req.user
        const userObj = user.toObject();
        userObj.id = userObj._id;
        req.user = userObj;
        if (process.env.NODE_ENV === 'development')
          console.debug('[AUTH] Auth success %s', userObj.email || userObj._id);

        next();
      } catch (jwtError) {
        return res.status(401).json({
          error: 'Invalid token',
          details: jwtError instanceof Error ? jwtError.message : 'Unknown error',
        });
      }
    } else {
      // No token found
      return res.status(401).json({ error: 'No auth token found' });
    }
  } catch (error) {
    return res.status(401).json({
      error: 'Please authenticate',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const isAgentOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    if (req.user.role !== 'admin' && req.user.role !== 'agent') {
      throw new Error('Not authorized');
    }

    next();
  } catch (error) {
    res.status(403).json({ error: 'Not authorized' });
  }
};

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    if (req.user.role !== 'admin') {
      throw new Error('Admin access required');
    }

    next();
  } catch (error) {
    res.status(403).json({ error: 'Admin access required' });
  }
};

export { authenticate as auth };
export default authenticate;
