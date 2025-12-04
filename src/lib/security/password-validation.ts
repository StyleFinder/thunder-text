/**
 * Password Validation & Security
 *
 * Provides comprehensive password validation including:
 * - Minimum length requirements
 * - Complexity rules (uppercase, lowercase, numbers, symbols)
 * - Common password blocklist
 * - Strength scoring
 */

// Common passwords to block (top 100 most common)
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  '1234567890', 'qwerty', 'qwerty123', 'abc123', 'monkey', 'master',
  'dragon', 'letmein', 'login', 'admin', 'welcome', 'football', 'iloveyou',
  'sunshine', 'princess', 'starwars', 'superman', 'batman', 'trustno1',
  'hello', 'shadow', 'ashley', 'michael', 'ninja', 'mustang', 'password1!',
  'passw0rd', 'p@ssword', 'p@ssw0rd', 'changeme', 'secret', 'root',
  '111111', '000000', '654321', '666666', '696969', '121212', '123123',
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1q2w3e4r', '1qaz2wsx',
  'baseball', 'basketball', 'hockey', 'soccer', 'jordan', 'thomas',
  'hunter', 'ranger', 'harley', 'cheese', 'butter', 'cookie', 'coffee',
  'chicken', 'pepper', 'summer', 'winter', 'spring', 'autumn', 'orange',
  'purple', 'yellow', 'silver', 'diamond', 'thunder', 'thunder1', 'thunder123',
  'shopify', 'shopify1', 'shopify123', 'ecommerce', 'store', 'store123',
  'admin123', 'user', 'user123', 'test', 'test123', 'guest', 'default'
])

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'fair' | 'good' | 'strong'
  score: number // 0-100
}

export interface PasswordRequirements {
  minLength?: number
  requireUppercase?: boolean
  requireLowercase?: boolean
  requireNumbers?: boolean
  requireSymbols?: boolean
  blockCommonPasswords?: boolean
}

const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: false, // Optional but adds to strength score
  blockCommonPasswords: true
}

/**
 * Validate a password against security requirements
 *
 * @param password - The password to validate
 * @param requirements - Optional custom requirements (defaults to secure settings)
 * @returns Validation result with errors and strength score
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS
): PasswordValidationResult {
  const errors: string[] = []
  let score = 0

  const opts = { ...DEFAULT_REQUIREMENTS, ...requirements }

  // Check minimum length
  if (password.length < (opts.minLength || 8)) {
    errors.push(`Password must be at least ${opts.minLength} characters`)
  } else {
    score += 20
    // Bonus for longer passwords
    if (password.length >= 12) score += 10
    if (password.length >= 16) score += 10
  }

  // Check for uppercase letters
  const hasUppercase = /[A-Z]/.test(password)
  if (opts.requireUppercase && !hasUppercase) {
    errors.push('Password must contain at least one uppercase letter')
  } else if (hasUppercase) {
    score += 15
  }

  // Check for lowercase letters
  const hasLowercase = /[a-z]/.test(password)
  if (opts.requireLowercase && !hasLowercase) {
    errors.push('Password must contain at least one lowercase letter')
  } else if (hasLowercase) {
    score += 15
  }

  // Check for numbers
  const hasNumbers = /[0-9]/.test(password)
  if (opts.requireNumbers && !hasNumbers) {
    errors.push('Password must contain at least one number')
  } else if (hasNumbers) {
    score += 15
  }

  // Check for symbols
  const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)
  if (opts.requireSymbols && !hasSymbols) {
    errors.push('Password must contain at least one symbol (!@#$%^&*...)')
  } else if (hasSymbols) {
    score += 15
  }

  // Check against common passwords
  if (opts.blockCommonPasswords) {
    const lowerPassword = password.toLowerCase()
    if (COMMON_PASSWORDS.has(lowerPassword)) {
      errors.push('This password is too common. Please choose a more unique password')
      score = Math.min(score, 20) // Cap score for common passwords
    }
  }

  // Check for sequential characters (123, abc, etc.)
  if (/(.)\1{2,}/.test(password)) {
    score -= 10 // Penalize repeated characters
  }

  // Check for keyboard patterns
  const keyboardPatterns = ['qwerty', 'asdf', 'zxcv', '1234', '4321', 'abcd']
  const lowerPass = password.toLowerCase()
  for (const pattern of keyboardPatterns) {
    if (lowerPass.includes(pattern)) {
      score -= 10
      break
    }
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score))

  // Determine strength level
  let strength: 'weak' | 'fair' | 'good' | 'strong'
  if (score < 40) {
    strength = 'weak'
  } else if (score < 60) {
    strength = 'fair'
  } else if (score < 80) {
    strength = 'good'
  } else {
    strength = 'strong'
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score
  }
}

/**
 * Check if a password is in the common passwords list
 */
export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase())
}

/**
 * Get human-readable password requirements
 */
export function getPasswordRequirementsText(
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS
): string[] {
  const reqs: string[] = []

  if (requirements.minLength) {
    reqs.push(`At least ${requirements.minLength} characters`)
  }
  if (requirements.requireUppercase) {
    reqs.push('At least one uppercase letter (A-Z)')
  }
  if (requirements.requireLowercase) {
    reqs.push('At least one lowercase letter (a-z)')
  }
  if (requirements.requireNumbers) {
    reqs.push('At least one number (0-9)')
  }
  if (requirements.requireSymbols) {
    reqs.push('At least one symbol (!@#$%^&*...)')
  }
  if (requirements.blockCommonPasswords) {
    reqs.push('Cannot be a commonly used password')
  }

  return reqs
}
