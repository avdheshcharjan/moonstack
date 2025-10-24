import { toSimpleSmartAccount } from 'permissionless/accounts';
import { createPublicClient, createWalletClient, custom, http, type Address } from 'viem';
import { base } from 'viem/chains';
import { createBaseAccountSDK, getCryptoKeyAccount } from '@base-org/account';

const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || '';
const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || '';

// EntryPoint v0.7 address
export const ENTRYPOINT_ADDRESS_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const;

// SDK instance singleton
let sdkInstance: ReturnType<typeof createBaseAccountSDK> | null = null;

/**
 * Get or create Base Account SDK instance
 */
export function getBaseAccountSDK() {
  if (!sdkInstance) {
    sdkInstance = createBaseAccountSDK({
      appName: 'OptionBook',
      appLogoUrl: 'https://optionbook.xyz/logo.png',
      appChainIds: [base.id], // Base mainnet chain ID (8453)
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
  const account = await getCryptoKeyAccount();
  if (!account?.account?.address) {
    throw new Error('No Base Account found. Please connect your wallet first.');
  }
  return account;
}

/**
 * Get the user's Base Account address
 */
export async function getBaseAccountAddress(): Promise<Address> {
  const account = await getBaseAccount();
  return account.account.address as Address;
}

/**
 * Check if Base Account is connected
 */
export async function isBaseAccountConnected(): Promise<boolean> {
  try {
    const account = await getCryptoKeyAccount();
    return Boolean(account?.account?.address);
  } catch {
    return false;
  }
}

/**
 * Check wallet capabilities for atomic batching
 */
export async function getSmartAccountAddress(owner: Address): Promise<Address> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Ethereum provider not found');
  }

  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  const walletClient = createWalletClient({
    chain: base,
    transport: custom(window.ethereum),
    account: owner,
  });

  const simpleAccount = await (toSimpleSmartAccount as any)({
    client: publicClient,
    entryPoint: {
      address: ENTRYPOINT_ADDRESS_V07,
      version: '0.7' as const,
    },
    owner: walletClient,
  });

  console.log('Smart Account Address:', simpleAccount.address);

  return simpleAccount.address;
}
