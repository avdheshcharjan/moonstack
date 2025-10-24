/// <reference path="../global.d.ts" />
import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { BASE_CHAIN_ID } from '../utils/contracts';
import { getBaseAccountProvider, isBaseAccountConnected } from '@/src/lib/smartAccount';

interface UseWalletReturn {
  walletAddress: string | null;
  chainId: number | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WALLET_STORAGE_KEY = 'moonstack_wallet_address';
const CHAIN_STORAGE_KEY = 'moonstack_chain_id';

export function useWallet(): UseWalletReturn {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const connectWallet = async (): Promise<void> => {
    try {
      setIsConnecting(true);

      // Try Base Account SDK first for smart wallet
      try {
        const provider = getBaseAccountProvider();
        const accounts = await provider.request({ method: 'wallet_connect' }) as string[];

        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setChainId(BASE_CHAIN_ID);
          localStorage.setItem(WALLET_STORAGE_KEY, accounts[0]);
          localStorage.setItem(CHAIN_STORAGE_KEY, BASE_CHAIN_ID.toString());
          return;
        }
      } catch (baseAccountError) {
        console.log('Base Account not available, falling back to injected wallet:', baseAccountError);
      }

      // Fallback to traditional wallet connection
      if (!window.ethereum) {
        alert('Please install a Web3 wallet to continue.');
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();

      setWalletAddress(accounts[0]);
      setChainId(Number(network.chainId));
      localStorage.setItem(WALLET_STORAGE_KEY, accounts[0]);
      localStorage.setItem(CHAIN_STORAGE_KEY, Number(network.chainId).toString());

      if (Number(network.chainId) !== BASE_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }],
          });
          setChainId(BASE_CHAIN_ID);
        } catch (switchError: unknown) {
          const error = switchError as { code?: number };
          if (error.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x2105',
                  chainName: 'Base',
                  nativeCurrency: {
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  rpcUrls: ['https://mainnet.base.org'],
                  blockExplorerUrls: ['https://basescan.org']
                }]
              });
              setChainId(BASE_CHAIN_ID);
              localStorage.setItem(CHAIN_STORAGE_KEY, BASE_CHAIN_ID.toString());
            } catch (addError) {
              console.error('Error adding Base network:', addError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = (): void => {
    setWalletAddress(null);
    setChainId(null);
    localStorage.removeItem(WALLET_STORAGE_KEY);
    localStorage.removeItem(CHAIN_STORAGE_KEY);
  };

  // Restore wallet connection on mount
  useEffect(() => {
    const restoreConnection = async (): Promise<void> => {
      if (typeof window === 'undefined') return;

      const savedAddress = localStorage.getItem(WALLET_STORAGE_KEY);
      const savedChainId = localStorage.getItem(CHAIN_STORAGE_KEY);

      if (!savedAddress) return;

      try {
        // Try Base Account SDK first
        try {
          const provider = getBaseAccountProvider();
          const accounts = await provider.request({ method: 'eth_accounts' }) as string[];

          if (accounts && accounts.length > 0 && accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
            setWalletAddress(accounts[0]);
            setChainId(savedChainId ? parseInt(savedChainId) : BASE_CHAIN_ID);
            return;
          }
        } catch (baseError) {
          console.log('Base Account not available for auto-connect');
        }

        // Fallback to injected wallet
        if (window.ethereum) {
          const provider = new BrowserProvider(window.ethereum);
          const accounts = await provider.send('eth_accounts', []);

          if (accounts && accounts.length > 0 && accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
            const network = await provider.getNetwork();
            setWalletAddress(accounts[0]);
            setChainId(Number(network.chainId));
          } else {
            // Clear storage if wallet is no longer connected
            localStorage.removeItem(WALLET_STORAGE_KEY);
            localStorage.removeItem(CHAIN_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Error restoring wallet connection:', error);
        localStorage.removeItem(WALLET_STORAGE_KEY);
        localStorage.removeItem(CHAIN_STORAGE_KEY);
      }
    };

    restoreConnection();
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]): void => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setWalletAddress(accounts[0]);
        localStorage.setItem(WALLET_STORAGE_KEY, accounts[0]);
      }
    };

    const handleChainChanged = (chainIdHex: string): void => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      localStorage.setItem(CHAIN_STORAGE_KEY, newChainId.toString());
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  return {
    walletAddress,
    chainId,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
}
