import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { AppError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  userId?: string;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = '';

    // Check authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // Check cookies (if secure cookies are configured)
    else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      throw new AppError('Authentication failed. Token not provided.', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development_access_token_secret_129847120394871029348') as {
      userId: string;
      role: 'user' | 'admin';
    };

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError('User belonging to this token no longer exists.', 401);
    }

    // Attach user information to request
    req.user = user;
    req.userId = user.id;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      next(new AppError('Your login has expired. Please sign in again.', 401));
    } else if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token credentials. Please sign in again.', 401));
    } else {
      next(error);
    }
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('Forbidden. Administrative access required.', 403));
  }
  next();
};

export const requireVerified = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.user.isVerified) {
    return next(new AppError('Your email address must be verified to perform this action.', 403));
  }
  next();
};
