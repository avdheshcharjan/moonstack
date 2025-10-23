import type { Address, Hex } from 'viem';

const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || '';

export interface PaymasterStubDataResponse {
  paymaster: Address;
  paymasterData: Hex;
  paymasterVerificationGasLimit: bigint;
  paymasterPostOpGasLimit: bigint;
  isFinal: boolean;
}

export interface PaymasterDataResponse {
  paymaster: Address;
  paymasterData: Hex;
}

export interface UserOperationRequest {
  sender: Address;
  nonce: bigint;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

/**
 * Get paymaster stub data for gas estimation
 * This is called during UserOperation preparation to get initial gas estimates
 */
export async function getPaymasterStubData(
  userOp: UserOperationRequest,
  entryPoint: Address
): Promise<PaymasterStubDataResponse> {
  const response = await fetch(PAYMASTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'pm_getPaymasterStubData',
      params: [
        {
          sender: userOp.sender,
          nonce: `0x${userOp.nonce.toString(16)}`,
          callData: userOp.callData,
          callGasLimit: `0x${userOp.callGasLimit.toString(16)}`,
          verificationGasLimit: `0x${userOp.verificationGasLimit.toString(16)}`,
          preVerificationGas: `0x${userOp.preVerificationGas.toString(16)}`,
          maxFeePerGas: `0x${userOp.maxFeePerGas.toString(16)}`,
          maxPriorityFeePerGas: `0x${userOp.maxPriorityFeePerGas.toString(16)}`,
        },
        entryPoint,
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Paymaster request failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Paymaster error: ${data.error.message}`);
  }

  return {
    paymaster: data.result.paymaster,
    paymasterData: data.result.paymasterData,
    paymasterVerificationGasLimit: BigInt(data.result.paymasterVerificationGasLimit),
    paymasterPostOpGasLimit: BigInt(data.result.paymasterPostOpGasLimit),
    isFinal: data.result.isFinal || false,
  };
}

/**
 * Get final paymaster data with signature
 * This is called after gas estimation to get the signed paymaster data
 */
export async function getPaymasterData(
  userOp: UserOperationRequest,
  entryPoint: Address
): Promise<PaymasterDataResponse> {
  const response = await fetch(PAYMASTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'pm_getPaymasterData',
      params: [
        {
          sender: userOp.sender,
          nonce: `0x${userOp.nonce.toString(16)}`,
          callData: userOp.callData,
          callGasLimit: `0x${userOp.callGasLimit.toString(16)}`,
          verificationGasLimit: `0x${userOp.verificationGasLimit.toString(16)}`,
          preVerificationGas: `0x${userOp.preVerificationGas.toString(16)}`,
          maxFeePerGas: `0x${userOp.maxFeePerGas.toString(16)}`,
          maxPriorityFeePerGas: `0x${userOp.maxPriorityFeePerGas.toString(16)}`,
        },
        entryPoint,
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Paymaster request failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Paymaster error: ${data.error.message}`);
  }

  return {
    paymaster: data.result.paymaster,
    paymasterData: data.result.paymasterData,
  };
}

/**
 * Check if paymaster is configured and available
 */
export function isPaymasterConfigured(): boolean {
  return Boolean(PAYMASTER_URL && PAYMASTER_URL.length > 0);
}
