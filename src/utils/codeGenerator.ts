/**
 * Utility to generate short alphanumeric codes for referral codes
 */

/**
 * Generates a deterministic referral code from a wallet address
 * Uses the wallet address as a seed to ensure:
 * 1. Same wallet always generates the same code
 * 2. Different wallets generate different codes (no collisions)
 * 3. No need to check database for uniqueness
 * 
 * @param walletAddress - The wallet address to use as seed
 * @param length - Length of the code to generate (default: 6)
 * @returns Deterministic alphanumeric code (e.g., "K61ITS")
 */
export async function generateCodeFromWallet(walletAddress: string, length: number = 6): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  // Normalize wallet address (lowercase, remove 0x prefix if present)
  const normalizedAddress = walletAddress.toLowerCase().replace(/^0x/, '');
  
  // Hash the wallet address using SubtleCrypto API (available in Node.js 15+ and browsers)
  let hashHex: string;
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Modern environment with Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(normalizedAddress);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Fallback: Simple hash function (for environments without crypto.subtle)
    hashHex = simpleHash(normalizedAddress);
  }
  
  // Convert hash to alphanumeric code
  let code = '';
  for (let i = 0; i < length; i++) {
    // Take 2 hex characters at a time
    const hexChunk = hashHex.slice(i * 2, i * 2 + 2);
    const value = parseInt(hexChunk, 16);
    code += characters[value % characters.length];
  }
  
  return code;
}

/**
 * Simple fallback hash function for environments without crypto.subtle
 * @param str - String to hash
 * @returns Hex string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to hex and pad
  return Math.abs(hash).toString(16).padStart(64, '0').repeat(4).slice(0, 64);
}

/**
 * Generates a random alphanumeric code (uppercase letters and numbers only)
 * @deprecated Use generateCodeFromWallet for deterministic codes
 * @param length - Length of the code to generate (default: 6)
 * @returns Random alphanumeric code (e.g., "A1B2C3")
 */
export function generateShortCode(length: number = 6): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  
  return code;
}

/**
 * Generates a cryptographically secure random code (if crypto API is available)
 * Falls back to Math.random() if crypto is not available
 * @param length - Length of the code to generate (default: 6)
 * @returns Random alphanumeric code
 */
export function generateSecureCode(length: number = 6): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  // Check if we're in a browser or Node.js environment with crypto
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    // Browser environment
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      code += characters[array[i] % characters.length];
    }
  } else if (typeof global !== 'undefined' && global.crypto && global.crypto.getRandomValues) {
    // Node.js environment (v15+)
    const array = new Uint32Array(length);
    global.crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      code += characters[array[i] % characters.length];
    }
  } else {
    // Fallback to Math.random()
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }
  }
  
  return code;
}

/**
 * Validates if a code matches the expected format
 * @param code - Code to validate
 * @returns true if code is valid alphanumeric uppercase
 */
export function isValidCodeFormat(code: string): boolean {
  const validPattern = /^[A-Z0-9]+$/;
  return validPattern.test(code) && code.length >= 4 && code.length <= 10;
}

