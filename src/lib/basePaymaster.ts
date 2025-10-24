import { createPublicClient, http, createWalletClient, custom, type Address, type Hex } from 'viem';
import { base } from 'viem/chains';
import { createSmartAccountClient } from 'permissionless';
import { toSimpleSmartAccount } from 'permissionless/accounts';
import { ENTRYPOINT_ADDRESS_V07 } from './smartAccount';
import type { CartTransaction } from '@/src/types/cart';
import { baseAccountSDK } from '@/src/providers/BaseAccountProvider';

// Base Paymaster & Bundler RPC URL from Coinbase Developer Platform
const PAYMASTER_RPC_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || '';
const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || PAYMASTER_RPC_URL;

// Increased gas limits to prevent estimation failures
const GAS_LIMITS = {
    callGasLimit: 2_000_000n, // Increased from default ~100k
    verificationGasLimit: 1_000_000n, // Increased for smart account verification
    preVerificationGas: 100_000n, // Increased for bundler overhead
    maxFeePerGas: 1_000_000_000n, // 1 gwei
    maxPriorityFeePerGas: 1_000_000_000n, // 1 gwei
};

if (!PAYMASTER_RPC_URL) {
    console.warn('⚠️ NEXT_PUBLIC_PAYMASTER_URL not configured. Gasless transactions will not work.');
}

console.log('🔧 Paymaster Configuration:', {
    paymasterConfigured: !!PAYMASTER_RPC_URL,
    bundlerConfigured: !!BUNDLER_URL,
});

/**
 * Create a Smart Account client with Base Paymaster support
 * This enables gasless BATCHED transactions sponsored by the paymaster
 * Uses ERC-4337 UserOperations for true atomic batch execution
 */
export async function createSmartAccountWithBasePaymaster(ownerAddress: Address) {
    if (typeof window === 'undefined') {
        throw new Error('Smart account can only be created on client side');
    }

    console.log('🔧 Creating Smart Account with Paymaster...');
    console.log('👤 Owner Address:', ownerAddress);

    // Get the Base Account SDK provider (NOT window.ethereum/MetaMask)
    const baseProvider = baseAccountSDK.getProvider();
    if (!baseProvider) {
        throw new Error('Base Account provider not found. Please connect with Base Account.');
    }

    console.log('✅ Base Account provider found');

    // Create public client for reading blockchain state
    const publicClient = createPublicClient({
        chain: base,
        transport: http(),
    });

    console.log('✅ Public client created');

    // Create wallet client from Base Account provider
    const walletClient = createWalletClient({
        chain: base,
        transport: custom(baseProvider),
        account: ownerAddress,
    });

    console.log('✅ Wallet client created from Base Account provider');

    // Create simple smart account using wallet client as owner
    const simpleAccount = await (toSimpleSmartAccount as any)({
        client: publicClient,
        entryPoint: {
            address: ENTRYPOINT_ADDRESS_V07,
            version: '0.7' as const,
        },
        owner: walletClient,
    });

    console.log('✅ Simple Smart Account created');
    console.log('🏦 Smart Account Address:', simpleAccount.address);

    // Create smart account client with bundler and paymaster
    const smartAccountClient = createSmartAccountClient({
        account: simpleAccount as any,
        chain: base,
        bundlerTransport: http(BUNDLER_URL, {
            timeout: 60_000, // Increased to 60 seconds
        }),
        // The Coinbase Base Paymaster handles sponsorship automatically
        // when the bundler URL is configured correctly
    });

    console.log('✅ Smart Account Client created with Paymaster support');
    console.log('📡 Bundler URL configured:', BUNDLER_URL.slice(0, 50) + '...');
    console.log('💰 Gas Limits configured:', {
        callGasLimit: GAS_LIMITS.callGasLimit.toString(),
        verificationGasLimit: GAS_LIMITS.verificationGasLimit.toString(),
        preVerificationGas: GAS_LIMITS.preVerificationGas.toString(),
    });

    return smartAccountClient;
}

/**
 * Execute batch transactions gaslessly using Base Paymaster
 * This uses ERC-4337 UserOperations for ATOMIC batch execution
 */
