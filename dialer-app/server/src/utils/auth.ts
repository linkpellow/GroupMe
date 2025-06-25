import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRATION } from '../config/jwt.config';

export const generateAuthToken = (userId: string): string => {
  return jwt.sign({ _id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
  });
};
