const { ethers, JsonRpcProvider, NonceManager } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Polygon Mainnet Configuration dengan multiple RPC fallback
const POLYGON_RPC_URLS = [
    process.env.POLYGON_RPC || 'https://rpc.ankr.com/polygon',
    'https://rpc-mainnet.maticvigil.com',
    'https://polygon-rpc.com',
    'https://polygon.llamarpc.com',
    'https://polygon-bor.publicnode.com'
];
const POLYGON_CHAIN_ID = 137;
const POLYGON_EXPLORER = 'https://polygonscan.com';

// Contract configuration
const CONTRACT_NAME = 'BlockCam';
const CONTRACT_SOURCE = path.join(__dirname, '../contracts/BlockCam.sol');

class PolygonBlockchain {
    constructor() {
        this.provider = null;
        this.contract = null;
        this.contractAddress = null;
        this.signer = null;
        this.nonceManager = null;
        this.currentRpcIndex = 0;
        
        // Try to initialize RPC connection with timeout
        this.initializeRPC();
    }

    async initializeRPC() {
        for (let i = 0; i < POLYGON_RPC_URLS.length; i++) {
            try {
                console.log(`🔄 Trying RPC ${i + 1}/${POLYGON_RPC_URLS.length}: ${POLYGON_RPC_URLS[i]}`);
                this.provider = new JsonRpcProvider(POLYGON_RPC_URLS[i]);
                
                // Test connection with timeout
                const testPromise = this.provider.getBlockNumber();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('RPC timeout')), 5000)
                );
                
                await Promise.race([testPromise, timeoutPromise]);
                this.currentRpcIndex = i;
                console.log(`✅ Polygon RPC connected successfully using: ${POLYGON_RPC_URLS[i]}`);
                
