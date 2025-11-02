import { BinaryPair } from '@/src/types/prediction';

/**
 * Generates a unique shareable URL for a binary pair card
 * @param pair The binary pair to share
 * @returns The shareable URL
 */
export function generateShareUrl(pair: BinaryPair): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const baseUrl = window.location.origin + window.location.pathname;
  // Use the pair's unique ID which is already stable: underlying_threshold_expiry
  const encodedId = encodeURIComponent(pair.id);
  return `${baseUrl}?id=${encodedId}`;
}

/**
 * Copies text to clipboard
 * @param text Text to copy
 * @returns Promise that resolves to true if successful
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
}

/**
 * Generates share text for social media
 * @param pair The binary pair
 * @param url The share URL
 * @returns Formatted share text
 */
export function generateShareText(pair: BinaryPair, url: string): string {
  return `${pair.question}\n\nMake your prediction on Thetanuts!\n${url}`;
}
