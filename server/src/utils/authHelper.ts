import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'development_access_token_secret_129847120394871029348';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'development_refresh_token_secret_01283719082374198273';

export class AuthHelper {
  public static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  public static async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static generateAccessToken(userId: string, role: string, rememberMe: boolean = false): string {
    const expiresIn = rememberMe ? '7d' : '15m';
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn });
  }

  public static generateRefreshToken(userId: string, rememberMe: boolean = false): string {
    const expiresIn = rememberMe ? '30d' : '7d';
    return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn });
  }

  public static verifyRefreshToken(token: string): { userId: string } {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
  }
}