                // Initialize wallet if private key is available
                const backendKey = process.env.BACKEND_PRIVATE_KEY;
                if (backendKey) {
                    try {
                        this.signer = new ethers.Wallet(backendKey, this.provider);
                        this.nonceManager = ethers.NonceManager ? new ethers.NonceManager(this.signer) : this.signer;
                        console.log('✅ Backend wallet initialized');
                        break; // Exit loop if successful
                    } catch (error) {
                        console.warn('⚠️ Failed to initialize backend wallet:', error.message);
                    }
                } else {
                    console.warn('⚠️ BACKEND_PRIVATE_KEY not set');
                    break; // Exit loop if no private key
                }
            } catch (error) {
                console.warn(`⚠️ Failed to connect to RPC ${i + 1}:`, error.message);
                if (i === POLYGON_RPC_URLS.length - 1) {
                    console.warn('⚠️ All RPC endpoints failed');
                    console.log('🔄 Backend will run in fallback mode (no blockchain features)');
                    this.provider = null;
                }
            }
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
        const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URLS[this.currentRpcIndex]);
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
            
            // Dapatkan gas price yang optimal untuk biaya minimal ~50-60 IDR
            const gasPrice = await this.provider.getFeeData();
            
            // Gunakan EIP-1559 gas parameters (maxFeePerGas dan maxPriorityFeePerGas)
            // Jangan gunakan gasPrice bersamaan dengan maxFeePerGas
            const txOptions = { 
                gasLimit: 800000 // Gas limit yang cukup untuk transaksi
            };
            
            // Minimum gas price untuk memastikan biaya minimal 50 rupiah
            // Asumsi 1 MATIC = 15,000 IDR, maka 50 IDR = 0.00333 MATIC
            // Untuk gas limit 800,000, minimum gas price = 0.00333 / 800,000 = ~4.16 gwei
            const minGasPriceGwei = 5; // Minimum 5 gwei untuk memastikan biaya minimal
            const minGasPrice = ethers.parseUnits(minGasPriceGwei.toString(), 'gwei');
            
            // Jika network mendukung EIP-1559, gunakan maxFeePerGas dan maxPriorityFeePerGas
            if (gasPrice.maxFeePerGas && gasPrice.maxPriorityFeePerGas) {
                // Gunakan multiplier yang lebih tinggi (2x) untuk memastikan transaksi berhasil
                let calculatedMaxFeePerGas = gasPrice.maxFeePerGas * 20n / 10n; // 2x lipat
                let calculatedMaxPriorityFeePerGas = gasPrice.maxPriorityFeePerGas * 20n / 10n; // 2x lipat
                
                // Pastikan gas price tidak di bawah minimum
                if (calculatedMaxFeePerGas < minGasPrice) {
                    calculatedMaxFeePerGas = minGasPrice;
                }
                if (calculatedMaxPriorityFeePerGas < minGasPrice) {
                    calculatedMaxPriorityFeePerGas = minGasPrice;
                }
                
                txOptions.maxFeePerGas = calculatedMaxFeePerGas;
                txOptions.maxPriorityFeePerGas = calculatedMaxPriorityFeePerGas;
                
                console.log(`💰 Gas Price: maxFeePerGas=${ethers.formatUnits(calculatedMaxFeePerGas, 'gwei')} gwei, maxPriorityFeePerGas=${ethers.formatUnits(calculatedMaxPriorityFeePerGas, 'gwei')} gwei`);
            } else if (gasPrice.gasPrice) {
                // Fallback ke legacy gasPrice jika EIP-1559 tidak didukung
                let calculatedGasPrice = gasPrice.gasPrice * 20n / 10n; // 2x lipat
                
                // Pastikan gas price tidak di bawah minimum
                if (calculatedGasPrice < minGasPrice) {
                    calculatedGasPrice = minGasPrice;
                }
                
                txOptions.gasPrice = calculatedGasPrice;
                console.log(`💰 Gas Price: ${ethers.formatUnits(calculatedGasPrice, 'gwei')} gwei`);
            }
            
            const tx = await contractWithSigner.uploadVideo(
                videoHash,
                title,
                description,
                duration,
                txOptions
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
        const description = ''; // Always empty description
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
            
            // Optimasi: kurangi range block untuk menghindari timeout
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 100); // Kurangi dari 500 ke 100
            
            // Tambahkan timeout untuk query
            const uploadEvents = await Promise.race([
                this.contract.queryFilter(
                    this.contract.filters.VideoUploaded(),
                    fromBlock,
                    currentBlock
                ),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Query timeout')), 30000)
                )
            ]);
            
            const userUploads = [];
            for (const event of uploadEvents) {
                try {
                    const tx = await event.getTransaction();
                    if (tx.from.toLowerCase() === userAddress.toLowerCase()) {
                        const block = await event.getBlock();
                        
                        // Perbaiki error toNumber() dengan safe parsing
                        let duration = 0;
                        try {
                            if (event.args.duration && typeof event.args.duration.toNumber === 'function') {
                                duration = event.args.duration.toNumber();
                            } else if (event.args.duration) {
                                duration = parseInt(event.args.duration.toString());
                            }
                        } catch (durationError) {
                            console.warn('⚠️ Failed to parse duration:', durationError.message);
                            duration = 0;
                        }
                        
                        userUploads.push({
                            ipfsHash: event.args.videoHash || '',
                            title: event.args.title || '',
                            description: event.args.description || '',
                            duration: duration,
                            uploadTime: new Date(block.timestamp * 1000).toISOString(),
                            txHash: event.transactionHash,
                            blockNumber: event.blockNumber
                        });
                    }
                } catch (eventError) {
                    console.warn('⚠️ Failed to process event:', eventError.message);
                    continue; // Skip event yang bermasalah
                }
            }
            
            userUploads.sort((a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime());
            return userUploads;
        } catch (error) {
            console.error('❌ Failed to get user uploads:', error.message);
            
            // Return empty array jika timeout atau error
            if (error.message.includes('timeout') || error.message.includes('network')) {
                console.warn('⚠️ Network timeout, returning empty array');
            }
            
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

    // Get backend wallet balance
    async getBackendWalletBalance() {
        try {
            if (!this.signer) {
                console.warn('⚠️ Backend wallet not initialized');
                return 0;
            }
            const balance = await this.provider.getBalance(this.signer.address);
            return Number(ethers.formatEther(balance));
        } catch (error) {
            console.warn('⚠️ Failed to get backend wallet balance:', error.message);
            return 0;
        }
    }

    // Get backend wallet address
    getBackendWalletAddress() {
        try {
            if (!this.signer) {
                console.warn('⚠️ Backend wallet not initialized');
                return null;
            }
            return this.signer.address;
        } catch (error) {
            console.warn('⚠️ Failed to get backend wallet address:', error.message);
            return null;
        }
    }

    // Get gas estimation for upload transaction
    async getGasEstimation() {
        try {
            if (!this.contract) {
                await this.loadContract();
            }
            if (!this.nonceManager) {
                throw new Error('No signer available. Wallet must be connected.');
            }

            // Estimasi gas untuk transaksi upload
            const gasEstimate = await this.contract.uploadVideo.estimateGas(
                'QmTestHash123456789', // dummy hash untuk estimasi
                'Test Title',
                'Test Description',
                60 // dummy duration
            );

            // Dapatkan gas price saat ini
            const feeData = await this.provider.getFeeData();
            
            // Minimum gas price untuk memastikan biaya minimal 50 rupiah
            const minGasPriceGwei = 5; // Minimum 5 gwei
            const minGasPrice = ethers.parseUnits(minGasPriceGwei.toString(), 'gwei');
            
            // Hitung biaya dalam MATIC (1 MATIC = 10^18 wei)
            const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('30', 'gwei');
            const estimatedCost = gasEstimate * gasPrice;
            const estimatedCostInMatic = Number(ethers.formatEther(estimatedCost));

            // Biaya dengan gas price 2x lipat untuk memastikan transaksi berhasil (~50-60 IDR)
            let optimalGasPrice = gasPrice * 20n / 10n; // 2x lipat
            
            // Pastikan gas price tidak di bawah minimum
            if (optimalGasPrice < minGasPrice) {
                optimalGasPrice = minGasPrice;
            }
            
            const optimalEstimatedCost = gasEstimate * optimalGasPrice;
            const optimalEstimatedCostInMatic = Number(ethers.formatEther(optimalEstimatedCost));

            return {
                gasEstimate: gasEstimate.toString(),
                currentGasPrice: gasPrice.toString(),
                optimalGasPrice: optimalGasPrice.toString(),
                minGasPrice: minGasPrice.toString(),
                estimatedCostInMatic: estimatedCostInMatic.toFixed(6),
                optimalEstimatedCostInMatic: optimalEstimatedCostInMatic.toFixed(6),
                estimatedCostInRupiah: (estimatedCostInMatic * 15000).toFixed(0), // Asumsi 1 MATIC = 15,000 IDR
                optimalEstimatedCostInRupiah: (optimalEstimatedCostInMatic * 15000).toFixed(0),
                gasPriceInGwei: ethers.formatUnits(gasPrice, 'gwei'),
                optimalGasPriceInGwei: ethers.formatUnits(optimalGasPrice, 'gwei')
            };
        } catch (error) {
            console.error('❌ Failed to get gas estimation:', error.message);
            return {
                error: error.message,
                estimatedCostInRupiah: '45', // Fallback ke 45 rupiah
                optimalEstimatedCostInRupiah: '60' // Fallback ke 60 rupiah
            };
        }
    }
}

module.exports = PolygonBlockchain; 