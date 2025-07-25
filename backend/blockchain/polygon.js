const { ethers, JsonRpcProvider, NonceManager } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Polygon Mainnet Configuration
const POLYGON_RPC_URL = 'https://polygon-rpc.com';
const POLYGON_CHAIN_ID = 137;
const POLYGON_EXPLORER = 'https://polygonscan.com';

// Contract configuration
const CONTRACT_NAME = 'BlockCam';
const CONTRACT_SOURCE = path.join(__dirname, '../contracts/BlockCam.sol');

class PolygonBlockchain {
    constructor() {
        this.provider = new JsonRpcProvider(POLYGON_RPC_URL);
        this.contract = null;
        this.contractAddress = null;
        // Tambahan: signer backend (private key)
        const backendKey = process.env.BACKEND_PRIVATE_KEY;
        if (backendKey) {
            this.signer = new ethers.Wallet(backendKey, this.provider);
            this.nonceManager = ethers.NonceManager ? new ethers.NonceManager(this.signer) : this.signer;
        } else {
            this.signer = null;
            this.nonceManager = null;
        }
    }

    // Compile Solidity contract
    async compileContract() {
        try {
            const solc = require('solc');
            const contractSource = fs.readFileSync(CONTRACT_SOURCE, 'utf8');
            
            const input = {
                language: 'Solidity',
                sources: {
                    'BlockCam.sol': {
                        content: contractSource
                    }
                },
                settings: {
                    outputSelection: {
                        '*': {
                            '*': ['*']
                        }
                    }
                }
            };

            const output = JSON.parse(solc.compile(JSON.stringify(input)));
            
            if (output.errors) {
                const errors = output.errors.filter(error => error.severity === 'error');
                if (errors.length > 0) {
                    throw new Error(`Compilation errors: ${JSON.stringify(errors, null, 2)}`);
                }
            }

            const contract = output.contracts['BlockCam.sol']['BlockCam'];
            return {
                abi: contract.abi,
                bytecode: contract.evm.bytecode.object
            };
        } catch (error) {
            console.error('Compilation error:', error.message);
            throw error;
        }
    }

    // Deploy contract (DISABLED, remove or comment out if not needed)
    // async deployContract() {
    //     try {
    //         console.log('🔧 Compiling contract...');
    //         const { abi, bytecode } = await this.compileContract();
            
    //         console.log('📦 Creating contract factory...');
    //         const factory = new ethers.ContractFactory(abi, bytecode, this.wallet);
            
    //         console.log('🚀 Deploying contract to Polygon Mainnet...');
    //         const contract = await factory.deploy();
            
    //         console.log('⏳ Waiting for deployment confirmation...');
    //         await contract.deployed();
            
    //         this.contract = contract;
    //         this.contractAddress = contract.address;
            
    //         console.log('✅ Contract deployed successfully!');
    //         console.log(`📍 Contract Address: ${this.contractAddress}`);
    //         console.log(`🔗 Explorer: ${POLYGON_EXPLORER}/address/${this.contractAddress}`);
            
    //         // Save contract info
    //         this.saveContractInfo();
            
    //         return {
    //             address: this.contractAddress,
    //             explorer: `${POLYGON_EXPLORER}/address/${this.contractAddress}`,
    //             abi: abi
    //         };
    //     } catch (error) {
    //         console.error('❌ Deployment failed:', error.message);
    //         throw error;
    //     }
    // }

    // Save contract information
    saveContractInfo() {
        const contractInfo = {
            address: this.contractAddress,
            network: 'Polygon Mainnet',
            chainId: POLYGON_CHAIN_ID,
            deployedAt: new Date().toISOString(),
            explorer: `${POLYGON_EXPLORER}/address/${this.contractAddress}`
        };
        
        fs.writeFileSync(
            path.join(__dirname, '../contract-info.json'),
            JSON.stringify(contractInfo, null, 2)
        );
        
        console.log('💾 Contract information saved to contract-info.json');
    }

    // Load existing contract (DISABLED, remove or comment out if not needed)
    async loadContract() {
        const contractInfoPath = path.join(__dirname, '../contract-info.json');
        if (!fs.existsSync(contractInfoPath)) {
            throw new Error('Contract info file not found. Deploy contract first.');
        }
        const contractInfo = JSON.parse(fs.readFileSync(contractInfoPath, 'utf8'));
        // Ambil ABI dari file ABI JSON (misal: ../contracts/BlockCam.json)
        const abiPath = path.join(__dirname, '../contracts/BlockCam.json');
        if (!fs.existsSync(abiPath)) {
            throw new Error('Contract ABI file not found.');
        }
        const { abi } = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        // Gunakan provider publik Polygon
        const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
        this.contractAddress = contractInfo.address;
        this.contract = new ethers.Contract(this.contractAddress, abi, provider);
        console.log('📋 Contract loaded for read-only');
    }

