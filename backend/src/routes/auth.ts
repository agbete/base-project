import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { query } from '@/config/database';
import { getSessionService, getCacheService } from '@/config/redis';
import { logger, logLoginAttempt, logSecurityEvent } from '@/utils/logger';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { authMiddleware } from '@/middleware/auth';
import { 
  ValidationError, 
  AuthenticationError,
  asyncHandler 
} from '@/middleware/errorHandler';

const router = Router();

// Interfaces
interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string;
  rememberMe?: boolean;
}

// Configuration JWT
const jwtSecret = process.env['JWT_SECRET'];
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: string = jwtSecret;

interface ResetPasswordRequest {
  email: string;
}

interface ConfirmResetRequest {
  token: string;
  newPassword: string;
}

// ========================================
// CONNEXION
// ========================================

router.post('/login', authRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email, password, totpCode, rememberMe }: LoginRequest = req.body;
  
  // Validation des données
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }
  
  const ip = req.ip || 'unknown';
  
  try {
    // Récupérer l'utilisateur avec les tentatives de connexion
    const users = await query(
      `SELECT 
        u.id, u.email, u.password_hash, u.first_name, u.last_name,
        u.company_id, u.role_id, u.status, u.is_super_admin,
        u.two_factor_enabled, u.two_factor_secret, u.failed_login_attempts,
        u.locked_until, u.last_login_at,
        c.name as company_name, c.status as company_status
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );
    
    if (users.length === 0) {
      logLoginAttempt(email, false, ip, 'User not found');
      throw new AuthenticationError('Invalid credentials');
    }
    
    const user = users[0];
    
    // Vérifier si le compte est verrouillé
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      logLoginAttempt(email, false, ip, 'Account locked');
      throw new AuthenticationError('Account temporarily locked due to too many failed attempts');
    }
    
    // Vérifier le statut de l'utilisateur et de l'entreprise
    if (user.status !== 'active') {
      logLoginAttempt(email, false, ip, `User status: ${user.status}`);
      throw new AuthenticationError('Account is not active');
    }
    
    if (user.company_status !== 'active') {
      logLoginAttempt(email, false, ip, `Company status: ${user.company_status}`);
      throw new AuthenticationError('Company account is not active');
    }
    
    // Vérifier le mot de passe
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordValid) {
      // Incrémenter les tentatives échouées
      await incrementFailedAttempts(user.id, user.failed_login_attempts || 0);
      logLoginAttempt(email, false, ip, 'Invalid password');
      throw new AuthenticationError('Invalid credentials');
    }
    
    // Vérifier le 2FA si activé
    if (user.two_factor_enabled) {
      if (!totpCode) {
        throw new ValidationError('2FA code required', { requiresTwoFactor: true });
      }
      
      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: totpCode,
        window: 2, // Permettre 2 fenêtres de temps (±60 secondes)
      });
      
      if (!verified) {
        await incrementFailedAttempts(user.id, user.failed_login_attempts || 0);
        logLoginAttempt(email, false, ip, 'Invalid 2FA code');
        throw new AuthenticationError('Invalid 2FA code');
      }
    }
    
    // Connexion réussie - réinitialiser les tentatives échouées
    await resetFailedAttempts(user.id);
    
    // Créer une session
    const sessionId = crypto.randomUUID();
    const sessionService = getSessionService();
    
    const sessionData = {
      userId: user.id,
      email: user.email,
      companyId: user.company_id,
      roleId: user.role_id,
      isSuperAdmin: user.is_super_admin,
      ip,
      userAgent: req.get('User-Agent'),
      createdAt: new Date().toISOString(),
    };
    
    const sessionTTL = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 jours ou 1 jour
    await sessionService.createSession(sessionId, sessionData, sessionTTL);
    
    // Générer les tokens JWT
    
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      companyId: user.company_id,
      roleId: user.role_id,
      isSuperAdmin: user.is_super_admin,
      sessionId,
    };
    
    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: process.env['JWT_EXPIRES_IN'] || '15m',
    } as jwt.SignOptions);
    
    const refreshTokenSecret = process.env['JWT_REFRESH_SECRET'] || JWT_SECRET;
    const refreshToken = jwt.sign(tokenPayload, refreshTokenSecret, {
      expiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
    } as jwt.SignOptions);
    
    // Mettre à jour la dernière connexion
    await query(
      'UPDATE users SET last_login_at = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [user.id]
    );
    
    logLoginAttempt(email, true, ip);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          companyId: user.company_id,
          companyName: user.company_name,
          roleId: user.role_id,
          isSuperAdmin: user.is_super_admin,
          twoFactorEnabled: user.two_factor_enabled,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env['JWT_EXPIRES_IN'] || '15m',
        },
        session: {
          id: sessionId,
          expiresAt: new Date(Date.now() + sessionTTL * 1000).toISOString(),
        }
      }
    });
    
  } catch (error) {
    if (!(error instanceof AuthenticationError) && !(error instanceof ValidationError)) {
      logger.error('Login error:', {
        email,
        ip,
        error: error instanceof Error ? error.message : error,
      });
    }
    throw error;
  }
}));

// ========================================
// RAFRAÎCHISSEMENT DU TOKEN
// ========================================

router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw new ValidationError('Refresh token required');
  }
  
  try {
    const refreshSecret = process.env['JWT_REFRESH_SECRET'] || process.env['JWT_SECRET'];
    if (!refreshSecret) {
      throw new Error('JWT secrets not configured');
    }
    
    const decoded = jwt.verify(refreshToken, refreshSecret) as any;
    
    // Vérifier que la session existe toujours
    const sessionService = getSessionService();
    const session = await sessionService.getSession(decoded.sessionId);
    
    if (!session || session.userId !== decoded.userId) {
      throw new AuthenticationError('Invalid refresh token');
    }
    
    // Générer un nouveau token d'accès
    
    const newAccessToken = jwt.sign({
      userId: decoded.userId,
      email: decoded.email,
      companyId: decoded.companyId,
      roleId: decoded.roleId,
      isSuperAdmin: decoded.isSuperAdmin,
      sessionId: decoded.sessionId,
    }, JWT_SECRET, {
      expiresIn: process.env['JWT_EXPIRES_IN'] || '15m',
    } as jwt.SignOptions);
    
    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: process.env['JWT_EXPIRES_IN'] || '15m',
      }
    });
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid refresh token');
    }
    throw error;
  }
}));

// ========================================
// DÉCONNEXION
// ========================================

router.post('/logout', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const sessionId = req.sessionId;
  
  if (sessionId) {
    const sessionService = getSessionService();
    await sessionService.deleteSession(sessionId);
    
    logger.info('User logged out', {
      userId: req.user?.id,
      sessionId,
      ip: req.ip,
    });
  }
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// ========================================
// DÉCONNEXION DE TOUTES LES SESSIONS
// ========================================

router.post('/logout-all', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (userId) {
    const sessionService = getSessionService();
    await sessionService.deleteUserSessions(userId);
    
    logSecurityEvent('logout_all_sessions', {
      userId,
      ip: req.ip,
    });
  }
  
  res.json({
    success: true,
    message: 'Logged out from all sessions'
  });
}));

// ========================================
// CONFIGURATION 2FA
// ========================================

router.post('/2fa/setup', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  
  if (!userId || !userEmail) {
    throw new AuthenticationError('User information required');
  }
  
  // Générer un secret 2FA
  const secret = speakeasy.generateSecret({
    name: `${process.env['TOTP_SERVICE_NAME'] || 'SaaS App'} (${userEmail})`,
    issuer: process.env['TOTP_ISSUER'] || 'Your Company',
    length: 32,
  });
  
  // Générer le QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');
  
  // Stocker temporairement le secret (pas encore activé)
  const cacheService = getCacheService();
  await cacheService.set(`2fa_setup:${userId}`, {
    secret: secret.base32,
    createdAt: new Date().toISOString(),
  }, 10 * 60); // 10 minutes
  
  res.json({
    success: true,
    data: {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
    }
  });
}));

router.post('/2fa/verify', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { totpCode } = req.body;
  const userId = req.user?.id;
  
  if (!totpCode || !userId) {
    throw new ValidationError('TOTP code and user ID required');
  }
  
  // Récupérer le secret temporaire
  const cacheService = getCacheService();
  const setupData = await cacheService.get(`2fa_setup:${userId}`);
  
  if (!setupData) {
    throw new ValidationError('2FA setup not found or expired. Please start setup again.');
  }
  
  // Vérifier le code TOTP
  const verified = speakeasy.totp.verify({
    secret: setupData.secret,
    encoding: 'base32',
    token: totpCode,
    window: 2,
  });
  
  if (!verified) {
    throw new ValidationError('Invalid TOTP code');
  }
  
  // Activer le 2FA pour l'utilisateur
  await query(
    'UPDATE users SET two_factor_enabled = true, two_factor_secret = $1 WHERE id = $2',
    [setupData.secret, userId]
  );
  
  // Supprimer le setup temporaire
  await cacheService.del(`2fa_setup:${userId}`);
  
  logSecurityEvent('2fa_enabled', {
    userId,
    ip: req.ip,
  });
  
  res.json({
    success: true,
    message: '2FA enabled successfully'
  });
}));

router.post('/2fa/disable', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { totpCode, password } = req.body;
  const userId = req.user?.id;
  
  if (!totpCode || !password || !userId) {
    throw new ValidationError('TOTP code and password required');
  }
  
  // Vérifier le mot de passe actuel
  const users = await query(
    'SELECT password_hash, two_factor_secret FROM users WHERE id = $1',
    [userId]
  );
  
  if (users.length === 0) {
    throw new AuthenticationError('User not found');
  }
  
  const user = users[0];
  const passwordValid = await bcrypt.compare(password, user.password_hash);
  
  if (!passwordValid) {
    throw new AuthenticationError('Invalid password');
  }
  
  // Vérifier le code TOTP
  const verified = speakeasy.totp.verify({
    secret: user.two_factor_secret,
    encoding: 'base32',
    token: totpCode,
    window: 2,
  });
  
  if (!verified) {
    throw new ValidationError('Invalid TOTP code');
  }
  
  // Désactiver le 2FA
  await query(
    'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1',
    [userId]
  );
  
  logSecurityEvent('2fa_disabled', {
    userId,
    ip: req.ip,
  });
  
  res.json({
    success: true,
    message: '2FA disabled successfully'
  });
}));

// ========================================
// RÉINITIALISATION DE MOT DE PASSE
// ========================================

router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { email }: ResetPasswordRequest = req.body;
  
  if (!email) {
    throw new ValidationError('Email is required');
  }
  
  // Toujours retourner succès pour éviter l'énumération d'emails
  const response = {
    success: true,
    message: 'If an account with this email exists, a password reset link has been sent.'
  };
  
  try {
    const users = await query(
      'SELECT id, email, first_name FROM users WHERE email = $1 AND status = $2',
      [email.toLowerCase(), 'active']
    );
    
    if (users.length > 0) {
      const user = users[0];
      
      // Générer un token de réinitialisation
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure
      
      // Stocker le token
      await query(
        'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
        [resetToken, resetExpires, user.id]
      );
      
      // TODO: Envoyer l'email de réinitialisation
      // await sendPasswordResetEmail(user.email, user.first_name, resetToken);
      
      logger.info('Password reset requested', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });
    }
    
  } catch (error) {
    logger.error('Password reset error:', {
      email,
      error: error instanceof Error ? error.message : error,
    });
  }
  
  res.json(response);
}));

router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword }: ConfirmResetRequest = req.body;
  
  if (!token || !newPassword) {
    throw new ValidationError('Token and new password are required');
  }
  
  if (newPassword.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }
  
  // Vérifier le token
  const users = await query(
    'SELECT id, email FROM users WHERE reset_token = $1 AND reset_expires > NOW() AND status = $2',
    [token, 'active']
  );
  
  if (users.length === 0) {
    throw new ValidationError('Invalid or expired reset token');
  }
  
  const user = users[0];
  
  // Hasher le nouveau mot de passe
  const saltRounds = parseInt(process.env['BCRYPT_ROUNDS'] || '12');
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);
  
  // Mettre à jour le mot de passe et supprimer le token
  await query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
    [passwordHash, user.id]
  );
  
  logSecurityEvent('password_reset', {
    userId: user.id,
    email: user.email,
    ip: req.ip,
  });
  
  res.json({
    success: true,
    message: 'Password reset successfully'
  });
}));

// ========================================
// PROFIL UTILISATEUR
// ========================================

router.get('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  
  if (!user) {
    throw new AuthenticationError('User information not available');
  }
  
  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      companyId: user.companyId,
      roleId: user.roleId,
      roleName: user.roleName,
      permissions: user.permissions,
      status: user.status,
      isSuperAdmin: user.isSuperAdmin,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      preferences: user.preferences,
    }
  });
}));

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

async function incrementFailedAttempts(userId: string, currentAttempts: number): Promise<void> {
  const maxAttempts = parseInt(process.env['MAX_LOGIN_ATTEMPTS'] || '5');
  const lockoutTime = parseInt(process.env['ACCOUNT_LOCKOUT_TIME'] || '1800000'); // 30 minutes
  
  const newAttempts = currentAttempts + 1;
  const lockedUntil = newAttempts >= maxAttempts 
    ? new Date(Date.now() + lockoutTime) 
    : null;
  
  await query(
    'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
    [newAttempts, lockedUntil, userId]
  );
  
  if (lockedUntil) {
    logSecurityEvent('account_locked', {
      userId,
      attempts: newAttempts,
      lockedUntil: lockedUntil.toISOString(),
    });
  }
}

async function resetFailedAttempts(userId: string): Promise<void> {
  await query(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
    [userId]
  );
}

export default router;
