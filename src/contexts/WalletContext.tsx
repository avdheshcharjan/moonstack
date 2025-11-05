'use client';

import { baseAccountSDK } from '@/src/providers/BaseAccountProvider';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { BASE_CHAIN_ID } from '../utils/contracts';

export interface WalletContextType {
    walletAddress: string | null;
    chainId: number | null;
    isConnecting: boolean;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [chainId, setChainId] = useState<number | null>(null);
    const [isConnecting, setIsConnecting] = useState<boolean>(false);

    const connectWallet = async (): Promise<void> => {
        try {
            setIsConnecting(true);

            console.log('🔵 Requesting "Sign in with Base"...');

            // Use Base Account SDK - Request accounts using standard Ethereum RPC
            const provider = baseAccountSDK.getProvider();

            // Use eth_requestAccounts to trigger the connection modal
            const accounts = await provider.request({
                method: 'eth_requestAccounts',
                params: []
            }) as string[];

            console.log('📝 Accounts returned:', accounts);

            if (accounts && accounts.length > 0) {
                const address = accounts[0];
                console.log('✅ Connected with Base Account:', address);
                console.log('✅ Setting wallet state:', { address, chainId: BASE_CHAIN_ID });
                setWalletAddress(address);
                setChainId(BASE_CHAIN_ID);
            } else {
                throw new Error('No accounts returned from Base Account');
            }
        } catch (error) {
            console.error('❌ Error connecting with Base Account:', error);
            console.error('Error details:', error);
            alert('Connection failed. Please try again.');
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectWallet = (): void => {
        console.log('🔴 Disconnecting wallet');
        setWalletAddress(null);
        setChainId(null);
    };

    // NO AUTO-RECONNECT - User must "Sign in with Base" on every page load
    // This ensures a fresh session and prevents any cached wallet states

    // Listen for Base Account disconnection events only
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const provider = baseAccountSDK.getProvider();

            const handleAccountsChanged = (accounts: string[]): void => {
                console.log('🔄 Accounts changed:', accounts);
                if (accounts.length === 0) {
                    console.log('🔴 Base Account disconnected');
                    disconnectWallet();
                } else if (walletAddress && accounts[0].toLowerCase() !== walletAddress.toLowerCase()) {
                    console.log('🔄 Account changed to:', accounts[0]);
                    setWalletAddress(accounts[0]);
                }
            };

            const handleChainChanged = (chainIdHex: string): void => {
                const newChainId = parseInt(chainIdHex, 16);
                console.log('🔄 Chain changed to:', newChainId);
                setChainId(newChainId);

                // If switched away from Base, disconnect
                if (newChainId !== BASE_CHAIN_ID) {
                    console.log('⚠️ Not on Base chain, disconnecting');
                    disconnectWallet();
                }
            };

            provider.on('accountsChanged', handleAccountsChanged);
            provider.on('chainChanged', handleChainChanged);

            return () => {
                provider.removeListener('accountsChanged', handleAccountsChanged);
                provider.removeListener('chainChanged', handleChainChanged);
            };
        } catch (error) {
            console.log('Base Account event listeners not available:', error);
        }
    }, [walletAddress]);

    const value: WalletContextType = {
        walletAddress,
        chainId,
        isConnecting,
        connectWallet,
        disconnectWallet,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet(): WalletContextType {
    const context = useContext(WalletContext);

    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }

    return context;
}