    // Upload video metadata to blockchain
    async uploadVideoMetadata(videoHash, title, description, duration) {
        try {
            if (!this.contract) {
                await this.loadContract();
            }
            if (!this.nonceManager) {
                throw new Error('No signer available. Wallet must be connected.');
            }
            const contractWithSigner = this.contract.connect(this.nonceManager);
            console.log('📤 Uploading video metadata to blockchain...');
            const tx = await contractWithSigner.uploadVideo(
                videoHash,
                title,
                description,
                duration,
                { gasLimit: 700000 }
            );
            console.log('⏳ Waiting for transaction confirmation...');
            const receipt = await tx.wait();
            console.log('✅ Video metadata uploaded successfully!');
            const transactionHash = receipt.transactionHash || receipt.hash;
            return {
                transactionHash: transactionHash,
                blockNumber: receipt.blockNumber,
                explorer: `${POLYGON_EXPLORER}/tx/${transactionHash}`
            };
        } catch (error) {
            console.error('❌ Failed to upload video metadata:', error.message);
            throw error;
        }
    }

    // Tambahkan method untuk upload video ke blockchain
    async uploadVideoToBlockchain(ipfsHash, fileSize, metadata) {
        console.log('uploadVideoToBlockchain called with:', { ipfsHash, fileSize, metadata });
        const title = metadata.title || metadata.name || '';
        const description = metadata.description || '';
        const duration = metadata.duration || 0;
        // Panggil uploadVideoMetadata
        const result = await this.uploadVideoMetadata(ipfsHash, title, description, duration);
        return result;
    }

    // Get video metadata from blockchain (DISABLED, remove or comment out if not needed)
    // async getVideoMetadata(videoHash) {
    //     try {
    //         if (!this.contract) {
    //             await this.loadContract();
    //         }
            
    //         const video = await this.contract.getVideo(videoHash);
    //         return {
    //             hash: video.hash,
    //             title: video.title,
    //             description: video.description,
    //             duration: video.duration.toNumber(),
    //             uploader: video.uploader,
    //             uploadTime: new Date(video.uploadTime.toNumber() * 1000).toISOString()
    //         };
    //     } catch (error) {
    //         console.error('❌ Failed to get video metadata:', error.message);
    //         throw error;
    //     }
    // }

    // Get all videos
    async getAllVideos() {
        try {
            if (!this.contract) {
                await this.loadContract();
            }
            
            const videoCount = await this.contract.getVideoCount();
            const videos = [];
            
            for (let i = 0; i < videoCount; i++) {
                const video = await this.contract.getVideoByIndex(i);
                videos.push({
                    hash: video.hash,
                    title: video.title,
                    description: video.description,
                    duration: video.duration.toNumber(),
                    uploader: video.uploader,
                    uploadTime: new Date(video.uploadTime.toNumber() * 1000).toISOString()
                });
            }
            
            return videos;
        } catch (error) {
            console.error('❌ Failed to get all videos:', error.message);
            throw error;
        }
    }

