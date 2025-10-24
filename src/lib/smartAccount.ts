import type { Address } from 'viem';
import { createBaseAccountSDK, getCryptoKeyAccount, base } from '@base-org/account';

/**
 * Base Account SDK instance (singleton)
 */
let sdkInstance: ReturnType<typeof createBaseAccountSDK> | null = null;

/**
 * Get or create Base Account SDK instance
 */
export function getBaseAccountSDK() {
  if (!sdkInstance) {
    sdkInstance = createBaseAccountSDK({
      appName: 'OptionBook',
      appLogoUrl: 'https://optionbook.xyz/logo.png',
      appChainIds: [base.constants.CHAIN_IDS.base],
    });
  }
  return sdkInstance;
}

/**
 * Get the Base Account provider for wallet interactions
 */
export function getBaseAccountProvider() {
  const sdk = getBaseAccountSDK();
  return sdk.getProvider();
}

/**
 * Get the current crypto key account
 */
export async function getBaseAccount() {
  console.log('🔍 [smartAccount] Getting crypto key account...');
  try {
    const account = await getCryptoKeyAccount();
    console.log('✅ [smartAccount] Got account:', account ? 'exists' : 'null');
    console.log('✅ [smartAccount] Account address:', account?.account?.address || 'none');

    if (!account?.account?.address) {
      console.error('❌ [smartAccount] No Base Account found');
      throw new Error('No Base Account found. Please connect your wallet first.');
    }
    return account;
  } catch (error) {
    console.error('❌ [smartAccount] Error getting crypto key account:', error);
    throw error;
  }
}

/**
 * Get the user's Base Account address
 */
export async function getBaseAccountAddress(): Promise<Address> {
  console.log('🔍 [smartAccount] getBaseAccountAddress called');
  try {
    const account = await getBaseAccount();
    const address = account.account.address as Address;
    console.log('✅ [smartAccount] Returning address:', address);
    return address;
  } catch (error) {
    console.error('❌ [smartAccount] Failed to get Base Account address:', error);
    throw error;
  }
}

/**
 * Check if Base Account is connected
 */
export async function isBaseAccountConnected(): Promise<boolean> {
  console.log('🔍 [smartAccount] Checking if Base Account is connected...');
  try {
    const account = await getCryptoKeyAccount();
    const isConnected = Boolean(account?.account?.address);
    console.log('✅ [smartAccount] Base Account connected:', isConnected);
    if (isConnected) {
      console.log('✅ [smartAccount] Base Account address:', account.account.address);
    }
    return isConnected;
  } catch (error) {
    console.error('❌ [smartAccount] Error checking connection:', error);
    return false;
  }
}

/**
 * Check wallet capabilities for atomic batching
 */
export async function checkBatchCapabilities(address: Address): Promise<{
  atomicBatchSupported: boolean;
  paymasterSupported: boolean;
}> {
  try {
    const provider = getBaseAccountProvider();
    const capabilities = await provider.request({
      method: 'wallet_getCapabilities',
      params: [address],
    });

    const baseCapabilities = capabilities[base.constants.CHAIN_IDS.base];

    return {
      atomicBatchSupported: Boolean(baseCapabilities?.atomicBatch?.supported),
      paymasterSupported: Boolean(baseCapabilities?.paymasterService?.supported),
    };
  } catch (error) {
    console.error('Failed to check capabilities:', error);
    return {
      atomicBatchSupported: false,
      paymasterSupported: false,
    };
  }
}

// Legacy exports for backward compatibility
/**
 * @deprecated Use getBaseAccountAddress instead
 */
export const getSmartAccountAddress = getBaseAccountAddress;

/**
 * @deprecated Use getBaseAccountProvider instead - no need for separate client creation
 */
export async function createSmartAccountWithPaymaster(_owner: Address) {
  // For backward compatibility, return an object with provider methods
  const provider = getBaseAccountProvider();
  const address = await getBaseAccountAddress();

  return {
    account: { address },
    provider,
  };
}
