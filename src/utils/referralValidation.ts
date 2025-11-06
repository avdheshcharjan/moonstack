/**
 * Client-side referral code validation utilities
 */

/**
 * Validates if a referral code matches the expected format
 * - 6 characters
 * - Alphanumeric (A-Z, 0-9)
 * - Uppercase only
 */
export function isValidReferralCodeFormat(code: string): boolean {
  if (!code || code.length !== 6) return false;
  return /^[A-Z0-9]{6}$/.test(code);
}

/**
 * Sanitizes user input for referral codes
 * - Converts to uppercase
 * - Removes non-alphanumeric characters
 * - Limits to 6 characters
 */
export function sanitizeReferralCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

/**
 * Formats a referral code for display
 * Adds spacing for readability (e.g., "ABC 123")
 */
export function formatReferralCode(code: string): string {
  if (code.length <= 3) return code;
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