    // Get transaction history from blockchain
    async getTransactionHistory() {
        try {
            if (!this.contract) {
                await this.loadContract();
            }
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000); // Last 10k blocks
            const uploadEvents = await this.contract.queryFilter(
                this.contract.filters.VideoUploaded(),
                fromBlock,
                currentBlock
            );
            const verifyEvents = await this.contract.queryFilter(
                this.contract.filters.VideoVerified(),
                fromBlock,
                currentBlock
            );
            const transactions = [];
            for (const event of uploadEvents) {
                const block = await event.getBlock();
                const tx = await event.getTransaction();
                const receipt = await event.getTransactionReceipt();
                let description = '';
                try {
                    // Ambil detail video dari smart contract
                    const video = await this.contract.getVideo(event.args.videoHash);
                    description = video.description;
                } catch (e) {
                    description = '';
                }
                transactions.push({
                    txHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    timestamp: new Date(block.timestamp * 1000).toISOString(),
                    from: tx.from,
                    to: tx.to,
                    method: 'uploadVideo',
                    status: receipt.status === 1 ? 'success' : 'failed',
                    gasUsed: receipt.gasUsed.toString(),
                    ipfsHash: event.args.videoHash,
                    videoTitle: event.args.title,
                    description // tambahkan deskripsi
                });
            }
            for (const event of verifyEvents) {
                const block = await event.getBlock();
                const tx = await event.getTransaction();
                const receipt = await event.getTransactionReceipt();
                transactions.push({
                    txHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    timestamp: new Date(block.timestamp * 1000).toISOString(),
                    from: tx.from,
                    to: tx.to,
                    method: 'verifyVideo',
                    status: receipt.status === 1 ? 'success' : 'failed',
                    gasUsed: receipt.gasUsed.toString(),
                    ipfsHash: event.args.videoHash,
                    videoTitle: event.args.title
                });
            }
            transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return transactions;
        } catch (error) {
            console.error('❌ Failed to get transaction history:', error.message);
            return [];
        }
    }

    // Get user-specific transaction history
    async getUserTransactionHistory(userAddress) {
        try {
            if (!this.contract) {
                await this.loadContract();
            }
            
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 1000);      
            // Get all events first
            const uploadEvents = await this.contract.queryFilter(
                this.contract.filters.VideoUploaded(),
                fromBlock,
                currentBlock
            );
            
            const verifyEvents = await this.contract.queryFilter(
                this.contract.filters.VideoVerified(),
                fromBlock,
                currentBlock
            );
            
            const userTransactions = [];
            
            // Filter upload events by user address
            for (const event of uploadEvents) {
                const tx = await event.getTransaction();
                if (tx.from.toLowerCase() === userAddress.toLowerCase()) {
                    const block = await event.getBlock();
                    const receipt = await event.getTransactionReceipt();
                    
                    userTransactions.push({
                        txHash: event.transactionHash,
                        blockNumber: event.blockNumber,
                        timestamp: new Date(block.timestamp * 1000).toISOString(),
                        from: tx.from,
                        to: tx.to,
                        method: 'uploadVideo',
                        status: receipt.status === 1 ? 'success' : 'failed',
                        gasUsed: receipt.gasUsed.toString(),
                        ipfsHash: event.args.videoHash,
                        videoTitle: event.args.title
                    });
                }
            }
            
            // Filter verify events by user address
            for (const event of verifyEvents) {
                const tx = await event.getTransaction();
                if (tx.from.toLowerCase() === userAddress.toLowerCase()) {
                    const block = await event.getBlock();
                    const receipt = await event.getTransactionReceipt();
                    
                    userTransactions.push({
                        txHash: event.transactionHash,
                        blockNumber: event.blockNumber,
                        timestamp: new Date(block.timestamp * 1000).toISOString(),
                        from: tx.from,
                        to: tx.to,
                        method: 'verifyVideo',
                        status: receipt.status === 1 ? 'success' : 'failed',
                        gasUsed: receipt.gasUsed.toString(),
                        ipfsHash: event.args.videoHash,
                        videoTitle: event.args.title
                    });
                }
            }
            
            // Sort by timestamp (newest first)
            userTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            return userTransactions;
        } catch (error) {
            console.error('❌ Failed to get user transaction history:', error.message);
            return [];
        }
    }

    // Get user-specific uploads
    async getUserUploads(userAddress) {
        try {
            if (!this.contract) {
                await this.loadContract();
            }
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 500); // Optimasi: hanya 500 block terakhir
            const uploadEvents = await this.contract.queryFilter(
                this.contract.filters.VideoUploaded(),
                fromBlock,
                currentBlock
            );
            const userUploads = [];
            for (const event of uploadEvents) {
                const tx = await event.getTransaction();
                if (tx.from.toLowerCase() === userAddress.toLowerCase()) {
                    const block = await event.getBlock();
                    userUploads.push({
                        ipfsHash: event.args.videoHash,
                        title: event.args.title,
                        description: event.args.description,
                        duration: event.args.duration.toNumber(),
                        uploadTime: new Date(block.timestamp * 1000).toISOString(),
                        txHash: event.transactionHash,
                        blockNumber: event.blockNumber
                    });
                }
            }
            userUploads.sort((a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime());
            return userUploads;
        } catch (error) {
            console.error('❌ Failed to get user uploads:', error.message);
            return [];
        }
    }

    getContractInfo() {
        const contractInfoPath = path.join(__dirname, '../contract-info.json');
        if (!fs.existsSync(contractInfoPath)) {
            return { success: false, error: 'Contract info not found' };
        }
        const contractInfo = JSON.parse(fs.readFileSync(contractInfoPath, 'utf8'));
        return { success: true, data: contractInfo };
    }
}

module.exports = PolygonBlockchain; 