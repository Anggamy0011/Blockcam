// Tambahkan deklarasi global untuk window.ethereum dan interface EthereumProvider
interface EthereumProvider {
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
}
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

import { ethers } from 'ethers';
import type { Eip1193Provider } from 'ethers';

const BACKEND_URL = "http://localhost:4000";

export interface BlockchainUploadResult {
    success: boolean;
    txHash?: string;
    videoId?: string;
    blockNumber?: number;
}

export interface BlockchainInfo {
    address: string;
    network: string;
    rpc: string;
}

class BlockchainService {
    private provider: ethers.BrowserProvider | null = null;
    private signer: ethers.JsonRpcSigner | null | undefined = null;

    // Connect wallet
    async connectWallet(): Promise<string | null> {
        try {
            if (typeof window.ethereum === 'undefined') {
                throw new Error('MetaMask is not installed');
            }

            // Request account access
            const eth = window.ethereum as EthereumProvider;
            if (!eth.request) throw new Error('Ethereum provider does not support request');
            const accounts = await eth.request({
                method: 'eth_requestAccounts'
            }) as string[];

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found');
            }

            // Paksa switch ke Polygon Mainnet (chainId 137)
            const polygonChainId = '0x89'; // 137 dalam hex
            const currentChainId = await eth.request({ method: 'eth_chainId' });
            if (currentChainId !== polygonChainId) {
                try {
                    await eth.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: polygonChainId }],
                    });
                } catch (switchError: unknown) {
                    // Jika Polygon belum ada di wallet, tambahkan chain baru
                    if (typeof switchError === 'object' && switchError !== null && 'code' in switchError && (switchError as { code: number }).code === 4902) {
                        await eth.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: polygonChainId,
                                chainName: 'Polygon Mainnet',
                                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                                rpcUrls: ['https://polygon-rpc.com/'],
                                blockExplorerUrls: ['https://polygonscan.com/'],
                            }],
                        });
                    } else {
                        throw new Error('Gagal switch ke jaringan Polygon. Silakan ganti network ke Polygon secara manual di wallet.');
                    }
                }
            }

            // Create provider and signer
            this.provider = new ethers.BrowserProvider(window.ethereum as Eip1193Provider);
            this.signer = await this.provider?.getSigner();
            
            // Get contract address from backend
            await this.getContractInfo();

            return accounts[0];
        } catch (error) {
            console.error('Error connecting wallet:', error);
            throw error;
        }
    }

    // Get contract info from backend
    async getContractInfo(): Promise<BlockchainInfo> {
        try {
            const response = await fetch(`${BACKEND_URL}/blockchain/info`);
            const data = await response.json();
            
            if (data.success) {
                return data.data;
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error getting contract info:', error);
            throw error;
        }
    }

    // Get current account
    async getCurrentAccount(): Promise<string | null> {
        if (!this.signer) {
            return null;
        }
        return await this.signer.getAddress();
    }

    // Check if wallet is connected
    isConnected(): boolean {
        return this.signer !== null;
    }

    // Setup wallet listener
    setupWalletListener(callback: (accounts: string[]) => void) {
        if (typeof window.ethereum !== 'undefined') {
            const eth = window.ethereum as EthereumProvider;
            if (eth.on) {
                eth.on('accountsChanged', (...args: unknown[]) => {
                    if (Array.isArray(args) && args.every(a => typeof a === 'string')) {
                        callback(args as string[]);
                    }
                });
            }
        }
    }

    // Remove wallet listener
    removeWalletListener(callback: (accounts: string[]) => void) {
        if (typeof window.ethereum !== 'undefined') {
            const eth = window.ethereum as EthereumProvider;
            if (eth.removeListener) {
                eth.removeListener('accountsChanged', (...args: unknown[]) => {
                    if (Array.isArray(args) && args.every(a => typeof a === 'string')) {
                        callback(args as string[]);
                    }
                });
            }
        }
    }
}

const blockchainService = new BlockchainService();
export default blockchainService; 