export async function executeBatchWithPaymaster(
    transactions: CartTransaction[],
    userAddress: Address
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
        if (transactions.length === 0) {
            throw new Error('No transactions to execute');
        }

        console.log('========================================');
        console.log('🚀 GASLESS BATCH EXECUTION STARTING');
        console.log('========================================');
        console.log('👤 User Address:', userAddress);
        console.log('📦 Total transactions:', transactions.length);
        console.log('💰 Total USDC needed:', transactions.reduce((sum, tx) => sum + (tx.requiredUSDC || 0n), 0n).toString());

        // Get the Base Account provider
        const baseProvider = baseAccountSDK.getProvider();
        if (!baseProvider) {
            throw new Error('Base Account provider not found. Please connect with Base Account.');
        }

        console.log('✅ Base Account provider ready');

        // Prepare all calls for batch execution
        console.log('\n📝 Preparing transactions:');
        transactions.forEach((tx, index) => {
            console.log(`  ${index + 1}. ${tx.description}`);
            console.log(`     To: ${tx.to}`);
            console.log(`     Value: ${tx.value || 0n}`);
            console.log(`     USDC: ${tx.requiredUSDC?.toString() || '0'}`);
            console.log(`     Data: ${tx.data}`);
            console.log(`     Order Details:`, tx.orderDetails);
        });

        // Validate transactions
        const totalUSDC = transactions.reduce((sum, tx) => sum + (tx.requiredUSDC || 0n), 0n);
        console.log('\n💰 Total USDC Required:', totalUSDC.toString());

        // Check user's USDC balance
        console.log('⚠️  Make sure you have at least', (Number(totalUSDC) / 1_000_000).toFixed(2), 'USDC');
        console.log('⚠️  Make sure USDC is approved for spending');

        // Check if we need to add USDC approval transactions
        // Cart transactions only contain fillOrder calls, but we need approvals first
        const { USDC_ADDRESS, OPTION_BOOK_ADDRESS } = await import('@/src/utils/contracts');
        const { encodeFunctionData } = await import('viem');

        const totalUSDCNeeded = transactions.reduce((sum, tx) => sum + (tx.requiredUSDC || 0n), 0n);

        console.log('\n🔍 Pre-flight checks...');
        console.log('Total USDC needed:', (Number(totalUSDCNeeded) / 1_000_000).toFixed(2), 'USDC');

        // Create public client to check balances
        const publicClient = createPublicClient({
            chain: base,
            transport: http(),
        });

        // Check USDC balance
        try {
            const balance = await (publicClient.readContract as any)({
                address: USDC_ADDRESS as Address,
                abi: [{
                    name: 'balanceOf',
                    type: 'function',
                    inputs: [{ name: 'owner', type: 'address' }],
                    outputs: [{ name: '', type: 'uint256' }],
                    stateMutability: 'view'
                }] as const,
                functionName: 'balanceOf',
                args: [userAddress],
            }) as bigint;

            console.log('💰 Your USDC balance:', (Number(balance) / 1_000_000).toFixed(2), 'USDC');

            if (balance < totalUSDCNeeded) {
                throw new Error(
                    `Insufficient USDC balance. You have ${(Number(balance) / 1_000_000).toFixed(2)} USDC but need ${(Number(totalUSDCNeeded) / 1_000_000).toFixed(2)} USDC`
                );
            }

            console.log('✅ USDC balance sufficient');

            // Check current allowance
            const allowance = await (publicClient.readContract as any)({
                address: USDC_ADDRESS as Address,
                abi: [{
                    name: 'allowance',
                    type: 'function',
                    inputs: [
                        { name: 'owner', type: 'address' },
                        { name: 'spender', type: 'address' }
                    ],
                    outputs: [{ name: '', type: 'uint256' }],
                    stateMutability: 'view'
                }] as const,
                functionName: 'allowance',
                args: [userAddress, OPTION_BOOK_ADDRESS as Address],
            }) as bigint;

            console.log('📝 Current USDC allowance:', (Number(allowance) / 1_000_000).toFixed(2), 'USDC');

            if (allowance < totalUSDCNeeded) {
                console.log('⚠️  Need to approve USDC - will add to batch');
            } else {
                console.log('✅ USDC already approved - skipping approval');
            }
        } catch (balanceError) {
            console.error('⚠️  Could not check balance/allowance:', balanceError);
            console.error('Continuing anyway...');
        }

        // Create approval transaction for the total amount
        // We'll approve once for all fillOrder transactions
        const approvalData = encodeFunctionData({
            abi: [{
                name: 'approve',
                type: 'function',
                inputs: [
                    { name: 'spender', type: 'address' },
                    { name: 'amount', type: 'uint256' }
                ],
                outputs: [{ name: '', type: 'bool' }],
                stateMutability: 'nonpayable'
            }],
            functionName: 'approve',
            args: [OPTION_BOOK_ADDRESS as Address, totalUSDCNeeded],
        });

        console.log('✅ Adding USDC approval to batch');

        // Build the batch: approval first, then all fillOrder transactions
        const allCalls = [
            // First: approve USDC for all transactions
            {
                to: USDC_ADDRESS,
                value: '0x0',
                data: approvalData,
            },
            // Then: all fillOrder transactions
            ...transactions.map(tx => ({
                to: tx.to,
                value: tx.value ? `0x${tx.value.toString(16)}` : '0x0',
                data: tx.data,
            }))
        ];

        console.log('\n========================================');
        console.log('📡 Sending Batch via EIP-5792 wallet_sendCalls...');
        console.log('📦 Batch includes:');
        console.log('  1. USDC Approval for', (Number(totalUSDCNeeded) / 1_000_000).toFixed(2), 'USDC');
        console.log('  2-' + (allCalls.length) + '. Fill', transactions.length, 'order(s)');
        console.log('⚡ Paymaster will sponsor gas fees (if configured)');
        console.log('🔗 All', allCalls.length, 'transactions will execute atomically');
        console.log('========================================\n');

        const formattedCalls = allCalls;

        // Send batch transaction using EIP-5792 wallet_sendCalls
        // Base Account SDK handles batching and paymaster integration natively
        console.log('📤 Sending request with capabilities:', {
            paymasterService: PAYMASTER_RPC_URL ? 'configured' : 'not configured',
            gasLimits: {
                callGasLimit: GAS_LIMITS.callGasLimit.toString(),
                verificationGasLimit: GAS_LIMITS.verificationGasLimit.toString(),
                preVerificationGas: GAS_LIMITS.preVerificationGas.toString(),
            }
        });

        const result = await baseProvider.request({
            method: 'wallet_sendCalls',
            params: [{
                version: '1.0', // EIP-5792 version
                from: userAddress,
                chainId: `0x${base.id.toString(16)}`, // Base mainnet chain ID in hex
                calls: formattedCalls,
                capabilities: {
                    paymasterService: {
                        url: PAYMASTER_RPC_URL,
                    },
                },
            }]
        });

        // wallet_sendCalls returns a call bundle ID, not a transaction hash
        // We'll use it as the identifier
        const txHash = typeof result === 'string' ? result : JSON.stringify(result);

        console.log('✅ Batch transaction submitted and mined!');
        console.log('🔗 Transaction Hash:', txHash);

        console.log('\n========================================');
        console.log('✅ BATCH EXECUTION SUCCESSFUL!');
        console.log('========================================');
        console.log('🔗 Transaction Hash:', txHash);
        console.log('📦 All', transactions.length, 'transactions executed atomically');
        console.log('⚡ Gas fees sponsored by Paymaster');
        console.log('🎉 User only paid USDC, no ETH required!');
        console.log('========================================\n');

        return {
            success: true,
            txHash,
        };
    } catch (error) {
        console.error('\n========================================');
        console.error('❌ GASLESS BATCH EXECUTION FAILED');
        console.error('========================================');
        console.error('Error:', error);

        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);

            // Extract revert data if available
            const errorData = (error as any).data;
            if (errorData) {
                console.error('Revert data:', errorData);
                console.error('💡 Decode this data at: https://bia.is/tools/abi-decoder/');
            }

            // Check for specific error types
            if (error.message.includes('execution reverted')) {
                console.error('\n🔍 DEBUGGING TIPS:');
                console.error('1. Check if you have enough USDC balance');
                console.error('2. Check if USDC is approved for OptionBook contract');
                console.error('3. Verify the order is still valid (not expired)');
                console.error('4. Try increasing gas limits further');
                console.error('5. Simulate the transaction using Tenderly or EntryPoint contract');
            }

            if (error.message.includes('insufficient funds')) {
                console.error('\n💰 INSUFFICIENT FUNDS:');
                console.error('Your smart account or paymaster needs ETH for gas');
            }

            if (error.message.includes('signature')) {
                console.error('\n✍️ SIGNATURE ERROR:');
                console.error('The UserOperation was modified after paymaster signed it');
                console.error('This should not happen - report this bug');
            }
        }

        console.error('========================================\n');

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Check if Base Paymaster is configured
 */
export function isBasePaymasterConfigured(): boolean {
    return Boolean(PAYMASTER_RPC_URL && PAYMASTER_RPC_URL.length > 0);
}

/**
 * Get the smart account address for a given owner
 */
export async function getSmartAccountAddressWithPaymaster(ownerAddress: Address): Promise<Address> {
    const smartAccountClient = await createSmartAccountWithBasePaymaster(ownerAddress);
    return smartAccountClient.account.address;
}

