import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { AuthHelper } from '../utils/authHelper';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import crypto from 'crypto';

export class AuthController {
  public static async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        throw new AppError('Name, email, and password are required fields.', 400);
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new AppError('A user with this email address already exists.', 400);
      }

      const passwordHash = await AuthHelper.hashPassword(password);
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create new user (automatically verify the first user as admin for easy bootstrap)
      const usersCount = await User.countDocuments();
      const isFirstUser = usersCount === 0;

      const newUser = await User.create({
        name,
        email,
        passwordHash,
        role: isFirstUser ? 'admin' : 'user',
        isVerified: isFirstUser, // Auto-verify admin
        verificationToken: isFirstUser ? undefined : verificationToken,
      });

      console.log(`[Auth] User registered: ${newUser.email} (Role: ${newUser.role})`);
      if (!isFirstUser) {
        console.log(`[Verification Simulator] Send email to ${email} with token: ${verificationToken}`);
      }

      res.status(201).json({
        status: 'success',
        message: isFirstUser 
          ? 'Admin account created and verified successfully.' 
          : 'User registered. Please check your email to verify your account.',
        data: {
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            isVerified: newUser.isVerified
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, rememberMe } = req.body;

      if (!email || !password) {
        throw new AppError('Email and password must be provided.', 400);
      }

      const user = await User.findOne({ email });
      if (!user || !(await AuthHelper.comparePasswords(password, user.passwordHash))) {
        throw new AppError('Incorrect email or password credentials.', 401);
      }

      const accessToken = AuthHelper.generateAccessToken(user.id, user.role, rememberMe);
      const refreshToken = AuthHelper.generateRefreshToken(user.id, rememberMe);

      // Save refresh session to database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

      await Session.create({
        userId: user.id,
        refreshToken,
        ipAddress: req.ip,
        deviceDetails: req.headers['user-agent'],
        expiresAt,
      });

      // Configure cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        expires: expiresAt
      };

      res.cookie('access_token', accessToken, cookieOptions);
      res.cookie('refresh_token', refreshToken, cookieOptions);

      res.status(200).json({
        status: 'success',
        message: 'Signed in successfully.',
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            storageUsed: user.storageUsed,
            maxStorageLimit: user.maxStorageLimit
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies.refresh_token || req.body.refreshToken;
      
      if (token) {
        // Delete session record
        await Session.deleteOne({ refreshToken: token });
      }

      res.clearCookie('access_token');
      res.clearCookie('refresh_token');

      res.status(200).json({
        status: 'success',
        message: 'Signed out successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies.refresh_token || req.body.refreshToken;

      if (!token) {
        throw new AppError('Refresh token required.', 401);
      }

      const session = await Session.findOne({ refreshToken: token });
      if (!session) {
        throw new AppError('Invalid or expired refresh session.', 401);
      }

      const decoded = AuthHelper.verifyRefreshToken(token);
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new AppError('User belonging to session no longer exists.', 401);
      }

      const newAccessToken = AuthHelper.generateAccessToken(user.id, user.role, false);
      
      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      res.status(200).json({
        status: 'success',
        data: {
          accessToken: newAccessToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;

      const user = await User.findOne({ verificationToken: token });
      if (!user) {
        throw new AppError('Invalid or expired email verification token.', 400);
      }

      user.isVerified = true;
      user.verificationToken = undefined;
      await user.save();

      res.status(200).json({
        status: 'success',
        message: 'Email address verified successfully. You can now login.'
      });
    } catch (error) {
      next(error);
    }
  }

  public static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      
      const user = await User.findOne({ email });
      if (!user) {
        // Obfuscate user existence to prevent enumeration, but log internally
        console.log(`[Auth] Forgot password requested for non-existent email: ${email}`);
        res.status(200).json({
          status: 'success',
          message: 'If the email exists, a password reset link has been dispatched.'
        });
        return;
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      console.log(`[Forgot Password Simulator] Send email to ${email} with reset link: http://localhost:5173/reset-password/${resetToken}`);

      res.status(200).json({
        status: 'success',
        message: 'If the email exists, a password reset link has been dispatched.'
      });
    } catch (error) {
      next(error);
    }
  }

  public static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (!password) {
        throw new AppError('New password is required.', 400);
      }

      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() }
      });

      if (!user) {
        throw new AppError('Invalid or expired password reset token.', 400);
      }

      user.passwordHash = await AuthHelper.hashPassword(password);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.status(200).json({
        status: 'success',
        message: 'Password reset completed successfully. You can now login with your new credentials.'
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user?.id,
            name: user?.name,
            email: user?.email,
            role: user?.role,
            isVerified: user?.isVerified,
            storageUsed: user?.storageUsed,
            maxStorageLimit: user?.maxStorageLimit,
            createdAt: user?.createdAt
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
