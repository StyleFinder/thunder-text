/**
 * Two-Factor Authentication (2FA) Module
 *
 * Provides TOTP-based 2FA for admin users:
 * - Generate secret keys and QR codes for setup
 * - Verify TOTP codes during login
 * - Backup codes for recovery
 *
 * Uses otplib for TOTP generation/verification
 */

import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { randomBytes, createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// Configure authenticator options
authenticator.options = {
  digits: 6,
  step: 30, // 30-second window
  window: 1  // Allow 1 step before/after for clock drift
};

const APP_NAME = 'ThunderText';
const BACKUP_CODE_COUNT = 10;

export interface TwoFactorSetupResult {
  success: boolean;
  secret?: string;
  qrCodeDataUrl?: string;
  backupCodes?: string[];
  error?: string;
}

export interface TwoFactorVerifyResult {
  success: boolean;
  error?: string;
}

/**
 * Generate a new 2FA secret for an admin user
 */
export function generateTwoFactorSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate backup codes for recovery
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    // Generate 8-character alphanumeric codes
    const code = randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash backup codes for secure storage
 */
function hashBackupCodes(codes: string[]): string[] {
  return codes.map(code =>
    createHash('sha256').update(code).digest('hex')
  );
}

/**
 * Generate QR code data URL for authenticator app setup
 */
export async function generateQRCode(email: string, secret: string): Promise<string> {
  const otpauth = authenticator.keyuri(email, APP_NAME, secret);
  return QRCode.toDataURL(otpauth);
}

/**
 * Initialize 2FA setup for an admin user
 * Returns secret and QR code for the user to scan
 */
export async function initializeTwoFactorSetup(
  adminId: string,
  email: string
): Promise<TwoFactorSetupResult> {
  try {
    const secret = generateTwoFactorSecret();
    const backupCodes = generateBackupCodes();
    const qrCodeDataUrl = await generateQRCode(email, secret);

    // Store the pending 2FA setup (not yet verified)
    const { error } = await supabaseAdmin
      .from('super_admins')
      .update({
        two_factor_secret_pending: secret,
        two_factor_backup_codes_pending: hashBackupCodes(backupCodes)
      })
      .eq('id', adminId);

    if (error) {
      logger.error('[2FA] Failed to store pending setup', error as Error, {
        component: 'two-factor-auth',
        adminId
      });
      return { success: false, error: 'Failed to initialize 2FA setup' };
    }

    logger.info('[2FA] Setup initialized', {
      component: 'two-factor-auth',
      adminId
    });

    return {
      success: true,
      secret,
      qrCodeDataUrl,
      backupCodes // Return plaintext codes to show user ONCE
    };
  } catch (error) {
    logger.error('[2FA] Setup initialization error', error as Error, {
      component: 'two-factor-auth'
    });
    return { success: false, error: 'Server error' };
  }
}

/**
 * Complete 2FA setup by verifying the first code
 * This confirms the user has successfully set up their authenticator
 */
export async function completeTwoFactorSetup(
  adminId: string,
  code: string
): Promise<TwoFactorVerifyResult> {
  try {
    // Get the pending secret
    const { data: admin, error: fetchError } = await supabaseAdmin
      .from('super_admins')
      .select('two_factor_secret_pending, two_factor_backup_codes_pending')
      .eq('id', adminId)
      .single();

    if (fetchError || !admin?.two_factor_secret_pending) {
      return { success: false, error: 'No pending 2FA setup found' };
    }

    // Verify the code against the pending secret
    const isValid = authenticator.verify({
      token: code,
      secret: admin.two_factor_secret_pending
    });

    if (!isValid) {
      return { success: false, error: 'Invalid verification code' };
    }

    // Move pending to active
    const { error: updateError } = await supabaseAdmin
      .from('super_admins')
      .update({
        two_factor_enabled: true,
        two_factor_secret: admin.two_factor_secret_pending,
        two_factor_backup_codes: admin.two_factor_backup_codes_pending,
        two_factor_secret_pending: null,
        two_factor_backup_codes_pending: null,
        two_factor_enabled_at: new Date().toISOString()
      })
      .eq('id', adminId);

    if (updateError) {
      logger.error('[2FA] Failed to complete setup', updateError as Error, {
        component: 'two-factor-auth',
        adminId
      });
      return { success: false, error: 'Failed to enable 2FA' };
    }

    logger.info('[2FA] Setup completed successfully', {
      component: 'two-factor-auth',
      adminId
    });

    return { success: true };
  } catch (error) {
    logger.error('[2FA] Setup completion error', error as Error, {
      component: 'two-factor-auth'
    });
    return { success: false, error: 'Server error' };
  }
}

/**
 * Verify a 2FA code during login
 */
export async function verifyTwoFactorCode(
  adminId: string,
  code: string
): Promise<TwoFactorVerifyResult> {
  try {
    const { data: admin, error: fetchError } = await supabaseAdmin
      .from('super_admins')
      .select('two_factor_secret, two_factor_backup_codes')
      .eq('id', adminId)
      .eq('two_factor_enabled', true)
      .single();

    if (fetchError || !admin?.two_factor_secret) {
      return { success: false, error: '2FA not enabled for this account' };
    }

    // First, try regular TOTP verification
    const isValidTotp = authenticator.verify({
      token: code,
      secret: admin.two_factor_secret
    });

    if (isValidTotp) {
      logger.info('[2FA] Code verified via TOTP', {
        component: 'two-factor-auth',
        adminId
      });
      return { success: true };
    }

    // If TOTP fails, check if it's a backup code
    const codeHash = createHash('sha256').update(code.toUpperCase()).digest('hex');
    const backupCodes = admin.two_factor_backup_codes || [];

    const backupCodeIndex = backupCodes.indexOf(codeHash);
    if (backupCodeIndex !== -1) {
      // Remove the used backup code
      backupCodes.splice(backupCodeIndex, 1);

      await supabaseAdmin
        .from('super_admins')
        .update({ two_factor_backup_codes: backupCodes })
        .eq('id', adminId);

      logger.warn('[2FA] Backup code used', {
        component: 'two-factor-auth',
        adminId,
        remainingBackupCodes: backupCodes.length
      });

      return { success: true };
    }

    return { success: false, error: 'Invalid verification code' };
  } catch (error) {
    logger.error('[2FA] Verification error', error as Error, {
      component: 'two-factor-auth'
    });
    return { success: false, error: 'Server error' };
  }
}

/**
 * Check if admin has 2FA enabled
 */
export async function isTwoFactorEnabled(adminId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('super_admins')
      .select('two_factor_enabled')
      .eq('id', adminId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.two_factor_enabled === true;
  } catch {
    return false;
  }
}

/**
 * Disable 2FA for an admin (requires password confirmation)
 */
export async function disableTwoFactor(adminId: string): Promise<TwoFactorVerifyResult> {
  try {
    const { error } = await supabaseAdmin
      .from('super_admins')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: null,
        two_factor_enabled_at: null
      })
      .eq('id', adminId);

    if (error) {
      logger.error('[2FA] Failed to disable', error as Error, {
        component: 'two-factor-auth',
        adminId
      });
      return { success: false, error: 'Failed to disable 2FA' };
    }

    logger.info('[2FA] Disabled for admin', {
      component: 'two-factor-auth',
      adminId
    });

    return { success: true };
  } catch (error) {
    logger.error('[2FA] Disable error', error as Error, {
      component: 'two-factor-auth'
    });
    return { success: false, error: 'Server error' };
  }
}

/**
 * Regenerate backup codes (invalidates old ones)
 */
export async function regenerateBackupCodes(adminId: string): Promise<{
  success: boolean;
  backupCodes?: string[];
  error?: string;
}> {
  try {
    const backupCodes = generateBackupCodes();
    const hashedCodes = hashBackupCodes(backupCodes);

    const { error } = await supabaseAdmin
      .from('super_admins')
      .update({ two_factor_backup_codes: hashedCodes })
      .eq('id', adminId)
      .eq('two_factor_enabled', true);

    if (error) {
      return { success: false, error: 'Failed to regenerate backup codes' };
    }

    logger.info('[2FA] Backup codes regenerated', {
      component: 'two-factor-auth',
      adminId
    });

    return { success: true, backupCodes };
  } catch (error) {
    logger.error('[2FA] Backup code regeneration error', error as Error, {
      component: 'two-factor-auth'
    });
    return { success: false, error: 'Server error' };
  }
}
