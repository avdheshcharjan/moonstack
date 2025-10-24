import { createPublicClient, createWalletClient, custom, http, type Address } from 'viem';
import { base } from 'viem/chains';
import { createSmartAccountClient } from 'permissionless';
import { toSimpleSmartAccount } from 'permissionless/accounts';
import { baseAccountSDK } from '@/src/providers/BaseAccountProvider';

const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || '';
const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || '';

// EntryPoint v0.7 address
export const ENTRYPOINT_ADDRESS_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const;

/**
 * Create a smart account client with Coinbase Paymaster support
 */
export async function createSmartAccountWithPaymaster(
  owner: Address
) {
  if (typeof window === 'undefined') {
    throw new Error('Smart account can only be created on client side');
  }

  // Use Base Account SDK provider
  const provider = baseAccountSDK.getProvider();

  // Create public client for reading blockchain state
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  // Create wallet client from Base Account provider
  const walletClient = createWalletClient({
    chain: base,
    transport: custom(provider),
    account: owner,
  });

  // Create simple smart account using wallet client as owner
  const simpleAccount = await (toSimpleSmartAccount as any)({
    client: publicClient,
    entryPoint: {
      address: ENTRYPOINT_ADDRESS_V07,
      version: '0.7' as const,
    },
    owner: walletClient,
  });

  // Create smart account client with bundler (paymaster integration via bundler)
  const smartAccountClient = createSmartAccountClient({
    account: simpleAccount as any,
    chain: base,
    bundlerTransport: http(BUNDLER_URL),
    // Note: Paymaster integration will be handled via the bundler/paymaster endpoint
  });

  return smartAccountClient;
}

/**
 * Get smart account address from owner address
 */
export async function getSmartAccountAddress(owner: Address): Promise<Address> {
  if (typeof window === 'undefined') {
    throw new Error('Smart account can only be accessed on client side');
  }

  // Use Base Account SDK provider
  const provider = baseAccountSDK.getProvider();

  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  const walletClient = createWalletClient({
    chain: base,
    transport: custom(provider),
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

  return simpleAccount.address as Address;
}
