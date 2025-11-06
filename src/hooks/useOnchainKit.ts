import { useAccount, useBalance, useSignMessage, useChainId } from 'wagmi';
import { base } from 'wagmi/chains';

/**
 * Comprehensive hook for OnchainKit wallet features
 * Combines multiple wagmi hooks into a single, easy-to-use interface
 */
export function useOnchainKit() {
  const { address, isConnected, isConnecting, isDisconnected } = useAccount();
  const chainId = useChainId();
  const { data: balance, isLoading: isBalanceLoading } = useBalance({
    address: address,
  });
  const { signMessage, data: signature, error: signError } = useSignMessage();

  const isOnBase = chainId === base.id;

  return {
    // Account info
    address,
    isConnected,
    isConnecting,
    isDisconnected,
    
    // Chain info
    chainId,
    isOnBase,
    
    // Balance info
    balance: balance?.formatted,
    balanceSymbol: balance?.symbol,
    balanceRaw: balance?.value,
    isBalanceLoading,
    
    // Signing
    signMessage,
    signature,
    signError,
  };
}

